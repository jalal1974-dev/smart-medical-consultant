import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  MessageCircle,
  Mail,
  Clock,
  HelpCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  Send,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface FAQ {
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
}

const faqs: FAQ[] = [
  {
    questionAr: "كيف تعمل المنصة؟",
    questionEn: "How does the platform work?",
    answerAr:
      "1. سجّل حساباً مجانياً\n2. أرسل استشارتك مع الأعراض والملفات الطبية\n3. يقوم الذكاء الاصطناعي بتوليد تحليل طبي شامل\n4. يراجع طبيب مختص التحليل ويعتمده\n5. تتلقى تقريراً شاملاً مع توصيات",
    answerEn:
      "1. Register a free account\n2. Submit your consultation with symptoms and medical files\n3. AI generates a comprehensive medical analysis\n4. A specialist reviews and approves the analysis\n5. You receive a full report with recommendations",
  },
  {
    questionAr: "كم يستغرق الرد؟",
    questionEn: "How long does it take?",
    answerAr:
      "التحليل بالذكاء الاصطناعي: فوري (دقائق)\nمراجعة الطبيب المختص: 24–48 ساعة",
    answerEn:
      "AI analysis: Immediate (minutes)\nSpecialist review: 24–48 hours",
  },
  {
    questionAr: "هل الاستشارة تحل محل زيارة الطبيب؟",
    questionEn: "Does this replace a doctor visit?",
    answerAr:
      "لا. استشاراتنا معلوماتية فقط وتهدف إلى مساعدتك على فهم حالتك بشكل أفضل. في الحالات الخطيرة أو الطارئة، يُرجى مراجعة طبيب مباشرة أو الاتصال بالطوارئ.",
    answerEn:
      "No. Our consultations are informational only and are designed to help you better understand your condition. For serious or emergency cases, please see a doctor directly or call emergency services.",
  },
  {
    questionAr: "كيف أدفع؟",
    questionEn: "How do I pay?",
    answerAr:
      "نقبل الدفع عبر PayPal فقط:\n• الاستشارة الأولى: مجانية عند التسجيل\n• كل استشارة إضافية: 5 دولار",
    answerEn:
      "We accept PayPal only:\n• First consultation: Free on registration\n• Each additional consultation: $5",
  },
  {
    questionAr: "هل بياناتي آمنة؟",
    questionEn: "Is my data secure?",
    answerAr:
      "نعم. نستخدم تشفير SSL لجميع الاتصالات، ونخزن ملفاتك بأمان على خوادم S3 المشفرة. لن نشارك بياناتك مع أي طرف ثالث دون موافقتك.",
    answerEn:
      "Yes. We use SSL encryption for all communications and store your files securely on encrypted S3 servers. We will never share your data with any third party without your consent.",
  },
];

export default function Contact() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const sendMessage = trpc.contact.sendMessage.useMutation();

  const validateForm = () => {
    const errs: typeof formErrors = {};
    if (!form.name.trim()) errs.name = isAr ? "الاسم مطلوب" : "Name is required";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = isAr ? "بريد إلكتروني صحيح مطلوب" : "Valid email is required";
    if (!form.message || form.message.trim().length < 10)
      errs.message = isAr ? "الرسالة يجب أن تكون 10 أحرف على الأقل" : "Message must be at least 10 characters";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await sendMessage.mutateAsync(form);
      setSubmitted(true);
      setForm({ name: "", email: "", message: "" });
      toast.success(isAr ? "تم إرسال رسالتك بنجاح!" : "Message sent successfully!");
    } catch {
      toast.error(isAr ? "حدث خطأ. يرجى المحاولة مرة أخرى." : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-16">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-bold mb-3">
            {isAr ? "اتصل بنا" : "Contact Us"}
          </h1>
          <p className="text-slate-300 text-lg">
            {isAr
              ? "هل لديك سؤال؟ نحن هنا للمساعدة!"
              : "Have a question? We're here to help!"}
          </p>
        </div>
      </div>

      <div className="container max-w-4xl py-12 space-y-10">
        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WhatsApp */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <MessageCircle className="w-5 h-5" />
                {isAr ? "واتساب" : "WhatsApp"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {isAr
                  ? "تواصل معنا مباشرة عبر واتساب للحصول على رد سريع"
                  : "Contact us directly via WhatsApp for a quick response"}
              </p>
              <p className="font-semibold text-lg" dir="ltr">+962 777 066 005</p>
              <a
                href="https://wa.me/962777066005"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="w-4 h-4" />
                {isAr ? "فتح واتساب" : "Open WhatsApp"}
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Mail className="w-5 h-5" />
                {isAr ? "البريد الإلكتروني" : "Email"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {isAr
                  ? "لأي استفسارات عامة أو طلبات خاصة"
                  : "For general inquiries or special requests"}
              </p>
              <p className="font-semibold" dir="ltr">support@smartmedcon.com</p>
              <a
                href="mailto:support@smartmedcon.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                {isAr ? "إرسال بريد إلكتروني" : "Send Email"}
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              {isAr ? "ساعات العمل" : "Business Hours"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                <p className="font-semibold text-green-800 dark:text-green-300">
                  {isAr ? "الأحد – الخميس" : "Sunday – Thursday"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {isAr
                    ? "9:00 ص – 6:00 م (توقيت عمّان)"
                    : "9:00 AM – 6:00 PM (Amman Time)"}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  {isAr ? "الجمعة – السبت" : "Friday – Saturday"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {isAr ? "مغلق" : "Closed"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {isAr
                  ? "في حالات الطوارئ الطبية، يُرجى الاتصال بالطوارئ مباشرة (911)"
                  : "For medical emergencies, please call emergency services directly (911)"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              {isAr ? "نموذج التواصل" : "Send Us a Message"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Send className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">
                  {isAr ? "تم إرسال رسالتك!" : "Message Sent!"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {isAr
                    ? "سنرد عليك خلال ساعات العمل. شكراً لتواصلك معنا."
                    : "We'll get back to you during business hours. Thank you for reaching out."}
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  {isAr ? "إرسال رسالة أخرى" : "Send Another Message"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {isAr ? "الاسم" : "Name"}
                    </Label>
                    <Input
                      placeholder={isAr ? "اسمك الكامل" : "Your full name"}
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="mt-1"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {isAr ? "البريد الإلكتروني" : "Email"}
                    </Label>
                    <Input
                      type="email"
                      placeholder={isAr ? "بريدك الإلكتروني" : "your@email.com"}
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="mt-1"
                      dir="ltr"
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    {isAr ? "رسالتك" : "Your Message"}
                  </Label>
                  <Textarea
                    placeholder={
                      isAr
                        ? "اكتب رسالتك هنا..."
                        : "Write your message here..."
                    }
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    rows={5}
                    className="mt-1 resize-none"
                  />
                  {formErrors.message && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    isAr ? "جارٍ الإرسال..." : "Sending..."
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {isAr ? "إرسال الرسالة" : "Send Message"}
                    </span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-500" />
            {isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-sm">
                    {isAr ? faq.questionAr : faq.questionEn}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line border-t pt-3 bg-muted/20">
                    {isAr ? faq.answerAr : faq.answerEn}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {isAr ? "الموقع" : "Location"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {isAr ? "الأردن — عمّان" : "Jordan — Amman"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-bold mb-4">
            {isAr ? "روابط سريعة" : "Quick Links"}
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/", labelAr: "الصفحة الرئيسية", labelEn: "Home" },
              { href: "/consultations", labelAr: "نموذج الاستشارة", labelEn: "Consultation Form" },
              { href: "/terms", labelAr: "شروط الخدمة", labelEn: "Terms of Service" },
              { href: "/privacy", labelAr: "سياسة الخصوصية", labelEn: "Privacy Policy" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                {isAr ? link.labelAr : link.labelEn}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
