"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Play, DollarSign, Clock, CheckCircle, ArrowRight, Shield, Zap, TrendingUp, Users, Award } from "lucide-react"

const packages = [
  {
    name: "الأساسية",
    price: 20,
    dailyEarnings: 1,
    videosPerDay: 5,
    duration: 30,
    popular: false,
    gradient: "from-slate-500/10 to-slate-600/5",
  },
  {
    name: "القياسية",
    price: 50,
    dailyEarnings: 3,
    videosPerDay: 10,
    duration: 30,
    popular: true,
    gradient: "from-cyan-500/15 to-blue-500/10",
  },
  {
    name: "الاحترافية",
    price: 100,
    dailyEarnings: 7,
    videosPerDay: 20,
    duration: 30,
    popular: false,
    gradient: "from-indigo-500/10 to-purple-500/5",
  },
]

const steps = [
  {
    icon: Shield,
    title: "اشترك",
    description: "اختر الباقة المناسبة وادفع USDT مرة واحدة لتفعيل حسابك.",
    number: "01",
  },
  {
    icon: Play,
    title: "قيّم الفيديوهات",
    description: "شاهد الفيديوهات وقيّمها يومياً. كل تقييم يمنحك أرباح USDT حسب باقتك.",
    number: "02",
  },
  {
    icon: DollarSign,
    title: "اسحب أرباحك",
    description: "قدّم طلب سحب في أي وقت، وتُرسل الأرباح مباشرة إلى محفظتك TRC20.",
    number: "03",
  },
]

const stats = [
  { value: "$50K+", label: "إجمالي المدفوعات", icon: DollarSign },
  { value: "5,000+", label: "مستخدم نشط", icon: Users },
  { value: "100K+", label: "فيديو تم تقييمه", icon: TrendingUp },
  { value: "24h", label: "سحوبات سريعة", icon: Zap },
]

const testimonials = [
  { name: "أحمد م.", text: "سحبت أرباحي خلال ساعات. تجربة رائعة وموثوقة.", amount: "$90" },
  { name: "فاطمة ع.", text: "الباقة القياسية مثالية لي. أرباح يومية ثابتة.", amount: "$63" },
  { name: "خالد ر.", text: "أنصح الجميع بالباقة الاحترافية. العائد ممتاز.", amount: "$210" },
]

export default function LandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth()

  const getDashboardLink = () => {
    if (!isAuthenticated) return "/auth/login"
    return user?.isAdmin ? "/admin" : "/dashboard"
  }

  return (
    <div className="min-h-screen overflow-x-hidden" dir="rtl">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.18 205), transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -left-60 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.18 250), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.18 205), transparent 70%)" }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLoading ? null : isAuthenticated ? (
              <Button asChild className="rounded-xl">
                <Link href={getDashboardLink()}>
                  الذهاب إلى اللوحة
                  <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="rounded-xl text-muted-foreground hover:text-foreground">
                  <Link href="/auth/login">تسجيل الدخول</Link>
                </Button>
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                  <Link href="/auth/register">ابدأ الآن</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/25 bg-primary/8 text-primary text-sm font-medium mb-8 shadow-sm shadow-primary/10">
            <Zap className="h-3.5 w-3.5" />
            اربح أثناء المشاهدة
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight text-balance mb-7">
            اربح{" "}
            <span
              className="relative inline-block"
              style={{
                background: "linear-gradient(135deg, oklch(0.80 0.20 205), oklch(0.65 0.22 220))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              USDT
            </span>{" "}
            من تقييم الفيديوهات
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            اشترك في باقة، قيّم فيديوهات يومياً، واحصل على أرباح USDT مباشرة إلى محفظتك.
            تجربة بسيطة وشفافة ومربحة.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="text-base rounded-2xl h-14 px-8 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Link href="/auth/register">
                ابدأ الربح اليوم
                <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-base rounded-2xl h-14 px-8 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
            >
              <Link href="#how-it-works">كيف يعمل الموقع</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" />
              بدون رسوم خفية
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" />
              سحب سريع 24 ساعة
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" />
              دعم مستمر
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-10 border-y border-border/40 bg-card/40 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="flex justify-center mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-primary mb-1 tabular-nums">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">الطريقة</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">كيف يعمل الموقع</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              ثلاث خطوات بسيطة لبدء الربح من تقييم الفيديوهات
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {steps.map((step, index) => (
              <div key={step.title} className="relative group">
                <div
                  className="rounded-2xl border border-border/50 bg-card/60 p-8 text-center hover:border-primary/30 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                >
                  {/* Step number */}
                  <div className="text-6xl font-black text-primary/8 absolute top-4 left-4 leading-none select-none">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/15 transition-colors">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>

                  {/* Step badge */}
                  <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold mb-4">
                    {index + 1}
                  </div>

                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 relative">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.75 0.18 205 / 0.06), transparent)",
          }}
        />
        <div className="mx-auto max-w-5xl relative">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">الأسعار</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">اختر باقتك</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              اختر خطة الاشتراك المناسبة لهدفك الربحي
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {packages.map((pkg) => (
              <Card
                key={pkg.name}
                className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  pkg.popular
                    ? "border-primary/50 shadow-2xl shadow-primary/15 scale-[1.02]"
                    : "border-border/50 hover:border-border hover:shadow-xl"
                }`}
              >
                {/* Card gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${pkg.gradient} pointer-events-none`} />

                {pkg.popular && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}

                {pkg.popular && (
                  <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-primary/30">
                     الأكثر شيوعاً
                  </div>
                )}

                <CardHeader className="text-center pb-2 pt-10 relative">
                  <CardTitle className="text-2xl font-bold">{pkg.name}</CardTitle>
                  <CardDescription className="text-sm">اشتراك لمدة {pkg.duration} يوم</CardDescription>
                </CardHeader>

                <CardContent className="text-center relative">
                  <div className="my-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-black">${pkg.price}</span>
                      <span className="text-muted-foreground text-sm">USDT</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border/50 mb-6" />

                  <div className="space-y-3 mb-8 text-right">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>ربح يومي <strong className="text-foreground">${pkg.dailyEarnings}</strong></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span><strong className="text-foreground">{pkg.videosPerDay}</strong> فيديو يومياً</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>إجمالي حتى <strong className="text-foreground">${pkg.dailyEarnings * pkg.duration}</strong></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>فاصل 24 ساعة بين التقييمات</span>
                    </div>
                  </div>

                  <Button
                    className={`w-full rounded-xl h-11 font-semibold transition-all duration-300 ${
                      pkg.popular ? "shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5" : ""
                    }`}
                    variant={pkg.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/auth/register">ابدأ الآن</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 border-t border-border/40">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">آراء المستخدمين</p>
            <h2 className="text-3xl md:text-4xl font-bold">ماذا يقول مستخدمونا</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-border/50 bg-card/60 p-6 hover:border-primary/25 hover:bg-card/80 transition-all duration-300"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary text-xs font-bold">
                      {t.name[0]}
                    </div>
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                  <span className="text-primary font-bold text-sm">{t.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 80% at 50% 100%, oklch(0.75 0.18 205 / 0.08), transparent)",
          }}
        />
        <div className="mx-auto max-w-3xl text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-8 mx-auto">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-5 text-balance tracking-tight">
            جاهز لبدء الربح؟
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            انضم إلى آلاف المستخدمين الذين يربحون USDT يومياً عبر تقييم الفيديوهات.
          </p>
          <Button
            size="lg"
            asChild
            className="text-base rounded-2xl h-14 px-10 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Link href="/auth/register">
              أنشئ حساباً مجانياً
              <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
            </Link>
          </Button>
          <p className="mt-5 text-sm text-muted-foreground">لا يوجد رسوم إضافية · سحب سريع · دعم 24/7</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border/40">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
         
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">الشروط</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">الخصوصية</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">الدعم</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}