// app/(legal)/support/_components/support-form.tsx
"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Send, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { submitSupportRequest } from "../actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-12 rounded-xl font-semibold text-base shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-300"
    >
      {pending ? (
        <>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          جارٍ الإرسال...
        </>
      ) : (
        <>
          <Send className="ml-2 h-4 w-4" />
          إرسال الطلب
        </>
      )}
    </Button>
  )
}

export default function SupportForm() {
  const [state, formAction] = useActionState(submitSupportRequest, null)

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">تم إرسال طلبك بنجاح!</h3>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
          سيتواصل معك فريق الدعم عبر بريدك الإلكتروني خلال 24 ساعة. شكراً لتواصلك معنا.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-8">
      <h2 className="text-2xl font-bold mb-2">تواصل مع الدعم</h2>
      <p className="text-muted-foreground text-sm mb-8">
        أرسل لنا تفاصيل مشكلتك وسنرد عليك في أقرب وقت ممكن.
      </p>

      <form action={formAction} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Full name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              الاسم الكامل <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="أدخل اسمك الكامل"
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:border-primary/50"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              البريد الإلكتروني <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="example@email.com"
              className="h-11 rounded-xl bg-background/50 border-border/60 focus:border-primary/50"
              required
            />
          </div>
        </div>

        {/* Issue category */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">
            نوع المشكلة <span className="text-destructive">*</span>
          </Label>
          <Select name="category" required>
            <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/60 focus:border-primary/50">
              <SelectValue placeholder="اختر نوع المشكلة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subscription">مشكلة في الاشتراك أو الدفع</SelectItem>
              <SelectItem value="rating">مشكلة في تقييم الفيديوهات</SelectItem>
              <SelectItem value="withdrawal">مشكلة في طلب السحب</SelectItem>
              <SelectItem value="account">مشكلة في الحساب أو تسجيل الدخول</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TxHash (optional) */}
        <div className="space-y-2">
          <Label htmlFor="txHash" className="text-sm font-medium">
            رمز المعاملة (TxHash){" "}
            <span className="text-muted-foreground font-normal text-xs">— اختياري، خاص بمشاكل الدفع</span>
          </Label>
          <Input
            id="txHash"
            name="txHash"
            placeholder="0x..."
            className="h-11 rounded-xl bg-background/50 border-border/60 focus:border-primary/50 font-mono text-sm"
            dir="ltr"
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message" className="text-sm font-medium">
            وصف المشكلة <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="message"
            name="message"
            placeholder="اشرح مشكلتك بالتفصيل لنتمكن من مساعدتك بشكل أفضل..."
            className="min-h-[130px] rounded-xl bg-background/50 border-border/60 focus:border-primary/50 resize-none"
            required
          />
        </div>

        {/* Error */}
        {state?.error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
            {state.error}
          </p>
        )}

        <SubmitButton />

        <p className="text-center text-xs text-muted-foreground">
          بإرسال هذا النموذج، توافق على معالجة بياناتك وفقاً لـ{" "}
          <a href="/privacy" className="text-primary hover:underline">
            سياسة الخصوصية
          </a>
        </p>
      </form>
    </div>
  )
}