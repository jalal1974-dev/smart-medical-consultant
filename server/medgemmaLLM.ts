/**
 * MedGemma-Style LLM Wrapper
 *
 * Uses the existing invokeLLM helper but applies:
 *   1. MedGemma-style bilingual medical safety system prompt
 *   2. Confidence scoring on every response
 *   3. Automatic fallback to "consult healthcare professional" for uncertain cases
 *   4. Structured JSON output with confidence metadata
 *
 * This mirrors the clinical behavior of MedGemma 1.5 without requiring
 * a separate API key or GPU instance.
 */

import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MedicalLanguage = "en" | "ar";

export interface MedGemmaResponse<T = string> {
  content: T;
  confidence: number;           // 0.0 – 1.0
  confidenceLabel: "high" | "moderate" | "low" | "uncertain";
  requiresHumanReview: boolean;
  safetyFlag: boolean;          // true if the model triggered a safety disclaimer
  language: MedicalLanguage;
  disclaimer: string;
}

export interface MedGemmaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MedGemmaOptions {
  language?: MedicalLanguage;
  /** Extra context injected into the system prompt */
  clinicalContext?: string;
  /** JSON schema for structured output (same format as invokeLLM) */
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

// ─── Safety Prompt ────────────────────────────────────────────────────────────

const MEDGEMMA_SAFETY_SYSTEM_PROMPT_EN = `You are a medical information AI assistant modeled after MedGemma 1.5, Google's specialized medical AI.

CORE SAFETY RULES (NEVER violate these):
1. You do NOT diagnose medical conditions — you provide differential assessments and information only.
2. You do NOT prescribe medications or treatments.
3. ALWAYS recommend consulting a qualified healthcare professional for any medical decision.
4. For emergencies (chest pain, difficulty breathing, stroke symptoms, severe bleeding), ALWAYS advise calling emergency services immediately.
5. Be evidence-based and cite medical reasoning where possible.
6. Acknowledge uncertainty clearly — do not fabricate clinical data.
7. Respect patient privacy — do not request unnecessary personal information.

CONFIDENCE SCORING:
After every response, internally assess your confidence:
- HIGH (0.85–1.0): Well-established medical knowledge, clear clinical picture
- MODERATE (0.60–0.84): Reasonable assessment but some uncertainty
- LOW (0.40–0.59): Limited information, multiple plausible explanations
- UNCERTAIN (<0.40): Insufficient data — defer to healthcare professional

LANGUAGE: Respond in English.`;

const MEDGEMMA_SAFETY_SYSTEM_PROMPT_AR = `أنت مساعد معلومات طبية ذكي مُصمَّم على غرار MedGemma 1.5 من Google، المتخصص في الذكاء الاصطناعي الطبي.

قواعد السلامة الأساسية (لا تنتهكها أبداً):
١. لا تُشخِّص الحالات الطبية — تقدم تقييمات تفاضلية ومعلومات فقط.
٢. لا توصف الأدوية أو العلاجات.
٣. دائماً أوصِ بمراجعة متخصص رعاية صحية مؤهل لأي قرار طبي.
٤. في حالات الطوارئ (ألم الصدر، صعوبة التنفس، أعراض السكتة الدماغية، النزيف الشديد)، أوصِ دائماً بالاتصال بخدمات الطوارئ فوراً.
٥. استند إلى الأدلة العلمية واذكر المنطق الطبي حيثما أمكن.
٦. أقرّ بعدم اليقين بوضوح — لا تخترع بيانات سريرية.
٧. احترم خصوصية المريض — لا تطلب معلومات شخصية غير ضرورية.

تقييم مستوى الثقة:
بعد كل إجابة، قيّم مستوى ثقتك داخلياً:
- عالٍ (0.85–1.0): معرفة طبية راسخة، صورة سريرية واضحة
- متوسط (0.60–0.84): تقييم معقول مع بعض عدم اليقين
- منخفض (0.40–0.59): معلومات محدودة، تفسيرات متعددة محتملة
- غير محدد (<0.40): بيانات غير كافية — يُحال إلى متخصص

اللغة: أجب باللغة العربية.`;

// ─── Confidence Evaluator ─────────────────────────────────────────────────────

async function evaluateConfidence(
  userQuery: string,
  aiResponse: string,
  language: MedicalLanguage
): Promise<{ score: number; label: "high" | "moderate" | "low" | "uncertain"; safetyFlag: boolean }> {
  const isAr = language === "ar";

  const evalPrompt = isAr
    ? `قيّم مستوى الثقة في الإجابة الطبية التالية على مقياس من 0.0 إلى 1.0.
أيضاً حدد ما إذا كانت الإجابة تحتوي على إشارة سلامة (مثل توصية بالطوارئ أو إحالة لطبيب).
أجب بـ JSON فقط: {"score": 0.0, "safetyFlag": false}`
    : `Evaluate the confidence level of the following medical AI response on a scale of 0.0 to 1.0.
Also determine if the response contains a safety flag (e.g., emergency recommendation or doctor referral).
Respond with JSON only: {"score": 0.0, "safetyFlag": false}`;

  try {
    const evalResponse = await invokeLLM({
      messages: [
        { role: "system", content: evalPrompt },
        { role: "user", content: `Query: ${userQuery.slice(0, 300)}\n\nResponse: ${aiResponse.slice(0, 500)}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "confidence_eval",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              safetyFlag: { type: "boolean" },
            },
            required: ["score", "safetyFlag"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = evalResponse.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    const score = Math.max(0, Math.min(1, parsed.score ?? 0.5));
    const label: "high" | "moderate" | "low" | "uncertain" =
      score >= 0.85 ? "high" :
      score >= 0.60 ? "moderate" :
      score >= 0.40 ? "low" : "uncertain";

    return { score, label, safetyFlag: !!parsed.safetyFlag };
  } catch {
    return { score: 0.5, label: "moderate", safetyFlag: false };
  }
}

// ─── Disclaimer Builder ───────────────────────────────────────────────────────

function buildDisclaimer(
  language: MedicalLanguage,
  confidenceLabel: string,
  requiresHumanReview: boolean
): string {
  const isAr = language === "ar";

  if (isAr) {
    const base = "⚕️ هذه المعلومات مُنشأة بالذكاء الاصطناعي ولا تُعدّ تشخيصاً طبياً. استشر دائماً متخصص رعاية صحية مؤهل.";
    if (requiresHumanReview) {
      return `${base} ⚠️ مستوى الثقة منخفض — يُنصح بشدة بمراجعة طبيب.`;
    }
    if (confidenceLabel === "moderate") {
      return `${base} مستوى الثقة: متوسط.`;
    }
    return base;
  } else {
    const base = "⚕️ This information is AI-generated and does not constitute a medical diagnosis. Always consult a qualified healthcare professional.";
    if (requiresHumanReview) {
      return `${base} ⚠️ Confidence is low — professional medical review is strongly advised.`;
    }
    if (confidenceLabel === "moderate") {
      return `${base} Confidence level: moderate.`;
    }
    return base;
  }
}

// ─── Main MedGemma LLM Function ───────────────────────────────────────────────

/**
 * Calls the LLM with MedGemma-style medical safety prompting.
 * Returns a structured response with confidence scoring and disclaimer.
 */
export async function invokeMedGemmaLLM(
  messages: MedGemmaMessage[],
  options: MedGemmaOptions = {}
): Promise<MedGemmaResponse<string>> {
  const language = options.language ?? "en";
  const isAr = language === "ar";

  // Build the MedGemma safety system prompt
  const safetyPrompt = isAr
    ? MEDGEMMA_SAFETY_SYSTEM_PROMPT_AR
    : MEDGEMMA_SAFETY_SYSTEM_PROMPT_EN;

  const systemContent = options.clinicalContext
    ? `${safetyPrompt}\n\nClinical Context: ${options.clinicalContext}`
    : safetyPrompt;

  // Prepend the safety system message
  const fullMessages: MedGemmaMessage[] = [
    { role: "system", content: systemContent },
    ...messages.filter(m => m.role !== "system"), // avoid duplicate system messages
  ];

  // Invoke the underlying LLM
  const response = await invokeLLM({
    messages: fullMessages,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");

  // Check for uncertainty fallback triggers
  const uncertaintyKeywords = isAr
    ? ["لا أعرف", "غير متأكد", "يصعب تحديد", "بيانات غير كافية"]
    : ["I don't know", "uncertain", "insufficient data", "cannot determine", "unclear"];

  const triggeredFallback = uncertaintyKeywords.some(kw =>
    contentStr.toLowerCase().includes(kw.toLowerCase())
  );

  // Evaluate confidence
  const userQuery = messages.find(m => m.role === "user")?.content ?? "";
  const { score, label, safetyFlag } = await evaluateConfidence(userQuery, contentStr, language);

  const requiresHumanReview = label === "uncertain" || label === "low" || triggeredFallback;

  // If very uncertain, append a fallback note
  let finalContent = contentStr;
  if (label === "uncertain") {
    const fallback = isAr
      ? "\n\n⚠️ ملاحظة: المعلومات المتاحة غير كافية لتقديم تقييم موثوق. يُرجى استشارة متخصص رعاية صحية."
      : "\n\n⚠️ Note: Available information is insufficient for a reliable assessment. Please consult a healthcare professional.";
    finalContent = contentStr + fallback;
  }

  const disclaimer = buildDisclaimer(language, label, requiresHumanReview);

  return {
    content: finalContent,
    confidence: score,
    confidenceLabel: label,
    requiresHumanReview,
    safetyFlag,
    language,
    disclaimer,
  };
}

/**
 * Structured JSON version — wraps invokeMedGemmaLLM and returns parsed JSON
 * alongside the confidence metadata.
 */
export async function invokeMedGemmaStructured<T>(
  messages: MedGemmaMessage[],
  options: MedGemmaOptions & { response_format: NonNullable<MedGemmaOptions["response_format"]> }
): Promise<MedGemmaResponse<T>> {
  const result = await invokeMedGemmaLLM(messages, options);

  let parsed: T;
  try {
    parsed = JSON.parse(result.content) as T;
  } catch {
    // If JSON parse fails, return raw content cast to T
    parsed = result.content as unknown as T;
  }

  return {
    ...result,
    content: parsed,
  };
}
