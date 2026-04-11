/**
 * Seed script: inserts one realistic Arabic test consultation with completed AI analysis.
 * Run with: node seed-test-consultation.mjs
 */
import { createRequire } from "module";
import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const aiAnalysis = JSON.stringify({
  summary: "المريض يعاني من ارتفاع ضغط الدم مع صداع متكرر وضيق في التنفس عند المجهود. التحليل يشير إلى ضرورة مراجعة طبيب متخصص في أمراض القلب والأوعية الدموية.",
  diagnosis: {
    primary: "ارتفاع ضغط الدم الأولي (Hypertension Grade II)",
    differential: ["قصور القلب الاحتقاني المبكر", "فرط نشاط الغدة الدرقية", "توتر نفسي مزمن"]
  },
  recommendations: [
    "قياس ضغط الدم يومياً وتسجيل القراءات",
    "تقليل تناول الملح إلى أقل من 5 غرام يومياً",
    "ممارسة الرياضة الخفيفة 30 دقيقة يومياً",
    "الابتعاد عن التدخين والكافيين",
    "مراجعة طبيب القلب خلال أسبوع"
  ],
  medications: [
    { name: "Amlodipine 5mg", dosage: "مرة واحدة يومياً صباحاً", duration: "3 أشهر" },
    { name: "Losartan 50mg", dosage: "مرة واحدة يومياً مساءً", duration: "3 أشهر" }
  ],
  urgencyLevel: "urgent",
  followUpRequired: true,
  followUpTimeframe: "أسبوع واحد",
  language: "ar"
});

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);

  try {
    // 1. Ensure a test user exists (userId=1 fallback, or create one)
    const [users] = await conn.execute("SELECT id FROM users LIMIT 1");
    let userId;
    if (users.length > 0) {
      userId = users[0].id;
      console.log(`Using existing user id=${userId}`);
    } else {
      const [result] = await conn.execute(
        `INSERT INTO users (openId, name, email, role, hasUsedFreeConsultation, subscription_type, plan_type, consultations_remaining, free_consultations_used, free_consultations_total, lastSignedIn, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        ["test-open-id-001", "مريض تجريبي", "test@smartmedcon.com", "user", 1, "free", "free", 0, 1, 1]
      );
      userId = result.insertId;
      console.log(`Created test user id=${userId}`);
    }

    // 2. Check if test consultation already exists
    const [existing] = await conn.execute(
      "SELECT id FROM consultations WHERE patientEmail = ? LIMIT 1",
      ["ahmad.khalil.test@example.com"]
    );
    if (existing.length > 0) {
      console.log(`Test consultation already exists (id=${existing[0].id}). Skipping insert.`);
      await conn.end();
      return;
    }

    // 3. Insert the test consultation
    const [result] = await conn.execute(
      `INSERT INTO consultations (
        userId, patientName, patientEmail, patientPhone,
        symptoms, medicalHistory,
        preferredLanguage, priority, status,
        aiAnalysis, aiReportUrl, aiInfographicUrl, aiSlideDeckUrl, aiMindMapUrl,
        aiProcessingAttempts, aiLastProcessedAt,
        specialistApprovalStatus,
        isFree, amount, paymentStatus,
        materialsRegeneratedCount,
        createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, NOW(),
        ?,
        ?, ?, ?,
        ?,
        NOW(), NOW()
      )`,
      [
        userId,
        "أحمد خليل",
        "ahmad.khalil.test@example.com",
        "+962791234567",
        "صداع شديد متكرر لمدة أسبوعين، ضيق في التنفس عند صعود الدرج، دوخة عند الوقوف بسرعة، ارتفاع ضغط الدم 160/100 ملم زئبق عند القياس في المنزل",
        "ارتفاع ضغط الدم منذ 3 سنوات، مريض بالسكري النوع الثاني منذ 5 سنوات، لا يوجد تاريخ عائلي لأمراض القلب",
        "ar",
        "urgent",
        "specialist_review",
        aiAnalysis,
        null, // aiReportUrl — not generated yet (admin can regenerate)
        null, // aiInfographicUrl — not generated yet
        null, // aiSlideDeckUrl — not generated yet
        null, // aiMindMapUrl — not generated yet
        1,
        "pending_review",
        0, // isFree
        5, // amount ($5)
        "completed",
        0,
      ]
    );

    console.log(`✅ Test consultation inserted with id=${result.insertId}`);
    console.log("   Patient: أحمد خليل | Status: specialist_review | Priority: urgent");
    console.log("   The admin panel should now show this consultation.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
