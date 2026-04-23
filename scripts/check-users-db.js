import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function checkUsers() {
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`Found ${users.length} users in the database:`);
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkUsers();
