"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const schema = z
  .object({
    currentPassword: z.string().min(1, "أدخل كلمة المرور الحالية"),
    newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string().min(1, "يرجى تأكيد كلمة المرور الجديدة"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية",
    path: ["newPassword"],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  })

function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-muted-foreground">{label}</label>
      <div
        className={cn(
          "group flex items-center gap-3 rounded-xl border bg-secondary/50 px-4 py-3 transition-all",
          "focus-within:border-primary focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20",
          error ? "border-destructive" : "border-border"
        )}
      >
        <Lock size={15} className="shrink-0 text-muted-foreground/60 transition group-focus-within:text-primary" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 outline-none"
          dir="rtl"
          aria-invalid={Boolean(error)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="shrink-0 text-muted-foreground/60 hover:bg-transparent hover:text-foreground"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function StrengthBar({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const labels = ["", "ضعيفة", "متوسطة", "جيدة", "قوية"]
  const colors = ["", "bg-destructive", "bg-yellow-500", "bg-blue-500", "bg-success"]

  if (!password) return null

  return (
    <div className="space-y-1.5" dir="rtl">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= score ? colors[score] : "bg-border"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        قوة كلمة المرور: <span className={cn("font-semibold", score === 4 && "text-success", score <= 1 && "text-destructive")}>{labels[score]}</span>
      </p>
    </div>
  )
}

export default function AdminChangePasswordPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user } = useAuth()

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const setField = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        currentPassword: fieldErrors.currentPassword?.[0] ?? "",
        newPassword: fieldErrors.newPassword?.[0] ?? "",
        confirmPassword: fieldErrors.confirmPassword?.[0] ?? "",
      })
      return
    }

    if (!user?.email) {
      toast.error("تعذر تحديد البريد الإلكتروني للحساب")
      return
    }

    setErrors({})
    setIsSaving(true)

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.currentPassword,
      })

      if (verifyError) {
        setErrors({ currentPassword: "كلمة المرور الحالية غير صحيحة" })
        toast.error("كلمة المرور الحالية غير صحيحة")
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.newPassword,
      })

      if (updateError) {
        toast.error(updateError.message || "تعذر تحديث كلمة المرور")
        return
      }

      toast.success("تم تغيير كلمة المرور بنجاح")
      router.back()
    } catch {
      toast.error("حدث خطأ أثناء تغيير كلمة المرور")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl" dir="rtl">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>تغيير كلمة مرور الإدارة</CardTitle>
              <CardDescription>استخدم كلمة مرور قوية وفريدة لحماية حسابك</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordField
            label="كلمة المرور الحالية"
            value={form.currentPassword}
            onChange={setField("currentPassword")}
            error={errors.currentPassword}
            autoComplete="current-password"
          />

          <PasswordField
            label="كلمة المرور الجديدة"
            value={form.newPassword}
            onChange={setField("newPassword")}
            error={errors.newPassword}
            autoComplete="new-password"
          />

          <StrengthBar password={form.newPassword} />

          <PasswordField
            label="تأكيد كلمة المرور الجديدة"
            value={form.confirmPassword}
            onChange={setField("confirmPassword")}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <div className="flex gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              يفضل استخدام مزيج من الأحرف الكبيرة والصغيرة والأرقام والرموز.
            </p>
          </div>

          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
