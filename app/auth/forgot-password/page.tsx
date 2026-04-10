"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Mail } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const emailSchema = z.object({
  email: z.string().trim().email("يرجى إدخال بريد إلكتروني صحيح"),
})

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return

    const intervalId = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [resendCooldown])

  async function sendResetEmail(targetEmail: string) {
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/login?recovery=1`
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes("not found") || message.includes("user not found") || message.includes("invalid user")) {
        toast.error("هذا البريد الإلكتروني غير مسجل لدينا")
      } else {
        toast.error(error.message || "تعذر إرسال رابط إعادة التعيين")
      }
      return false
    }

    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = emailSchema.safeParse({ email })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "يرجى إدخال بريد إلكتروني صحيح")
      return
    }

    setLoading(true)
    const sent = await sendResetEmail(parsed.data.email)
    if (!sent) {
      setLoading(false)
      return
    }

    toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني")
    setIsSent(true)
    setResendCooldown(30)
    setLoading(false)
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return

    setLoading(true)
    const sent = await sendResetEmail(email)

    if (!sent) {
      setLoading(false)
      return
    }

    toast.success("تمت إعادة إرسال رابط إعادة التعيين")
    setResendCooldown(30)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="w-full max-w-md z-10 rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-md p-5 sm:p-6">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold">استعادة كلمة المرور</h1>
          <p className="text-sm text-muted-foreground mt-1">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-14 bg-background/60 border-border rounded-xl text-foreground placeholder:text-muted-foreground pl-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 shadow-md shadow-primary/25 transition-all text-white"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  جارٍ الإرسال...
                </>
              ) : (
                "إرسال رابط الاستعادة"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              تم إرسال رابط إعادة التعيين إلى:
            </p>
            <p className="font-semibold text-foreground">{email}</p>
            <p className="text-xs text-muted-foreground">
              افحص صندوق الوارد والبريد غير الهام. يمكنك إعادة الإرسال إذا لم يصلك البريد.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
            >
              {loading
                ? "جارٍ الإرسال..."
                : resendCooldown > 0
                  ? `إعادة الإرسال خلال ${resendCooldown}ث`
                  : "إعادة الإرسال"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSent(false)}
            >
              تغيير البريد الإلكتروني
            </Button>
          </div>
        )}

        <div className="mt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">
              <ArrowRight className="mr-2 h-4 w-4" />
              العودة إلى تسجيل الدخول
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
