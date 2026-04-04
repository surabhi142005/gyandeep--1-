import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gyandeep';

async function listUsers() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const users = await db.collection('users').find({}).limit(10).toArray();
  console.log(`Found ${users.length} users:`);
  users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
  
  await client.close();
}

listUsers().catch(console.error);
