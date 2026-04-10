import Link from "next/link"
import { ArrowRight, Home, LogIn, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-44 -right-44 h-140 w-140 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.18 205), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-45 -left-40 h-115 w-115 rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.18 250), transparent 70%)" }}
        />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-20">
        <Card className="w-full border-border/60 bg-card/75 backdrop-blur-xl shadow-2xl shadow-primary/10">
          <CardContent className="space-y-8 p-7 sm:p-10">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">خطأ 404</p>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">الصفحة غير موجودة</h1>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                <SearchX className="h-7 w-7 text-primary" />
              </div>
            </div>

            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              الرابط الذي فتحته غير صحيح أو ربما تم نقل الصفحة. يمكنك الرجوع للرئيسية أو تسجيل الدخول للمتابعة من لوحة التحكم.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" className="h-12 rounded-xl">
                <Link href="/">
                  <Home className="ml-2 h-4 w-4" />
                  العودة للرئيسية
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-border/60">
                <Link href="/auth/login">
                  <LogIn className="ml-2 h-4 w-4" />
                  تسجيل الدخول
                </Link>
              </Button>
            </div>

            <div className="pt-1 text-sm text-muted-foreground">
              أو جرّب صفحة
              <Link href="/dashboard" className="mx-1 inline-flex items-center font-medium text-primary hover:underline">
                لوحة التحكم
                <ArrowRight className="mr-1 h-3.5 w-3.5 rotate-180" />
              </Link>
              إذا كان لديك حساب مفعل.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
