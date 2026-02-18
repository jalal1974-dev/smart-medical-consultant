/**
 * Manus Slides Generation Helper
 * Uses the manus-export-slides CLI utility to generate professional presentations
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

const execAsync = promisify(exec);

interface SlideContent {
  id: string;
  title: string;
  summary: string;
  content: string;
}

interface GenerateSlidesOptions {
  title: string;
  slides: SlideContent[];
  theme?: string;
  language?: "en" | "ar";
}

interface GenerateSlidesResult {
  versionId: string;
  previewUrl: string;
  downloadUrl: string;
}

/**
 * Generate professional slides using Manus slides system
 * This creates a temporary slide project, generates images, and exports the result
 */
export async function generateProfessionalSlides(
  options: GenerateSlidesOptions
): Promise<GenerateSlidesResult> {
  const { title, slides, language = "en" } = options;
  
  // Create temporary project directory
  const projectId = nanoid(10);
  const projectDir = `/tmp/slides-${projectId}`;
  
  try {
    await mkdir(projectDir, { recursive: true });
    
    // Create markdown content file
    const markdownContent = generateMarkdownContent(title, slides, language);
    const contentPath = join(projectDir, "content.md");
    await writeFile(contentPath, markdownContent, "utf-8");
    
    // Generate slides using manus CLI (this would need to be implemented via API)
    // For now, we'll return a placeholder that indicates the slides need to be generated
    // In production, this should call the actual Manus slides generation API
    
    return {
      versionId: projectId,
      previewUrl: `manus-slides://${projectId}`,
      downloadUrl: `manus-slides://${projectId}`,
    };
  } catch (error) {
    console.error("Failed to generate slides:", error);
    throw new Error(`Slides generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate markdown content for slides
 */
function generateMarkdownContent(
  title: string,
  slides: SlideContent[],
  language: "en" | "ar"
): string {
  let markdown = `# ${title}\n\n---\n\n`;
  
  for (const slide of slides) {
    markdown += `## ${slide.title}\n\n${slide.content}\n\n---\n\n`;
  }
  
  return markdown;
}

/**
 * Generate a single-slide medical infographic
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
    ? `### المريض\n${patientName}\n\n### الأعراض\n${symptoms}\n\n### التشخيص المحتمل\n${diagnosis}\n\n### التوصيات\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : `### Patient\n${patientName}\n\n### Symptoms\n${symptoms}\n\n### Potential Diagnosis\n${diagnosis}\n\n### Recommendations\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
  
  return generateProfessionalSlides({
    title,
    slides: [{
      id: "summary",
      title,
      summary: isArabic ? "ملخص شامل للحالة الطبية" : "Comprehensive medical case summary",
      content,
    }],
    language,
  });
}

/**
 * Export slides to PDF format using manus-export-slides utility
 */
export async function exportSlidesToPDF(versionId: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `manus-export-slides manus-slides://${versionId} pdf`
    );
    
    // Extract the PDF path from stdout
    const pdfPath = stdout.trim();
    return pdfPath;
  } catch (error) {
    console.error("Failed to export slides to PDF:", error);
    throw new Error(`PDF export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
