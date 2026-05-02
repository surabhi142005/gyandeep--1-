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
 * System environment variables remain highest priority.
 * File priority:
 * 1. gyandeep.env
 * 2. .env.local
 * 3. .env.production / .env.development
 * 4. .env
 */
export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const envFiles = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local',
    'gyandeep.env',
  ];

  let loadedFile = null;
  const loadedFiles = [];

  for (const file of envFiles) {
    const envPath = path.join(rootDir, file);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      loadedFiles.push(file);
      loadedFile = loadedFile || file;
    }
  }

  if (!loadedFile) {
    console.warn('[Env] No environment files found. Using system environment variables.');
  } else {
    console.log(`[Env] Loaded environment files: ${loadedFiles.join(', ')}`);
  }

  const missingCore = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missingCore.length > 0) {
    throw new Error(`[Env] Missing required environment variables: ${missingCore.join(', ')}`);
  }

  const missingOptionalProduction = [
    'GROQ_API_KEY',
    'OPENAI_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ].filter((key) => !process.env[key]);

  if (missingOptionalProduction.length > 0) {
    console.warn(
      `[Env] Production features disabled or degraded until these variables are set: ${missingOptionalProduction.join(', ')}`
    );
  }
}

// Auto-load on import
loadEnv();

export default process.env;
