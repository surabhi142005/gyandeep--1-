import '../utils/env.js';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import bcrypt from 'bcryptjs';

const args = process.argv.slice(2);
const email = args[0];
const newPassword = args[1];

if (!email || !newPassword) {
  console.log('Usage: node server/scripts/reset-password.js <email> <newPassword>');
  process.exit(1);
}

async function main() {
  const db = await connectToDatabase();
  
  const user = await db.collection(COLLECTIONS.USERS).findOne({ email });
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await db.collection(COLLECTIONS.USERS).updateOne(
    { email },
    { $set: { password: hashedPassword } }
  );
  
  console.log('Password updated for:', email);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});