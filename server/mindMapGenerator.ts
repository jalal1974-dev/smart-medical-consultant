/**
 * Mind Map Generator for Medical Research Topics
 * Generates interactive mind maps to help admins identify areas for deep research
 */

import { invokeLLM } from "./_core/llm";

export interface MindMapNode {
  id: string;
  label: string;
  description: string;
  children?: MindMapNode[];
  researchPriority: "high" | "medium" | "low";
  researched: boolean;
}

export interface MindMapData {
  consultationId: number;
  rootTopic: string;
  nodes: MindMapNode[];
  createdAt: Date;
}

/**
 * Generate a mind map of research topics from consultation data
 */
export async function generateResearchMindMap(
  symptoms: string,
  medicalHistory: string | undefined,
  initialDiagnosis: string,
  language: "en" | "ar"
): Promise<MindMapData> {
  const isArabic = language === "ar";
  
  const systemPrompt = isArabic
    ? `أنت خبير طبي متخصص في تحليل الحالات المعقدة. قم بإنشاء خريطة ذهنية للمواضيع البحثية التي يجب استكشافها بعمق لتحسين التشخيص والعلاج.

قم بتنظيم المواضيع في فئات رئيسية:
1. التشخيصات المحتملة (مع التشخيصات التفريقية)
2. الفحوصات والتحاليل المطلوبة
3. خيارات العلاج والأدوية
4. المضاعفات المحتملة
5. التفاعلات الدوائية والموانع

لكل موضوع، حدد:
- أولوية البحث (عالية/متوسطة/منخفضة)
- وصف مختصر لما يجب البحث عنه
- مواضيع فرعية ذات صلة

أعد النتيجة بتنسيق JSON.`
    : `You are a medical expert specialized in analyzing complex cases. Create a mind map of research topics that should be explored in depth to improve diagnosis and treatment.

Organize topics into main categories:
1. Potential Diagnoses (with differential diagnoses)
2. Required Tests and Examinations
3. Treatment Options and Medications
4. Potential Complications
5. Drug Interactions and Contraindications

For each topic, specify:
- Research priority (high/medium/low)
- Brief description of what to research
- Related subtopics

Return the result in JSON format.`;

  const userPrompt = isArabic
    ? `الأعراض: ${symptoms}

${medicalHistory ? `التاريخ الطبي: ${medicalHistory}` : "لا يوجد تاريخ طبي"}

التشخيص الأولي: ${initialDiagnosis}

قم بإنشاء خريطة ذهنية شاملة للمواضيع البحثية.`
    : `Symptoms: ${symptoms}

${medicalHistory ? `Medical History: ${medicalHistory}` : "No medical history"}

Initial Diagnosis: ${initialDiagnosis}

Create a comprehensive mind map of research topics.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "research_mind_map",
        strict: true,
        schema: {
          type: "object",
          properties: {
            rootTopic: {
              type: "string",
              description: "The main topic of the mind map",
            },
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  description: { type: "string" },
                  priority: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                  },
                  subtopics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        label: { type: "string" },
                        description: { type: "string" },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                      },
                      required: ["id", "label", "description", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["id", "label", "description", "priority", "subtopics"],
                additionalProperties: false,
              },
            },
          },
          required: ["rootTopic", "categories"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid content in LLM response");
  }

  const parsed = JSON.parse(content);

  // Convert to mind map format
  const nodes: MindMapNode[] = parsed.categories.map((cat: any) => ({
    id: cat.id,
    label: cat.label,
    description: cat.description,
    researchPriority: cat.priority,
    researched: false,
    children: cat.subtopics.map((sub: any) => ({
      id: sub.id,
      label: sub.label,
      description: sub.description,
      researchPriority: sub.priority,
      researched: false,
    })),
  }));

  return {
    consultationId: 0, // Will be set by caller
    rootTopic: parsed.rootTopic,
    nodes,
    createdAt: new Date(),
  };
}

/**
 * Perform deep research on a specific topic from the mind map
 */
export async function performDeepResearch(
  topic: string,
  context: string,
  language: "en" | "ar"
): Promise<string> {
  const isArabic = language === "ar";

  const systemPrompt = isArabic
    ? `أنت باحث طبي متخصص. قم بإجراء بحث معمق حول الموضوع المحدد. استخدم أحدث الأدلة الطبية والدراسات السريرية.

قدم:
1. معلومات شاملة ومفصلة
2. إحصائيات ونسب مئوية إن وجدت
3. توصيات مبنية على الأدلة
4. تحذيرات وموانع مهمة
5. مراجع وإرشادات طبية

يجب أن يكون البحث دقيقاً ومهنياً وشاملاً.`
    : `You are a specialized medical researcher. Conduct in-depth research on the specified topic. Use the latest medical evidence and clinical studies.

Provide:
1. Comprehensive and detailed information
2. Statistics and percentages where available
3. Evidence-based recommendations
4. Important warnings and contraindications
5. Medical references and guidelines

The research should be accurate, professional, and comprehensive.`;

  const userPrompt = isArabic
    ? `الموضوع البحثي: ${topic}

السياق: ${context}

قم بإجراء بحث معمق وتقديم تحليل شامل.`
    : `Research Topic: ${topic}

Context: ${context}

Conduct in-depth research and provide comprehensive analysis.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid content in deep research response");
  }

  return content;
}
