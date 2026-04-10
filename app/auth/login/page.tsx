"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { Star, Eye, EyeOff } from "lucide-react"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
})

export default function LoginPage() {
  const router = useRouter()
  const { login, startAdminLogin, isAuthenticated, user } = useAuth()

  const [mode, setMode] = useState<"user" | "admin">("user")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.isAdmin) {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    }
  }, [isAuthenticated, user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validated = loginSchema.safeParse({ email, password })
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message || "تحقق من البيانات المدخلة")
      return
    }

    setIsLoading(true)

    const result =
      mode === "admin"
        ? await startAdminLogin(validated.data.email, validated.data.password)
        : await login(validated.data.email, validated.data.password)

    if (result.success) {
      toast.success("مرحباً بعودتك!")
    } else {
      toast.error(result.error || "فشل تسجيل الدخول")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
    
      <div className="w-full max-w-md z-10 rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-md p-5 sm:p-6">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "admin" ? "دخول مباشر إلى لوحة الإدارة" : "ادخل إلى حسابك لمتابعة الربح"}
          </p>
        </div>

        <div className="flex rounded-xl bg-secondary/70 p-1 mb-6 border border-border/70">
          <button
            type="button"
            onClick={() => {
              setMode("user")
            }}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === "user"
                ? "bg-primary text-primary-foreground "
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            دخول المستخدم
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("admin")
            }}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === "admin"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            دخول الإدارة
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="email"
                placeholder={mode === "admin" ? "بريد المسؤول" : "البريد الإلكتروني"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-14 bg-background/60 border-border rounded-xl text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-14 bg-background/60 border-border rounded-xl text-foreground placeholder:text-muted-foreground pl-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl text-base font-semibold bg-primary  hover:bg-primary/90 shadow-md shadow-primary/25 transition-all text-white"
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  جارٍ تسجيل الدخول...
                </>
              ) : mode === "admin" ? (
                "دخول الإدارة"
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {"ليس لديك حساب؟ "}
          <Link href="/auth/register" className="text-primary hover:underline font-medium">
            إنشاء حساب
          </Link>
        </div>

        <div className="mt-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/">العودة إلى الصفحة الرئيسية</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
