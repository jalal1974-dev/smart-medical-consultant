import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // MySQL ENUM columns need ALTER TABLE to add new values
  await conn.execute(`
    ALTER TABLE report_generation_logs
    MODIFY COLUMN report_type ENUM(
      'infographic','pdf','slides','mindmap','pptx','all',
      'upload_infographic','upload_pptx',
      'upload_pdf','upload_slides','upload_mindmap'
    ) NOT NULL
  `);
  console.log('✅ report_type enum updated successfully');
} catch (err) {
  if (err.message?.includes('Duplicate')) {
    console.log('ℹ️  Values already exist, skipping');
  } else {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
} finally {
  await conn.end();
}
