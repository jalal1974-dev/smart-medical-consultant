import { MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {language === 'ar' ? 'مستشارك الطبي الذكي' : 'Smart Medical Consultant'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'منصة استشارات طبية مدعومة بالذكاء الاصطناعي تقدم تحليلاً شاملاً ومراجعة من قبل أطباء متخصصين.'
                : 'AI-powered medical consultation platform providing comprehensive analysis and specialist review.'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === 'ar' ? 'الرئيسية' : 'Home'}
                </a>
              </li>
              <li>
                <a href="/consultations" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === 'ar' ? 'الاستشارات' : 'Consultations'}
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {language === 'ar' ? 'خدماتنا' : 'Our Services'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">
                {language === 'ar' ? 'التحليل الطبي بالذكاء الاصطناعي' : 'AI Medical Analysis'}
              </li>
              <li className="text-muted-foreground">
                {language === 'ar' ? 'مراجعة الأطباء المتخصصين' : 'Specialist Review'}
              </li>
              <li className="text-muted-foreground">
                {language === 'ar' ? 'استشارات عن بعد' : 'Telemedicine'}
              </li>
              <li className="text-muted-foreground">
                {language === 'ar' ? 'رأي طبي ثانٍ' : 'Second Opinion'}
              </li>
            </ul>
          </div>

          {/* Find Us */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {language === 'ar' ? 'ابحث عنا' : 'Find Us'}
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  {language === 'ar' 
                    ? 'نخدم جميع أنحاء المملكة العربية السعودية'
                    : 'Serving all of Saudi Arabia'}
                </span>
              </p>
              
              {/* Google Business Profile Link */}
              <a
                href="https://g.page/r/YOUR_PLACE_ID/review"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                {language === 'ar' ? 'اتركنا تقييماً على Google' : 'Leave us a Google Review'}
              </a>

              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? 'تقييمك يساعدنا على تحسين خدماتنا'
                  : 'Your review helps us improve our services'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            © {currentYear} {language === 'ar' ? 'مستشارك الطبي الذكي' : 'Smart Medical Consultant'}.{' '}
            {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <a href="/terms" className="hover:text-foreground transition-colors hover:underline underline-offset-2">
              {language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
            </a>
            <span>·</span>
            <a href="/privacy" className="hover:text-foreground transition-colors hover:underline underline-offset-2">
              {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </a>
          </div>
          <p className="mt-2 text-xs">
            {language === 'ar' 
              ? 'للطوارئ الطبية، يرجى الاتصال بالرقم 997 أو زيارة أقرب قسم طوارئ.'
              : 'For medical emergencies, please call 997 or visit the nearest emergency room.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
