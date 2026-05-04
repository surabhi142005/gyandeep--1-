/**
 * server/db/seedData.js
 * Seeds the database with rich demo data for Gyandeep
 * Run with: node server/db/seedData.js
 */

import '../utils/env.js';
import { reseedDemoDatabase } from './demoSeed.js';

async function seedDatabase() {
  const result = await reseedDemoDatabase({ clearExisting: false });

  if (result.skipped) {
    console.log(result.message);
    return;
  }

  console.log(result.message);
  console.log('Summary:', JSON.stringify(result.summary, null, 2));
  console.log('Credentials:', JSON.stringify(result.credentials, null, 2));
}

seedDatabase().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
