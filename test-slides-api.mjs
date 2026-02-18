import { ENV } from "./server/_core/env.js";

const testMarkdown = `---
title: Medical Case Summary
language: ar
direction: rtl
---

# ملخص الحالة الطبية

---

## معلومات المريض

**الاسم:** أحمد محمد

**التاريخ:** 2026-02-17

---

## الأعراض

صداع شديد ودوخة منذ 3 أيام

---

## التشخيص المحتمل

قد يكون ناتجاً عن ارتفاع ضغط الدم أو الإجهاد

---

## التوصيات

1. قياس ضغط الدم
2. الراحة الكافية
3. شرب الماء بكثرة

---
`;

console.log("Testing Manus Slides API...");
console.log("API URL:", process.env.BUILT_IN_FORGE_API_URL);

try {
  const response = await fetch(`${process.env.BUILT_IN_FORGE_API_URL}/slides/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      content: testMarkdown,
      theme: "medical",
      language: "ar",
      format: "image",
    }),
  });

  console.log("Response status:", response.status);
  console.log("Response headers:", Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log("Response body:", text);
  
  if (response.ok) {
    const result = JSON.parse(text);
    console.log("\n✅ Success!");
    console.log("Version ID:", result.versionId);
    console.log("Preview URL:", result.previewUrl);
  } else {
    console.log("\n❌ Failed!");
  }
} catch (error) {
  console.error("Error:", error.message);
}
