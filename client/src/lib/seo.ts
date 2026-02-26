/**
 * SEO Utilities for Smart Medical Consultant
 * Provides dynamic page titles, descriptions, and meta tags
 */

export interface PageSEO {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}

/**
 * SEO configuration for each page
 */
export const pageSEO: Record<string, PageSEO> = {
  home: {
    title: "Smart Medical Consultant - AI-Powered Medical Analysis | مستشارك الطبي الذكي",
    description: "Get instant AI-powered medical consultation with comprehensive reports, infographics, and specialist review. Bilingual Arabic/English support. First consultation FREE! احصل على استشارة طبية ذكية مع تقارير شاملة ومراجعة من أطباء متخصصين.",
    keywords: "medical consultation, AI doctor, symptom checker, online medical advice, telemedicine, healthcare AI, استشارة طبية, طبيب ذكي, تشخيص الأعراض",
    ogImage: "/og-image-home.jpg"
  },
  consultations: {
    title: "Submit Medical Consultation - Smart Medical Consultant",
    description: "Submit your medical reports, symptoms, and history for AI-powered analysis. Get comprehensive consultation reports reviewed by medical specialists in English or Arabic.",
    keywords: "submit consultation, medical analysis, AI diagnosis, symptom analysis, medical report review, استشارة طبية, تحليل طبي",
    ogImage: "/og-image-consultations.jpg"
  },
  dashboard: {
    title: "My Dashboard - Smart Medical Consultant",
    description: "View your consultation history, download reports, access infographics, and track your medical analysis results. Secure patient portal with bilingual support.",
    keywords: "patient dashboard, consultation history, medical reports, health records, لوحة المريض, سجلات طبية",
    ogImage: "/og-image-dashboard.jpg"
  },
  videos: {
    title: "Medical Education Videos - Smart Medical Consultant",
    description: "Watch educational medical videos covering various health topics, conditions, and treatments. Expert explanations in English and Arabic.",
    keywords: "medical videos, health education, medical tutorials, healthcare videos, فيديوهات طبية, تعليم صحي",
    ogImage: "/og-image-videos.jpg"
  },
  podcasts: {
    title: "Medical Podcasts - Smart Medical Consultant",
    description: "Listen to medical podcasts featuring expert discussions on health topics, medical advances, and patient care. Available in English and Arabic.",
    keywords: "medical podcasts, health podcasts, medical discussions, healthcare audio, بودكاست طبي, صحة",
    ogImage: "/og-image-podcasts.jpg"
  },
  analytics: {
    title: "Analytics Dashboard - Smart Medical Consultant",
    description: "View platform analytics, consultation statistics, and usage metrics. Administrative dashboard for tracking system performance.",
    keywords: "analytics, statistics, metrics, dashboard, تحليلات, إحصائيات",
    ogImage: "/og-image-analytics.jpg"
  },
  admin: {
    title: "Admin Panel - Smart Medical Consultant",
    description: "Administrative panel for managing consultations, reviewing AI analysis, conducting deep research, and approving materials. Specialist access only.",
    keywords: "admin panel, consultation management, specialist review, medical administration, لوحة الإدارة",
    ogImage: "/og-image-admin.jpg"
  }
};

/**
 * Update page title dynamically
 */
export function updatePageTitle(page: keyof typeof pageSEO) {
  const seo = pageSEO[page];
  if (seo) {
    document.title = seo.title;
  }
}

/**
 * Update meta description dynamically
 */
export function updateMetaDescription(page: keyof typeof pageSEO) {
  const seo = pageSEO[page];
  if (seo) {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', seo.description);
  }
}

/**
 * Update meta keywords dynamically
 */
export function updateMetaKeywords(page: keyof typeof pageSEO) {
  const seo = pageSEO[page];
  if (seo && seo.keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', seo.keywords);
  }
}

/**
 * Update Open Graph meta tags dynamically
 */
export function updateOpenGraphTags(page: keyof typeof pageSEO) {
  const seo = pageSEO[page];
  if (seo) {
    // Update OG title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', seo.title);
    }
    
    // Update OG description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', seo.description);
    }
    
    // Update OG image
    if (seo.ogImage) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute('content', `https://smartmedcon-jsnymp6w.manus.space${seo.ogImage}`);
      }
    }
  }
}

/**
 * Update all SEO elements for a page
 */
export function updatePageSEO(page: keyof typeof pageSEO) {
  updatePageTitle(page);
  updateMetaDescription(page);
  updateMetaKeywords(page);
  updateOpenGraphTags(page);
}

/**
 * Get canonical URL for current page
 */
export function getCanonicalURL(path: string): string {
  const baseURL = "https://smartmedcon-jsnymp6w.manus.space";
  return `${baseURL}${path}`;
}

/**
 * Update canonical link tag
 */
export function updateCanonicalURL(path: string) {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', getCanonicalURL(path));
}
