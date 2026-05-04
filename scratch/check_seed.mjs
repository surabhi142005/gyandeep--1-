import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gyandeep:surabhi_142005@cluster0.ph2wi4x.mongodb.net/gyandeep?retryWrites=true&w=majority';

async function checkSeed() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(); // Uses the DB name from the URI or default
    const userCount = await db.collection('user').countDocuments();
    const classCount = await db.collection('class').countDocuments();
    const subjectCount = await db.collection('subject').countDocuments();
    
    console.log(`User count: ${userCount}`);
    console.log(`Class count: ${classCount}`);
    console.log(`Subject count: ${subjectCount}`);
    
    if (userCount > 0) {
      console.log('Seed data appears to be present.');
      // Peek at some users
      const users = await db.collection('user').find({}).limit(5).toArray();
      console.log('Sample users:', users.map(u => ({ name: u.name, email: u.email, role: u.role })));
    } else {
      console.log('No users found. Seed data might be missing.');
    }
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}

checkSeed();
