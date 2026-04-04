/**
 * test-api.js
 * Automated API test script for Gyandeep
 * Run: node test-api.js
 */

import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const API = `${BASE_URL}/api`;

const tests = [];
let passed = 0;
let failed = 0;

const log = (msg, type = 'info') => {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
  };
  console.log(`${colors[type] || ''}${msg}\x1b[0m`);
};

const test = async (name, fn) => {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    tests.push({ name, status: 'passed' });
    passed++;
    console.log('\x1b[32m✓ PASSED\x1b[0m');
  } catch (err) {
    tests.push({ name, status: 'failed', error: err.message });
    failed++;
    console.log(`\x1b[31m✗ FAILED: ${err.message}\x1b[0m`);
  }
};

const request = async (url, options = {}) => {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  
  if (!res.ok && !url.includes('health')) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  
  return { status: res.status, data };
};

const getToken = () => global.testToken;
const setToken = (token) => { global.testToken = token; };

// ─────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────

const testHealth = async () => {
  const { status, data } = await request('/health');
  if (status !== 200 || data.status !== 'ok') {
    throw new Error('Health check failed');
  }
  log(`  Database: ${data.db}, Uptime: ${Math.round(data.uptime)}s`, 'info');
};

const testAuth = async () => {
  // Register
  const registerData = {
    name: `Test Teacher ${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    role: 'teacher',
  };
  
  const { data: registerData2 } = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerData),
  }).catch(() => ({ data: null }));
  
  // Login
  const { data: loginData } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: registerData.email,
      password: registerData.password,
    }),
  });
  
  if (loginData?.token) {
    setToken(loginData.token);
    log(`  Logged in as: ${loginData.user?.name || 'User'}`, 'info');
  }
};

const testUsers = async () => {
  await request('/users', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testClasses = async () => {
  await request('/classes', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testAttendance = async () => {
  const { data: weeklyData } = await request('/attendance/weekly?classId=test', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  
  await request('/attendance', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testGrades = async () => {
  await request('/grades', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testNotes = async () => {
  await request('/notes/centralized', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testTimetable = async () => {
  await request('/timetable', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testTickets = async () => {
  await request('/tickets', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testNotifications = async () => {
  await request('/notifications', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testQuestionBank = async () => {
  await request('/question-bank', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testTags = async () => {
  await request('/tags-presets', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testFaceList = async () => {
  await request('/face/list', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testStorage = async () => {
  const { data } = await request('/storage/storage-status', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  log(`  Storage provider: ${data?.provider || 'unknown'}`, 'info');
};

const testAnalytics = async () => {
  await request('/analytics/insights', {
    method: 'POST',
    body: JSON.stringify({ studentData: {} }),
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testAIQuiz = async () => {
  const { data } = await request('/quiz', {
    method: 'POST',
    body: JSON.stringify({
      notesText: 'Photosynthesis is the process by which plants convert sunlight into energy',
      subject: 'Science',
    }),
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  log(`  Quiz generated: ${data?.quiz?.length || 0} questions`, 'info');
};

const testAIGrade = async () => {
  await request('/grade', {
    method: 'POST',
    body: JSON.stringify({
      questions: [{ question: 'What is 2+2?', correctAnswer: '4', type: 'mcq', maxScore: 10 }],
      answers: ['4'],
    }),
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testAISummarize = async () => {
  const { data } = await request('/summarize', {
    method: 'POST',
    body: JSON.stringify({
      text: 'The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration.',
      subject: 'Biology',
      mode: 'bullets',
    }),
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  log(`  Summarized: ${data?.result?.substring(0, 50)}...`, 'info');
};

const testTeacherStats = async () => {
  const validId = '507f1f77bcf86cd799439011';
  await request(`/teacher/stats?teacherId=${validId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  
  await request(`/teacher/quiz-stats?teacherId=${validId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testWebhooks = async () => {
  await request('/webhooks', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

const testAdminAuditLogs = async () => {
  await request('/admin/audit-logs', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
};

// ─────────────────────────────────────────────────────────────
// RUN TESTS
// ─────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n');
  log('═'.repeat(60), 'info');
  log('  GYANDEEP API TEST SUITE', 'info');
  log('═'.repeat(60), 'info');
  log(`  Base URL: ${BASE_URL}`, 'info');
  log('═'.repeat(60), 'info');
  console.log('\n');

  log('📋 Running API Tests...\n', 'info');

  // Core tests
  await test('Health Check', testHealth);
  await test('Authentication', testAuth);
  await test('Users API', testUsers);
  await test('Classes API', testClasses);
  
  // Attendance & Location
  await test('Attendance API', testAttendance);
  
  // Academic
  await test('Grades API', testGrades);
  await test('Notes API', testNotes);
  await test('Timetable API', testTimetable);
  
  // Communication
  await test('Tickets API', testTickets);
  await test('Notifications API', testNotifications);
  
  // Content
  await test('Question Bank API', testQuestionBank);
  await test('Tags API', testTags);
  
  // Features
  await test('Face Recognition API', testFaceList);
  await test('Storage API', testStorage);
  
  // Analytics
  await test('Analytics API', testAnalytics);
  await test('Teacher Stats API', testTeacherStats);
  
  // AI Features
  await test('AI Quiz Generation', testAIQuiz);
  await test('AI Auto-Grading', testAIGrade);
  await test('AI Summarization', testAISummarize);
  
  // Admin
  await test('Webhooks API', testWebhooks);
  await test('Audit Logs API', testAdminAuditLogs);

  // Summary
  console.log('\n');
  log('═'.repeat(60), 'info');
  log('  TEST SUMMARY', 'info');
  log('═'.repeat(60), 'info');
  log(`  Total:   ${tests.length}`, 'info');
  log(`  Passed:  ${passed}`, 'success');
  log(`  Failed:  ${failed}`, failed > 0 ? 'error' : 'success');
  log('═'.repeat(60), 'info');
  console.log('\n');

  if (failed > 0) {
    log('✗ FAILED TESTS:', 'error');
    tests.filter(t => t.status === 'failed').forEach(t => {
      log(`  - ${t.name}: ${t.error}`, 'error');
    });
    console.log('\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
