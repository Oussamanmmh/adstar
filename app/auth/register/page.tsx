"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { Star, Eye, EyeOff } from "lucide-react"
import { z } from "zod"

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "الاسم الكامل يجب أن يكون حرفين على الأقل"),
    email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string().min(6, "تأكيد كلمة المرور مطلوب"),
    referralCode: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => value === "" || /^[A-Z0-9]{8}$/.test(value), "رمز الإحالة غير صالح")
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  })

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, isAuthenticated, user } = useAuth()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [referralCode, setReferralCode] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  useEffect(() => {
    const ref = searchParams.get("ref")
    if (!ref) return

    const normalized = ref.trim().toUpperCase()
    if (/^[A-Z0-9]{8}$/.test(normalized)) {
      setReferralCode(normalized)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validated = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      referralCode,
    })

    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message || "تحقق من البيانات المدخلة")
      return
    }

    setIsLoading(true)

    const result = await register({
      email: validated.data.email,
      password: validated.data.password,
      fullName: validated.data.fullName,
      referralCode: validated.data.referralCode || undefined,
    })

    if (result.success) {
      toast.success("تم إنشاء الحساب بنجاح!")
    } else {
      toast.error(result.error || "فشل إنشاء الحساب")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">


      <div className="w-full max-w-md z-10 rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-md p-5 sm:p-6">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-sm text-muted-foreground mt-1">سجّل الآن وابدأ رحلتك مع Adstar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="الاسم الكامل"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="h-14 bg-background/60 border-border rounded-xl text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative">
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
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
              autoComplete="new-password"
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

          <div className="relative">
            <Input
              type="text"
              placeholder="رمز الإحالة (اختياري)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              autoComplete="off"
              inputMode="text"
              maxLength={8}
              className="h-14 bg-background/60 border-border rounded-xl text-foreground placeholder:text-muted-foreground uppercase tracking-wider"
            />
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-14 bg-background/60 border-border rounded-xl text-foreground placeholder:text-muted-foreground pl-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 rounded-xl text-base font-semibold bg-primary  hover:bg-primary/90 shadow-md shadow-primary/25 transition-all"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                جارٍ إنشاء الحساب...
              </>
            ) : (
              "إنشاء حساب"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            تسجيل الدخول
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
