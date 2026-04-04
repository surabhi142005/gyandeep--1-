import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gyandeep';

function generateOdId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function createTestUsers() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const password = await bcrypt.hash('Password123!', 10);
  
  const testUsers = [
    { name: 'Admin User', email: 'admin@test.com', role: 'admin' },
    { name: 'Teacher User', email: 'teacher@test.com', role: 'teacher' },
    { name: 'Student User', email: 'student@test.com', role: 'student' },
  ];
  
  for (const user of testUsers) {
    const existing = await db.collection('users').findOne({ email: user.email });
    if (existing) {
      await db.collection('users').updateOne(
        { email: user.email },
        { $set: { password, updatedAt: new Date() } }
      );
      console.log(`Updated password for: ${user.email}`);
    } else {
      try {
        await db.collection('users').insertOne({
          ...user,
          password,
          odId: generateOdId(),
          emailVerified: true,
          xp: 100,
          coins: 50,
          level: 1,
          streak: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`Created: ${user.email} (${user.role})`);
      } catch (e) {
        console.log(`Error creating ${user.email}: ${e.message}`);
      }
    }
  }
  
  await client.close();
  console.log('\n Test users ready!');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin:   admin@test.com / Password123!');
  console.log('   Teacher:  teacher@test.com / Password123!');
  console.log('   Student: student@test.com / Password123!');
}

createTestUsers().catch(console.error);
