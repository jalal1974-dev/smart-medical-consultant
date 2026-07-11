import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = readFileSync(join(__dirname, "../drizzle/0004_doctor_uploaded_materials.sql"), "utf8");

// Remove comment lines, then split on semicolons
const cleaned = sql
  .split("\n")
  .filter(line => !line.trim().startsWith("--"))
  .join("\n");
const statements = cleaned
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0);

const conn = await mysql.createConnection(url);

for (const stmt of statements) {
  if (!stmt) continue;
  try {
    await conn.execute(stmt);
    console.log("✓", stmt.slice(0, 80).replace(/\n/g, " "));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("⚠ Column already exists, skipping:", e.message);
    } else {
      console.error("✗ Error:", e.message);
      console.error("  Statement:", stmt.slice(0, 120));
    }
  }
}

// Verify
const [rows] = await conn.execute("SHOW COLUMNS FROM consultations LIKE 'doctorUploaded%'");
console.log("\nVerification — doctorUploaded columns:", rows.map(r => r.Field));
const [rows2] = await conn.execute("SHOW COLUMNS FROM consultations LIKE 'sent%ToPatient'");
console.log("Verification — sentXxxToPatient columns:", rows2.map(r => r.Field));

await conn.end();
console.log("\nDone.");
