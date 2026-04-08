"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getActiveSubscription, getPackageById, getTodayRatings, getLastRatingTime, getRatingsByUser } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Play, Clock, TrendingUp, ArrowRight, AlertCircle } from "lucide-react"
import type { UserSubscription, Package } from "@/lib/types"

function CountdownTimer({ targetTime }: { targetTime: Date }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    function updateTimer() {
      const now = new Date()
      const diff = targetTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("متاح الآن")
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [targetTime])

  return <span className={timeLeft === "متاح الآن" ? "text-primary" : ""}>{timeLeft}</span>
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [packageInfo, setPackageInfo] = useState<Package | null>(null)
  const [todayRatings, setTodayRatings] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [canRate, setCanRate] = useState(false)
  const [nextRatingTime, setNextRatingTime] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      const activeSub = getActiveSubscription(user.id)
      setSubscription(activeSub || null)

      if (activeSub) {
        const pkg = getPackageById(activeSub.packageId)
        setPackageInfo(pkg || null)
      }

      const todayRatingsCount = getTodayRatings(user.id).length
      setTodayRatings(todayRatingsCount)

      const allRatings = getRatingsByUser(user.id)
      const total = allRatings.reduce((sum, r) => sum + r.earned_usdt, 0)
      setTotalEarned(total)

      // Check if can rate (24h cooldown)
      const lastRating = getLastRatingTime(user.id)
      if (lastRating) {
        const nextAllowed = new Date(lastRating.getTime() + 24 * 60 * 60 * 1000)
        const now = new Date()
        setCanRate(now >= nextAllowed)
        setNextRatingTime(nextAllowed)
      } else {
        setCanRate(true)
        setNextRatingTime(null)
      }
    }
  }, [user])

  if (!user) return null

  const daysRemaining = subscription?.expiresAt 
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const progressPercent = packageInfo 
    ? ((packageInfo.duration_days - daysRemaining) / packageInfo.duration_days) * 100 
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">مرحباً بعودتك، {user.fullName.split(" ")[0]}</h1>
        <p className="text-muted-foreground">إليك ملخصاً سريعاً لأرباحك ونشاطك.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الرصيد</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${user.balance_usdt.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">متاح للسحب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">أرباحك الكلية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تقييمات اليوم</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayRatings}</div>
            <p className="text-xs text-muted-foreground">
              {packageInfo ? `من ${packageInfo.videos_per_day} فيديو` : "لا يوجد اشتراك نشط"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">التقييم القادم</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {canRate ? (
                <span className="text-primary">متاح الآن</span>
              ) : nextRatingTime ? (
                <CountdownTimer targetTime={nextRatingTime} />
              ) : (
                "غير متاح"
              )}
            </div>
            <p className="text-xs text-muted-foreground">فاصل 24 ساعة بين كل تقييم</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status */}
      {subscription && packageInfo ? (
        <Card>
          <CardHeader>
            <CardTitle>حالة الاشتراك</CardTitle>
            <CardDescription>
              باقة {packageInfo.name} - أرباح ${packageInfo.daily_earnings} يومياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">التقدم</span>
              <span>{packageInfo.duration_days - daysRemaining} من {packageInfo.duration_days} يوم</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                متبقي {daysRemaining} يوم
              </span>
              <span className="text-sm text-muted-foreground">
                ينتهي في: {new Date(subscription.expiresAt!).toLocaleDateString("ar-EG")}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <CardTitle>لا يوجد اشتراك نشط</CardTitle>
            </div>
            <CardDescription>
              اشترك في باقة لتبدأ الربح من تقييم الفيديوهات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/subscribe">
                عرض الباقات
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تقييم الفيديوهات</CardTitle>
            <CardDescription>
              اربح USDT عبر مشاهدة الفيديوهات وتقييمها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              disabled={!subscription || !canRate}
              asChild={subscription && canRate ? true : undefined}
            >
              {subscription && canRate ? (
                <Link href="/dashboard/rate">
                  ابدأ التقييم
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : !subscription ? (
                "اشترك أولاً"
              ) : (
                "انتظر انتهاء الفاصل"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">سحب الأرباح</CardTitle>
            <CardDescription>
              حوّل أرباحك إلى محفظتك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              disabled={user.balance_usdt < 5}
              asChild={user.balance_usdt >= 5 ? true : undefined}
            >
              {user.balance_usdt >= 5 ? (
                <Link href="/dashboard/withdraw">
                  طلب سحب
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                "الحد الأدنى 5$"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
