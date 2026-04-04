# Gyandeep Testing Guide

## Quick Start

### 1. Run API Tests Only
```bash
npm run test:api
```

### 2. Run Full Stack (Frontend + Backend)
```bash
npm run test:fullstack
```

### 3. Manual Testing
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev

# Browser: http://localhost:5173
```

---

## Manual Testing Checklist

### ✅ Authentication
| Test | Steps | Expected |
|------|-------|----------|
| Email Login | Login with credentials | Redirect to dashboard |
| Face Login | Click face icon, capture | Authenticated if match |
| Logout | Click logout | Redirect to login |
| Password Reset | Forgot password | Email/code sent |

### ✅ Teacher Dashboard
| Feature | Test | Expected |
|---------|------|----------|
| Start Session | Enable location, click start | Code generated |
| Attendance | Mark students present | Records saved |
| Quiz Generation | Enter topic, click generate | Questions appear |
| Upload Notes | Upload PDF/image | File stored |
| Performance Chart | View performance tab | Real data shown |
| Question Bank | Add/edit/delete questions | CRUD works |

### ✅ Student Dashboard
| Feature | Test | Expected |
|---------|------|----------|
| Mark Attendance | Enter code or use face | Marked present |
| View Grades | Check grades tab | Grades displayed |
| Face Registration | Register face | Face saved |
| Notifications | Receive notification | Toast appears |

### ✅ Admin Dashboard
| Feature | Test | Expected |
|---------|------|----------|
| User Management | Add/edit/delete users | Changes saved |
| Analytics | View dashboard | Charts render |
| Question Bank | Manage questions | Full CRUD |

---

## API Testing with curl

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'
```

### Attendance
```bash
# Set your token
TOKEN="your_token_here"

# Create attendance
curl -X POST http://localhost:3001/api/attendance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"studentId":"123","classId":"456","status":"Present"}'

# Get weekly attendance
curl http://localhost:3001/api/attendance/weekly?classId=456 \
  -H "Authorization: Bearer $TOKEN"
```

### AI Features
```bash
# Generate Quiz
curl -X POST http://localhost:3001/api/quiz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"notesText":"Math basics","subject":"Mathematics"}'

# Auto Grade
curl -X POST http://localhost:3001/api/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"questions":[{"question":"2+2?","correctAnswer":"4","type":"mcq","maxScore":10}],"answers":["4"]}'

# Summarize
curl -X POST http://localhost:3001/api/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"Long text...","subject":"Science","mode":"bullets"}'
```

---

## Test Users (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gyandeep.edu | admin123 |
| Teacher | teacher@gyandeep.edu | teacher123 |
| Student | student@gyandeep.edu | student123 |

---

## Troubleshooting

### Backend won't start
```bash
# Check MongoDB connection
# Ensure .env has valid MONGODB_URI

# Check port
netstat -an | grep 3001
```

### Frontend won't start
```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall
npm install
```

### API tests fail
```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check CORS
curl -I http://localhost:3001/api/health
```

---

## Coverage Reports

```bash
# Run with coverage
npm run test:coverage

# Security tests
npm run test:security
```
