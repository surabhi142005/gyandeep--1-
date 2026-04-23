import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

async function testConnection() {
  const gyandeepEnv = 'gyandeep.env';
  if (fs.existsSync(gyandeepEnv)) {
    dotenv.config({ path: gyandeepEnv });
    console.log('Loaded gyandeep.env');
  } else {
    dotenv.config();
    console.log('Loaded .env');
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'gyandeep';

  if (!uri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  console.log(`Testing connection to: ${uri.split('@')[1] || uri}`);
  console.log(`Database name: ${dbName}`);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB');
    const db = client.db(dbName);
    const result = await db.command({ ping: 1 });
    console.log('Ping result:', result);
    
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(c => console.log(` - ${c.name}`));

  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await client.close();
  }
}

testConnection();
