/**
 * PPTX Report Generation using Manus LLM + pptxgenjs
 * Generates a 5-slide medical consultation report in Arabic or English.
 */
import PptxGenJS from "pptxgenjs";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// Brand color palette
const COLORS = {
  cyan: "06B6D4",
  green: "10B981",
  white: "FFFFFF",
  black: "1E293B",
  gray: "64748B",
  lightBg: "F0FDFA",
};

interface PptxSection {
  symptoms: string;
  diagnosis: string;
  recommendations: string;
  tests: string;
}

/**
 * Parse LLM response into structured sections.
 */
function parseAnalysis(text: string, isArabic: boolean): PptxSection {
  const diagnosisKw = isArabic
    ? ["تشخيص", "التشخيص", "تحليل", "diagnosis"]
    : ["diagnosis", "analysis", "assessment"];
  const recommendKw = isArabic
    ? ["توصي", "علاج", "خطة", "recommend", "treatment"]
    : ["recommend", "treatment", "plan", "management"];
  const testsKw = isArabic
    ? ["فحوص", "تحاليل", "فحص", "اختبار", "test"]
    : ["test", "investigation", "lab", "examination"];

  const lines = text.split("\n");
  let current: keyof PptxSection | "" = "";
  const buckets: Record<keyof PptxSection, string[]> = {
    symptoms: [],
    diagnosis: [],
    recommendations: [],
    tests: [],
  };

  for (const line of lines) {
    const ll = line.toLowerCase();
    if (diagnosisKw.some((k) => ll.includes(k))) {
      current = "diagnosis";
    } else if (recommendKw.some((k) => ll.includes(k))) {
      current = "recommendations";
    } else if (testsKw.some((k) => ll.includes(k))) {
      current = "tests";
    } else if (line.trim() && current) {
      buckets[current].push(line.trim());
    }
  }

  const join = (arr: string[]) => arr.join("\n");

  // Fallback: split by double-newline paragraphs
  if (!buckets.diagnosis.length && !buckets.recommendations.length) {
    const parts = text.split(/\n\n+/);
    return {
      symptoms: "",
      diagnosis: parts[0] ?? text.substring(0, 800),
      recommendations: parts[1] ?? "",
      tests: parts[2] ?? "",
    };
  }

  return {
    symptoms: "",
    diagnosis: join(buckets.diagnosis),
    recommendations: join(buckets.recommendations),
    tests: join(buckets.tests),
  };
}

/**
 * Add a header bar + title to a slide.
 */
function addSlideHeader(
  pptx: PptxGenJS,
  slide: ReturnType<PptxGenJS["addSlide"]>,
  title: string,
  color: string
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 1.1,
    fill: { color },
  });
  slide.addText(title, {
    x: 0.4, y: 0.2, w: 9.2, h: 0.7,
    fontSize: 28,
    bold: true,
    color: COLORS.white,
    fontFace: "Arial",
  });
}

/**
 * Add body text to a slide.
 */
function addBody(
  slide: ReturnType<PptxGenJS["addSlide"]>,
  text: string,
  isArabic: boolean
) {
  slide.addText(text || (isArabic ? "لا توجد معلومات متاحة" : "No information available"), {
    x: 0.6, y: 1.4, w: 8.8, h: 4.8,
    fontSize: 16,
    color: COLORS.black,
    fontFace: "Arial",
    align: isArabic ? "right" : "left",
    valign: "top",
    wrap: true,
  });
}

export async function generatePptxForConsultation(params: {
  consultationId: number;
  patientName: string;
  symptoms: string;
  medicalHistory: string | null;
  aiAnalysis: string | null;
  preferredLanguage: "en" | "ar";
}): Promise<string> {
  const { consultationId, patientName, symptoms, medicalHistory, aiAnalysis, preferredLanguage } = params;
  const isArabic = preferredLanguage === "ar";

  // ── 1. Generate / parse medical analysis ──────────────────────────────────
  let sections: PptxSection;

  if (aiAnalysis) {
    // Try to parse existing JSON analysis
    try {
      const parsed = JSON.parse(aiAnalysis);
      sections = {
        symptoms,
        diagnosis:
          typeof parsed.diagnosis === "object"
            ? `${parsed.diagnosis.primary ?? ""}\n\n${(parsed.diagnosis.differential ?? []).join("\n")}`
            : String(parsed.diagnosis ?? ""),
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.join("\n")
          : String(parsed.recommendations ?? ""),
        tests: Array.isArray(parsed.medications)
          ? parsed.medications.map((m: { name: string; dosage: string }) => `${m.name} — ${m.dosage}`).join("\n")
          : String(parsed.tests ?? ""),
      };
    } catch {
      sections = parseAnalysis(aiAnalysis, isArabic);
      sections.symptoms = symptoms;
    }
  } else {
    // Call LLM to generate analysis
    const prompt = isArabic
      ? `أنت طبيب استشاري متخصص. قم بتحليل الحالة التالية وقدم:
1. التشخيص الأولي المحتمل
2. التوصيات العلاجية
3. الفحوصات الطبية المطلوبة

المريض: ${patientName}
الأعراض: ${symptoms}
التاريخ المرضي: ${medicalHistory || "لا يوجد"}

قدم التحليل بشكل واضح ومفصل باللغة العربية.`
      : `You are a specialist medical consultant. Analyze this case and provide:
1. Possible initial diagnosis
2. Treatment recommendations
3. Required medical tests

Patient: ${patientName}
Symptoms: ${symptoms}
Medical History: ${medicalHistory || "None"}

Provide clear and detailed analysis in English.`;

    const resp = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });
    const rawContent = resp.choices?.[0]?.message?.content ?? "";
    const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    sections = parseAnalysis(text, isArabic);
    sections.symptoms = symptoms;
  }

  // ── 2. Build PPTX ─────────────────────────────────────────────────────────
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"
  pptx.author = "Smart Medical Consultant";
  pptx.subject = isArabic ? "تقرير طبي" : "Medical Report";

  // Slide 1: Cover
  const s1 = pptx.addSlide();
  s1.background = { color: COLORS.lightBg };
  s1.addText(
    isArabic ? "🩺 مستشارك الطبي الذكي" : "🩺 Smart Medical Consultant",
    { x: 1, y: 2, w: 11.33, h: 1.2, fontSize: 40, bold: true, color: COLORS.cyan, align: "center", fontFace: "Arial" }
  );
  s1.addText(`📋 ${patientName}`, {
    x: 1, y: 3.5, w: 11.33, h: 0.7, fontSize: 26, color: COLORS.black, align: "center", fontFace: "Arial",
  });
  s1.addText(`📅 ${new Date().toLocaleDateString(isArabic ? "ar-JO" : "en-GB")}`, {
    x: 1, y: 4.4, w: 11.33, h: 0.5, fontSize: 18, color: COLORS.gray, align: "center", fontFace: "Arial",
  });

  // Slide 2: Symptoms
  const s2 = pptx.addSlide();
  s2.background = { color: COLORS.white };
  addSlideHeader(pptx, s2, isArabic ? "🩺 الأعراض المبلغ عنها" : "🩺 Reported Symptoms", COLORS.cyan);
  addBody(s2, sections.symptoms || symptoms, isArabic);

  // Slide 3: Diagnosis
  const s3 = pptx.addSlide();
  s3.background = { color: COLORS.white };
  addSlideHeader(pptx, s3, isArabic ? "🔬 التشخيص الأولي" : "🔬 Initial Diagnosis", COLORS.green);
  addBody(s3, sections.diagnosis, isArabic);

  // Slide 4: Recommendations
  const s4 = pptx.addSlide();
  s4.background = { color: COLORS.white };
  addSlideHeader(pptx, s4, isArabic ? "💊 التوصيات العلاجية" : "💊 Treatment Recommendations", COLORS.cyan);
  addBody(s4, sections.recommendations, isArabic);

  // Slide 5: Tests / Medications
  const s5 = pptx.addSlide();
  s5.background = { color: COLORS.white };
  addSlideHeader(pptx, s5, isArabic ? "💉 الفحوصات والأدوية" : "💉 Tests & Medications", COLORS.green);
  addBody(s5, sections.tests, isArabic);

  // ── 3. Export buffer & upload to S3 ───────────────────────────────────────
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const safeName = patientName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
  const key = `pptx-reports/${consultationId}/${safeName}-${nanoid(8)}.pptx`;
  const { url } = await storagePut(
    key,
    buffer,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );

  return url;
}
