import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set!');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('gyandeep');
    console.log('Connected to MongoDB!');
    
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      console.log(`Clearing collection: ${col.name}`);
      try {
        await db.collection(col.name).deleteMany({});
      } catch (err) {
        console.error(`Failed to clear ${col.name}:`, err.message);
      }
    }
    console.log('All collections cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await client.close();
  }
}

run();
