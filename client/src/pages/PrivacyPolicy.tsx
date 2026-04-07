import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Lock, Database, Eye, Trash2, Phone, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
            <Lock className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">سياسة الخصوصية | Privacy Policy</h1>
              <p className="text-muted-foreground mt-1">
                آخر تحديث: ٧ أبريل ٢٠٢٦ | Last Updated: April 7, 2026
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* Intro */}
        <section>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              نحن في <strong>مستشارك الطبي الذكي</strong> نلتزم بحماية خصوصيتك وأمان بياناتك الطبية. توضح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها.
            </p>
            <p>
              At <strong>Smart Medical Consultant</strong>, we are committed to protecting your privacy and the security of your medical data. This policy explains how we collect, use, and protect your information.
            </p>
          </div>
        </section>

        {/* Section 1 — Data We Collect */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">1.</span>
            البيانات التي نجمعها | Data We Collect
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-4 text-sm leading-relaxed">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2 text-right" dir="rtl">بيانات الحساب</h3>
                <ul className="space-y-1 text-right text-muted-foreground" dir="rtl">
                  <li>• الاسم الكامل</li>
                  <li>• عنوان البريد الإلكتروني</li>
                  <li>• رقم الهاتف (اختياري)</li>
                  <li>• صورة الملف الشخصي (اختياري)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Account Data</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Full name</li>
                  <li>• Email address</li>
                  <li>• Phone number (optional)</li>
                  <li>• Profile picture (optional)</li>
                </ul>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              <div>
                <h3 className="font-semibold mb-2 text-right" dir="rtl">البيانات الطبية</h3>
                <ul className="space-y-1 text-right text-muted-foreground" dir="rtl">
                  <li>• التقارير الطبية والأشعة</li>
                  <li>• نتائج المختبرات</li>
                  <li>• الأعراض والتاريخ المرضي</li>
                  <li>• الأدوية الحالية</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Medical Data</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Medical reports and X-rays</li>
                  <li>• Lab results</li>
                  <li>• Symptoms and medical history</li>
                  <li>• Current medications</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — How We Use Data */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">2.</span>
            كيف نستخدم بياناتك | How We Use Your Data
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <ul className="space-y-2 text-right" dir="rtl">
              <li>• <strong>تقديم الخدمة:</strong> تحليل بياناتك الطبية وتوليد التقارير والمحتوى التعليمي</li>
              <li>• <strong>مراجعة المتخصصين:</strong> مشاركة التحليل مع المتخصصين الطبيين للمراجعة والاعتماد</li>
              <li>• <strong>تحسين الخدمة:</strong> تحليل أنماط الاستخدام لتحسين جودة النظام (بشكل مجهول)</li>
              <li>• <strong>التواصل:</strong> إرسال إشعارات حول حالة استشارتك</li>
            </ul>
            <ul className="space-y-2 mt-3">
              <li>• <strong>Service delivery:</strong> Analyzing your medical data and generating reports and educational content</li>
              <li>• <strong>Specialist review:</strong> Sharing analysis with medical specialists for review and approval</li>
              <li>• <strong>Service improvement:</strong> Analyzing usage patterns to improve system quality (anonymized)</li>
              <li>• <strong>Communication:</strong> Sending notifications about your consultation status</li>
            </ul>
          </div>
        </section>

        {/* Section 3 — Data Protection */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">3.</span>
            حماية البيانات | Data Protection
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              نستخدم تقنيات تشفير متقدمة لحماية بياناتك:
            </p>
            <p>We use advanced encryption technologies to protect your data:</p>
            <div className="grid md:grid-cols-3 gap-3 mt-2">
              {[
                { ar: "تشفير SSL/TLS لجميع الاتصالات", en: "SSL/TLS encryption for all connections" },
                { ar: "تخزين آمن على خوادم مشفرة", en: "Secure storage on encrypted servers" },
                { ar: "وصول محدود للبيانات الطبية", en: "Limited access to medical data" },
              ].map((item, i) => (
                <div key={i} className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-right" dir="rtl">{item.ar}</p>
                  <p className="text-xs mt-1">{item.en}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Data Sharing */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">4.</span>
            مشاركة البيانات | Data Sharing
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right font-semibold" dir="rtl">
              لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تجارية.
            </p>
            <p className="font-semibold">
              We do not sell your data or share it with third parties for commercial purposes.
            </p>
            <p className="text-right text-muted-foreground" dir="rtl">
              الاستثناءات الوحيدة هي: المتخصصون الطبيون المرخصون الذين يراجعون استشارتك، ومزودو الخدمات التقنية الضروريين (مثل خدمات التخزين السحابي)، والجهات القانونية عند الاقتضاء.
            </p>
            <p className="text-muted-foreground">
              The only exceptions are: licensed medical specialists who review your consultation, necessary technical service providers (such as cloud storage services), and legal authorities when required.
            </p>
          </div>
        </section>

        {/* Section 5 — Your Rights */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">5.</span>
            حقوقك | Your Rights
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-right" dir="rtl">
                <li>• <strong>الوصول:</strong> طلب نسخة من بياناتك</li>
                <li>• <strong>التصحيح:</strong> تصحيح البيانات غير الدقيقة</li>
                <li>• <strong>الحذف:</strong> طلب حذف حسابك وبياناتك</li>
                <li>• <strong>الاعتراض:</strong> الاعتراض على معالجة بياناتك</li>
                <li>• <strong>النقل:</strong> طلب نقل بياناتك إلى منصة أخرى</li>
              </ul>
              <ul className="space-y-2">
                <li>• <strong>Access:</strong> Request a copy of your data</li>
                <li>• <strong>Correction:</strong> Correct inaccurate data</li>
                <li>• <strong>Deletion:</strong> Request deletion of your account and data</li>
                <li>• <strong>Objection:</strong> Object to the processing of your data</li>
                <li>• <strong>Portability:</strong> Request transfer of your data to another platform</li>
              </ul>
            </div>
            <p className="text-muted-foreground text-xs mt-2" dir="rtl">
              لممارسة أي من هذه الحقوق، تواصل معنا عبر WhatsApp: +962 777 066 005
            </p>
            <p className="text-muted-foreground text-xs">
              To exercise any of these rights, contact us via WhatsApp: +962 777 066 005
            </p>
          </div>
        </section>

        {/* Section 6 — Cookies */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">6.</span>
            ملفات تعريف الارتباط | Cookies
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              نستخدم ملفات تعريف الارتباط الضرورية فقط للحفاظ على جلسة تسجيل الدخول وتحسين تجربتك. لا نستخدم ملفات تعريف ارتباط تتبع لأغراض إعلانية.
            </p>
            <p>
              We use only necessary cookies to maintain your login session and improve your experience. We do not use tracking cookies for advertising purposes.
            </p>
          </div>
        </section>

        {/* Section 7 — Data Retention */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary font-bold">7.</span>
            الاحتفاظ بالبيانات | Data Retention
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              نحتفظ ببياناتك طالما حسابك نشط. عند حذف حسابك، يتم حذف بياناتك الشخصية خلال 30 يوماً، مع الاحتفاظ بالسجلات المطلوبة قانونياً فقط.
            </p>
            <p>
              We retain your data for as long as your account is active. Upon account deletion, your personal data is deleted within 30 days, retaining only legally required records.
            </p>
          </div>
        </section>

        {/* Section 8 — Contact */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-primary font-bold">8.</span>
            الاتصال | Contact
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm leading-relaxed">
            <p className="text-right" dir="rtl">
              لأي أسئلة أو مخاوف تتعلق بخصوصيتك:
            </p>
            <p>For any questions or concerns regarding your privacy:</p>
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
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-medium" dir="rtl">
            باستخدامك للمنصة، فإنك توافق على سياسة الخصوصية هذه.
          </p>
          <p className="font-medium">
            By using the platform, you agree to this Privacy Policy.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/" className="text-primary hover:underline">Home</Link>
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            <Link href="/register" className="text-primary hover:underline">Register</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
