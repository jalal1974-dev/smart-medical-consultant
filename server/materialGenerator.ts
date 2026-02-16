import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

interface ConsultationData {
  consultationId: number;
  patientName: string;
  symptoms: string;
  medicalHistory?: string;
  medicalReports?: string[];
  labResults?: string[];
  xrayImages?: string[];
  preferredLanguage: "en" | "ar";
}

interface GeneratedMaterials {
  reportUrl: string;
  infographicUrl: string;
  slideDeckUrl: string;
  analysisText: string;
}

/**
 * Generate comprehensive medical materials (report, infographic, slide deck)
 * for a consultation submission
 */
export async function generateConsultationMaterials(
  data: ConsultationData
): Promise<GeneratedMaterials> {
  const { patientName, symptoms, medicalHistory, preferredLanguage } = data;

  // Step 1: Generate comprehensive medical analysis
  const analysisText = await generateMedicalAnalysis(data);

  // Step 2: Generate PDF report
  const reportUrl = await generatePDFReport(data, analysisText);

  // Step 3: Generate infographic
  const infographicUrl = await generateInfographic(data, analysisText);

  // Step 4: Generate slide deck
  const slideDeckUrl = await generateSlideDeck(data, analysisText);

  return {
    reportUrl,
    infographicUrl,
    slideDeckUrl,
    analysisText,
  };
}

/**
 * Generate comprehensive medical analysis using LLM
 */
async function generateMedicalAnalysis(data: ConsultationData): Promise<string> {
  const { patientName, symptoms, medicalHistory, preferredLanguage } = data;

  const systemPrompt = preferredLanguage === "ar"
    ? `أنت طبيب استشاري متخصص. قم بتحليل الحالة الطبية التالية وقدم:
1. ملخص الأعراض
2. التشخيصات المحتملة (مرتبة حسب الاحتمالية)
3. الفحوصات الموصى بها
4. خطة العلاج المقترحة
5. نصائح للمريض
6. علامات التحذير التي تتطلب عناية طبية فورية

يجب أن يكون التحليل شاملاً ومهنياً ومبنياً على أحدث الأدلة الطبية.`
    : `You are a specialist medical consultant. Analyze the following medical case and provide:
1. Summary of symptoms
2. Potential diagnoses (ranked by likelihood)
3. Recommended tests and examinations
4. Suggested treatment plan
5. Patient advice and lifestyle recommendations
6. Warning signs requiring immediate medical attention

The analysis should be comprehensive, professional, and based on current medical evidence.`;

  const userPrompt = preferredLanguage === "ar"
    ? `اسم المريض: ${patientName}

الأعراض الرئيسية:
${symptoms}

${medicalHistory ? `التاريخ الطبي:\n${medicalHistory}` : "لا يوجد تاريخ طبي مسجل"}

قم بتقديم تحليل طبي شامل لهذه الحالة.`
    : `Patient Name: ${patientName}

Main Symptoms:
${symptoms}

${medicalHistory ? `Medical History:\n${medicalHistory}` : "No medical history provided"}

Please provide a comprehensive medical analysis for this case.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0].message.content;
  return typeof content === 'string' ? content : "";
}

/**
 * Generate PDF report from analysis
 */
async function generatePDFReport(
  data: ConsultationData,
  analysisText: string
): Promise<string> {
  const { patientName, symptoms, medicalHistory, preferredLanguage, consultationId } = data;

  // Create HTML content for PDF
  const htmlContent = preferredLanguage === "ar" ? `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; direction: rtl; }
    h1 { color: #2c5282; border-bottom: 3px solid #2c5282; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .section { margin: 20px 0; padding: 15px; background: #f7fafc; border-right: 4px solid #4299e1; }
    .header { text-align: center; margin-bottom: 40px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; }
  </style>
</head>
<body>
  <div class="header">
    <h1>مستشارك الطبي الذكي</h1>
    <p>تقرير التحليل الطبي الشامل</p>
    <p>رقم الاستشارة: ${consultationId}</p>
  </div>

  <div class="section">
    <h2>معلومات المريض</h2>
    <p><strong>الاسم:</strong> ${patientName}</p>
    <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
  </div>

  <div class="section">
    <h2>الأعراض المسجلة</h2>
    <p>${symptoms}</p>
  </div>

  ${medicalHistory ? `
  <div class="section">
    <h2>التاريخ الطبي</h2>
    <p>${medicalHistory}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2>التحليل الطبي</h2>
    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${analysisText}</pre>
  </div>

  <div class="footer">
    <p><strong>تنبيه مهم:</strong> هذا التحليل تم إنشاؤه بواسطة الذكاء الاصطناعي ويجب مراجعته من قبل طبيب مختص قبل اتخاذ أي قرارات علاجية.</p>
    <p>© ${new Date().getFullYear()} مستشارك الطبي الذكي - جميع الحقوق محفوظة</p>
  </div>
</body>
</html>
  ` : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2c5282; border-bottom: 3px solid #2c5282; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .section { margin: 20px 0; padding: 15px; background: #f7fafc; border-left: 4px solid #4299e1; }
    .header { text-align: center; margin-bottom: 40px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Smart Medical Consultant</h1>
    <p>Comprehensive Medical Analysis Report</p>
    <p>Consultation ID: ${consultationId}</p>
  </div>

  <div class="section">
    <h2>Patient Information</h2>
    <p><strong>Name:</strong> ${patientName}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US')}</p>
  </div>

  <div class="section">
    <h2>Reported Symptoms</h2>
    <p>${symptoms}</p>
  </div>

  ${medicalHistory ? `
  <div class="section">
    <h2>Medical History</h2>
    <p>${medicalHistory}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2>Medical Analysis</h2>
    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${analysisText}</pre>
  </div>

  <div class="footer">
    <p><strong>Important Notice:</strong> This analysis was generated by AI and must be reviewed by a qualified medical professional before making any treatment decisions.</p>
    <p>© ${new Date().getFullYear()} Smart Medical Consultant - All Rights Reserved</p>
  </div>
</body>
</html>
  `;

  // Convert HTML to PDF using a library or service
  // For now, we'll upload the HTML and return the URL
  // In production, you would use a PDF generation service
  const pdfBuffer = Buffer.from(htmlContent, 'utf-8');
  const fileName = `consultation-report-${consultationId}-${nanoid(8)}.html`;
  
  const { url } = await storagePut(fileName, pdfBuffer, 'text/html');
  return url;
}

/**
 * Generate infographic image
 */
async function generateInfographic(
  data: ConsultationData,
  analysisText: string
): Promise<string> {
  const { patientName, symptoms, preferredLanguage } = data;

  // Generate infographic prompt
  const prompt = preferredLanguage === "ar"
    ? `إنشاء إنفوجرافيك طبي احترافي يلخص الحالة الطبية التالية:

المريض: ${patientName}
الأعراض: ${symptoms}

يجب أن يتضمن الإنفوجرافيك:
- ملخص الأعراض بأيقونات واضحة
- التشخيصات المحتملة
- الفحوصات الموصى بها
- نصائح العلاج الأساسية

التصميم يجب أن يكون:
- احترافي وطبي
- ألوان هادئة (أزرق، أخضر، أبيض)
- سهل القراءة والفهم
- يحتوي على أيقونات طبية واضحة`
    : `Create a professional medical infographic summarizing the following medical case:

Patient: ${patientName}
Symptoms: ${symptoms}

The infographic should include:
- Summary of symptoms with clear icons
- Potential diagnoses
- Recommended tests
- Key treatment advice

Design should be:
- Professional and medical
- Calm colors (blue, green, white)
- Easy to read and understand
- Contains clear medical icons`;

  // Note: This would use an image generation API
  // For now, return a placeholder
  const placeholderUrl = "https://via.placeholder.com/800x1200/4299e1/ffffff?text=Medical+Infographic";
  return placeholderUrl;
}

/**
 * Generate slide deck presentation
 */
async function generateSlideDeck(
  data: ConsultationData,
  analysisText: string
): Promise<string> {
  const { patientName, symptoms, medicalHistory, preferredLanguage, consultationId } = data;

  // Generate slide deck content in markdown format
  const slidesMarkdown = preferredLanguage === "ar" ? `
# مستشارك الطبي الذكي
## تقرير التحليل الطبي

رقم الاستشارة: ${consultationId}

---

# معلومات المريض

- **الاسم:** ${patientName}
- **التاريخ:** ${new Date().toLocaleDateString('ar-EG')}

---

# الأعراض المسجلة

${symptoms}

---

${medicalHistory ? `# التاريخ الطبي\n\n${medicalHistory}\n\n---\n\n` : ''}

# التحليل الطبي

${analysisText.substring(0, 500)}...

---

# التوصيات

- مراجعة طبيب مختص
- إجراء الفحوصات الموصى بها
- اتباع خطة العلاج المقترحة

---

# تنبيه مهم

**هذا التحليل تم إنشاؤه بواسطة الذكاء الاصطناعي**

يجب مراجعته من قبل طبيب مختص قبل اتخاذ أي قرارات علاجية

---

# شكراً لاستخدامكم مستشارك الطبي الذكي

للمزيد من المعلومات، يرجى التواصل مع فريقنا الطبي
  ` : `
# Smart Medical Consultant
## Medical Analysis Report

Consultation ID: ${consultationId}

---

# Patient Information

- **Name:** ${patientName}
- **Date:** ${new Date().toLocaleDateString('en-US')}

---

# Reported Symptoms

${symptoms}

---

${medicalHistory ? `# Medical History\n\n${medicalHistory}\n\n---\n\n` : ''}

# Medical Analysis

${analysisText.substring(0, 500)}...

---

# Recommendations

- Consult with a qualified physician
- Complete recommended tests
- Follow suggested treatment plan

---

# Important Notice

**This analysis was generated by AI**

Must be reviewed by a qualified medical professional before making any treatment decisions

---

# Thank You for Using Smart Medical Consultant

For more information, please contact our medical team
  `;

  // Upload slides markdown
  const slidesBuffer = Buffer.from(slidesMarkdown, 'utf-8');
  const fileName = `consultation-slides-${consultationId}-${nanoid(8)}.md`;
  
  const { url } = await storagePut(fileName, slidesBuffer, 'text/markdown');
  return url;
}
