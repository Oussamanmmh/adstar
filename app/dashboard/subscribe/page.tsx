"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  getSubscriptionPageData,
  purchaseSubscriptionWithBalance,
} from "@/lib/actions/subscriptions-rating"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle, Clock } from "lucide-react"

type SubscriptionPackage = {
  id: string
  name: string
  price_usdt: number
  daily_earnings: number
  duration_days: number
  videos_per_day: number
}

type UserSubscription = {
  id: string
  package_id: string
  tx_hash: string | null
  status: "pending" | "active" | "expired"
  started_at: string | null
  expires_at: string | null
}

export default function SubscribePage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null)
  const [pendingSubscription, setPendingSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    void loadData()
  }, [user])

  if (!user) return null

  async function loadData() {
    setIsLoading(true)
    const result = await getSubscriptionPageData()

    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }

    setPackages(result.data.packages)
    setActiveSubscription(result.data.activeSubscription)
    setPendingSubscription(result.data.pendingSubscription)
    setIsLoading(false)
  }

  async function handleBuyPackage(pkg: SubscriptionPackage) {
    if (!user) return

    if (user.balance_usdt < pkg.price_usdt) {
      toast.error("رصيدك غير كاف لشراء هذه الباقة", {
        description: "يرجى شحن الرصيد أولاً عبر صفحة الإيداع.",
      })
      router.push("/dashboard/deposit")
      return
    }

    setIsSubmittingId(pkg.id)

    const result = await purchaseSubscriptionWithBalance({ packageId: pkg.id })

    if (!result.success) {
      toast.error(result.error)
      setIsSubmittingId(null)
      return
    }

    await Promise.all([refreshUser(), loadData()])
    setIsSubmittingId(null)

    toast.success("تم شراء الباقة بنجاح", {
      description: result.message,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى اللوحة
        </Link>

        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">جار تحميل بيانات الاشتراك...</CardContent>
        </Card>
      </div>
    )
  }

  const activePackage = activeSubscription
    ? packages.find((p) => p.id === activeSubscription.package_id)
    : null
  const pendingPackage = pendingSubscription
    ? packages.find((p) => p.id === pendingSubscription.package_id)
    : null
  const daysRemaining = activeSubscription?.expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activeSubscription.expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0

  const hasBlockedPurchase = !!activeSubscription || !!pendingSubscription

  return (
    <div className="space-y-6">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة إلى اللوحة
      </Link>

      {activeSubscription && (
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>اشتراك نشط</CardTitle>
            <CardDescription>
              أنت مشترك حالياً في باقة {activePackage?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-3xl font-bold">{daysRemaining} days</div>
              <div className="text-sm text-muted-foreground">متبقي</div>
            </div>
            <div className="text-sm text-muted-foreground">
              ينتهي في: {activeSubscription.expires_at ? new Date(activeSubscription.expires_at).toLocaleDateString("ar-EG") : "-"}
            </div>
          </CardContent>
        </Card>
      )}

      {!activeSubscription && pendingSubscription && (
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>بانتظار الموافقة</CardTitle>
            <CardDescription>
              اشتراكك في باقة {pendingPackage?.name} بانتظار موافقة الإدارة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-left">
              <div className="mb-1 text-xs text-muted-foreground">معرّف العملية</div>
              <div className="break-all font-mono text-sm">{pendingSubscription.tx_hash ?? pendingSubscription.id}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              عادة تتم مراجعة الدفعات خلال 24 ساعة، وسيصلك إشعار بعد الموافقة.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">اختر باقتك</h1>
        <p className="text-muted-foreground">اختر خطة الاشتراك المناسبة لتبدأ الربح</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id}
            className={pkg.price_usdt === 1500 ? "border-primary shadow-lg shadow-primary/10" : ""}
          >
            {pkg.price_usdt === 1500 && (
              <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 text-center">
                الأكثر شيوعاً
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{pkg.name}</CardTitle>
              <CardDescription>اشتراك لمدة {pkg.duration_days} يوم</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <span className="text-4xl font-bold">${pkg.price_usdt}</span>
                <span className="text-muted-foreground ml-1">USDT</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>ربح يومي ${pkg.daily_earnings}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>{pkg.videos_per_day} فيديو يومياً</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>حتى ${pkg.daily_earnings * pkg.duration_days} إجمالي</span>
                </div>
              </div>

              <Button 
                className="w-full"
                variant={pkg.price_usdt === 1500 ? "default" : "outline"}
                onClick={() => handleBuyPackage(pkg)}
                disabled={isSubmittingId === pkg.id || hasBlockedPurchase}
              >
                {isSubmittingId === pkg.id
                  ? "جارٍ الشراء..."
                  : activeSubscription
                    ? "لديك اشتراك نشط"
                    : pendingSubscription
                      ? "طلب قيد المراجعة"
                      : "اشترك الآن"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
