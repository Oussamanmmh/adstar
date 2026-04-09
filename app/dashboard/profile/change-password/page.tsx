'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, ArrowRight, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function PasswordField({ label, value, onChange, error, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-muted-foreground">{label}</label>
      <div className={cn(
        'group flex items-center gap-3 rounded-xl border bg-secondary/50 px-4 py-3 transition-all',
        'focus-within:border-primary focus-within:bg-secondary focus-within:ring-2 focus-within:ring-primary/20',
        error ? 'border-destructive' : 'border-border'
      )}>
        <Lock size={15} className="shrink-0 text-muted-foreground/60 transition group-focus-within:text-primary" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 outline-none"
          dir="rtl"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          onClick={() => setShow((s) => !s)}
          className="shrink-0 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
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
  const labels = ['', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية']
  const colors = ['', 'bg-destructive', 'bg-yellow-500', 'bg-blue-500', 'bg-success']
  if (!password) return null
  return (
    <div className="space-y-1.5" dir="rtl">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i <= score ? colors[score] : 'bg-border')} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        قوة كلمة المرور:{' '}
        <span className={cn('font-semibold', score === 4 && 'text-success', score <= 1 && 'text-destructive')}>
          {labels[score]}
        </span>
      </p>
    </div>
  )
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ old: '', newPass: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }))

  function validate() {
    const e: Record<string, string> = {}
    if (!form.old) e.old = 'هذا الحقل مطلوب'
    if (form.newPass.length < 8) e.newPass = 'يجب أن تكون 8 أحرف على الأقل'
    if (form.newPass !== form.confirm) e.confirm = 'كلمتا المرور غير متطابقتين'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 1200))
      toast.success('تم تغيير كلمة المرور بنجاح')
      router.back()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-md px-5">

        {/* Header */}
        <div className="flex items-center gap-3 pb-6 pt-10">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowRight size={17} />
          </Button>
          <div>
            <h1 className="text-lg font-bold">كلمة سر الدخول</h1>
            <p className="text-xs text-muted-foreground">غيّر كلمة مرور حسابك</p>
          </div>
        </div>

        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10">
            <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-xl" />
            <Lock size={32} className="relative text-primary" />
          </div>
        </div>

        {/* Form card */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl shadow-black/20">
          <div className="space-y-4">
            <PasswordField
              label="كلمة المرور القديمة لتسجيل الدخول"
              value={form.old}
              onChange={set('old')}
              error={errors.old}
              autoComplete="current-password"
            />
            <PasswordField
              label="كلمة مرور تسجيل الدخول الجديدة"
              value={form.newPass}
              onChange={set('newPass')}
              error={errors.newPass}
              autoComplete="new-password"
            />
            <StrengthBar password={form.newPass} />
            <PasswordField
              label="تأكيد كلمة المرور الجديدة"
              value={form.confirm}
              onChange={set('confirm')}
              error={errors.confirm}
              autoComplete="new-password"
            />
          </div>

          {/* Tip */}
          <div className="mt-5 flex gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              استخدم مزيجاً من الأحرف الكبيرة والصغيرة والأرقام والرموز لكلمة مرور أقوى.
            </p>
          </div>

          {/* Submit */}
          <Button
            size="lg"
            className="mt-6 w-full rounded-2xl"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />}
            {loading ? 'جارٍ الحفظ...' : 'يتأكد'}
          </Button>
        </div>

      </div>
    </div>
  )
}