import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function checkLogin() {
  try {
    await client.connect();
    const db = client.db();
    
    const email = 'admin@gyandeep.edu';
    const password = 'admin123';
    
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.log('User not found in DB');
      return;
    }
    
    console.log(`Found user: ${user.email}`);
    console.log(`Stored hash: ${user.password}`);
    
    const valid = await bcrypt.compare(password, user.password);
    console.log(`Bcrypt compare result for "${password}": ${valid}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkLogin();
