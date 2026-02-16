import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { generateSlides, generateMedicalInfographic } from "./_core/slidesGeneration";
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
 * Generate infographic image using Manus Slides API
 */
async function generateInfographic(
  data: ConsultationData,
  analysisText: string
): Promise<string> {
  const { patientName, symptoms, preferredLanguage } = data;

  // Extract key recommendations from analysis
  const recommendations = extractRecommendations(analysisText, preferredLanguage);
  
  // Extract diagnosis from analysis
  const diagnosis = extractDiagnosis(analysisText, preferredLanguage);

  try {
    // Generate infographic using Manus Slides API
    const result = await generateMedicalInfographic(
      patientName,
      symptoms,
      diagnosis,
      recommendations,
      preferredLanguage
    );

    return result.downloadUrl;
  } catch (error) {
    console.error("Failed to generate infographic:", error);
    // Fallback to placeholder
    return "https://via.placeholder.com/800x1200/4299e1/ffffff?text=Medical+Infographic";
  }
}

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

/**
 * Generate slide deck presentation using Manus Slides API
 */
async function generateSlideDeck(
  data: ConsultationData,
  analysisText: string
): Promise<string> {
  const { patientName, symptoms, medicalHistory, preferredLanguage, consultationId } = data;

  const isArabic = preferredLanguage === "ar";
  const title = isArabic ? "مستشارك الطبي الذكي - تقرير التحليل الطبي" : "Smart Medical Consultant - Medical Analysis Report";

  // Extract recommendations
  const recommendations = extractRecommendations(analysisText, preferredLanguage);
  const diagnosis = extractDiagnosis(analysisText, preferredLanguage);

  // Prepare slides content
  const slides = [];

  // Slide 1: Patient Info
  slides.push({
    title: isArabic ? "معلومات المريض" : "Patient Information",
    content: isArabic
      ? `**الاسم:** ${patientName}\n\n**التاريخ:** ${new Date().toLocaleDateString('ar-EG')}\n\n**رقم الاستشارة:** ${consultationId}`
      : `**Name:** ${patientName}\n\n**Date:** ${new Date().toLocaleDateString('en-US')}\n\n**Consultation ID:** ${consultationId}`,
  });

  // Slide 2: Symptoms
  slides.push({
    title: isArabic ? "الأعراض المسجلة" : "Reported Symptoms",
    content: symptoms,
  });

  // Slide 3: Medical History (if exists)
  if (medicalHistory) {
    slides.push({
      title: isArabic ? "التاريخ الطبي" : "Medical History",
      content: medicalHistory,
    });
  }

  // Slide 4: Diagnosis
  slides.push({
    title: isArabic ? "التشخيص المحتمل" : "Potential Diagnosis",
    content: diagnosis,
  });

  // Slide 5: Recommendations
  slides.push({
    title: isArabic ? "التوصيات" : "Recommendations",
    content: recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n\n"),
  });

  // Slide 6: Important Notice
  slides.push({
    title: isArabic ? "تنبيه مهم" : "Important Notice",
    content: isArabic
      ? "هذا التحليل تم إنشاؤه بواسطة الذكاء الاصطناعي\n\nيجب مراجعته من قبل طبيب مختص قبل اتخاذ أي قرارات علاجية"
      : "This analysis was generated by AI\n\nMust be reviewed by a qualified medical professional before making any treatment decisions",
  });

  try {
    // Generate slides using Manus Slides API
    const result = await generateSlides({
      title,
      slides,
      theme: "medical",
      language: preferredLanguage,
    });

    return result.downloadUrl;
  } catch (error) {
    console.error("Failed to generate slide deck:", error);
    // Fallback: save as markdown
    const slidesMarkdown = `# ${title}\n\n${slides.map(s => `## ${s.title}\n\n${s.content}\n\n---\n`).join("\n")}`;
    const slidesBuffer = Buffer.from(slidesMarkdown, 'utf-8');
    const fileName = `consultation-slides-${consultationId}-${nanoid(8)}.md`;
    const { url } = await storagePut(fileName, slidesBuffer, 'text/markdown');
    return url;
  }
}
