/**
 * test-fullstack.sh / test-fullstack.cmd
 * Start both frontend and backend, then run API tests
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';
const ROOT = process.cwd();

const log = (msg, color = '\x1b[36m') => {
  console.log(`${color}${msg}\x1b[0m`);
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const checkServer = async (url, maxRetries = 30) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await wait(1000);
    process.stdout.write('.');
  }
  return false;
};

async function main() {
  log('\n═══════════════════════════════════════════════════════', '\x1b[35m');
  log('  GYANDEEP FULLSTACK TEST', '\x1b[35m');
  log('═══════════════════════════════════════════════════════\n', '\x1b[35m');

  let backend, frontend;

  try {
    // Start backend
    log('🚀 Starting Backend Server...', '\x1b[33m');
    backend = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'server'], {
      cwd: ROOT,
      stdio: 'pipe',
      shell: isWindows,
    });

    backend.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Server running') || msg.includes('localhost:3001')) {
        process.stdout.write(' [READY]\n');
      }
    });

    backend.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    // Wait for backend
    process.stdout.write('  Waiting for backend... ');
    const backendReady = await checkServer('http://localhost:3001/api/health');
    if (!backendReady) {
      throw new Error('Backend failed to start');
    }
    log('Backend running on http://localhost:3001', '\x1b[32m');

    // Run API tests
    log('\n📋 Running API Tests...', '\x1b[33m');
    const testResult = await execAsync('node test-api.js', { cwd: ROOT });
    console.log(testResult.stdout);
    if (testResult.stderr) console.error(testResult.stderr);

    // Start frontend
    log('\n🚀 Starting Frontend Dev Server...', '\x1b[33m');
    frontend = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
      cwd: ROOT,
      stdio: 'pipe',
      shell: isWindows,
    });

    frontend.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Local:') || msg.includes('localhost:5173')) {
        process.stdout.write(' [READY]\n');
      }
    });

    // Wait for frontend
    process.stdout.write('  Waiting for frontend... ');
    const frontendReady = await checkServer('http://localhost:5173', 60);
    if (!frontendReady) {
      throw new Error('Frontend failed to start');
    }
    log('Frontend running on http://localhost:5173', '\x1b[32m');

    // Summary
    log('\n═══════════════════════════════════════════════════════', '\x1b[35m');
    log('  TEST SERVERS RUNNING', '\x1b[32m');
    log('═══════════════════════════════════════════════════════', '\x1b[35m');
    log('  Frontend: http://localhost:5173', '\x1b[36m');
    log('  Backend:  http://localhost:3001', '\x1b[36m');
    log('  API Test: http://localhost:3001/api/health', '\x1b[36m');
    log('═══════════════════════════════════════════════════════', '\x1b[35m');
    log('\n  Press Ctrl+C to stop all servers\n', '\x1b[33m');

    // Wait for interrupt
    process.on('SIGINT', () => {
      log('\n\n🛑 Stopping servers...', '\x1b[31m');
      if (backend) backend.kill();
      if (frontend) frontend.kill();
      process.exit(0);
    });

  } catch (err) {
    log(`\n✗ Error: ${err.message}`, '\x1b[31m');
    if (backend) backend.kill();
    if (frontend) frontend.kill();
    process.exit(1);
  }
}

main();
