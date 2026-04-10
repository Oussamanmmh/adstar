"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { ArrowRight, Mail, Save, Shield, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "الاسم يجب أن يحتوي على حرفين على الأقل")
    .max(100, "الاسم طويل جداً"),
  email: z.string().trim().email("يرجى إدخال بريد إلكتروني صحيح"),
})

export default function AdminProfilePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, refreshUser } = useAuth()

  const [fullName, setFullName] = useState(user?.fullName ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = useMemo(() => {
    return fullName !== (user?.fullName ?? "") || email !== (user?.email ?? "")
  }, [email, fullName, user?.email, user?.fullName])

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("تعذر تحديد حساب الإدارة الحالي")
      return
    }

    const parsed = profileSchema.safeParse({ fullName, email })
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        fullName: fieldErrors.fullName?.[0] ?? "",
        email: fieldErrors.email?.[0] ?? "",
      })
      return
    }

    setErrors({})
    setIsSaving(true)

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.fullName,
          email: parsed.data.email,
        })
        .eq("id", user.id)

      if (profileError) {
        toast.error(profileError.message || "تعذر تحديث بيانات الملف الشخصي")
        return
      }

      const emailChanged = parsed.data.email !== (user.email ?? "")
      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({
          email: parsed.data.email,
        })

        if (authError) {
          toast.error(authError.message || "تم تحديث الاسم لكن تعذر تحديث البريد الإلكتروني")
          return
        }

        toast.success("تم تحديث البيانات. تحقق من بريدك لتأكيد العنوان الجديد")
      } else {
        toast.success("تم تحديث بيانات الحساب بنجاح")
      }

      await refreshUser()
      router.refresh()
    } catch {
      toast.error("حدث خطأ غير متوقع أثناء حفظ البيانات")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">إعدادات حساب الإدارة</h1>
          <p className="text-sm text-muted-foreground">تحديث الاسم والبريد الإلكتروني وكلمة المرور</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            البيانات الأساسية
          </CardTitle>
          <CardDescription>يمكنك تعديل معلومات حساب الإدارة من هنا</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-full-name">الاسم الكامل</Label>
            <div className={cn("relative", errors.fullName && "text-destructive") }>
              <UserRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="pr-10"
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
              />
            </div>
            {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pr-10"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
            </div>
            {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
          </div>

          <Button className="w-full sm:w-auto" onClick={handleSave} disabled={isSaving || !isDirty}>
            <Save className="h-4 w-4" />
            {isSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            الأمان
          </CardTitle>
          <CardDescription>تغيير كلمة مرور حساب الإدارة</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={() => router.push("/admin/profile/change-password") }>
            تغيير كلمة المرور
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
