// app/(legal)/privacy/page.tsx
import { Metadata } from "next"
import { Lock, Eye, Database, Share2, UserCheck, Trash2, Mail } from "lucide-react"

export const metadata: Metadata = {
  title: "سياسة الخصوصية | Adstar",
  description: "تعرف على كيفية جمع بياناتك واستخدامها وحمايتها على منصة Adstar.",
}

const sections = [
  {
    icon: Database,
    title: "البيانات التي نجمعها",
    items: [
      {
        label: "بيانات التسجيل",
        detail: "الاسم الكامل، البريد الإلكتروني، وعنوان المحفظة TRC20 عند إنشاء الحساب.",
      },
      {
        label: "بيانات المعاملات",
        detail: "تفاصيل الاشتراكات، رموز المعاملات (TxHash)، سجلات السحب والأرباح.",
      },
      {
        label: "بيانات النشاط",
        detail: "سجلات تقييم الفيديوهات، أوقات الدخول، والإجراءات المنفذة داخل المنصة.",
      },
      {
        label: "البيانات التقنية",
        detail: "عنوان IP، نوع المتصفح، الجهاز المستخدم، وبيانات الجلسة لأغراض الأمان.",
      },
    ],
  },
  {
    icon: Eye,
    title: "كيف نستخدم بياناتك",
    items: [
      { label: "تشغيل الخدمة", detail: "لتفعيل حسابك، معالجة الاشتراكات، وإدارة تقييمات الفيديوهات." },
      { label: "المعالجة المالية", detail: "للتحقق من معاملات USDT ومعالجة طلبات السحب." },
      { label: "الأمان", detail: "لحماية حسابك، اكتشاف الاحتيال، ومنع الوصول غير المصرح به." },
      { label: "التواصل", detail: "لإرسال إشعارات مهمة تتعلق بحسابك أو تحديثات الخدمة." },
      { label: "تحسين المنصة", detail: "لتحليل أنماط الاستخدام وتحسين تجربة المستخدم بشكل مستمر." },
    ],
  },
  {
    icon: Share2,
    title: "مشاركة البيانات مع أطراف ثالثة",
    items: [
      { label: "Supabase", detail: "نستخدم Supabase لتخزين البيانات وإدارة المصادقة بشكل آمن." },
      { label: "TronGrid API", detail: "للتحقق من معاملات USDT على شبكة TRON دون الكشف عن بياناتك الشخصية." },
      { label: "لا مشاركة تجارية", detail: "لا نبيع أو نؤجر أو نتاجر ببياناتك الشخصية لأي طرف ثالث بأي شكل." },
      { label: "الإفصاح القانوني", detail: "قد نُفصح عن البيانات إذا طُلب منا ذلك بموجب القانون أو أمر قضائي." },
    ],
  },
  {
    icon: Lock,
    title: "كيف نحمي بياناتك",
    items: [
      { label: "التشفير", detail: "جميع البيانات المنقولة محمية بتشفير SSL/TLS من الدرجة العسكرية." },
      { label: "سياسات RLS", detail: "قاعدة البيانات محمية بـ Row Level Security — لا أحد يرى بيانات مستخدم آخر." },
      { label: "وصول محدود", detail: "فقط موظفو Adstar المخولون يمكنهم الوصول لبيانات المستخدمين وللأغراض الضرورية فقط." },
      { label: "مراجعات دورية", detail: "نراجع إجراءات الأمان بانتظام ونحدثها لمواكبة أفضل الممارسات." },
    ],
  },
  {
    icon: UserCheck,
    title: "حقوقك كمستخدم",
    items: [
      { label: "حق الوصول", detail: "يمكنك طلب نسخة كاملة من بياناتك الشخصية المخزنة لدينا في أي وقت." },
      { label: "حق التصحيح", detail: "يمكنك تعديل معلوماتك الشخصية مباشرة من إعدادات حسابك." },
      { label: "حق الحذف", detail: "يمكنك طلب حذف حسابك وبياناتك، مع الأخذ بعين الاعتبار التزاماتنا القانونية." },
      { label: "حق الاعتراض", detail: "يمكنك الاعتراض على معالجة بياناتك لأغراض معينة عبر التواصل مع الدعم." },
    ],
  },
  {
    icon: Trash2,
    title: "الاحتفاظ بالبيانات وحذفها",
    items: [
      { label: "مدة الاحتفاظ", detail: "نحتفظ ببياناتك طالما حسابك نشطاً أو لمدة 3 سنوات بعد آخر نشاط." },
      { label: "سجلات المعاملات", detail: "سجلات المعاملات المالية تُحتفظ بها لمدة 7 سنوات وفقاً للمتطلبات القانونية." },
      { label: "طلب الحذف", detail: "عند طلب حذف الحساب، تُحذف البيانات الشخصية خلال 30 يوم عمل." },
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="relative px-4" dir="rtl">
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-0 w-[500px] h-[500px] pointer-events-none opacity-[0.04]"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.18 250), transparent 70%)" }}
      />

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-14">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            سياسة الخصوصية
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            نحن في Adstar نأخذ خصوصيتك على محمل الجد. تشرح هذه الصفحة بوضوح ما نجمعه من بيانات، وكيف نستخدمها، وكيف نحميها.
          </p>
        </div>

        {/* Highlight banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-10 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">التزامنا بخصوصيتك</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              لا نبيع بياناتك. لا نشاركها إلا بما هو ضروري لتشغيل الخدمة. أنت دائماً في السيطرة على معلوماتك.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={section.title}
              className="rounded-2xl border border-border/50 bg-card/60 p-7 hover:border-border/80 transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium">البند {i + 1}</span>
                  <h2 className="text-xl font-bold leading-tight">{section.title}</h2>
                </div>
              </div>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div key={item.label} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-primary/40 flex-shrink-0 mt-2" />
                    <div>
                      <span className="text-sm font-semibold text-foreground">{item.label}: </span>
                      <span className="text-sm text-muted-foreground leading-relaxed">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact note */}
        <div className="mt-10 rounded-2xl border border-border/50 bg-card/40 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-bold">تواصل معنا بشأن خصوصيتك</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            إذا كان لديك أي استفسار حول سياسة الخصوصية أو تريد ممارسة أي من حقوقك، تواصل معنا عبر{" "}
            <a href="/support" className="text-primary hover:underline font-medium">صفحة الدعم</a>{" "}
            وسنرد عليك خلال 48 ساعة.
          </p>
        </div>
      </div>
    </div>
  )
}