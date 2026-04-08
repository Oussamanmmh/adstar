// app/(legal)/support/page.tsx
import { Metadata } from "next"
import { MessageCircle, Clock, Zap, BookOpen, DollarSign, CreditCard, Video, ChevronDown } from "lucide-react"
import SupportForm from "./_components/support-form"

export const metadata: Metadata = {
  title: "الدعم الفني | Adstar",
  description: "نحن هنا للمساعدة. تواصل مع فريق دعم Adstar أو تصفح الأسئلة الشائعة.",
}

const faqs = [
  {
    category: "الاشتراك والدفع",
    icon: CreditCard,
    questions: [
      {
        q: "ما هي طرق الدفع المقبولة؟",
        a: "نقبل فقط عملة USDT عبر شبكة TRC20. تأكد من إرسال المبلغ الصحيح من محفظة متوافقة مع TRC20 مثل Trust Wallet.",
      },
      {
        q: "كيف أتحقق من اشتراكي بعد الدفع؟",
        a: "بعد إرسال USDT، انسخ رمز المعاملة (TxHash) من محفظتك وألصقه في صفحة تأكيد الاشتراك. يتم التحقق تلقائياً خلال دقائق.",
      },
      {
        q: "ماذا أفعل إذا لم يتم تفعيل اشتراكي؟",
        a: "تأكد أولاً أن المبلغ المرسل صحيح والمحفظة المستقبِلة هي نفسها المعروضة في المنصة. إذا استمرت المشكلة، تواصل معنا عبر النموذج أدناه مع إرفاق TxHash.",
      },
    ],
  },
  {
    category: "تقييم الفيديوهات",
    icon: Video,
    questions: [
      {
        q: "لماذا لا أستطيع تقييم فيديو اليوم؟",
        a: "يمكنك تقييم فيديو واحد كل 24 ساعة فقط. ستجد في لوحتك مؤقتاً يُظهر وقت تجديد التقييم القادم.",
      },
      {
        q: "هل يمكنني تقييم أكثر من فيديو في اليوم لزيادة أرباحي؟",
        a: "لا، يقتصر النظام على تقييم واحد يومياً لكل مستخدم بصرف النظر عن الباقة. هذا يضمن عدالة التقييمات وجودتها.",
      },
    ],
  },
  {
    category: "الأرباح والسحب",
    icon: DollarSign,
    questions: [
      {
        q: "ما هو الحد الأدنى للسحب؟",
        a: "الحد الأدنى لطلب السحب هو 5 دولار USDT. يتم معالجة الطلبات خلال 24 ساعة عمل.",
      },
      {
        q: "كيف أعرف أن طلب السحب قُبل؟",
        a: "ستتلقى إشعاراً في لوحة التحكم عند تغيير حالة طلبك. عند الموافقة، تصل USDT مباشرة إلى عنوان محفظتك TRC20.",
      },
      {
        q: "ماذا أفعل إذا أدخلت عنوان محفظة خاطئاً؟",
        a: "تواصل مع الدعم فوراً قبل معالجة الطلب. إذا تمت المعالجة لعنوان خاطئ، لن تتمكن Adstar من استرداد الأموال.",
      },
    ],
  },
]

export default function SupportPage() {
  return (
    <div className="relative px-4" dir="rtl">
      {/* Ambient glow */}
      <div
        className="fixed top-1/2 right-0 w-[400px] h-[400px] pointer-events-none opacity-[0.04]"
        style={{ background: "radial-gradient(circle, oklch(0.75 0.18 205), transparent 70%)" }}
      />

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-medium mb-6">
            <MessageCircle className="h-3.5 w-3.5" />
            نحن هنا للمساعدة
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            مركز الدعم الفني
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            لديك مشكلة؟ ابحث عن إجابتك في الأسئلة الشائعة، أو تواصل مباشرة مع فريقنا.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-14">
          {[
            { icon: Clock, label: "وقت الرد", value: "أقل من 24 ساعة" },
            { icon: Zap, label: "دعم سريع", value: "7 أيام في الأسبوع" },
            { icon: BookOpen, label: "أسئلة شائعة", value: `${faqs.reduce((acc, c) => acc + c.questions.length, 0)} سؤال موثق` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center hover:border-border/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-sm font-bold">{item.value}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            الأسئلة الشائعة
          </h2>
          <div className="space-y-8">
            {faqs.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <cat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-muted-foreground">{cat.category}</h3>
                </div>
                <div className="space-y-3 mr-9">
                  {cat.questions.map((faq, i) => (
                    <details
                      key={i}
                      className="group rounded-xl border border-border/50 bg-card/60 overflow-hidden hover:border-border/80 transition-colors"
                    >
                      <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none select-none">
                        <span className="font-medium text-sm leading-relaxed">{faq.q}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
                      </summary>
                      <div className="px-5 pb-5 pt-0">
                        <div className="h-px bg-border/50 mb-4" />
                        <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-14">
          <div className="h-px bg-border/50" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-sm text-muted-foreground whitespace-nowrap">
            لم تجد إجابتك؟ تواصل معنا مباشرة
          </span>
        </div>

        {/* Contact Form */}
        <SupportForm />
      </div>
    </div>
  )
}