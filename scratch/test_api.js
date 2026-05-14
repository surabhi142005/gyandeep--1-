
import fetch from 'node-fetch';

async function testQuizGenerate() {
  const baseUrl = 'http://localhost:3001';
  try {
    const res = await fetch(`${baseUrl}/api/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notesText: 'Test notes', subject: 'Math' })
    });
    console.log('Status:', res.status);
    const data = await res.json().catch(() => ({}));
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testQuizGenerate();
