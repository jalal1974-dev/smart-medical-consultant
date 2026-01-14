import { notifyOwner } from "./_core/notification";

interface ConsultationReceiptData {
  consultationId: number;
  patientName: string;
  patientEmail: string;
  amount: number;
  isFree: boolean;
  preferredLanguage: "en" | "ar";
  createdAt: Date;
  status: string;
}

/**
 * Send consultation receipt email to patient
 * Note: This uses the owner notification system as a temporary solution.
 * In production, you should integrate a proper email service (SendGrid, AWS SES, etc.)
 */
export async function sendConsultationReceipt(data: ConsultationReceiptData): Promise<boolean> {
  const { consultationId, patientName, patientEmail, amount, isFree, preferredLanguage, createdAt, status } = data;

  const isArabic = preferredLanguage === "ar";

  // Format date
  const formattedDate = createdAt.toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Email title
  const title = isArabic
    ? `إيصال استشارة طبية #${consultationId}`
    : `Medical Consultation Receipt #${consultationId}`;

  // Email content
  const content = isArabic
    ? `
مرحباً ${patientName}،

شكراً لك على استخدام خدمة مستشارك الطبي الذكي. تم استلام طلب الاستشارة الطبية الخاص بك بنجاح.

تفاصيل الإيصال:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• رقم الاستشارة: #${consultationId}
• التاريخ: ${formattedDate}
• المبلغ: ${isFree ? "مجاني" : `$${amount}`}
• الحالة: ${getStatusInArabic(status)}
• البريد الإلكتروني: ${patientEmail}

الخطوات التالية:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. سيقوم نظام الذكاء الاصطناعي المتقدم لدينا بتحليل تقاريرك الطبية ونتائج المختبر والأشعة والأعراض بدقة عالية.

2. سيراجع فريقنا من الأطباء المتخصصين نتائج التحليل للتأكد من دقتها وشموليتها.

3. ستتلقى تقريراً طبياً مفصلاً يتضمن:
   • تحليل شامل لحالتك الصحية
   • فيديوهات توضيحية مبسطة
   • رسوم بيانية ومعلومات مرئية
   • توصيات مبنية على أحدث الأبحاث الطبية

4. يمكنك مناقشة التقرير مع طبيبك المعالج لاتخاذ القرارات الطبية المناسبة.

5. سنتابع معك لتقييم مدى توافق خطة العلاج مع أحدث الأدبيات الطبية.

يمكنك متابعة حالة استشارتك في أي وقت من خلال لوحة التحكم على موقعنا.

مع أطيب التمنيات بالصحة والعافية،
فريق مستشارك الطبي الذكي

ملاحظة: هذا البريد الإلكتروني تم إرساله تلقائياً، يرجى عدم الرد عليه.
    `
    : `
Hello ${patientName},

Thank you for using Smart Medical Consultant. Your medical consultation request has been received successfully.

Receipt Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Consultation ID: #${consultationId}
• Date: ${formattedDate}
• Amount: ${isFree ? "Free" : `$${amount}`}
• Status: ${getStatusInEnglish(status)}
• Email: ${patientEmail}

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Our advanced AI system will analyze your medical reports, lab results, X-rays, and symptoms with high precision.

2. Our team of medical specialists will review the AI analysis to ensure accuracy and comprehensiveness.

3. You will receive a detailed medical report including:
   • Comprehensive analysis of your health condition
   • Explanatory videos in simple language
   • Infographics and visual information
   • Recommendations based on the latest medical research

4. You can discuss the report with your treating physician to make informed medical decisions.

5. We will follow up with you to evaluate whether your treatment plan aligns with the latest medical literature.

You can track your consultation status anytime through the dashboard on our website.

Best wishes for your health and wellness,
Smart Medical Consultant Team

Note: This email was sent automatically, please do not reply to it.
    `;

  // Send notification to owner (temporary solution)
  // In production, this should send directly to the patient's email
  try {
    await notifyOwner({
      title: `[Patient Email] ${title}`,
      content: `To: ${patientEmail}\n\n${content}`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send consultation receipt:", error);
    return false;
  }
}

function getStatusInArabic(status: string): string {
  switch (status) {
    case "submitted":
      return "تم الإرسال";
    case "ai_processing":
      return "قيد التحليل بالذكاء الاصطناعي";
    case "specialist_review":
      return "مراجعة الأخصائي";
    case "completed":
      return "مكتمل";
    case "follow_up":
      return "متابعة";
    default:
      return status;
  }
}

function getStatusInEnglish(status: string): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "ai_processing":
      return "AI Processing";
    case "specialist_review":
      return "Specialist Review";
    case "completed":
      return "Completed";
    case "follow_up":
      return "Follow-up";
    default:
      return status;
  }
}

/**
 * Send consultation status update email to patient
 */
export async function sendConsultationStatusUpdate(
  consultationId: number,
  patientName: string,
  patientEmail: string,
  newStatus: string,
  preferredLanguage: "en" | "ar"
): Promise<boolean> {
  const isArabic = preferredLanguage === "ar";

  const title = isArabic
    ? `تحديث حالة الاستشارة #${consultationId}`
    : `Consultation Status Update #${consultationId}`;

  const statusText = isArabic ? getStatusInArabic(newStatus) : getStatusInEnglish(newStatus);

  const content = isArabic
    ? `
مرحباً ${patientName}،

تم تحديث حالة استشارتك الطبية.

رقم الاستشارة: #${consultationId}
الحالة الجديدة: ${statusText}

${
  newStatus === "completed"
    ? "تقريرك الطبي المفصل جاهز الآن! يمكنك الاطلاع عليه من خلال لوحة التحكم على موقعنا."
    : "سنبقيك على اطلاع بأي تحديثات جديدة."
}

مع أطيب التمنيات،
فريق مستشارك الطبي الذكي
    `
    : `
Hello ${patientName},

Your medical consultation status has been updated.

Consultation ID: #${consultationId}
New Status: ${statusText}

${
  newStatus === "completed"
    ? "Your detailed medical report is now ready! You can view it through the dashboard on our website."
    : "We'll keep you updated with any new developments."
}

Best regards,
Smart Medical Consultant Team
    `;

  try {
    await notifyOwner({
      title: `[Patient Email] ${title}`,
      content: `To: ${patientEmail}\n\n${content}`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send status update:", error);
    return false;
  }
}
