"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ChevronLeft, ShieldCheck, Zap } from "lucide-react"
import Image from "next/image"

const NETWORKS = [
  {
    id: "trc20",
    name: "USDT — TRC20",
    description: "شبكة ترون (TRON)",
    badge: "موصى به",
    badgeVariant: "default" as const,
    imgUrl:"/assets/USDT-TRC20.png",
    features: ["رسوم منخفضة جداً", "تأكيد سريع ~1 دقيقة"],
    accentColor: "border-red-500/30 hover:border-red-500/60",
    dotColor: "bg-red-400",
  },
  {
    id: "bep20",
    name: "USDT — BEP20",
    description: "شبكة BNB Smart Chain",
    badge: "BNB Chain",
    badgeVariant: "secondary" as const,
    imgUrl:"/assets/USDT-BEP20.png",
    features: ["متوافق مع MetaMask / Trust Wallet", "تأكيد سريع ~3 دقائق"],
    accentColor: "border-yellow-500/30 hover:border-yellow-500/60",
    dotColor: "bg-yellow-400",
  },
]

export default function DepositPage() {
  return (
    <div className="max-w-md mx-auto space-y-6 py-2">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة إلى اللوحة
      </Link>
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">إيداع USDT</h1>
        <p className="text-sm text-muted-foreground">
          اختر الشبكة لإيداع الأصول في حسابك
        </p>
      </div>

      {/* Network Cards */}
      <div className="space-y-3">
        {NETWORKS.map((net) => (
          <Link key={net.id} href={`/dashboard/deposit/${net.id}`} className="block">
            <Card
              className={`
                border-2 transition-all duration-200 cursor-pointer group
                ${net.accentColor}
              `}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Icon */}
                <Image src={net.imgUrl} alt={net.name} width={40} height={40} className="w-14 h-14" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base">{net.name}</span>
                    <Badge variant={net.badgeVariant} className="text-[10px] px-1.5 py-0">
                      {net.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{net.description}</p>
                  <div className="flex flex-col gap-0.5">
                    {net.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${net.dotColor}`} />
                        <span className="text-xs text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold mb-0.5">إيداع فوري</p>
            <p className="text-[11px] text-muted-foreground">يُضاف الرصيد تلقائياً بعد التحقق</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold mb-0.5">آمن ومضمون</p>
            <p className="text-[11px] text-muted-foreground">نتحقق من كل معاملة على البلوكتشين</p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <p className="text-[11px] text-muted-foreground text-center px-4">
        ⚠️ تأكد من اختيار الشبكة الصحيحة قبل الإرسال — إرسال عبر شبكة خاطئة قد يؤدي إلى فقدان الأموال نهائياً.
      </p>
    </div>
  )
}