/**
 * Manus Slides Generation Helper
 * Integrates with the Manus Slides API (nano banana pro) for creating professional presentations
 */

import { ENV } from "./env";

interface SlideContent {
  title: string;
  content: string;
  layout?: "title" | "content" | "two-column" | "image-text";
}

interface GenerateSlidesOptions {
  title: string;
  slides: SlideContent[];
  theme?: "medical" | "professional" | "modern";
  language?: "en" | "ar";
}

interface GenerateSlidesResult {
  versionId: string;
  previewUrl: string;
  downloadUrl: string;
}

/**
 * Generate professional slides using Manus Slides API
 */
export async function generateSlides(
  options: GenerateSlidesOptions
): Promise<GenerateSlidesResult> {
  const { title, slides, theme = "medical", language = "en" } = options;

  // Convert slides to markdown format
  const markdown = generateMarkdown(title, slides, language);

  // Call Manus Slides API
  const response = await fetch(`${ENV.forgeApiUrl}/slides/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      content: markdown,
      theme,
      language,
      format: "image", // Use image mode for nano banana pro
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Slides generation failed: ${error}`);
  }

  const result = await response.json();
  
  return {
    versionId: result.versionId,
    previewUrl: result.previewUrl,
    downloadUrl: result.downloadUrl || result.previewUrl,
  };
}

/**
 * Generate markdown content for slides
 */
function generateMarkdown(
  title: string,
  slides: SlideContent[],
  language: "en" | "ar"
): string {
  const direction = language === "ar" ? "rtl" : "ltr";
  
  let markdown = `---\ntitle: ${title}\nlanguage: ${language}\ndirection: ${direction}\n---\n\n`;
  
  // Title slide
  markdown += `# ${title}\n\n---\n\n`;
  
  // Content slides
  for (const slide of slides) {
    markdown += `## ${slide.title}\n\n${slide.content}\n\n---\n\n`;
  }
  
  return markdown;
}

/**
 * Generate medical infographic as a single slide
 */
export async function generateMedicalInfographic(
  patientName: string,
  symptoms: string,
  diagnosis: string,
  recommendations: string[],
  language: "en" | "ar"
): Promise<GenerateSlidesResult> {
  const isArabic = language === "ar";
  
  const title = isArabic ? "ملخص الحالة الطبية" : "Medical Case Summary";
  
  const content = isArabic
    ? `### المريض
${patientName}

### الأعراض
${symptoms}

### التشخيص المحتمل
${diagnosis}

### التوصيات
${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : `### Patient
${patientName}

### Symptoms
${symptoms}

### Potential Diagnosis
${diagnosis}

### Recommendations
${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

  return generateSlides({
    title,
    slides: [{ title, content }],
    theme: "medical",
    language,
  });
}
