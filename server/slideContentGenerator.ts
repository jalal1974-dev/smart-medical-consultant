/**
 * Generate structured slide content for medical consultations
 * This content can be used to create actual slides via Manus Slides API
 */

export interface SlideContent {
  id: string;
  title: string;
  content: string;
  type: "title" | "content" | "visual";
}

export interface InfographicContent {
  title: string;
  patientInfo: {
    name: string;
    age?: string;
    gender?: string;
  };
  symptoms: string[];
  diagnosis: string;
  urgencyLevel?: string;
  keyFindings: string[];
  recommendations: string[];
  language: "en" | "ar";
}

export interface SlideDeckContent {
  title: string;
  slides: SlideContent[];
  language: "en" | "ar";
}

/**
 * Generate infographic content structure
 */
export function generateInfographicContent(
  consultationData: any,
  analysis: string
): InfographicContent {
  const { patientName, symptoms, preferredLanguage } = consultationData;
  const isArabic = preferredLanguage === "ar";
  
  // Parse analysis to extract key information
  const diagnosisMatch = analysis.match(/(?:diagnosis|تشخيص)[:\s]+(.*?)(?:\n|$)/i);
  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : (isArabic ? "تحليل جاري" : "Analysis in progress");
  
  // Extract urgency level
  const urgencyMatch = analysis.match(/(?:urgency|أولوية)[:\s]+(\w+)/i);
  const urgencyLevel = urgencyMatch ? urgencyMatch[1].toLowerCase() : "medium";
  
  // Extract key findings
  const findingsMatch = analysis.match(/(?:key findings|النتائج الرئيسية)[:\s]+([\s\S]*?)(?:\n\n|(?:recommendations|توصيات))/i);
  const findingsText = findingsMatch ? findingsMatch[1] : "";
  const keyFindings = findingsText
    .split(/\n|•|-/)
    .filter(f => f.trim().length > 0)
    .slice(0, 3)
    .map(f => f.trim());
  
  // Extract recommendations
  const recommendationsMatch = analysis.match(/(?:recommendations|توصيات)[:\s]+([\s\S]*?)(?:\n\n|$)/i);
  const recommendationsText = recommendationsMatch ? recommendationsMatch[1] : "";
  const recommendations = recommendationsText
    .split(/\n|•|-/)
    .filter(r => r.trim().length > 0)
    .slice(0, 4)
    .map(r => r.trim());
  
  return {
    title: isArabic ? "ملخص الحالة الطبية" : "Medical Case Summary",
    patientInfo: {
      name: patientName,
    },
    symptoms: symptoms.split(/[,،]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0).slice(0, 5),
    diagnosis,
    urgencyLevel,
    keyFindings: keyFindings.length > 0 ? keyFindings : [
      isArabic ? "تحليل شامل للأعراض" : "Comprehensive symptom analysis",
      isArabic ? "تقييم الحالة الطبية" : "Medical condition assessment",
      isArabic ? "توصيات علاجية مخصصة" : "Personalized treatment recommendations"
    ],
    recommendations: recommendations.length > 0 ? recommendations : [
      isArabic ? "استشارة طبيب مختص" : "Consult a specialist",
      isArabic ? "المتابعة الدورية" : "Regular follow-up",
      isArabic ? "الالتزام بالعلاج" : "Adhere to treatment"
    ],
    language: preferredLanguage,
  };
}

/**
 * Generate slide deck content structure
 */
export function generateSlideDeckContent(
  consultationData: any,
  analysis: string
): SlideDeckContent {
  const { patientName, symptoms, medicalHistory, preferredLanguage } = consultationData;
  
  const isArabic = preferredLanguage === "ar";
  
  // Extract structured information from analysis
  const urgencyMatch = analysis.match(/(?:urgency|أولوية)[:\s]+(\w+)/i);
  const urgencyLevel = urgencyMatch ? urgencyMatch[1].toLowerCase() : "medium";
  
  const diagnosisMatch = analysis.match(/(?:diagnosis|تشخيص)[:\s]+(.*?)(?:\n|$)/i);
  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : "";
  
  const findingsMatch = analysis.match(/(?:key findings|النتائج الرئيسية)[:\s]+([\s\S]*?)(?:\n\n|(?:recommendations|توصيات))/i);
  const keyFindings = findingsMatch ? findingsMatch[1].trim() : "";
  
  const recommendationsText = extractRecommendations(analysis, isArabic);
  
  const slides: SlideContent[] = [
    // Title slide
    {
      id: "title",
      title: isArabic ? "التقرير الطبي الشامل" : "Comprehensive Medical Report",
      content: `${isArabic ? "المريض" : "Patient"}: ${patientName}\n${isArabic ? "التاريخ" : "Date"}: ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}`,
      type: "title",
    },
    // Overview slide with urgency
    {
      id: "overview",
      title: isArabic ? "نظرة عامة" : "Overview",
      content: `${isArabic ? "مستوى الأولوية" : "Urgency Level"}: ${urgencyLevel.toUpperCase()}\n\n${isArabic ? "الأعراض الرئيسية" : "Main Symptoms"}:\n${symptoms}`,
      type: "visual",
    },
    // Symptoms slide with visual structure
    {
      id: "symptoms",
      title: isArabic ? "الأعراض المقدمة" : "Presented Symptoms",
      content: symptoms.split(/[,،]/).map((s: string, i: number) => `${i + 1}. ${s.trim()}`).join('\n'),
      type: "content",
    },
    // Medical history slide (if available)
    ...(medicalHistory ? [{
      id: "history",
      title: isArabic ? "التاريخ الطبي" : "Medical History",
      content: medicalHistory,
      type: "content" as const,
    }] : []),
    // Diagnosis slide
    ...(diagnosis ? [{
      id: "diagnosis",
      title: isArabic ? "التشخيص" : "Diagnosis",
      content: diagnosis,
      type: "visual" as const,
    }] : []),
    // Key findings slide
    ...(keyFindings ? [{
      id: "findings",
      title: isArabic ? "النتائج الرئيسية" : "Key Findings",
      content: keyFindings,
      type: "content" as const,
    }] : []),
    // Recommendations slide with visual structure
    {
      id: "recommendations",
      title: isArabic ? "التوصيات العلاجية" : "Treatment Recommendations",
      content: recommendationsText,
      type: "visual",
    },
    // Next steps slide
    {
      id: "next-steps",
      title: isArabic ? "الخطوات التالية" : "Next Steps",
      content: isArabic 
        ? "1. مراجعة الطبيب المختص\n2. إجراء الفحوصات اللازمة\n3. المتابعة الدورية\n4. الالتزام بالعلاج الموصوف"
        : "1. Consult with specialist\n2. Complete necessary tests\n3. Regular follow-up\n4. Adhere to prescribed treatment",
      type: "content",
    },
    // Closing slide
    {
      id: "closing",
      title: isArabic ? "شكراً لثقتكم" : "Thank You",
      content: isArabic 
        ? "مستشارك الطبي الذكي\n\nللمتابعة والاستفسارات\nيرجى التواصل معنا"
        : "Your Smart Medical Consultant\n\nFor follow-up and inquiries\nPlease contact us",
      type: "title",
    },
  ];
  
  return {
    title: isArabic ? `التقرير الطبي - ${patientName}` : `Medical Report - ${patientName}`,
    slides,
    language: preferredLanguage,
  };
}

function extractRecommendations(analysis: string, isArabic: boolean): string {
  const recommendationsMatch = analysis.match(/(?:recommendations|توصيات)[:\s]+([\s\S]*?)(?:\n\n|$)/i);
  if (recommendationsMatch) {
    return recommendationsMatch[1].trim();
  }
  return isArabic 
    ? "• استشارة طبيب مختص\n• المتابعة الدورية\n• الالتزام بالعلاج الموصوف"
    : "• Consult a specialist\n• Regular follow-up\n• Adhere to prescribed treatment";
}
