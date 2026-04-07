import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Shield, AlertTriangle, CreditCard, Lock, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home / العودة للرئيسية</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">شروط الخدمة | Terms of Service</h1>
              <p className="text-muted-foreground mt-1">
                آخر تحديث: ٧ أبريل ٢٠٢٦ | Last Updated: April 7, 2026
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* Section 1 — Acceptance */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">1.</span>
            قبول الشروط | Acceptance of Terms
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              باستخدامك لمنصة <strong>مستشارك الطبي الذكي</strong>، فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى التوقف عن استخدام المنصة.
            </p>
            <p>
              By using <strong>Smart Medical Consultant (مستشارك الطبي الذكي)</strong>, you agree to these terms and conditions. If you do not agree to any part of these terms, please discontinue use of the platform.
            </p>
          </div>
        </section>

        {/* Section 2 — Services */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">2.</span>
            الخدمات المقدمة | Services Provided
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              نقدم استشارات طبية مدعومة بالذكاء الاصطناعي <strong>لأغراض معلوماتية فقط</strong>. يقوم النظام بتحليل التقارير الطبية ونتائج المختبرات والأشعة والأعراض والتاريخ المرضي، ويولّد تقارير شاملة ومراجعة من متخصصين طبيين.
            </p>
            <p>
              We provide AI-powered medical consultations <strong>for informational purposes only</strong>. The system analyzes medical reports, lab results, X-rays, symptoms, and medical history, and generates comprehensive reports reviewed by medical specialists.
            </p>
            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-600 dark:text-amber-400" dir="rtl">⚠️ تنبيه هام جداً</p>
                <ul className="space-y-1 text-right" dir="rtl">
                  <li>• هذه الاستشارات <strong>ليست بديلاً</strong> عن الاستشارة الطبية المباشرة مع طبيب مختص</li>
                  <li>• في حالات الطوارئ، اتصل بالإسعاف فوراً ولا تعتمد على هذه المنصة</li>
                  <li>• القرار الطبي النهائي يعود دائماً للطبيب المعالج</li>
                </ul>
                <p className="font-semibold text-amber-600 dark:text-amber-400 mt-2">⚠️ Important Notice</p>
                <ul className="space-y-1">
                  <li>• This is <strong>NOT a substitute</strong> for professional medical advice from a qualified physician</li>
                  <li>• In emergencies, call emergency services immediately — do not rely on this platform</li>
                  <li>• Final medical decisions always rest with your treating physician</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 — Liability */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">3.</span>
            المسؤولية | Liability
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              نبذل قصارى جهدنا لتقديم معلومات دقيقة ومحدّثة. غير أننا <strong>لا نتحمل مسؤولية قانونية</strong> عن أي قرارات طبية أو صحية تُتخذ بناءً على المعلومات المقدمة عبر هذه المنصة.
            </p>
            <p>
              We strive to provide accurate and up-to-date information. However, we are <strong>not legally liable</strong> for any medical or health decisions made based on information provided through this platform.
            </p>
          </div>
        </section>

        {/* Section 4 — Pricing */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">4.</span>
            الخطط والدفع | Plans and Payments
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-4 text-sm leading-relaxed">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">الخطة المجانية | Free Plan</h3>
                <ul className="space-y-1" dir="rtl">
                  <li>• <strong>استشارة واحدة مجانية</strong> عند التسجيل</li>
                  <li>• لا يلزم إدخال بيانات الدفع</li>
                </ul>
                <ul className="space-y-1 mt-2">
                  <li>• <strong>1 free consultation</strong> upon registration</li>
                  <li>• No payment details required</li>
                </ul>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-2">الدفع عند الحاجة | Pay Per Consultation</h3>
                <ul className="space-y-1" dir="rtl">
                  <li>• <strong>$5 دولار</strong> لكل استشارة إضافية</li>
                  <li>• الدفع عبر PayPal فقط</li>
                  <li>• لا توجد رسوم اشتراك شهرية</li>
                </ul>
                <ul className="space-y-1 mt-2">
                  <li>• <strong>$5 USD</strong> per additional consultation</li>
                  <li>• Payment via PayPal only</li>
                  <li>• No monthly subscription fees</li>
                </ul>
              </div>
            </div>
            <p className="text-muted-foreground text-xs" dir="rtl">
              * جميع المبالغ بالدولار الأمريكي. المدفوعات غير قابلة للاسترداد بعد إجراء التحليل. | All amounts in USD. Payments are non-refundable after analysis is performed.
            </p>
          </div>
        </section>

        {/* Section 5 — Privacy */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">5.</span>
            خصوصية البيانات | Data Privacy
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              جميع البيانات الطبية محمية ومشفرة. لن نشارك معلوماتك الشخصية أو الطبية مع أطراف ثالثة دون موافقتك الصريحة، إلا في الحالات التي يستوجبها القانون.
            </p>
            <p>
              All medical data is protected and encrypted. We will not share your personal or medical information with third parties without your explicit consent, except where required by law.
            </p>
            <p>
              For full details, see our{" "}
              <Link href="/privacy" className="text-primary underline hover:no-underline">
                Privacy Policy / سياسة الخصوصية
              </Link>.
            </p>
          </div>
        </section>

        {/* Section 6 — Intellectual Property */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">6.</span>
            حقوق الملكية الفكرية | Intellectual Property
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              المحتوى المولّد بواسطة الذكاء الاصطناعي بناءً على بياناتك ملك لك. المنصة والنظام والتصميم ملك حصري لـ<strong>مستشارك الطبي الذكي</strong>.
            </p>
            <p>
              AI-generated content based on your data belongs to you. The platform, system, and design are the exclusive property of <strong>Smart Medical Consultant</strong>.
            </p>
          </div>
        </section>

        {/* Section 7 — Termination */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">7.</span>
            إنهاء الخدمة | Termination
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              يحق لك إلغاء حسابك في أي وقت. نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط أو تُستخدم بطريقة مسيئة.
            </p>
            <p>
              You may cancel your account at any time. We reserve the right to suspend or terminate accounts that violate these terms or are used abusively.
            </p>
          </div>
        </section>

        {/* Section 8 — Changes */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">8.</span>
            التغييرات على الشروط | Changes to Terms
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              قد نقوم بتحديث هذه الشروط من وقت لآخر. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة.
            </p>
            <p>
              We may update these terms from time to time. You will be notified of any material changes via email or an in-platform notification.
            </p>
          </div>
        </section>

        {/* Section 9 — Governing Law */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">9.</span>
            القانون الساري | Governing Law
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              تخضع هذه الشروط وتُفسَّر وفقاً لقوانين <strong>المملكة الأردنية الهاشمية</strong>.
            </p>
            <p>
              These terms are governed by and construed in accordance with the laws of the <strong>Hashemite Kingdom of Jordan</strong>.
            </p>
          </div>
        </section>

        {/* Section 10 — Contact */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">10.</span>
            الاتصال | Contact
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              للأسئلة أو الاستفسارات حول هذه الشروط:
            </p>
            <p>For questions or inquiries about these terms:</p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <a
                href="https://wa.me/962777066005"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:underline font-medium"
              >
                <Phone className="h-4 w-4" />
                WhatsApp: +962 777 066 005
              </a>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-medium" dir="rtl">
            بقبولك لهذه الشروط، فإنك تقر بأنك قرأتها وفهمتها ووافقت عليها.
          </p>
          <p className="font-medium">
            By accepting these terms, you acknowledge that you have read, understood, and agreed to them.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/" className="text-primary hover:underline">Home</Link>
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/register" className="text-primary hover:underline">Register</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
