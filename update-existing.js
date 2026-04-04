import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gyandeep';

async function updateUsers() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const password = await bcrypt.hash('Password123!', 10);
  
  // Update all users with password
  const result = await db.collection('users').updateMany(
    { password: { $exists: false } },
    { $set: { password } }
  );
  console.log(`Updated ${result.modifiedCount} users with password`);
  
  // List all users now
  const users = await db.collection('users').find({}).toArray();
  console.log('\n📋 All Users:');
  users.forEach(u => console.log(`  ${u.email} (${u.role})`));
  
  await client.close();
  console.log('\n✅ Ready to login!');
}

updateUsers().catch(console.error);
