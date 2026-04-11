"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Copy,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  ChevronLeft,
  Loader2,
} from "lucide-react"
import type { Network } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// ─── Network config (client-safe — only public env vars) ─────────────────────

const NETWORK_CONFIG = {
  trc20: {
    name: "TRC20",
    fullName: "USDT — TRC20",
    label: "شبكة ترون (TRON)",
    accentClass: "text-red-400",
    bgClass: "bg-red-400/10",
    borderClass: "border-red-400/30",
    warnings: [
      "أرسل USDT فقط عبر شبكة TRC20",
      "لا ترسل TRX أو عملات أخرى",
      "الحد الأدنى للإيداع: 1 USDT",
    ],
  },
  bep20: {
    name: "BEP20",
    fullName: "USDT — BEP20",
    label: "شبكة BNB Smart Chain",
    accentClass: "text-yellow-400",
    bgClass: "bg-yellow-400/10",
    borderClass: "border-yellow-400/30",
    warnings: [
      "أرسل USDT فقط عبر شبكة BEP20 (BSC)",
      "لا ترسل عبر شبكة ETH أو غيرها",
      "الحد الأدنى للإيداع: 1 USDT",
    ],
  },
} as const

type Step = "address" | "waiting" | "success" | "failed"

// ─── QR Code image (uses free qrserver.com API, no pkg needed) ───────────────
function QRCode({ address, size = 180 }: { address: string; size?: number }) {
  const [loaded, setLoaded] = useState(false)
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(address)}&bgcolor=13131A&color=FFFFFF&margin=10`

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-border"
      style={{ width: size, height: size }}
    >
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-2xl" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="QR Code للعنوان"
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function NetworkDepositPage() {
  const params = useParams()
  const router = useRouter()
  const networkId = params.network as Network
  const supabase = getSupabaseBrowserClient()

  const config = NETWORK_CONFIG[networkId]

  const [step, setStep] = useState<Step>("address")
  const [userId, setUserId] = useState<string | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const [paymentId, setPaymentId] = useState<string>("")
  const [payAddress, setPayAddress] = useState<string>("")

  const [copied, setCopied] = useState(false)
  const [depositedAmount, setDepositedAmount] = useState(0)

  // Redirect to selector if invalid network
  if (!config) {
    router.replace("/dashboard/deposit")
    return null
  }

  const createPayment = useCallback(async (currentUserId: string) => {
    setIsCreatingPayment(true)
    setPaymentId("")
    setPayAddress("")

    try {
      const response = await fetch("/api/nowpayments/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          network: networkId,
          userId: currentUserId,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.paymentId || !result?.payAddress) {
        toast.error(result?.error ?? "تعذر إنشاء طلب دفع جديد")
        return
      }

      setPaymentId(String(result.paymentId))
      setPayAddress(String(result.payAddress))
      setStep("address")
    } catch {
      toast.error("حدث خطأ في الاتصال أثناء إنشاء طلب الدفع")
    } finally {
      setIsCreatingPayment(false)
    }
  }, [networkId])

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session?.user) {
          if (mounted) {
            toast.error("يجب تسجيل الدخول أولًا")
            router.replace("/auth/login")
          }
          return
        }

        if (mounted) {
          setUserId(data.session.user.id)
        }
      } catch {
        if (mounted) {
          toast.error("تعذر التحقق من الجلسة")
        }
      } finally {
        if (mounted) {
          setIsSessionLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      mounted = false
    }
  }, [router, supabase])

  useEffect(() => {
    if (!userId) return
    createPayment(userId)
  }, [userId, createPayment])

  useEffect(() => {
    if (step !== "waiting" || !paymentId) {
      return
    }

    let cancelled = false

    const checkStatus = async () => {
      if (cancelled) return

      try {
        setIsCheckingStatus(true)
        const response = await fetch(`/api/nowpayments/check-status?paymentId=${encodeURIComponent(paymentId)}`, {
          cache: "no-store",
        })

        const result = await response.json().catch(() => null)

        if (!response.ok || !result) {
          return
        }

        const status = String(result.status ?? "").toLowerCase()

        if (status === "finished") {
          setDepositedAmount(Number(result.actuallyPaid ?? 0))
          setStep("success")
        } else if (status === "failed" || status === "expired") {
          setStep("failed")
        }
      } catch {
        // Ignore transient network errors while polling.
      } finally {
        if (!cancelled) {
          setIsCheckingStatus(false)
        }
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [step, paymentId])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!payAddress) return
    try {
      await navigator.clipboard.writeText(payAddress)
      setCopied(true)
      toast.success("تم نسخ العنوان")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("فشل النسخ — يرجى النسخ يدوياً")
    }
  }

  const handleRetry = async () => {
    if (!userId) {
      toast.error("تعذر تحديد المستخدم الحالي")
      return
    }

    setDepositedAmount(0)
    setStep("address")
    await createPayment(userId)
  }

  // ── Render: Success ───────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-6 py-16 text-center">
        {/* Animated check */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          {/* Ping rings */}
          <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping" />
        </div>

        <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500 delay-150">
          <h2 className="text-2xl font-bold">تم الإيداع بنجاح 🎉</h2>
          <p className="text-muted-foreground text-sm">
            تمت إضافة{" "}
            <span className="text-primary font-bold text-lg">
              ${depositedAmount.toFixed(2)}
            </span>{" "}
            USDT إلى رصيدك
          </p>
          <p className="text-xs text-muted-foreground">
            الرصيد محدَّث الآن ويمكنك استخدامه فوراً
          </p>
        </div>

        <div className="w-full space-y-2 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <Button className="w-full" onClick={() => router.push("/dashboard")}>
            العودة إلى الرئيسية
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/dashboard/withdraw")}
          >
            عرض المحفظة
          </Button>
        </div>
      </div>
    )
  }

  if (step === "failed") {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-red-400/30 animate-ping" />
        </div>

        <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500 delay-150">
          <h2 className="text-2xl font-bold">فشل الدفع أو انتهت صلاحيته</h2>
          <p className="text-muted-foreground text-sm">
            لم يتم استلام الدفعة في الوقت المحدد أو حدث خطأ
          </p>
        </div>

        <div className="w-full space-y-2 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <Button className="w-full" onClick={handleRetry} disabled={isCreatingPayment}>
            {isCreatingPayment ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جارٍ إنشاء طلب جديد...
              </>
            ) : (
              "المحاولة مرة أخرى"
            )}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push("/support")}>
            تواصل مع الدعم
          </Button>
        </div>
      </div>
    )
  }

  // ── Render: Address step ──────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto space-y-4 pb-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() =>
            step === "address" ? router.back() : setStep("address")
          }
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight">إيداع {config.fullName}</h1>
          <p className="text-xs text-muted-foreground">{config.label}</p>
        </div>
        <Badge
          variant="secondary"
          className={`shrink-0 text-xs px-2 ${config.bgClass} ${config.accentClass} border-0`}
        >
          {config.name}
        </Badge>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["address", "waiting"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border
              ${step === s || (s === "address" && step === "waiting")
                ? `${config.bgClass} ${config.accentClass} ${config.borderClass}`
                : "bg-muted text-muted-foreground border-border"
              }
            `}>
              {s === "address" && step === "waiting" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-xs ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s === "address" ? "العنوان" : "انتظار التأكيد"}
            </span>
            {i < 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Address + QR ─────────────────────────────────────────── */}
      {step === "address" && (
        <>
          <Card className={`border ${config.borderClass}`}>
            <CardContent className="flex flex-col items-center gap-5 p-5">

              {/* Heading */}
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">حدد الشبكة: {config.name}</p>
                <p className="text-xs text-muted-foreground">
                  أرسل USDT إلى العنوان التالي وانتظر تأكيد المعاملة
                </p>
              </div>

              {/* QR Code */}
              {isSessionLoading || isCreatingPayment ? (
                <Skeleton className="w-[180px] h-[180px] rounded-2xl" />
              ) : payAddress ? (
                <QRCode address={payAddress} />
              ) : (
                <div className="w-[180px] h-[180px] rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center p-4">
                  تعذر الحصول على عنوان الدفع
                </div>
              )}

              {/* Address */}
              <div className="w-full space-y-1.5">
                <Label className="text-xs text-muted-foreground">عنوان الإيداع</Label>
                <div
                  className="flex items-start gap-2 p-3 bg-muted rounded-xl border border-border cursor-pointer group"
                  onClick={handleCopy}
                >
                  <code className="text-[11px] flex-1 break-all font-mono leading-relaxed text-foreground">
                    {isSessionLoading || isCreatingPayment ? "جارٍ تجهيز عنوان الدفع..." : payAddress || "غير متوفر"}
                  </code>
                  <div className="shrink-0 mt-0.5">
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </div>
                </div>
              </div>

              <Button
                className="w-full text-white hover:cursor-pointer"
                onClick={() => setStep("waiting")}
                disabled={!payAddress || !paymentId || isSessionLoading || isCreatingPayment}
              >
                أكملت الإرسال
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Warnings */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
              تذكير مهم
            </p>
            {config.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 bg-yellow-400/5 border border-yellow-400/20 rounded-lg"
              >
                <span className="text-yellow-400 text-xs font-bold shrink-0">{i + 1}.</span>
                <p className="text-xs text-muted-foreground">{w}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Step 2: Waiting for payment confirmation ─────────────────────── */}
      {step === "waiting" && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="text-center space-y-1">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#F5C518] animate-pulse" />
              </div>
              <h2 className="font-semibold mt-3">جارٍ انتظار تأكيد الدفع...</h2>
              <p className="text-xs text-muted-foreground">قد يستغرق التأكيد من دقيقة إلى بضع دقائق</p>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-lg ${config.bgClass}`}>
              <Loader2 className={`h-3.5 w-3.5 shrink-0 ${config.accentClass} ${isCheckingStatus ? "animate-spin" : ""}`} />
              <span className="text-[11px] text-muted-foreground">رقم الدفع:</span>
              <span className="text-[11px] font-mono truncate text-foreground">{paymentId || "—"}</span>
            </div>

            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => setStep("address")}
            >
              العودة لعرض العنوان
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}