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
  is_banned: boolean
  created_at: string
}

export type AdminUserDetails = {
  profile: {
    id: string
    full_name: string | null
    email: string | null
    wallet_address: string | null
    balance_usdt: number
    is_admin: boolean
    is_banned: boolean
    created_at: string
  }
  totals: {
    totalRevenue: number
    totalDeposits: number
    totalRatingEarnings: number
    totalWithdrawnApproved: number
    pendingWithdrawalAmount: number
    ratingsCount: number
    subscriptionsCount: number
  }
  activity: {
    activeSubscription: {
      id: string
      package_name: string
      started_at: string | null
      expires_at: string | null
    } | null
    lastRatingAt: string | null
    lastWithdrawalAt: string | null
    lastDepositAt: string | null
  }
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

type AdminPaginationInput = {
  page?: number
  count?: number
}

type AdminSubscriptionsTab = 'pending' | 'active' | 'all'
type AdminSubscriptionsInput = AdminPaginationInput & {
  tab?: AdminSubscriptionsTab
}

type AdminPaginationMeta = {
  page: number
  count: number
  totalCount: number
  totalPages: number
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

function normalizePagination(input?: AdminPaginationInput) {
  const pageRaw = Number(input?.page ?? 1)
  const countRaw = Number(input?.count ?? 10)

  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1
  const count = Number.isFinite(countRaw)
    ? Math.max(5, Math.min(50, Math.floor(countRaw)))
    : 10

  const from = (page - 1) * count
  const to = from + count - 1

  return { page, count, from, to }
}

function buildPaginationMeta(page: number, count: number, totalCount: number): AdminPaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalCount / count))
  return {
    page: Math.min(page, totalPages),
    count,
    totalCount,
    totalPages,
  }
}

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

export async function getAdminUsers(input?: AdminPaginationInput) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { page, count, from, to } = normalizePagination(input)

  const { data, error, count: totalCount } = await admin.supabase
    .from('profiles')
    .select('id, full_name, email, wallet_address, balance_usdt, is_admin, is_banned, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل المستخدمين حالياً',
    }
  }

  const safeTotalCount = totalCount ?? 0
  const pagination = buildPaginationMeta(page, count, safeTotalCount)

  if (safeTotalCount > 0 && from >= safeTotalCount) {
    const fallbackFrom = (pagination.page - 1) * count
    const fallbackTo = fallbackFrom + count - 1
    const { data: fallbackData, error: fallbackError } = await admin.supabase
      .from('profiles')
      .select('id, full_name, email, wallet_address, balance_usdt, is_admin, is_banned, created_at')
      .order('created_at', { ascending: false })
      .range(fallbackFrom, fallbackTo)

    if (fallbackError) {
      return {
        success: false as const,
        error: 'تعذر تحميل المستخدمين حالياً',
      }
    }

    return {
      success: true as const,
      data: (fallbackData ?? []) as AdminUserRow[],
      ...pagination,
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminUserRow[],
    ...pagination,
  }
}

export async function setUserBanStatus(input: { userId: string; isBanned: boolean }) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { data: targetUser, error: targetError } = await admin.supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', input.userId)
    .maybeSingle()

  if (targetError || !targetUser) {
    return {
      success: false as const,
      error: 'تعذر العثور على المستخدم المطلوب',
    }
  }

  if (targetUser.is_admin) {
    return {
      success: false as const,
      error: 'لا يمكن حظر حساب إداري',
    }
  }

  if (admin.userId === input.userId) {
    return {
      success: false as const,
      error: 'لا يمكنك تغيير حالة حظرك بنفسك',
    }
  }

  const { error } = await admin.supabase
    .from('profiles')
    .update({ is_banned: input.isBanned })
    .eq('id', input.userId)

  if (error) {
    return {
      success: false as const,
      error: input.isBanned ? 'تعذر حظر المستخدم حالياً' : 'تعذر إلغاء حظر المستخدم حالياً',
    }
  }

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${input.userId}`)

  return {
    success: true as const,
  }
}

export async function getAdminUserDetails(userId: string) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const [
    { data: profile, error: profileError },
    { data: earningsRows, error: earningsError },
    { data: withdrawalsRows, error: withdrawalsError },
    { data: ratingsRows, error: ratingsError },
    { data: subscriptionsRows, error: subscriptionsError },
    { data: depositsRows, error: depositsError },
  ] = await Promise.all([
    admin.supabase
      .from('profiles')
      .select('id, full_name, email, wallet_address, balance_usdt, is_admin, is_banned, created_at')
      .eq('id', userId)
      .maybeSingle(),
    admin.supabase
      .from('earnings')
      .select('amount_usdt, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    admin.supabase
      .from('withdrawals')
      .select('amount_usdt, status, requested_at')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false }),
    admin.supabase
      .from('video_ratings')
      .select('id, rated_at')
      .eq('user_id', userId)
      .order('rated_at', { ascending: false }),
    admin.supabase
      .from('user_subscriptions')
      .select('id, status, started_at, expires_at, package:packages(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    admin.supabase
      .from('deposits')
      .select('amount_usdt, confirmed_at')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .order('confirmed_at', { ascending: false }),
  ])

  if (profileError || earningsError || withdrawalsError || ratingsError || subscriptionsError || depositsError) {
    return {
      success: false as const,
      error: 'تعذر تحميل تفاصيل المستخدم حالياً',
    }
  }

  if (!profile) {
    return {
      success: false as const,
      error: 'المستخدم غير موجود',
    }
  }

  const totalRevenue = (earningsRows ?? []).reduce(
    (sum, row) => sum + Number((row as { amount_usdt: number }).amount_usdt ?? 0),
    0
  )

  const totalDeposits = (depositsRows ?? []).reduce(
    (sum, row) => sum + Number((row as { amount_usdt: number }).amount_usdt ?? 0),
    0
  )

  const totalRatingEarnings = (earningsRows ?? [])
    .filter((row) => String((row as { source: string }).source ?? '') === 'rating')
    .reduce((sum, row) => sum + Number((row as { amount_usdt: number }).amount_usdt ?? 0), 0)

  const totalWithdrawnApproved = (withdrawalsRows ?? [])
    .filter((row) => String((row as { status: string }).status ?? '') === 'approved')
    .reduce((sum, row) => sum + Number((row as { amount_usdt: number }).amount_usdt ?? 0), 0)

  const pendingWithdrawalAmount = (withdrawalsRows ?? [])
    .filter((row) => String((row as { status: string }).status ?? '') === 'pending')
    .reduce((sum, row) => sum + Number((row as { amount_usdt: number }).amount_usdt ?? 0), 0)

  const activeSubscription = (subscriptionsRows ?? []).find((row) => {
    const status = String((row as { status: string }).status ?? '')
    const expiresAt = (row as { expires_at: string | null }).expires_at
    return status === 'active' && !!expiresAt && new Date(expiresAt) > new Date()
  }) as
    | {
        id: string
        started_at: string | null
        expires_at: string | null
        package: { name: string } | { name: string }[] | null
      }
    | undefined

  const packageValue = activeSubscription
    ? getProfileValue(activeSubscription.package as { name: string } | { name: string }[] | null)
    : null

  return {
    success: true as const,
    data: {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        wallet_address: profile.wallet_address,
        balance_usdt: Number(profile.balance_usdt ?? 0),
        is_admin: !!profile.is_admin,
        is_banned: !!profile.is_banned,
        created_at: profile.created_at,
      },
      totals: {
        totalRevenue,
        totalDeposits,
        totalRatingEarnings,
        totalWithdrawnApproved,
        pendingWithdrawalAmount,
        ratingsCount: (ratingsRows ?? []).length,
        subscriptionsCount: (subscriptionsRows ?? []).length,
      },
      activity: {
        activeSubscription: activeSubscription
          ? {
              id: activeSubscription.id,
              package_name: packageValue?.name ?? 'غير معروف',
              started_at: activeSubscription.started_at,
              expires_at: activeSubscription.expires_at,
            }
          : null,
        lastRatingAt: (ratingsRows?.[0] as { rated_at: string } | undefined)?.rated_at ?? null,
        lastWithdrawalAt:
          (withdrawalsRows?.[0] as { requested_at: string } | undefined)?.requested_at ?? null,
        lastDepositAt:
          (depositsRows?.[0] as { confirmed_at: string } | undefined)?.confirmed_at ?? null,
      },
    } as AdminUserDetails,
  }
}

export async function getAdminSubscriptions(input?: AdminSubscriptionsInput) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const tab: AdminSubscriptionsTab =
    input?.tab === 'pending' || input?.tab === 'active' || input?.tab === 'all'
      ? input.tab
      : 'all'
  const statusFilter = tab === 'all' ? null : tab
  const { page, count, from, to } = normalizePagination(input)

  let subscriptionsQuery = admin.supabase
    .from('user_subscriptions')
    .select(
      'id, user_id, package_id, tx_hash, status, started_at, expires_at, created_at, profile:profiles!user_subscriptions_user_id_fkey(full_name, email), package:packages!user_subscriptions_package_id_fkey(name, price_usdt, duration_days)',
      { count: 'exact' }
    )

  if (statusFilter) {
    subscriptionsQuery = subscriptionsQuery.eq('status', statusFilter)
  }

  const [
    { data, error, count: totalCount },
    { count: pendingCount },
    { count: activeCount },
    { count: allCount },
  ] = await Promise.all([
    subscriptionsQuery
      .order('created_at', { ascending: false })
      .range(from, to),
    admin.supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin.supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin.supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true }),
  ])

  const counts = {
    pendingCount: pendingCount ?? 0,
    activeCount: activeCount ?? 0,
    allCount: allCount ?? 0,
  }

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل بيانات الاشتراكات حالياً',
    }
  }

  const safeTotalCount = totalCount ?? 0
  const pagination = buildPaginationMeta(page, count, safeTotalCount)

  if (safeTotalCount > 0 && from >= safeTotalCount) {
    const fallbackFrom = (pagination.page - 1) * count
    const fallbackTo = fallbackFrom + count - 1

    let fallbackQuery = admin.supabase
      .from('user_subscriptions')
      .select(
        'id, user_id, package_id, tx_hash, status, started_at, expires_at, created_at, profile:profiles!user_subscriptions_user_id_fkey(full_name, email), package:packages!user_subscriptions_package_id_fkey(name, price_usdt, duration_days)'
      )

    if (statusFilter) {
      fallbackQuery = fallbackQuery.eq('status', statusFilter)
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery
      .order('created_at', { ascending: false })
      .range(fallbackFrom, fallbackTo)

    if (fallbackError) {
      return {
        success: false as const,
        error: 'تعذر تحميل بيانات الاشتراكات حالياً',
      }
    }

    return {
      success: true as const,
      data: (fallbackData ?? []) as AdminSubscriptionRow[],
      tab,
      ...counts,
      ...pagination,
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminSubscriptionRow[],
    tab,
    ...counts,
    ...pagination,
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

export async function getAdminVideos(input?: AdminPaginationInput) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { page, count, from, to } = normalizePagination(input)

  const { data, error, count: totalCount } = await admin.supabase
    .from('videos')
    .select('id, title, youtube_url, thumbnail_url, order_index, is_active, created_at', {
      count: 'exact',
    })
    .order('order_index', { ascending: true })
    .range(from, to)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل الفيديوهات حالياً',
    }
  }

  const safeTotalCount = totalCount ?? 0
  const pagination = buildPaginationMeta(page, count, safeTotalCount)

  if (safeTotalCount > 0 && from >= safeTotalCount) {
    const fallbackFrom = (pagination.page - 1) * count
    const fallbackTo = fallbackFrom + count - 1
    const { data: fallbackData, error: fallbackError } = await admin.supabase
      .from('videos')
      .select('id, title, youtube_url, thumbnail_url, order_index, is_active, created_at')
      .order('order_index', { ascending: true })
      .range(fallbackFrom, fallbackTo)

    if (fallbackError) {
      return {
        success: false as const,
        error: 'تعذر تحميل الفيديوهات حالياً',
      }
    }

    return {
      success: true as const,
      data: (fallbackData ?? []) as AdminVideoRow[],
      ...pagination,
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminVideoRow[],
    ...pagination,
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

export async function getAdminPackages(input?: AdminPaginationInput) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return {
      success: false as const,
      error: admin.error,
    }
  }

  const { page, count, from, to } = normalizePagination(input)

  const { data, error, count: totalCount } = await admin.supabase
    .from('packages')
    .select('id, name, price_usdt, daily_earnings, duration_days, videos_per_day, is_active, created_at', {
      count: 'exact',
    })
    .order('price_usdt', { ascending: true })
    .range(from, to)

  if (error) {
    return {
      success: false as const,
      error: 'تعذر تحميل الباقات حالياً',
    }
  }

  const safeTotalCount = totalCount ?? 0
  const pagination = buildPaginationMeta(page, count, safeTotalCount)

  if (safeTotalCount > 0 && from >= safeTotalCount) {
    const fallbackFrom = (pagination.page - 1) * count
    const fallbackTo = fallbackFrom + count - 1
    const { data: fallbackData, error: fallbackError } = await admin.supabase
      .from('packages')
      .select('id, name, price_usdt, daily_earnings, duration_days, videos_per_day, is_active, created_at')
      .order('price_usdt', { ascending: true })
      .range(fallbackFrom, fallbackTo)

    if (fallbackError) {
      return {
        success: false as const,
        error: 'تعذر تحميل الباقات حالياً',
      }
    }

    return {
      success: true as const,
      data: (fallbackData ?? []) as AdminPackageRow[],
      ...pagination,
    }
  }

  return {
    success: true as const,
    data: (data ?? []) as AdminPackageRow[],
    ...pagination,
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
