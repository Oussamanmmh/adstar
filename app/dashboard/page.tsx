"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getDashboardData } from "@/lib/actions/subscriptions-rating"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, Play, Clock, TrendingUp, ArrowRight, AlertCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"

// Types remain the same
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

  return <span className={timeLeft === "متاح الآن" ? "text-primary font-bold animate-pulse" : "font-mono"}>{timeLeft}</span>
}

// 1. Dedicated Skeleton Component for seamless UX
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px] md:w-[350px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50 bg-card/40 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/40 backdrop-blur-md">
        <CardHeader>
          <Skeleton className="h-6 w-[150px] mb-2" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null)
  const [todayRatings, setTodayRatings] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [canRate, setCanRate] = useState(false)
  const [nextRatingTime, setNextRatingTime] = useState<Date | null>(null)

  useEffect(() => {
    if (!user) return
    void loadDashboardData()
  }, [user])

  async function loadDashboardData() {
    setIsLoadingData(true)
    try {
      const result = await getDashboardData()

      if (!result.success) {
        toast.error("حدث خطأ أثناء تحميل بيانات لوحة التحكم")
        return
      }

      setSubscription(result.data.activeSubscription)
      setPackageInfo(result.data.packageInfo)
      setTodayRatings(result.data.todayRatingsCount)
      setTotalEarned(result.data.totalEarned)
      setCanRate(result.data.canRate)
      setNextRatingTime(result.data.nextRatingTime ? new Date(result.data.nextRatingTime) : null)
    } catch (error) {
      toast.error("تعذر الاتصال بالخادم")
    } finally {
      setIsLoadingData(false)
    }
  }

  // 2. Handle initial auth loading vs data loading
  if (!user || isLoadingData) return <DashboardSkeleton />

  const daysRemaining = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const progressPercent = packageInfo 
    ? ((packageInfo.duration_days - daysRemaining) / packageInfo.duration_days) * 100 
    : 0

  // 3. Glassmorphism base class for consistent modern styling
  const glassCardClass = "border-border/30 bg-card/60 backdrop-blur-xl shadow-lg transition-all hover:bg-card/80"

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
          مرحباً بعودتك، {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          إليك ملخصاً سريعاً لأرباحك ونشاطك.
        </p>
      </div>

      {/* Stats Grid */}
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
            <div className="text-3xl font-bold">{todayRatings}</div>
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
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
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

      {/* Subscription Status */}
      {subscription && packageInfo ? (
        <Card className={glassCardClass}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">حالة الاشتراك</CardTitle>
                <CardDescription className="mt-1">
                  باقة {packageInfo.name} - أرباح <span className="text-primary font-semibold">${packageInfo.daily_earnings}</span> يومياً
                </CardDescription>
              </div>
              <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">
                نشط
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-foreground">التقدم</span>
                <span className="text-primary">{packageInfo.duration_days - daysRemaining} من {packageInfo.duration_days} يوم</span>
              </div>
              <Progress value={progressPercent} className="h-3 bg-muted/50" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-sm font-medium">
                متبقي {daysRemaining} يوم
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ينتهي في: {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString("ar-EG") : "-"}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/30 bg-primary/5 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
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

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-lg">تقييم الفيديوهات</CardTitle>
            <CardDescription>
              اربح USDT عبر مشاهدة الفيديوهات وتقييمها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full font-bold transition-all text-white" 
              size="lg"
              disabled={!subscription || !canRate}
              asChild={subscription && canRate ? true : undefined}
            >
              {subscription && canRate ? (
                <Link href="/dashboard/rate" >
                  <Play className="ml-2 h-4 w-4 fill-current" />
                  ابدأ التقييم الآن
                </Link>
              ) : !subscription ? (
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
            <CardDescription>
              حوّل أرباحك مباشرة إلى محفظتك الرقمية
            </CardDescription>
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