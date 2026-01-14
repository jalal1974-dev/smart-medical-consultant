/**
 * Bilingual translations for Smart Medical Consultant
 * Supports English (en) and Arabic (ar)
 */

export type Language = "en" | "ar";

export const translations = {
  en: {
    // Site info
    siteName: "Smart Medical Consultant",
    siteTagline: "Premium Healthcare Technology",
    
    // Navigation
    home: "Home",
    videos: "Videos",
    podcasts: "Podcasts",
    consultations: "Consultations",
    dashboard: "Dashboard",
    admin: "Admin Panel",
    signIn: "Sign In",
    signOut: "Sign Out",
    
    // Home page
    heroTitle: "Your Smart Medical Consultant",
    heroSubtitle: "Trusted and simplified medical content based on the latest medical advances across all specialties.",
    heroDescription: "We provide personalized consultations for each patient based on their health condition and medical reports, delivering detailed reports about their medical status based on the latest medical research and advances.",
    getStarted: "Get Started",
    bookConsultation: "Book Consultation",
    learnMore: "Learn More",
    
    // Features
    features: "Our Services",
    feature1Title: "Expert Consultations",
    feature1Desc: "Connect with certified medical professionals for personalized healthcare advice",
    feature2Title: "Bilingual Support",
    feature2Desc: "Full support in both Arabic and English for your convenience",
    feature3Title: "Secure & Private",
    feature3Desc: "Your medical information is protected with industry-standard security",
    feature4Title: "Educational Content",
    feature4Desc: "Access our library of medical videos and podcasts",
    
    // Consultation
    consultationTitle: "Book Your Consultation",
    freeConsultation: "Free Consultation Available",
    freeConsultationUsed: "Free consultation already used",
    consultationFee: "Consultation Fee",
    patientName: "Patient Name",
    patientEmail: "Patient Email",
    patientPhone: "Patient Phone",
    consultationReason: "Reason for Consultation",
    preferredLanguage: "Preferred Language",
    scheduleDate: "Preferred Date & Time",
    submit: "Submit",
    payNow: "Pay Now",
    bookFree: "Book Free Consultation",
    
    // Consultation status
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    
    // Payment
    paymentRequired: "Payment Required",
    paymentCompleted: "Payment Completed",
    paymentFailed: "Payment Failed",
    
    // Dashboard
    myConsultations: "My Consultations",
    consultationHistory: "Consultation History",
    noConsultations: "No consultations yet",
    consultationDetails: "Consultation Details",
    status: "Status",
    date: "Date",
    amount: "Amount",
    free: "Free",
    
    // Admin
    manageConsultations: "Manage Consultations",
    manageUsers: "Manage Users",
    manageContent: "Manage Content",
    addVideo: "Add Video",
    addPodcast: "Add Podcast",
    totalUsers: "Total Users",
    totalConsultations: "Total Consultations",
    pendingConsultations: "Pending Consultations",
    
    // Media
    watchVideos: "Watch Videos",
    listenPodcasts: "Listen to Podcasts",
    duration: "Duration",
    views: "Views",
    noVideos: "No videos available",
    noPodcasts: "No podcasts available",
    
    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    back: "Back",
    next: "Next",
    previous: "Previous",
    search: "Search",
    filter: "Filter",
    all: "All",
    
    // Messages
    loginRequired: "Please sign in to continue",
    consultationBooked: "Consultation booked successfully",
    consultationError: "Failed to book consultation",
    paymentSuccess: "Payment completed successfully",
    paymentError: "Payment failed. Please try again",
  },
  ar: {
    // Site info
    siteName: "مستشارك الطبي الذكي",
    siteTagline: "تقنية رعاية صحية متميزة",
    
    // Navigation
    home: "الرئيسية",
    videos: "الفيديوهات",
    podcasts: "البودكاست",
    consultations: "الاستشارات",
    dashboard: "لوحة التحكم",
    admin: "لوحة الإدارة",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    
    // Home page
    heroTitle: "مستشارك الطبي الذكي",
    heroSubtitle: "محتوى طبي موثوق ومبسط يستند إلى أحدث ما توصل إليه الطب في كل التخصصات.",
    heroDescription: "نقدم استشارات خاصة لكل مريض حسب حالته الصحية وتقاريره الطبية، ونقدم تقارير مفصلة عن حالته الطبية بناءً على أحدث ما توصل له الطب.",
    getStarted: "ابدأ الآن",
    bookConsultation: "احجز استشارة",
    learnMore: "اعرف المزيد",
    
    // Features
    features: "خدماتنا",
    feature1Title: "استشارات متخصصة",
    feature1Desc: "تواصل مع متخصصين طبيين معتمدين للحصول على نصائح صحية مخصصة",
    feature2Title: "دعم ثنائي اللغة",
    feature2Desc: "دعم كامل باللغتين العربية والإنجليزية لراحتك",
    feature3Title: "آمن وخاص",
    feature3Desc: "معلوماتك الطبية محمية بأحدث معايير الأمان",
    feature4Title: "محتوى تعليمي",
    feature4Desc: "استفد من مكتبتنا من الفيديوهات والبودكاست الطبية",
    
    // Consultation
    consultationTitle: "احجز استشارتك",
    freeConsultation: "استشارة مجانية متاحة",
    freeConsultationUsed: "تم استخدام الاستشارة المجانية",
    consultationFee: "رسوم الاستشارة",
    patientName: "اسم المريض",
    patientEmail: "البريد الإلكتروني",
    patientPhone: "رقم الهاتف",
    consultationReason: "سبب الاستشارة",
    preferredLanguage: "اللغة المفضلة",
    scheduleDate: "التاريخ والوقت المفضل",
    submit: "إرسال",
    payNow: "ادفع الآن",
    bookFree: "احجز استشارة مجانية",
    
    // Consultation status
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    completed: "مكتمل",
    cancelled: "ملغي",
    
    // Payment
    paymentRequired: "الدفع مطلوب",
    paymentCompleted: "تم الدفع",
    paymentFailed: "فشل الدفع",
    
    // Dashboard
    myConsultations: "استشاراتي",
    consultationHistory: "سجل الاستشارات",
    noConsultations: "لا توجد استشارات بعد",
    consultationDetails: "تفاصيل الاستشارة",
    status: "الحالة",
    date: "التاريخ",
    amount: "المبلغ",
    free: "مجاني",
    
    // Admin
    manageConsultations: "إدارة الاستشارات",
    manageUsers: "إدارة المستخدمين",
    manageContent: "إدارة المحتوى",
    addVideo: "إضافة فيديو",
    addPodcast: "إضافة بودكاست",
    totalUsers: "إجمالي المستخدمين",
    totalConsultations: "إجمالي الاستشارات",
    pendingConsultations: "الاستشارات المعلقة",
    
    // Media
    watchVideos: "شاهد الفيديوهات",
    listenPodcasts: "استمع للبودكاست",
    duration: "المدة",
    views: "المشاهدات",
    noVideos: "لا توجد فيديوهات متاحة",
    noPodcasts: "لا توجد بودكاست متاحة",
    
    // Common
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجح",
    cancel: "إلغاء",
    save: "حفظ",
    delete: "حذف",
    edit: "تعديل",
    view: "عرض",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    search: "بحث",
    filter: "تصفية",
    all: "الكل",
    
    // Messages
    loginRequired: "يرجى تسجيل الدخول للمتابعة",
    consultationBooked: "تم حجز الاستشارة بنجاح",
    consultationError: "فشل حجز الاستشارة",
    paymentSuccess: "تم الدفع بنجاح",
    paymentError: "فشل الدفع. يرجى المحاولة مرة أخرى",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key];
}
