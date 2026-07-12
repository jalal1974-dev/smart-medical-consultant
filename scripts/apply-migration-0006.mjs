import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(url);
const stmts = [
  `ALTER TABLE consultation_questions
     ADD COLUMN IF NOT EXISTS attachment_url TEXT,
     ADD COLUMN IF NOT EXISTS attachment_mime_type VARCHAR(100),
     ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)`,
];
for (const stmt of stmts) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.slice(0, 60));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Already exists, skipping:', stmt.slice(0, 60));
    } else {
      console.error('FAILED:', e.message);
    }
  }
}
await conn.end();
console.log('Migration 0006 complete');
