import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../server/utils/env.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required for Prisma commands. Add it to gyandeep.env or your shell environment.');
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);

if (prismaArgs.length === 0) {
  console.error('Usage: node scripts/run-prisma-command.mjs <prisma-args>');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prismaCliPath = path.resolve(__dirname, '../node_modules/prisma/build/index.js');

const child = spawn(process.execPath, [prismaCliPath, ...prismaArgs], {
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
