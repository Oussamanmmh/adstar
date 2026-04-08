"use client"

import { useState, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Copy,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  ChevronLeft,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { submitDeposit } from "@/lib/actions/deposit"
import type { Network } from "@/lib/types"

// ─── Network config (client-safe — only public env vars) ─────────────────────

const NETWORK_CONFIG = {
  trc20: {
    name: "TRC20",
    fullName: "USDT — TRC20",
    label: "شبكة ترون (TRON)",
    adminWallet: process.env.NEXT_PUBLIC_ADMIN_TRC20_WALLET ?? "",
    explorerBase: "https://tronscan.org/#/transaction/",
    explorerName: "TronScan",
    hashPlaceholder: "مثال: a1b2c3d4e5f6...",
    hashHint: "ابحث عن TxID في سجل معاملات محفظتك",
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
    adminWallet: process.env.NEXT_PUBLIC_ADMIN_BEP20_WALLET ?? "",
    explorerBase: "https://bscscan.com/tx/",
    explorerName: "BscScan",
    hashPlaceholder: "مثال: 0xabc123...",
    hashHint: "ابحث عن Tx Hash في سجل معاملات محفظتك",
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

type Step = "address" | "txhash" | "success"

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

  const config = NETWORK_CONFIG[networkId]

  const [step, setStep] = useState<Step>("address")
  const [txHash, setTxHash] = useState("")
  const [copied, setCopied] = useState(false)
  const [depositedAmount, setDepositedAmount] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Redirect to selector if invalid network
  if (!config) {
    router.replace("/dashboard/deposit")
    return null
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!config.adminWallet) return
    try {
      await navigator.clipboard.writeText(config.adminWallet)
      setCopied(true)
      toast.success("تم نسخ العنوان")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("فشل النسخ — يرجى النسخ يدوياً")
    }
  }

  const handleVerify = () => {
    if (!txHash.trim()) {
      toast.error("يرجى إدخال رمز المعاملة")
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.set("txHash", txHash.trim())
      fd.set("network", networkId)

      const result = await submitDeposit(fd)

      if (result.success && result.amount) {
        setDepositedAmount(result.amount)
        setStep("success")
      } else {
        toast.error(result.error ?? "فشل التحقق من المعاملة")
      }
    })
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
        {(["address", "txhash"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border
              ${step === s || (s === "address" && step === "txhash")
                ? `${config.bgClass} ${config.accentClass} ${config.borderClass}`
                : "bg-muted text-muted-foreground border-border"
              }
            `}>
              {s === "address" && step === "txhash" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-xs ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s === "address" ? "العنوان" : "رمز التحويل"}
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
              {config.adminWallet ? (
                <QRCode address={config.adminWallet} size={180} />
              ) : (
                <div className="w-[180px] h-[180px] rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center p-4">
                  لم يتم تكوين عنوان المحفظة بعد
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
                    {config.adminWallet || "غير متوفر"}
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
                className="w-full"
                onClick={() => setStep("txhash")}
                disabled={!config.adminWallet}
              >
                أكملت الإرسال — أدخل رمز المعاملة
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

      {/* ── Step 2: TxHash input ──────────────────────────────────────────── */}
      {step === "txhash" && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="text-center space-y-1">
              <h2 className="font-semibold">أدخل رمز المعاملة</h2>
              <p className="text-xs text-muted-foreground">{config.hashHint}</p>
            </div>

            {/* Mini address reminder */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${config.bgClass}`}>
              <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${config.accentClass}`} />
              <span className="text-[11px] font-mono truncate text-foreground">
                {config.adminWallet
                  ? `${config.adminWallet.slice(0, 12)}...${config.adminWallet.slice(-8)}`
                  : "—"}
              </span>
              <Badge variant="secondary" className={`mr-auto text-[10px] ${config.accentClass}`}>
                {config.name}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txhash" className="text-sm font-medium">
                رمز المعاملة (TxHash / TxID)
              </Label>
              <Input
                id="txhash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder={config.hashPlaceholder}
                className="font-mono text-xs h-12"
                dir="ltr"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">
                يمكنك نسخه من سجل معاملات محفظتك (Trust Wallet، MetaMask، إلخ)
              </p>
            </div>

            {/* Explorer link (if hash entered) */}
            {txHash.trim().length > 10 && (
              <a
                href={`${config.explorerBase}${txHash.trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                تحقق يدوياً على {config.explorerName}
              </a>
            )}

            <Button
              className="w-full h-12 text-base font-semibold text-white"
              onClick={handleVerify}
              disabled={isPending || !txHash.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جارٍ التحقق من المعاملة...
                </>
              ) : (
                "تحقق وأودع →"
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => setStep("address")}
              disabled={isPending}
            >
              العودة لعرض العنوان
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}