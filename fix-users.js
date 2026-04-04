import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gyandeep';

function generateOdId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function fixUsers() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const password = await bcrypt.hash('Password123!', 10);
  
  // Fix users with null od_id
  const result = await db.collection('users').updateMany(
    { odId: null },
    { $set: { odId: generateOdId() } }
  );
  console.log(`Fixed ${result.modifiedCount} users with null odId`);
  
  // Update test user passwords
  const testEmails = ['admin@test.com', 'teacher@test.com', 'student@test.com'];
  for (const email of testEmails) {
    await db.collection('users').updateOne(
      { email },
      { $set: { password, updatedAt: new Date() } }
    );
    console.log(`Updated: ${email}`);
  }
  
  await client.close();
  console.log('\n✅ All test users ready!');
}

fixUsers().catch(console.error);
