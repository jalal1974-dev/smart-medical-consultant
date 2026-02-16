import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
}

export function SEO({
  title,
  description,
  keywords,
  image,
  type = 'website'
}: SEOProps) {
  const [location] = useLocation();
  
  const defaultTitle = "Smart Medical Consultant - AI-Powered Medical Analysis | مستشارك الطبي الذكي";
  const defaultDescription = "Get instant AI-powered medical consultation with comprehensive reports, infographics, and specialist review. Bilingual Arabic/English support. First consultation FREE!";
  const defaultKeywords = "medical consultation, AI doctor, symptom checker, online medical advice, telemedicine, healthcare AI, استشارة طبية, طبيب ذكي";
  const defaultImage = "https://smartmedcon-jsnymp6w.manus.space/og-image.jpg";
  
  const pageTitle = title || defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = keywords || defaultKeywords;
  const pageImage = image || defaultImage;
  const pageUrl = `https://smartmedcon-jsnymp6w.manus.space${location}`;
  
  useEffect(() => {
    // Update document title
    document.title = pageTitle;
    
    // Update meta tags
    updateMetaTag('name', 'description', pageDescription);
    updateMetaTag('name', 'keywords', pageKeywords);
    updateMetaTag('property', 'og:title', pageTitle);
    updateMetaTag('property', 'og:description', pageDescription);
    updateMetaTag('property', 'og:image', pageImage);
    updateMetaTag('property', 'og:url', pageUrl);
    updateMetaTag('property', 'og:type', type);
    updateMetaTag('property', 'twitter:title', pageTitle);
    updateMetaTag('property', 'twitter:description', pageDescription);
    updateMetaTag('property', 'twitter:image', pageImage);
    
    // Update canonical link
    updateCanonicalLink(pageUrl);
  }, [pageTitle, pageDescription, pageKeywords, pageImage, pageUrl, type]);
  
  return null;
}

function updateMetaTag(attribute: string, key: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  
  element.href = url;
}

// JSON-LD Structured Data Components

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    "name": "Smart Medical Consultant",
    "alternateName": "مستشارك الطبي الذكي",
    "url": "https://smartmedcon-jsnymp6w.manus.space",
    "logo": "https://smartmedcon-jsnymp6w.manus.space/logo.png",
    "description": "AI-powered medical consultation platform providing comprehensive health analysis, reports, and specialist review in Arabic and English",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "International"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "availableLanguage": ["English", "Arabic"]
    },
    "sameAs": [
      "https://facebook.com/smartmedicalconsultant",
      "https://twitter.com/smartmedcon",
      "https://instagram.com/smartmedicalconsultant",
      "https://linkedin.com/company/smart-medical-consultant"
    ]
  };
  
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = 'organization-schema';
    
    const existing = document.getElementById('organization-schema');
    if (existing) {
      existing.replaceWith(script);
    } else {
      document.head.appendChild(script);
    }
    
    return () => {
      script.remove();
    };
  }, []);
  
  return null;
}

export function MedicalServiceSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "name": "Smart Medical Consultant",
    "description": "AI-powered medical consultation service with specialist review",
    "provider": {
      "@type": "MedicalOrganization",
      "name": "Smart Medical Consultant"
    },
    "serviceType": "Medical Consultation",
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": "https://smartmedcon-jsnymp6w.manus.space/consultations",
      "serviceName": "Online Medical Consultation",
      "availableLanguage": ["English", "Arabic"]
    },
    "areaServed": {
      "@type": "Place",
      "name": "Worldwide"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Medical Consultation Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Free AI Medical Consultation",
            "description": "First consultation with comprehensive AI analysis"
          },
          "price": "0",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Premium Medical Consultation",
            "description": "Detailed consultation with specialist review and comprehensive reports"
          },
          "price": "29.99",
          "priceCurrency": "USD"
        }
      ]
    }
  };
  
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = 'service-schema';
    
    const existing = document.getElementById('service-schema');
    if (existing) {
      existing.replaceWith(script);
    } else {
      document.head.appendChild(script);
    }
    
    return () => {
      script.remove();
    };
  }, []);
  
  return null;
}

export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Smart Medical Consultant",
    "alternateName": "مستشارك الطبي الذكي",
    "url": "https://smartmedcon-jsnymp6w.manus.space",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://smartmedcon-jsnymp6w.manus.space/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "inLanguage": ["en", "ar"]
  };
  
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = 'website-schema';
    
    const existing = document.getElementById('website-schema');
    if (existing) {
      existing.replaceWith(script);
    } else {
      document.head.appendChild(script);
    }
    
    return () => {
      script.remove();
    };
  }, []);
  
  return null;
}

export function FAQSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
  
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = 'faq-schema';
    
    const existing = document.getElementById('faq-schema');
    if (existing) {
      existing.replaceWith(script);
    } else {
      document.head.appendChild(script);
    }
    
    return () => {
      script.remove();
    };
  }, [faqs]);
  
  return null;
}
