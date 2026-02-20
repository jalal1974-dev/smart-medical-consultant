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
  
  // Parse analysis to extract key information
  const diagnosisMatch = analysis.match(/(?:diagnosis|تشخيص)[:\s]+(.*?)(?:\n|$)/i);
  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : "تحليل جاري";
  
  // Extract recommendations
  const recommendationsMatch = analysis.match(/(?:recommendations|توصيات)[:\s]+([\s\S]*?)(?:\n\n|$)/i);
  const recommendationsText = recommendationsMatch ? recommendationsMatch[1] : "";
  const recommendations = recommendationsText
    .split(/\n|•|-/)
    .filter(r => r.trim().length > 0)
    .slice(0, 4);
  
  return {
    title: preferredLanguage === "ar" ? "ملخص الحالة الطبية" : "Medical Case Summary",
    patientInfo: {
      name: patientName,
    },
    symptoms: symptoms.split(/[,،]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0),
    diagnosis,
    recommendations: recommendations.length > 0 ? recommendations : [
      preferredLanguage === "ar" ? "استشارة طبيب مختص" : "Consult a specialist"
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
  
  const slides: SlideContent[] = [
    // Title slide
    {
      id: "title",
      title: isArabic ? "التقرير الطبي" : "Medical Report",
      content: `${isArabic ? "المريض" : "Patient"}: ${patientName}`,
      type: "title",
    },
    // Symptoms slide
    {
      id: "symptoms",
      title: isArabic ? "الأعراض المقدمة" : "Presented Symptoms",
      content: symptoms,
      type: "content",
    },
    // Medical history slide (if available)
    ...(medicalHistory ? [{
      id: "history",
      title: isArabic ? "التاريخ الطبي" : "Medical History",
      content: medicalHistory,
      type: "content" as const,
    }] : []),
    // Analysis slide
    {
      id: "analysis",
      title: isArabic ? "التحليل الطبي" : "Medical Analysis",
      content: analysis.substring(0, 500) + "...",
      type: "content",
    },
    // Recommendations slide
    {
      id: "recommendations",
      title: isArabic ? "التوصيات" : "Recommendations",
      content: extractRecommendations(analysis, isArabic),
      type: "content",
    },
    // Closing slide
    {
      id: "closing",
      title: isArabic ? "شكراً لثقتكم" : "Thank You",
      content: isArabic 
        ? "مستشارك الطبي الذكي\nللمتابعة والاستفسارات، يرجى التواصل معنا"
        : "Your Smart Medical Consultant\nFor follow-up and inquiries, please contact us",
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
