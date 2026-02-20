import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { generateInfographicContent, generateSlideDeckContent } from "./slideContentGenerator";

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
  infographicContent: string; // JSON string of slide content
  slideDeckContent: string; // JSON string of slide content
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

  // Step 3: Prepare infographic content (actual slides generated later by admin)
  const infographicContent = generateInfographicContent(data, analysisText);

  // Step 4: Prepare slide deck content (actual slides generated later by admin)
  const slideDeckContent = generateSlideDeckContent(data, analysisText);

  return {
    reportUrl,
    infographicContent: JSON.stringify(infographicContent),
    slideDeckContent: JSON.stringify(slideDeckContent),
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

// Infographic generation removed - content is prepared in generateInfographicContent
// Actual slides are generated by admin trigger using Manus Slides API

/**
 * Extract diagnosis from analysis text
 */
function extractDiagnosis(analysisText: string, language: "en" | "ar"): string {
  const lines = analysisText.split("\n");
  const diagnosisKeyword = language === "ar" ? "التشخيص" : "diagnos";
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(diagnosisKeyword.toLowerCase())) {
      // Return the next few lines as diagnosis
      return lines.slice(i, i + 3).join(" ").substring(0, 200);
    }
  }
  
  return language === "ar" 
    ? "يتطلب تقييم طبي شامل"
    : "Requires comprehensive medical evaluation";
}

/**
 * Extract recommendations from analysis text
 */
function extractRecommendations(analysisText: string, language: "en" | "ar"): string[] {
  const lines = analysisText.split("\n");
  const recommendations: string[] = [];
  const recommendKeyword = language === "ar" ? "التوصيات" : "recommend";
  
  let inRecommendations = false;
  for (const line of lines) {
    if (line.toLowerCase().includes(recommendKeyword.toLowerCase())) {
      inRecommendations = true;
      continue;
    }
    
    if (inRecommendations && line.trim()) {
      const cleaned = line.replace(/^[-*\d.]+\s*/, "").trim();
      if (cleaned.length > 10) {
        recommendations.push(cleaned);
      }
      if (recommendations.length >= 5) break;
    }
  }
  
  // Fallback recommendations
  if (recommendations.length === 0) {
    return language === "ar"
      ? [
          "مراجعة طبيب مختص",
          "إجراء الفحوصات اللازمة",
          "اتباع خطة العلاج"
        ]
      : [
          "Consult with a specialist",
          "Complete necessary tests",
          "Follow treatment plan"
        ];
  }
  
  return recommendations;
}

// Slide deck generation removed - content is prepared in generateSlideDeckContent
// Actual slides are generated by admin trigger using Manus Slides API
