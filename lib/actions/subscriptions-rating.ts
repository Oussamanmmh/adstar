'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

type DbPackage = {
  id: string
  name: string
  price_usdt: number
  daily_earnings: number
  duration_days: number
  is_active: boolean
  videos_per_day: number | null
}

type DbSubscription = {
  id: string
  package_id: string
  tx_hash: string | null
  status: 'pending' | 'active' | 'expired'
  started_at: string | null
  expires_at: string | null
  created_at: string
}

type DbVideo = {
  id: string
  title: string
  youtube_url: string
  thumbnail_url: string | null
  order_index: number
  is_active: boolean
}

type DbVideoRating = {
  id: string
  video_id: string
  rating: number
  earned_usdt: number
  rated_at: string
}

const purchaseSchema = z.object({
  packageId: z.string().uuid('معرف الباقة غير صالح'),
})

const ratingSchema = z.object({
  videoId: z.string().uuid('معرف الفيديو غير صالح'),
  rating: z.number().int().min(1).max(5),
})

function mapPurchaseError(message: string): string {
  if (message.includes('insufficient balance')) {
    return 'رصيدك غير كاف لشراء هذه الباقة'
  }

  if (message.includes('already has an active subscription')) {
    return 'لديك اشتراك نشط بالفعل'
  }

  if (message.includes('pending subscription request exists')) {
    return 'لديك طلب اشتراك معلق بالفعل'
  }

  if (message.includes('package not found') || message.includes('package is not active')) {
    return 'الباقة غير متاحة حالياً'
  }

  return 'تعذر إتمام عملية الاشتراك حالياً'
}

function mapRatingError(message: string): string {
  if (message.includes('subscription required')) {
    return 'يجب أن يكون لديك اشتراك نشط للتقييم'
  }

  if (message.includes('video is not available')) {
    return 'الفيديو غير متاح للتقييم حالياً'
  }

  if (message.includes('you can rate only one video every 24 hours') || message.includes('one video every 24 hours')) {
    return 'يمكنك تقييم فيديو واحد فقط كل 24 ساعة'
  }

  return 'تعذر إرسال التقييم حالياً'
}

function normalizeVideosPerDay(videosPerDay: number | null | undefined): number {
  if (!videosPerDay || videosPerDay < 1) return 1
  return Math.floor(videosPerDay)
}

export async function getSubscriptionPageData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولاً',
    }
  }

  const [{ data: packages, error: packagesError }, { data: subscriptions, error: subscriptionsError }] =
    await Promise.all([
      supabase
        .from('packages')
        .select('id, name, price_usdt, daily_earnings, duration_days, is_active, videos_per_day')
        .eq('is_active', true)
        .order('price_usdt', { ascending: true }),
      supabase
        .from('user_subscriptions')
        .select('id, package_id, tx_hash, status, started_at, expires_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  if (packagesError || subscriptionsError) {
    return {
      success: false as const,
      error: 'تعذر تحميل بيانات الاشتراك حالياً',
    }
  }

  const subscriptionRows = (subscriptions ?? []) as DbSubscription[]

  const activeSubscription =
    subscriptionRows.find(
      (row) => row.status === 'active' && !!row.expires_at && new Date(row.expires_at) > new Date()
    ) ?? null

  const pendingSubscription = subscriptionRows.find((row) => row.status === 'pending') ?? null

  return {
    success: true as const,
    data: {
      packages: ((packages ?? []) as DbPackage[]).map((pkg) => ({
        ...pkg,
        videos_per_day: normalizeVideosPerDay(pkg.videos_per_day),
      })),
      activeSubscription,
      pendingSubscription,
    },
  }
}

export async function purchaseSubscriptionWithBalance(input: { packageId: string }) {
  const parsed = purchaseSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'البيانات غير صحيحة',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولاً',
    }
  }

  const { error } = await supabase.rpc('purchase_subscription_with_balance', {
    p_package_id: parsed.data.packageId,
  })

  if (error) {
    return {
      success: false as const,
      error: mapPurchaseError(error.message.toLowerCase()),
    }
  }

  return {
    success: true as const,
    message: 'تم تفعيل الاشتراك وخصم قيمة الباقة من الرصيد بنجاح',
  }
}

export async function getRatePageData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولاً',
    }
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    { data: subscriptions, error: subscriptionsError },
    { data: videos, error: videosError },
    { data: todayRatings, error: todayRatingsError },
    { data: lastRating, error: lastRatingError },
    { data: earningsRows, error: earningsError },
  ] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select(
        'id, package_id, status, started_at, expires_at, package:packages(id, name, daily_earnings, duration_days, videos_per_day)'
      )
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('videos')
      .select('id, title, youtube_url, thumbnail_url, order_index, is_active')
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    supabase
      .from('video_ratings')
      .select('id, video_id, rating, earned_usdt, rated_at')
      .eq('user_id', user.id)
      .gte('rated_at', startOfToday.toISOString())
      .order('rated_at', { ascending: false }),
    supabase
      .from('video_ratings')
      .select('rated_at')
      .eq('user_id', user.id)
      .order('rated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('earnings').select('amount_usdt').eq('user_id', user.id),
  ])

  if (subscriptionsError || videosError || todayRatingsError || lastRatingError || earningsError) {
    return {
      success: false as const,
      error: 'تعذر تحميل بيانات التقييم حالياً',
    }
  }

  const activeSubscription = subscriptions?.[0] ?? null
  const packageValue = Array.isArray(activeSubscription?.package)
    ? activeSubscription?.package[0]
    : activeSubscription?.package

  const packageInfo = packageValue
    ? {
        id: packageValue.id,
        name: packageValue.name,
        daily_earnings: Number(packageValue.daily_earnings ?? 0),
        duration_days: Number(packageValue.duration_days ?? 0),
        videos_per_day: normalizeVideosPerDay(packageValue.videos_per_day),
      }
    : null

  const lastRatedAt = lastRating?.rated_at ?? null
  const nextRatingTime = lastRatedAt
    ? new Date(new Date(lastRatedAt).getTime() + 24 * 60 * 60 * 1000)
    : null

  const canRate = !nextRatingTime || new Date() >= nextRatingTime

  const ratingRows = (todayRatings ?? []) as DbVideoRating[]
  const earnedToday = ratingRows.reduce((sum, row) => sum + Number(row.earned_usdt ?? 0), 0)

  const totalEarned = (earningsRows ?? []).reduce(
    (sum, row) => sum + Number((row as { amount_usdt: number }).amount_usdt ?? 0),
    0
  )

  return {
    success: true as const,
    data: {
      activeSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            package_id: activeSubscription.package_id,
            status: activeSubscription.status,
            started_at: activeSubscription.started_at,
            expires_at: activeSubscription.expires_at,
          }
        : null,
      packageInfo,
      videos: (videos ?? []) as DbVideo[],
      todayRatings: ratingRows,
      earnedToday,
      totalEarned,
      canRate,
      nextRatingTime: nextRatingTime ? nextRatingTime.toISOString() : null,
    },
  }
}

export async function submitVideoRating(input: { videoId: string; rating: number }) {
  const parsed = ratingSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'البيانات غير صحيحة',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false as const,
      error: 'يرجى تسجيل الدخول أولاً',
    }
  }

  const { data, error } = await supabase.rpc('submit_video_rating', {
    p_video_id: parsed.data.videoId,
    p_rating: parsed.data.rating,
  })

  if (error) {
    return {
      success: false as const,
      error: mapRatingError(error.message.toLowerCase()),
    }
  }

  const payload = data as { earned_usdt?: number } | null

  return {
    success: true as const,
    earned: Number(payload?.earned_usdt ?? 0),
  }
}

export async function getDashboardData() {
  const result = await getRatePageData()

  if (!result.success) {
    return result
  }

  return {
    success: true as const,
    data: {
      activeSubscription: result.data.activeSubscription,
      packageInfo: result.data.packageInfo,
      todayRatingsCount: result.data.todayRatings.length,
      totalEarned: result.data.totalEarned,
      canRate: result.data.canRate,
      nextRatingTime: result.data.nextRatingTime,
    },
  }
}
