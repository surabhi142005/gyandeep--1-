import '../server/utils/env.js';
import { connectToDatabase, closeDatabase } from '../server/db/mongoAtlas.js';

async function check() {
  try {
    const db = await connectToDatabase();
    const cols = ['attendance', 'grades', 'quizzes', 'quiz_attempts'];
    for(const col of cols) {
        try {
            const indexes = await db.collection(col).indexes();
            console.log(`${col.toUpperCase()} INDEXES:`, JSON.stringify(indexes, null, 2));
        } catch(e) { console.log(`${col} not found`); }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await closeDatabase();
  }
}
check();
