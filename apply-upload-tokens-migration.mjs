import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS upload_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(128) NOT NULL UNIQUE,
      consultation_id INT NOT NULL,
      patient_name VARCHAR(255) NOT NULL,
      report_type ENUM('infographic','slides','pdf','mindmap','pptx') NOT NULL,
      created_by_admin_id INT NOT NULL,
      created_by_admin_name VARCHAR(255) NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at BIGINT,
      uploaded_file_url VARCHAR(500),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  console.log('✅ upload_tokens table created successfully');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
