import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS report_generation_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      consultation_id INT NOT NULL,
      patient_name VARCHAR(255) NOT NULL,
      admin_id INT NOT NULL,
      admin_name VARCHAR(255) NOT NULL,
      report_type ENUM('infographic','pdf','slides','mindmap','pptx','all','upload_infographic','upload_pptx') NOT NULL,
      action ENUM('generate','regenerate','upload') NOT NULL DEFAULT 'generate',
      status ENUM('success','failed') NOT NULL DEFAULT 'success',
      error_message TEXT,
      output_url VARCHAR(500),
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ report_generation_logs table created (or already exists)");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await connection.end();
}
