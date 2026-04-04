import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gyandeep';

async function checkUser() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const user = await db.collection('users').findOne({ email: 'admin@test.com' });
  console.log('User found:', user ? {
    email: user.email,
    name: user.name,
    role: user.role,
    hasPassword: !!user.password,
    hasOdId: !!user.odId,
    active: user.active,
  } : 'NOT FOUND');
  
  await client.close();
}

checkUser().catch(console.error);
