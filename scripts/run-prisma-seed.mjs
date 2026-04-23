import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../server/utils/env.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required for Prisma seed. Add it to gyandeep.env or your shell environment.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedScriptPath = path.resolve(__dirname, '../prisma/seed.ts');

const child = spawn(process.execPath, ['--experimental-strip-types', seedScriptPath], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
