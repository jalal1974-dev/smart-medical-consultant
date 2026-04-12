/**
 * Direct migration: adds pptxReportUrl column to consultations table.
 * Run with: node apply-pptx-migration.mjs
 */
import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

async function migrate() {
  const conn = await mysql.createConnection(DATABASE_URL);
  try {
    // Check if column already exists
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'consultations' 
       AND COLUMN_NAME = 'pptxReportUrl'`
    );
    if (rows.length > 0) {
      console.log("✅ Column pptxReportUrl already exists. Skipping.");
    } else {
      await conn.execute(
        "ALTER TABLE `consultations` ADD COLUMN `pptxReportUrl` varchar(500) NULL"
      );
      console.log("✅ Column pptxReportUrl added to consultations table.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
