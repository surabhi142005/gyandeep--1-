/**
 * server/utils/env.js
 * Centralized environment variable loader
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

/**
 * Load environment variables with specific priority:
 * 1. gyandeep.env (Highest priority, custom project config)
 * 2. .env.local
 * 3. .env.production / .env.development (based on NODE_ENV)
 * 4. .env (Lowest priority, default config)
 */
export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const envFiles = [
    'gyandeep.env',
    '.env.local',
    `.env.${nodeEnv}`,
    '.env'
  ];

  let loadedFile = null;

  for (const file of envFiles) {
    const envPath = path.join(rootDir, file);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (!loadedFile) {
        loadedFile = file;
        console.log(`[Env] Loaded environment from ${file}`);
      }
    }
  }

  if (!loadedFile) {
    console.warn('[Env] No environment files found. Using system environment variables.');
  }

  // Ensure critical variables are set for Gemini
  if (!process.env.GEMINI_API_KEY && process.env.OPENAI_API_KEY) {
    // Fallback for transition period if user provided OpenAI key but we want to use Gemini
    // process.env.GEMINI_API_KEY = process.env.OPENAI_API_KEY;
  }
}

// Auto-load on import
loadEnv();

export default process.env;
