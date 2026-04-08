// app/(legal)/terms/page.tsx
import { Metadata } from "next"
import { FileText, CheckCircle, AlertCircle, Shield, DollarSign, Ban, Scale } from "lucide-react"

export const metadata: Metadata = {
  title: "شروط الاستخدام | Adstar",
  description: "اقرأ شروط وأحكام استخدام منصة Adstar قبل التسجيل.",
}

const sections = [
  {
    icon: CheckCircle,
    title: "القبول بالشروط",
    content: [
      "باستخدامك لمنصة Adstar، فإنك توافق على الالتزام بهذه الشروط والأحكام بالكامل.",
      "إذا كنت لا توافق على أي من هذه الشروط، يُرجى التوقف عن استخدام المنصة.",
      "تحتفظ Adstar بحق تعديل هذه الشروط في أي وقت، وسيُعلَم المستخدمون بأي تغييرات جوهرية.",
      "الاستمرار في استخدام المنصة بعد التعديلات يُعدّ قبولاً ضمنياً للشروط الجديدة.",
    ],
  },
  {
    icon: Shield,
    title: "شروط التسجيل والحساب",
    content: [
      "يجب أن يكون عمر المستخدم 18 عاماً أو أكثر للتسجيل في المنصة.",
      "يُلزَم المستخدم بتقديم معلومات صحيحة ودقيقة عند إنشاء الحساب.",
      "كل مستخدم مسؤول عن الحفاظ على سرية بيانات تسجيل الدخول الخاصة به.",
      "يُحظر إنشاء أكثر من حساب واحد لنفس الشخص. سيتم إيقاف الحسابات المكررة.",
      "Adstar غير مسؤولة عن أي خسائر ناجمة عن الوصول غير المصرح به لحسابك.",
    ],
  },
  {
    icon: DollarSign,
    title: "الاشتراكات والمدفوعات",
    content: [
      "جميع المدفوعات تتم بعملة USDT عبر شبكة TRC20 فقط.",
      "رسوم الاشتراك غير قابلة للاسترداد بعد تفعيل الحساب والتحقق من المعاملة.",
      "يتحمل المستخدم مسؤولية التحقق من صحة عنوان المحفظة قبل إرسال أي مبلغ.",
      "Adstar غير مسؤولة عن المعاملات المرسلة إلى عناوين خاطئة.",
      "في حال عدم التحقق من المعاملة خلال 48 ساعة، يُرجى التواصل مع الدعم الفني.",
    ],
  },
  {
    icon: FileText,
    title: "قواعد تقييم الفيديوهات",
    content: [
      "يحق للمستخدم تقييم فيديو واحد كل 24 ساعة فقط.",
      "يجب أن تكون التقييمات صادقة وتعكس رأياً حقيقياً في المحتوى.",
      "يُحظر التقييم الآلي أو استخدام أدوات تقنية للتحايل على نظام التقييم.",
      "يُحظر مشاركة بيانات الحساب مع أطراف أخرى لتقييم الفيديوهات بدلاً عنك.",
      "أي محاولة للتلاعب في نظام التقييم ستؤدي إلى إيقاف الحساب فوراً وبشكل دائم.",
    ],
  },
  {
    icon: Scale,
    title: "قواعد السحب والأرباح",
    content: [
      "الحد الأدنى للسحب هو 5 دولار USDT.",
      "تعالج طلبات السحب خلال 24 ساعة عمل من وقت الطلب.",
      "يتحمل المستخدم مسؤولية التأكد من صحة عنوان محفظته TRC20 عند طلب السحب.",
      "في حال رفض طلب السحب، يتم إعادة المبلغ إلى رصيد الحساب فوراً.",
      "Adstar تحتفظ بحق مراجعة طلبات السحب للتحقق من مشروعيتها.",
    ],
  },
  {
    icon: Ban,
    title: "الأنشطة المحظورة",
    content: [
      "يُحظر استخدام المنصة لأي غرض غير قانوني أو مخالف للأنظمة المعمول بها.",
      "يُحظر محاولة اختراق أو التلاعب في أنظمة المنصة التقنية.",
      "يُحظر نشر أي محتوى مسيء أو مضلل عبر المنصة.",
      "يُحظر انتحال هوية Adstar أو موظفيها أو مستخدمين آخرين.",
      "سيتم إيقاف الحسابات المخالفة وقد تُتخذ إجراءات قانونية عند الضرورة.",
    ],
  },
  {
    icon: AlertCircle,
    title: "إخلاء المسؤولية",
    content: [
      "Adstar لا تضمن توفر المنصة بشكل مستمر دون انقطاع.",
      "الأرباح المعلنة تعتمد على نشاط المستخدم والتزامه بقواعد التقييم اليومي.",
      "Adstar غير مسؤولة عن أي خسائر ناتجة عن تقلبات أسعار العملات الرقمية.",
      "المنصة غير مسؤولة عن مشاكل الشبكة أو التأخيرات في معاملات البلوكتشين.",
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="relative px-4" dir="rtl">
      {/* Ambient glow */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-[0.04]"
        style={{ background: "radial-gradient(circle, oklch(0.75 0.18 205), transparent 70%)" }}
      />

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-14">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            شروط الاستخدام
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            يُرجى قراءة هذه الشروط بعناية قبل استخدام منصة Adstar. باستخدامك للمنصة، فإنك توافق على الالتزام بجميع البنود المذكورة أدناه.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, i) => (
            <div
              key={section.title}
              className="rounded-2xl border border-border/50 bg-card/60 p-7 hover:border-border/80 transition-colors"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium">المادة {i + 1}</span>
                  <h2 className="text-xl font-bold leading-tight">{section.title}</h2>
                </div>
              </div>
              <ul className="space-y-3">
                {section.content.map((item, j) => (
                  <li key={j} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact note */}
        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            لديك سؤال حول شروط الاستخدام؟{" "}
            <a href="/support" className="text-primary hover:underline font-medium">
              تواصل مع فريق الدعم
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}