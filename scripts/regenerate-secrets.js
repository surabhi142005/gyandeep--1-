#!/usr/bin/env node

/**
 * scripts/regenerate-secrets.js
 * Regenerates all production secrets in .env file
 * Usage: node scripts/regenerate-secrets.js
 */

import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env');

// Generate a cryptographically secure 256-bit hex string
function generateSecret() {
  return randomBytes(32).toString('hex');
}

function main() {
  console.log('\n🔐 Gyandeep Secret Regeneration Tool\n');
  console.log('='.repeat(50));

  if (!existsSync(ENV_PATH)) {
    console.error('❌ .env file not found at:', ENV_PATH);
    console.log('   Run this script from the project root directory.');
    process.exit(1);
  }

  let envContent = readFileSync(ENV_PATH, 'utf-8');

  const secrets = {
    JWT_SECRET: generateSecret(),
    SESSION_SECRET: generateSecret(),
    JWT_REFRESH_SECRET: generateSecret(),
    INTERNAL_SERVICE_SECRET: generateSecret(),
  };

  const dateStr = new Date().toISOString().split('T')[0];

  for (const [key, value] of Object.entries(secrets)) {
    // Match the key followed by = and any value (up to newline)
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
      console.log(`✅ ${key} regenerated`);
    } else {
      // If key doesn't exist, append it
      envContent += `\n${key}=${value}`;
      console.log(`➕ ${key} added`);
    }
  }

  // Update the comment timestamp if it exists
  envContent = envContent.replace(
    /# Updated:.*Production-ready secrets/g,
    `# Updated: ${dateStr} - Production-ready secrets`
  );

  writeFileSync(ENV_PATH, envContent, 'utf-8');

  console.log('\n' + '='.repeat(50));
  console.log('✅ All secrets regenerated successfully!');
  console.log(`📄 Updated: ${ENV_PATH}`);
  console.log('\n⚠️  Remember:');
  console.log('   • Restart the server for changes to take effect');
  console.log('   • Never commit .env to version control');
  console.log('   • Use a secrets manager for production deployments');
  console.log('');
}

main();
