"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getDashboardData } from "@/lib/actions/subscriptions-rating"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, Play, Clock, TrendingUp, ArrowRight, AlertCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type UserSubscription = {
  id: string
  package_id: string
  status: "pending" | "active" | "expired"
  started_at: string | null
  expires_at: string | null
}

type PackageInfo = {
  id: string
  name: string
  daily_earnings: number
  duration_days: number
  videos_per_day: number
}

// Consolidated server state — one setState call instead of six
type DashboardData = {
  activeSubscription: UserSubscription | null
  packageInfo: PackageInfo | null
  todayRatingsCount: number
  totalEarned: number
  canRate: boolean
  nextRatingTime: Date | null
}

// ─── CountdownTimer ───────────────────────────────────────────────────────────
// Fix: clears the interval as soon as the countdown reaches zero instead of
// continuing to fire every second setting the same "متاح الآن" string.

function CountdownTimer({ targetTime }: { targetTime: Date }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    function tick() {
      const diff = targetTime.getTime() - Date.now()

      if (diff <= 0) {
        setTimeLeft("متاح الآن")
        clearInterval(id)
        return
      }

      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      )
    }

    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [targetTime])

  if (!timeLeft) return null

  return (
    <span className={timeLeft === "متاح الآن" ? "text-primary font-bold animate-pulse" : "font-mono"}>
      {timeLeft}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px] md:w-[350px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription card skeleton */}
      <Card className="border-border/50 bg-card/40">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-4 w-[220px]" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
          <div className="flex justify-between pt-2 border-t border-border/50">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        </CardContent>
      </Card>

      {/* Quick actions skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/40">
            <CardHeader>
              <Skeleton className="h-5 w-36 mb-1" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 1_000 * 60 * 60 * 24

/**
 * Derives elapsed/remaining from the same source (`started_at`) with the same
 * rounding direction so the two values always sum exactly to `duration_days`.
 *
 * Bug in original: elapsed = duration - Math.ceil(remaining) where remaining
 * was computed from `expires_at`. With 28.6 actual days left:
 *   Math.ceil(28.6) → 29  →  elapsed = 60 - 29 = 31   (UI showed "31 من 60")
 * but the "متبقي" label used the ceiled value directly:
 *   daysRemaining → 29                                  (UI showed "متبقي 29")
 * Both numbers use different rounding on the same fractional day, causing the
 * apparent contradiction. The fix uses Math.floor on elapsed from started_at.
 */
function computeDays(
  subscription: UserSubscription | null,
  packageInfo: PackageInfo | null,
): { daysElapsed: number; daysRemaining: number; progressPercent: number } {
  if (!subscription?.started_at || !packageInfo) {
    return { daysElapsed: 0, daysRemaining: 0, progressPercent: 0 }
  }

  const daysElapsed = Math.min(
    packageInfo.duration_days,
    Math.floor((Date.now() - new Date(subscription.started_at).getTime()) / DAY_MS),
  )
  const daysRemaining = packageInfo.duration_days - daysElapsed
  const progressPercent = (daysElapsed / packageInfo.duration_days) * 100

  return { daysElapsed, daysRemaining, progressPercent }
}

// ─── Main page ────────────────────────────────────────────────────────────────

const glassCardClass =
  "border-border/30 bg-card/60 backdrop-blur-xl shadow-lg transition-all hover:bg-card/80"

export default function DashboardPage() {
  const { user } = useAuth()
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [data, setData] = useState<DashboardData>({
    activeSubscription: null,
    packageInfo: null,
    todayRatingsCount: 0,
    totalEarned: 0,
    canRate: false,
    nextRatingTime: null,
  })

  // ── Data loading — single setState eliminates 6 cascading renders ──────────

  const loadDashboardData = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const result = await getDashboardData()

      if (!result.success) {
        toast.error("حدث خطأ أثناء تحميل بيانات لوحة التحكم")
        return
      }

      const d = result.data
      setData({
        activeSubscription: d.activeSubscription,
        packageInfo: d.packageInfo,
        todayRatingsCount: d.todayRatingsCount,
        totalEarned: d.totalEarned,
        canRate: d.canRate,
        nextRatingTime: d.nextRatingTime ? new Date(d.nextRatingTime) : null,
      })
    } catch {
      toast.error("تعذر الاتصال بالخادم")
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadDashboardData()
  }, [user, loadDashboardData])

  // ── Memoized derived values ────────────────────────────────────────────────

  const { daysElapsed, daysRemaining, progressPercent } = useMemo(
    () => computeDays(data.activeSubscription, data.packageInfo),
    [data.activeSubscription, data.packageInfo],
  )

  const firstName = useMemo(() => user?.fullName?.split(" ")[0] ?? "", [user?.fullName])

  const expiryLabel = useMemo(
    () =>
      data.activeSubscription?.expires_at
        ? new Date(data.activeSubscription.expires_at).toLocaleDateString("ar-EG")
        : "—",
    [data.activeSubscription?.expires_at],
  )

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!user || isLoadingData) return <DashboardSkeleton />

  const { activeSubscription, packageInfo, todayRatingsCount, totalEarned, canRate, nextRatingTime } =
    data

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
          مرحباً بعودتك، {firstName}
        </h1>
        <p className="text-muted-foreground mt-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          إليك ملخصاً سريعاً لأرباحك ونشاطك.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={glassCardClass}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الرصيد</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${user.balance_usdt.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">متاح للسحب</p>
          </CardContent>
        </Card>

        <Card className={glassCardClass}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">أرباحك الكلية</p>
          </CardContent>
        </Card>

        <Card className={glassCardClass}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تقييمات اليوم</CardTitle>
            <div className="p-2 bg-accent/10 rounded-lg">
              <Play className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayRatingsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {packageInfo ? `من ${packageInfo.videos_per_day} فيديو` : "لا يوجد اشتراك نشط"}
            </p>
          </CardContent>
        </Card>

        <Card className={glassCardClass}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">التقييم القادم</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">
              {canRate ? (
                <span className="text-primary flex items-center gap-2">
                  <span className="relative flex h-3 w-3 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                  متاح الآن
                </span>
              ) : nextRatingTime ? (
                <CountdownTimer targetTime={nextRatingTime} />
              ) : (
                <span className="text-muted-foreground text-xl">غير متاح</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">فاصل 24 ساعة بين كل تقييم</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription status */}
      {activeSubscription && packageInfo ? (
        <Card className={glassCardClass}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">حالة الاشتراك</CardTitle>
                <CardDescription className="mt-1">
                  باقة {packageInfo.name} ·{" "}
                  <span className="text-primary font-semibold">${packageInfo.daily_earnings}</span>{" "}
                  ربح يومي
                </CardDescription>
              </div>
              <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold whitespace-nowrap">
                نشط
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-foreground">التقدم</span>
                {/* FIX: both numbers derived from the same daysElapsed so they  */}
                {/* always satisfy: elapsed + remaining === duration_days        */}
                <span className="text-primary">
                  {daysElapsed} من {packageInfo.duration_days} يوم
                </span>
              </div>
              <Progress value={progressPercent} className="h-3 bg-muted/50" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-sm font-medium">متبقي {daysRemaining} يوم</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                ينتهي في: {expiryLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/30 bg-primary/5 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">لا يوجد اشتراك نشط</CardTitle>
                <CardDescription className="text-base mt-1">
                  اشترك في باقة لتبدأ الربح من تقييم الفيديوهات يومياً
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full sm:w-auto font-bold shadow-lg shadow-primary/20">
              <Link href="/dashboard/subscribe">
                عرض الباقات المميزة
                <ArrowRight className="mr-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-lg">تقييم الفيديوهات</CardTitle>
            <CardDescription>اربح USDT عبر مشاهدة الفيديوهات وتقييمها</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full font-bold text-white"
              size="lg"
              disabled={!activeSubscription || !canRate}
              asChild={activeSubscription !== null && canRate ? true : undefined}
            >
              {activeSubscription && canRate ? (
                <Link href="/dashboard/rate">
                  <Play className="ml-2 h-4 w-4 fill-current" />
                  ابدأ التقييم الآن
                </Link>
              ) : !activeSubscription ? (
                "اشترك أولاً لتبدأ"
              ) : (
                "انتظر انتهاء الفاصل الزمني"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-lg">سحب الأرباح</CardTitle>
            <CardDescription>حوّل أرباحك مباشرة إلى محفظتك الرقمية</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={user.balance_usdt >= 5 ? "default" : "secondary"}
              size="lg"
              className="w-full font-bold"
              disabled={user.balance_usdt < 5}
              asChild={user.balance_usdt >= 5 ? true : undefined}
            >
              {user.balance_usdt >= 5 ? (
                <Link href="/dashboard/withdraw" className="text-white">
                  طلب سحب الأرباح
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Link>
              ) : (
                "الحد الأدنى للسحب 5$"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}