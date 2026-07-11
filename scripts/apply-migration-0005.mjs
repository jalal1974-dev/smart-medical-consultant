/**
 * Migration 0005: Add personalized note columns for doctor-uploaded materials
 * Adds doctorUploadedVideoNote, doctorUploadedAudioNote, doctorUploadedOtherNote
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS doctorUploadedVideoNote TEXT`,
  `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS doctorUploadedAudioNote TEXT`,
  `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS doctorUploadedOtherNote TEXT`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.slice(0, 80));
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('SKIP (already exists):', sql.slice(0, 80));
    } else {
      console.error('ERROR:', err.message);
      process.exit(1);
    }
  }
}

await conn.end();
console.log('Migration 0005 complete.');
