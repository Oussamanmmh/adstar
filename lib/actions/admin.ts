'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

type AdminCheck =
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      userId: string
    }
  | {
      ok: false
      error: string
    }

export type AdminUserRow = {
  id: string
  full_name: string | null
  email: string | null
  wallet_address: string | null
  balance_usdt: number
  is_admin: boolean
  created_at: string
}

export type AdminSubscriptionRow = {
  id: string
  user_id: string
  package_id: string
  tx_hash: string | null
  status: 'pending' | 'active' | 'expired'
  started_at: string | null
  expires_at: string | null
  created_at: string
  profile:
    | {
        full_name: string | null
        email: string | null
      }
    | {
        full_name: string | null
        email: string | null
      }[]
    | null
  package:
    | {
        name: string
        price_usdt: number
        duration_days: number
      }
    | {
        name: string
        price_usdt: number
        duration_days: number
      }[]
    | null
}

export type AdminVideoRow = {
  id: string
  title: string
  youtube_url: string
  thumbnail_url: string | null
  order_index: number
  is_active: boolean
  created_at: string
}

export type AdminPackageRow = {
  id: string
  name: string
  price_usdt: number
  daily_earnings: number
  duration_days: number
  videos_per_day: number
  is_active: boolean
  created_at: string
}

const videoSchema = z.object({
  title: z.string().trim().min(3, 'عنوان الفيديو قصير جداً').max(200, 'العنوان طويل جداً'),
  youtubeUrl: z
    .string()
    .trim()
    .url('رابط الفيديو غير صالح')
    .refine(
      (url) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url),
      'يجب إدخال رابط يوتيوب صالح'
    ),
  isActive: z.boolean(),
})

const packageSchema = z.object({
  name: z.string().trim().min(2, 'اسم الباقة قصير جداً').max(100, 'اسم الباقة طويل جداً'),
  priceUsdt: z.number().positive('السعر يجب أن يكون أكبر من 0'),
  dailyEarnings: z.number().positive('الربح اليومي يجب أن يكون أكبر من 0'),
  durationDays: z.number().int().positive('مدة الباقة يجب أن تكون أكبر من 0'),
  videosPerDay: z.number().int().positive('عدد الفيديوهات يجب أن يكون أكبر من 0'),
  isActive: z.boolean(),
})

function getProfileValue<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/i,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/i,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

function getYoutubeThumbnail(url: string): string | null {
  const videoId = extractYoutubeId(url)
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      error: 'يرجى تسجيل الدخول أولاً',
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return {
      ok: false,
      error: 'غير مصرح لك بتنفيذ هذا الإجراء',
    }
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
  }
}

export async function getAdminDashboardData() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const [
    { count: totalUsers },
    { count: activeSubscriptions },
    { count: pendingSubscriptions },
    { count: pendingWithdrawals },
    { data: approvedWithdrawals },
    { data: profiles },
  ] = await Promise.all([
    admin.supabase.from('profiles').select('*', { count: 'exact', head: true }),
    admin.supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString()),
    admin.supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin.supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin.supabase
      .from('withdrawals')
      .select('amount_usdt')
      .eq('status', 'approved'),
    admin.supabase.from('profiles').select('balance_usdt'),
  ])

  const totalPaidOut = (approvedWithdrawals ?? []).reduce(
    (sum, row) => sum + Number((row as { amount_usdt: number }).amount_usdt ?? 0),
    0
  )

  const totalEarnings = (profiles ?? []).reduce(
    (sum, row) => sum + Number((row as { balance_usdt: number }).balance_usdt ?? 0),
    0
  )

  return {
    success: true as const,
    data: {
      totalUsers: totalUsers ?? 0,
      activeSubscriptions: activeSubscriptions ?? 0,
      pendingSubscriptions: pendingSubscriptions ?? 0,
      pendingWithdrawals: pendingWithdrawals ?? 0,
      totalPaidOut,
      totalEarnings,
    },
  }
}

export async function getAdminUsers() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { data, error } = await admin.supabase
    .from('profiles')
    .select('id, full_name, email, wallet_address, balance_usdt, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل المستخدمين حالياً',
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminUserRow[],
  }
}

export async function getAdminSubscriptions() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { data, error } = await admin.supabase
    .from('user_subscriptions')
    .select(
      'id, user_id, package_id, tx_hash, status, started_at, expires_at, created_at, profile:profiles!user_subscriptions_user_id_fkey(full_name, email), package:packages!user_subscriptions_package_id_fkey(name, price_usdt, duration_days)'
    )
    .order('created_at', { ascending: false })

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل بيانات الاشتراكات حالياً',
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminSubscriptionRow[],
  }
}

export async function processAdminSubscription(input: {
  subscriptionId: string
  decision: 'approved' | 'rejected'
}) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { data: subscription, error: subError } = await admin.supabase
    .from('user_subscriptions')
    .select('id, status, package:packages(duration_days)')
    .eq('id', input.subscriptionId)
    .maybeSingle()

  if (subError || !subscription) {
    return {
      success: false as const,
      error: 'تعذر العثور على الاشتراك المطلوب',
    }
  }

  if (subscription.status !== 'pending') {
    return {
      success: false as const,
      error: 'تمت معالجة هذا الاشتراك مسبقاً',
    }
  }

  if (input.decision === 'approved') {
    const packageValue = getProfileValue(
      subscription.package as { duration_days: number } | { duration_days: number }[] | null
    )

    const durationDays = Number(packageValue?.duration_days ?? 30)
    const startedAt = new Date()
    const expiresAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)

    const { error } = await admin.supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', input.subscriptionId)
      .eq('status', 'pending')

    if (error) {
      return {
        success: false as const,
        error: 'تعذر تفعيل الاشتراك حالياً',
      }
    }
  } else {
    const { error } = await admin.supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        started_at: null,
        expires_at: null,
      })
      .eq('id', input.subscriptionId)
      .eq('status', 'pending')

    if (error) {
      return {
        success: false as const,
        error: 'تعذر رفض الاشتراك حالياً',
      }
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/subscriptions')
  revalidatePath('/dashboard/subscribe')

  return {
    success: true as const,
  }
}

export async function getAdminVideos() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { data, error } = await admin.supabase
    .from('videos')
    .select('id, title, youtube_url, thumbnail_url, order_index, is_active, created_at')
    .order('order_index', { ascending: true })

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل الفيديوهات حالياً',
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminVideoRow[],
  }
}

export async function createAdminVideo(input: {
  title: string
  youtubeUrl: string
  isActive: boolean
}) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const parsed = videoSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'بيانات الفيديو غير صحيحة',
    }
  }

  const { count } = await admin.supabase.from('videos').select('*', { count: 'exact', head: true })

  const { error } = await admin.supabase.from('videos').insert({
    title: parsed.data.title,
    youtube_url: parsed.data.youtubeUrl,
    thumbnail_url: getYoutubeThumbnail(parsed.data.youtubeUrl),
    order_index: (count ?? 0) + 1,
    is_active: parsed.data.isActive,
  })

  if (error) {
    return {
      success: false as const,
      error: 'تعذر إضافة الفيديو حالياً',
    }
  }

  revalidatePath('/admin/videos')
  revalidatePath('/dashboard/rate')

  return {
    success: true as const,
  }
}

export async function updateAdminVideo(input: {
  id: string
  title: string
  youtubeUrl: string
  isActive: boolean
}) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const parsed = videoSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'بيانات الفيديو غير صحيحة',
    }
  }

  const { error } = await admin.supabase
    .from('videos')
    .update({
      title: parsed.data.title,
      youtube_url: parsed.data.youtubeUrl,
      thumbnail_url: getYoutubeThumbnail(parsed.data.youtubeUrl),
      is_active: parsed.data.isActive,
    })
    .eq('id', input.id)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحديث الفيديو حالياً',
    }
  }

  revalidatePath('/admin/videos')
  revalidatePath('/dashboard/rate')

  return {
    success: true as const,
  }
}

export async function toggleAdminVideoStatus(input: { id: string; isActive: boolean }) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { error } = await admin.supabase
    .from('videos')
    .update({ is_active: input.isActive })
    .eq('id', input.id)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحديث حالة الفيديو حالياً',
    }
  }

  revalidatePath('/admin/videos')
  revalidatePath('/dashboard/rate')

  return {
    success: true as const,
  }
}

export async function deleteAdminVideo(input: { id: string }) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { error } = await admin.supabase.from('videos').delete().eq('id', input.id)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر حذف الفيديو حالياً',
    }
  }

  revalidatePath('/admin/videos')
  revalidatePath('/dashboard/rate')

  return {
    success: true as const,
  }
}

export async function getAdminPackages() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { data, error } = await admin.supabase
    .from('packages')
    .select('id, name, price_usdt, daily_earnings, duration_days, videos_per_day, is_active, created_at')
    .order('price_usdt', { ascending: true })

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل الباقات حالياً',
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminPackageRow[],
  }
}

export async function createAdminPackage(input: {
  name: string
  priceUsdt: number
  dailyEarnings: number
  durationDays: number
  videosPerDay: number
  isActive: boolean
}) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const parsed = packageSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'بيانات الباقة غير صحيحة',
    }
  }

  const { error } = await admin.supabase.from('packages').insert({
    name: parsed.data.name,
    price_usdt: parsed.data.priceUsdt,
    daily_earnings: parsed.data.dailyEarnings,
    duration_days: parsed.data.durationDays,
    videos_per_day: parsed.data.videosPerDay,
    is_active: parsed.data.isActive,
  })

  if (error) {
    if (error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
      return {
        success: false as const,
        error: 'اسم الباقة مستخدم مسبقاً',
      }
    }

    return {
      success: false as const,
      error: 'تعذر إضافة الباقة حالياً',
    }
  }

  revalidatePath('/admin/packages')
  revalidatePath('/dashboard/subscribe')

  return {
    success: true as const,
  }
}

export async function updateAdminPackage(input: {
  id: string
  name: string
  priceUsdt: number
  dailyEarnings: number
  durationDays: number
  videosPerDay: number
  isActive: boolean
}) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const parsed = packageSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'بيانات الباقة غير صحيحة',
    }
  }

  const { error } = await admin.supabase
    .from('packages')
    .update({
      name: parsed.data.name,
      price_usdt: parsed.data.priceUsdt,
      daily_earnings: parsed.data.dailyEarnings,
      duration_days: parsed.data.durationDays,
      videos_per_day: parsed.data.videosPerDay,
      is_active: parsed.data.isActive,
    })
    .eq('id', input.id)

  if (error) {
    if (error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
      return {
        success: false as const,
        error: 'اسم الباقة مستخدم مسبقاً',
      }
    }

    return {
      success: false as const,
      error: 'تعذر تحديث الباقة حالياً',
    }
  }

  revalidatePath('/admin/packages')
  revalidatePath('/dashboard/subscribe')

  return {
    success: true as const,
  }
}

export async function toggleAdminPackageStatus(input: { id: string; isActive: boolean }) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { error } = await admin.supabase
    .from('packages')
    .update({ is_active: input.isActive })
    .eq('id', input.id)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحديث حالة الباقة حالياً',
    }
  }

  revalidatePath('/admin/packages')
  revalidatePath('/dashboard/subscribe')

  return {
    success: true as const,
  }
}

export async function deleteAdminPackage(input: { id: string }) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { count: activeOrPendingCount } = await admin.supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('package_id', input.id)
    .in('status', ['pending', 'active'])

  if ((activeOrPendingCount ?? 0) > 0) {
    return {
      success: false as const,
      error: 'لا يمكن حذف الباقة لأنها مرتبطة باشتراكات نشطة أو معلقة',
    }
  }

  const { error } = await admin.supabase.from('packages').delete().eq('id', input.id)

  if (error) {
    if (error.code === '23503') {
      return {
        success: false as const,
        error: 'لا يمكن حذف الباقة لأنها مرتبطة باشتراكات سابقة. يمكنك تعطيلها بدلاً من الحذف',
      }
    }

    return {
      success: false as const,
      error: 'تعذر حذف الباقة حالياً',
    }
  }

  revalidatePath('/admin/packages')
  revalidatePath('/dashboard/subscribe')

  return {
    success: true as const,
  }
}
