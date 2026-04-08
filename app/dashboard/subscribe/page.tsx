"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { 
  getPackages, 
  getActiveSubscription, 
  getPendingSubscriptions,
  createSubscription 
} from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle, Clock, Copy, AlertCircle } from "lucide-react"
import type { Package, UserSubscription } from "@/lib/types"

const PAYMENT_WALLET = "TXxxxxxxxxxxxxxxxxxxxxxxxxxxx" // Demo wallet address

export default function SubscribePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null)
  const [pendingSubscription, setPendingSubscription] = useState<UserSubscription | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [txHash, setTxHash] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  useEffect(() => {
    if (!user) return

    const pkgs = getPackages()
    setPackages(pkgs.filter(p => p.isActive))

    const activeSub = getActiveSubscription(user.id)
    setActiveSubscription(activeSub || null)

    const pendingSubs = getPendingSubscriptions().filter(s => s.userId === user.id)
    setPendingSubscription(pendingSubs[0] || null)
  }, [user])

  if (!user) return null

  function handleSelectPackage(pkg: Package) {
    setSelectedPackage(pkg)
    setShowPaymentDialog(true)
    setTxHash("")
  }

  function copyWalletAddress() {
    navigator.clipboard.writeText(PAYMENT_WALLET)
    toast.success("تم نسخ عنوان المحفظة")
  }

  function handleSubmitPayment() {
    if (!selectedPackage || !txHash.trim()) {
      toast.error("يرجى إدخال معرّف العملية")
      return
    }

    setIsSubmitting(true)

    // Create pending subscription
    createSubscription({
      userId: user.id,
      packageId: selectedPackage.id,
      txHash: txHash.trim(),
      status: "pending",
    })

    toast.success("تم إرسال الدفع بنجاح", {
      description: "اشتراكك الآن بانتظار موافقة الإدارة.",
    })

    setShowPaymentDialog(false)
    setSelectedPackage(null)
    setTxHash("")
    setIsSubmitting(false)

    // Refresh pending status
    const pendingSubs = getPendingSubscriptions().filter(s => s.userId === user.id)
    setPendingSubscription(pendingSubs[0] || null)
  }

  // Has active subscription
  if (activeSubscription) {
    const pkg = packages.find(p => p.id === activeSubscription.packageId)
    const daysRemaining = activeSubscription.expiresAt
      ? Math.max(0, Math.ceil((new Date(activeSubscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0

    return (
      <div className="space-y-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى اللوحة
        </Link>

        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>اشتراك نشط</CardTitle>
            <CardDescription>
              أنت مشترك حالياً في باقة {pkg?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold">{daysRemaining} days</div>
              <div className="text-sm text-muted-foreground">متبقي</div>
            </div>
            <div className="text-sm text-muted-foreground">
              ينتهي في: {new Date(activeSubscription.expiresAt!).toLocaleDateString("ar-EG")}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Has pending subscription
  if (pendingSubscription) {
    const pkg = packages.find(p => p.id === pendingSubscription.packageId)

    return (
      <div className="space-y-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى اللوحة
        </Link>

        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>بانتظار الموافقة</CardTitle>
            <CardDescription>
              اشتراكك في باقة {pkg?.name} بانتظار موافقة الإدارة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-left">
              <div className="text-xs text-muted-foreground mb-1">معرّف العملية</div>
              <div className="font-mono text-sm break-all">{pendingSubscription.txHash}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              عادة تتم مراجعة الدفعات خلال 24 ساعة، وسيصلك إشعار بعد الموافقة.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة إلى اللوحة
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">اختر باقتك</h1>
        <p className="text-muted-foreground">اختر خطة الاشتراك المناسبة لتبدأ الربح</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id}
            className={pkg.name === "Standard" ? "border-primary shadow-lg shadow-primary/10" : ""}
          >
            {pkg.name === "Standard" && (
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
                variant={pkg.name === "Standard" ? "default" : "outline"}
                onClick={() => handleSelectPackage(pkg)}
              >
                اشترك الآن
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إكمال الدفع</DialogTitle>
            <DialogDescription>
              أرسل {selectedPackage?.price_usdt} USDT عبر شبكة TRC20 لإكمال الاشتراك
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="text-sm text-muted-foreground">أرسل المبلغ التالي بالضبط:</div>
              <div className="text-3xl font-bold text-primary">
                ${selectedPackage?.price_usdt} USDT
              </div>
              <div className="text-xs text-muted-foreground">شبكة TRC20 فقط</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">عنوان محفظة الدفع</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 rounded bg-muted text-xs break-all">
                  {PAYMENT_WALLET}
                </code>
                <Button size="icon" variant="outline" onClick={copyWalletAddress}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-sm text-destructive">
                أرسل USDT عبر TRC20 فقط. أي شبكة أو عملة أخرى قد تضيع.
              </div>
            </div>

            <Field>
              <FieldLabel>معرّف العملية (TxID)</FieldLabel>
              <Input
                placeholder="أدخل معرّف العملية"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
            </Field>

            <Button 
              className="w-full" 
              onClick={handleSubmitPayment}
              disabled={!txHash.trim() || isSubmitting}
            >
              {isSubmitting ? "جارٍ الإرسال..." : "إرسال الدفع"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
