/**
 * mock-server.cjs
 * 
 * Lightweight mock API server for local development.
 * Provides all endpoints the frontend expects, including SSE for realtime events.
 * 
 * Usage: node mock-server.cjs
 */

const http = require('http');
const url = require('url');

const PORT = 3001;

// ── Mock Data ───────────────────────────────────────────────────────────────

const users = [
  {
    id: '1',
    name: 'Admin User',
    role: 'admin',
    email: 'admin@example.com',
    assignedSubjects: [],
    performance: [],
    badges: [],
    classId: null,
    faceImage: null,
    preferences: {},
    xp: 0,
    coins: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    active: true,
  },
  {
    id: '2',
    name: 'Teacher User',
    role: 'teacher',
    email: 'teacher@example.com',
    assignedSubjects: ['math', 'science'],
    performance: [],
    badges: [],
    classId: 'class-1',
    faceImage: null,
    preferences: {},
    xp: 200,
    coins: 50,
    level: 3,
    streak: 5,
    longestStreak: 10,
    active: true,
  },
  {
    id: '3',
    name: 'Student User',
    role: 'student',
    email: 'student@example.com',
    assignedSubjects: ['math', 'science'],
    performance: [
      { subject: 'Mathematics', date: '2026-03-01', score: 85 },
      { subject: 'Mathematics', date: '2026-03-08', score: 90 },
      { subject: 'Science', date: '2026-03-01', score: 78 },
    ],
    badges: ['High Score', 'Perfect 5'],
    classId: 'class-1',
    faceImage: null,
    preferences: {},
    xp: 350,
    coins: 120,
    level: 4,
    streak: 3,
    longestStreak: 7,
    totalQuizzes: 12,
    active: true,
  },
];

const classes = [
  { id: 'class-1', name: 'Class 1' },
  { id: 'class-2', name: 'Class 2' },
];

const subjects = [
  { id: 'math', name: 'Mathematics' },
  { id: 'science', name: 'Science' },
  { id: 'history', name: 'History' },
  { id: 'english', name: 'English' },
];

// ── Track last logged-in user ───────────────────────────────────────────────

let lastLoggedInUser = users[0]; // default to admin

// ── CORS Headers ────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const jsonHeaders = {
  'Content-Type': 'application/json',
  ...corsHeaders,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, jsonHeaders);
  res.end(JSON.stringify(data));
}

function ok(res) {
  sendJSON(res, 200, { ok: true });
}

function findUser(email) {
  return users.find((u) => u.email === email) || users[0];
}

// ── SSE Client Tracking ─────────────────────────────────────────────────────

const sseClients = new Set();

// ── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '';
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // ── SSE Endpoint ────────────────────────────────────────────────────────
  if (pathname === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders,
    });
    // Send initial ping
    res.write('data: {"event":"ping"}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── Collect request body ────────────────────────────────────────────────
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    let data = {};
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      // ignore parse errors
    }

    // ── Route matching ──────────────────────────────────────────────────

    // SSE broadcast
    if (pathname === '/api/events/broadcast') {
      sseClients.forEach((client) => {
        client.write('data: ' + JSON.stringify(data || {}) + '\n\n');
      });
      return ok(res);
    }

    // Bootstrap
    if (pathname === '/api/bootstrap') {
      return sendJSON(res, 200, {
        setupComplete: true,
        users,
        classes,
        subjects,
      });
    }

    // Auth
    if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
      const user = findUser(data.email);
      lastLoggedInUser = user;
      return sendJSON(res, 200, { token: 'mock-token-' + Date.now(), user });
    }

    if (pathname === '/api/auth/me') {
      return sendJSON(res, 200, lastLoggedInUser);
    }

    if (pathname === '/api/auth/face/register' || pathname === '/api/auth/face/login') {
      return sendJSON(res, 200, { ok: true, token: 'mock-token', user: users[0] });
    }

    if (pathname === '/api/auth/face') {
      return sendJSON(res, 200, { authenticated: true, confidence: 0.95, method: 'mock' });
    }

    if (pathname === '/api/auth/password/request') {
      return sendJSON(res, 200, { ok: true, message: 'Reset email sent (mock)' });
    }

    if (pathname === '/api/auth/password/verify') {
      return sendJSON(res, 200, { ok: true, valid: true });
    }

    if (pathname === '/api/auth/password/complete') {
      return ok(res);
    }

    if (pathname === '/api/auth/email/verify-send') {
      return sendJSON(res, 200, { ok: true, message: 'Verification email sent (mock)' });
    }

    if (pathname === '/api/auth/email/verify-check') {
      return sendJSON(res, 200, { ok: true, verified: true });
    }

    // Users
    if (pathname.startsWith('/api/users')) {
      if (method === 'GET') {
        return sendJSON(res, 200, { items: users });
      }
      return ok(res);
    }

    // Classes
    if (pathname.startsWith('/api/classes')) {
      if (method === 'GET') {
        return sendJSON(res, 200, classes);
      }
      return ok(res);
    }

    // Subjects
    if (pathname.startsWith('/api/subjects')) {
      if (method === 'GET') {
        return sendJSON(res, 200, subjects);
      }
      return ok(res);
    }

    // Notes
    if (pathname.startsWith('/api/notes')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      return sendJSON(res, 200, {
        ok: true,
        url: 'https://example.com/mock-note',
        extractedText: 'Mock extracted note content',
      });
    }

    // Attendance
    if (pathname.startsWith('/api/attendance')) {
      return ok(res);
    }

    // Grades
    if (pathname.startsWith('/api/grades')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      if (pathname.includes('/bulk')) {
        return sendJSON(res, 200, { ok: true, count: (data.grades || []).length });
      }
      return sendJSON(res, 200, { ok: true, grade: { id: 'g_' + Date.now(), ...data } });
    }

    // Timetable
    if (pathname.startsWith('/api/timetable')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      return sendJSON(res, 200, { ok: true, entry: { id: 'tt_' + Date.now(), ...data } });
    }

    // Tickets
    if (pathname.startsWith('/api/tickets')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      if (pathname.includes('/reply')) {
        return sendJSON(res, 200, { ok: true });
      }
      if (pathname.includes('/close')) {
        return sendJSON(res, 200, { ok: true });
      }
      if (pathname.includes('/assign')) {
        return sendJSON(res, 200, { ok: true, assignedToId: data.adminId || '1' });
      }
      return sendJSON(res, 200, { ok: true, ticket: { id: 't_' + Date.now(), ...data } });
    }

    // Notifications
    if (pathname.startsWith('/api/notifications')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      if (method === 'PATCH') {
        return ok(res);
      }
      if (method === 'DELETE') {
        return ok(res);
      }
      return sendJSON(res, 200, {
        ok: true,
        notification: { id: 'n_' + Date.now(), ...data },
      });
    }

    // Events (non-SSE GET)
    if (pathname.startsWith('/api/events')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      return ok(res);
    }

    // Question bank
    if (pathname.startsWith('/api/question-bank')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      if (method === 'DELETE') {
        return ok(res);
      }
      return ok(res);
    }

    // Tags presets
    if (pathname === '/api/tags-presets') {
      if (method === 'GET') {
        return sendJSON(res, 200, {});
      }
      return ok(res);
    }

    if (pathname === '/api/tags-presets/update') {
      return ok(res);
    }

    // Integrations
    if (pathname.startsWith('/api/integrations')) {
      return ok(res);
    }

    // Analytics
    if (pathname.startsWith('/api/analytics')) {
      return sendJSON(res, 200, { insights: [] });
    }

    // Audit logs
    if (pathname.startsWith('/api/audit-logs')) {
      return ok(res);
    }

    // Webhooks
    if (pathname.startsWith('/api/webhooks')) {
      if (method === 'GET') {
        return sendJSON(res, 200, []);
      }
      if (method === 'DELETE') {
        return ok(res);
      }
      return ok(res);
    }

    // Email
    if (pathname === '/api/email-notification') {
      return ok(res);
    }

    if (pathname === '/api/ai-email') {
      return ok(res);
    }

    if (pathname === '/api/admin/email/health') {
      return sendJSON(res, 200, { status: 'ok', provider: 'mock' });
    }

    // Default catch-all
    console.log(`[mock] Unhandled: ${method} ${pathname}`);
    return ok(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ✅ Mock API server running on http://localhost:${PORT}`);
  console.log(`  📡 SSE endpoint: http://localhost:${PORT}/api/events`);
  console.log(`  🔐 Login with: admin@example.com / teacher@example.com / student@example.com`);
  console.log(`  (any password works)\n`);
});
