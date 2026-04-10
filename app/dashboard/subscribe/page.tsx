"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  getSubscriptionPageData,
  purchaseSubscriptionWithBalance,
} from "@/lib/actions/subscriptions-rating"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowRight, CheckCircle, Clock } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type SubscriptionPackage = {
  id: string
  name: string
  price_usdt: number
  daily_earnings: number
  duration_days: number
  videos_per_day: number
  is_featured?: boolean
}

type UserSubscription = {
  id: string
  package_id: string
  tx_hash: string | null
  status: "pending" | "active" | "expired"
  started_at: string | null
  expires_at: string | null
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SubscribePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-5 w-36" />

      {/* Status card skeleton */}
      <Card className="max-w-md">
        <CardHeader className="items-center text-center space-y-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </CardContent>
      </Card>

      {/* Page heading */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Package cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="text-center space-y-2">
              <Skeleton className="h-7 w-32 mx-auto" />
              <Skeleton className="h-4 w-28 mx-auto" />
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {/* Price */}
              <Skeleton className="h-10 w-24 mx-auto" />
              {/* Feature list */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-40 mx-auto" />
                <Skeleton className="h-4 w-36 mx-auto" />
                <Skeleton className="h-4 w-44 mx-auto" />
              </div>
              {/* Button */}
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Active subscription card ─────────────────────────────────────────────────

function ActiveSubscriptionCard({
  subscription,
  packageName,
  daysRemaining,
}: {
  subscription: UserSubscription
  packageName: string
  daysRemaining: number
}) {
  const expiryLabel = subscription.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString("ar-EG")
    : "—"

  return (
    <Card className="max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>اشتراك نشط</CardTitle>
        <CardDescription>أنت مشترك حالياً في باقة {packageName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="text-3xl font-bold">{daysRemaining}</div>
          <div className="text-sm text-muted-foreground">يوم متبقي</div>
        </div>
        <p className="text-sm text-muted-foreground">ينتهي في: {expiryLabel}</p>
      </CardContent>
    </Card>
  )
}

// ─── Pending subscription card ────────────────────────────────────────────────

function PendingSubscriptionCard({
  subscription,
  packageName,
}: {
  subscription: UserSubscription
  packageName: string
}) {
  return (
    <Card className="max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>بانتظار الموافقة</CardTitle>
        <CardDescription>
          اشتراكك في باقة {packageName} بانتظار موافقة الإدارة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4 text-right" dir="ltr">
          <div className="mb-1 text-xs text-muted-foreground text-left">معرّف العملية</div>
          <div className="break-all font-mono text-sm">
            {subscription.tx_hash ?? subscription.id}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          عادةً تتم مراجعة الدفعات خلال 24 ساعة، وسيصلك إشعار بعد الموافقة.
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Package card ─────────────────────────────────────────────────────────────

function PackageCard({
  pkg,
  isSubmitting,
  hasBlockedPurchase,
  activeSubscription,
  pendingSubscription,
  onBuy,
}: {
  pkg: SubscriptionPackage
  isSubmitting: boolean
  hasBlockedPurchase: boolean
  activeSubscription: UserSubscription | null
  pendingSubscription: UserSubscription | null
  onBuy: (pkg: SubscriptionPackage) => void
}) {
  const isFeatured = pkg.is_featured ?? pkg.price_usdt === 1500
  const totalEarnings = pkg.daily_earnings * pkg.duration_days

  const buttonLabel = isSubmitting
    ? "جارٍ الشراء..."
    : activeSubscription
    ? "لديك اشتراك نشط"
    : pendingSubscription
    ? "طلب قيد المراجعة"
    : "اشترك الآن"

  return (
    <Card className={isFeatured ? "border-primary shadow-lg shadow-primary/10" : ""}>
      {isFeatured && (
        <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 text-center rounded-t-[calc(var(--radius)-1px)]">
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
          <span className="text-muted-foreground mr-1">USDT</span>
        </div>

        <ul className="space-y-3 text-sm" aria-label="مميزات الباقة">
          <li className="flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
            <span>ربح يومي ${pkg.daily_earnings}</span>
          </li>
          <li className="flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
            <span>{pkg.videos_per_day} فيديو يومياً</span>
          </li>
          <li className="flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
            <span>حتى ${totalEarnings} إجمالي</span>
          </li>
        </ul>

        <Button
          className="w-full"
          variant={isFeatured ? "default" : "outline"}
          onClick={() => onBuy(pkg)}
          disabled={isSubmitting || hasBlockedPurchase}
          aria-busy={isSubmitting}
        >
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubscribePage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()

  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null)
  const [pendingSubscription, setPendingSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null)

  // ── Memoized derived values ──────────────────────────────────────────────────

  const activePackage = useMemo(
    () => (activeSubscription ? packages.find((p) => p.id === activeSubscription.package_id) : null),
    [activeSubscription, packages],
  )

  const pendingPackage = useMemo(
    () => (pendingSubscription ? packages.find((p) => p.id === pendingSubscription.package_id) : null),
    [pendingSubscription, packages],
  )

  // FIX: derive from started_at with Math.floor so the displayed value matches
  // what the dashboard shows. Using Math.ceil on expires_at caused a ~1-day
  // discrepancy: ceil(28.6) = 29 while the dashboard floor-computed 31 elapsed
  // from started_at, making the two pages show contradictory remaining days.
  const daysRemaining = useMemo(() => {
    if (!activeSubscription?.started_at || !activePackage) return 0
    const daysElapsed = Math.min(
      activePackage.duration_days,
      Math.floor(
        (Date.now() - new Date(activeSubscription.started_at).getTime()) / (1000 * 60 * 60 * 24),
      ),
    )
    return activePackage.duration_days - daysElapsed
  }, [activeSubscription, activePackage])

  const hasBlockedPurchase = useMemo(
    () => !!activeSubscription || !!pendingSubscription,
    [activeSubscription, pendingSubscription],
  )

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user, loadData])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleBuyPackage = useCallback(
    async (pkg: SubscriptionPackage) => {
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
      toast.success("تم شراء الباقة بنجاح", { description: result.message })
    },
    [user, router, refreshUser, loadData],
  )

  // ── Guards ────────────────────────────────────────────────────────────────────

  if (!user) return null
  if (isLoading) return <SubscribePageSkeleton />

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى اللوحة
      </Link>

      {activeSubscription && activePackage && (
        <ActiveSubscriptionCard
          subscription={activeSubscription}
          packageName={activePackage.name}
          daysRemaining={daysRemaining}
        />
      )}

      {!activeSubscription && pendingSubscription && pendingPackage && (
        <PendingSubscriptionCard
          subscription={pendingSubscription}
          packageName={pendingPackage.name}
        />
      )}

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">اختر باقتك</h1>
        <p className="text-muted-foreground">اختر خطة الاشتراك المناسبة لتبدأ الربح</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            isSubmitting={isSubmittingId === pkg.id}
            hasBlockedPurchase={hasBlockedPurchase}
            activeSubscription={activeSubscription}
            pendingSubscription={pendingSubscription}
            onBuy={handleBuyPackage}
          />
        ))}
      </div>
    </div>
  )
}