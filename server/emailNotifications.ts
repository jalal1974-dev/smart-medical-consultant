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

/**
 * Send email notification to admins when a patient asks a new question
 */
export async function sendNewQuestionNotification(
  consultationId: number,
  patientName: string,
  patientEmail: string,
  question: string
): Promise<boolean> {
  const title = "🔔 New Patient Question";
  const content = `
A patient has submitted a new question about their consultation.

Patient Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Name: ${patientName}
• Email: ${patientEmail}
• Consultation ID: #${consultationId}

Question:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${question}

Please log in to the admin panel to answer this question.
  `.trim();

  try {
    await notifyOwner({ title, content });
    return true;
  } catch (error) {
    console.error("Failed to send new question notification:", error);
    return false;
  }
}

/**
 * Send email notification to patient when their question is answered
 */
export async function sendQuestionAnsweredNotification(
  patientEmail: string,
  patientName: string,
  consultationId: number,
  question: string,
  answer: string,
  preferredLanguage: "en" | "ar"
): Promise<boolean> {
  const isArabic = preferredLanguage === "ar";
  
  const title = isArabic 
    ? `تم الرد على سؤالك - استشارة #${consultationId}`
    : `Your Question Has Been Answered - Consultation #${consultationId}`;

  const greeting = isArabic
    ? `عزيزي/عزيزتي ${patientName}،`
    : `Dear ${patientName},`;

  const intro = isArabic
    ? "تم الرد على سؤالك من قبل أحد أطبائنا المتخصصين:"
    : "Your question has been answered by one of our medical specialists:";

  const questionLabel = isArabic ? "سؤالك:" : "Your Question:";
  const answerLabel = isArabic ? "الإجابة:" : "Answer:";
  const viewLabel = isArabic ? "لعرض التفاصيل الكاملة، يرجى تسجيل الدخول إلى حسابك." : "To view full details, please log in to your account.";
  const thanksLabel = isArabic ? "شكراً لثقتك بنا،" : "Thank you for trusting us,";
  const teamLabel = isArabic ? "فريق مستشارك الطبي الذكي" : "Smart Medical Consultant Team";

  const content = `
${greeting}

${intro}

${questionLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${question}

${answerLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${answer}

${viewLabel}

${thanksLabel}
${teamLabel}
  `.trim();

  try {
    await notifyOwner({
      title: `[Patient Email] ${title}`,
      content: `To: ${patientEmail}\n\n${content}`,
    });
    return true;
  } catch (error) {
    console.error("Failed to send question answered notification:", error);
    return false;
  }
}

/**
 * Send password reset email to user
 * Uses the owner notification system as a relay since direct SMTP is not configured.
 * The owner/admin receives the reset link and can forward it to the user.
 * In production, replace with direct email sending (SendGrid, AWS SES, Nodemailer, etc.)
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string | null,
  resetUrl: string
): Promise<boolean> {
  const displayName = userName || userEmail;

  const title = `Password Reset Request - ${displayName}`;
  const content = `
A password reset was requested for the following account:

User: ${displayName}
Email: ${userEmail}

Reset Link (expires in 1 hour):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${resetUrl}

If this user did not request a password reset, no action is needed.

Note: This link expires in 1 hour. After that, the user will need to request a new reset link.
  `.trim();

  try {
    await notifyOwner({ title, content });
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
