import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { consultations } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(pool);

// Get a test row
const [row] = await db.select({ id: consultations.id, paymentId: consultations.paymentId }).from(consultations).limit(1);
if (!row) { console.log('No rows'); pool.end(); process.exit(0); }

const testId = 'TEST-DRIZZLE-' + Date.now();
// Set paymentId to a test value
await db.update(consultations).set({ paymentId: testId, updatedAt: new Date() }).where(eq(consultations.id, row.id));

// Now do a status-only update (no paymentId in the set)
await db.update(consultations).set({ status: 'submitted', updatedAt: new Date() }).where(eq(consultations.id, row.id));

const [after] = await db.select({ paymentId: consultations.paymentId }).from(consultations).where(eq(consultations.id, row.id));
console.log('paymentId after status-only update:', after.paymentId);
console.log('Expected:', testId);
console.log('Match:', after.paymentId === testId ? 'YES - Drizzle does NOT overwrite' : 'NO - Drizzle OVERWRITES!');

// Restore original
await db.update(consultations).set({ paymentId: row.paymentId, updatedAt: new Date() }).where(eq(consultations.id, row.id));
pool.end();
