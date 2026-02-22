# SRS - GYANDEEP (3-Page Version)
**AI-Powered Classroom Management System | Feb 22, 2026**

---

## **1. INTRODUCTION**

**Purpose:** Gyandeep is a web-based classroom tool that enables teachers to create AI-powered quizzes (5 MCQs in <3 sec), track attendance via face recognition, and provide instant student feedback.

**Problem:** Teachers spend 45 min creating quizzes; attendance is manual; student feedback is delayed 1 week.

**Solution:** AI-generated quizzes, face-verified attendance, instant score + explanation.

**Scope:** Session management (6-digit codes), face registration, quiz generation, attendance tracking, performance dashboards, bulk user import, audit logs.

**Out of Scope:** Video calling, mobile app, blockchain credentials, offline sync (future).

**Success:** Teachers adopt (<5 min per quiz) within Month 1; 99% uptime; <3 sec page load.

---

## **2. OVERALL DESCRIPTION**

### **2.1 Product Perspective**
Standalone web app integrating with school's existing ecosystem (LMS, email, admin system). REST APIs enable future integrations. Deployed on Docker (AWS/Vercel).

### **2.2 Product Function**

| User | Creates | System Does |
|------|---------|-------------|
| Teacher | Session (button) | Generates 6-digit code A3B7C9; expires 10 min |
| Teacher | Quiz (upload notes PDF) | AI writes 5 MCQs; teacher edits; publishes |
| Teacher | Attendance | Face verification; live table; export CSV |
| Student | Session join (6-digit code) | Verifies face; marks present; auto-logs |
| Student | Quiz attempt | Accepts 5 answers; calculates %; explains each Q |
| Admin | Bulk import (CSV) | Creates 150 accounts; sends login emails |

### **2.3 User Characteristics**

| User | Tech Level | Need | Pain |
|------|-----------|------|------|
| Teachers (5–10) | Low-Medium | Fast quiz creation | "Takes 45 min" |
| Students (50–100) | Medium-High | Instant feedback | "Wait 1 week for grades" |
| Admin (1–2) | Medium | Compliance tracking | "No audit trail" |
| Parents | Low | Face data security | "Don't trust data usage" |
| IT (1) | High | High uptime | "Manage backups daily" |

### **2.4 General Constraints**

| Constraint | Limit |
|-----------|-------|
| Timeline | 11 weeks (May 2026 launch) |
| Budget | Rs. 50,000/year |
| Team | 2–4 engineers |
| Pilot Scale | 50–100 students, 1 school |
| Internet | 2+ Mbps |
| Browser | Chrome 90+, Safari 14+, Firefox 88+, Edge 90+ |
| Storage | 10 GB |

### **2.5 Assumptions**

✓ Teachers have basic PC skills (upload PDF, click buttons)  
✓ Students have smartphones + webcams  
✓ School has stable internet 2+ Mbps  
✓ Parents consent to face data  
✓ Gemini API 99.9% uptime  
✓ In-person attendance model  

---

## **3. SPECIAL REQUIREMENTS**

### **3.1 Hardware**
- **Teachers:** Laptop/desktop, webcam, 1920×1080 screen, 4GB RAM
- **Students:** Smartphone/tablet, webcam, 1280×720 resolution, 2GB RAM
- **Server:** 2GB RAM, 2 CPU cores, 50GB SSD, 10 Mbps internet uplink, UPS backup

### **3.2 Software**
- **Frontend:** React 18, TypeScript, Vite, Framer Motion, Recharts
- **Backend:** Node.js 18, Express, PostgreSQL 14+, Supabase Auth
- **APIs:** Google Gemini (quiz), Google OAuth (login), SendGrid (email)
- **Deployment:** Docker, AWS/Vercel, GitHub Actions
- **Testing:** Jest, Playwright, Postman

---

## **4. FUNCTIONAL REQUIREMENTS IN MODULES**

### **Module 1: Authentication (4 features)**
1. **Signup** – Email, password (8+ chars), name, role, school name
2. **Login** – Email + password; Google OAuth; session JWT (8-hr expiry)
3. **Face Registration** – 3 selfies different angles; encrypted storage; auto-delete 7 days
4. **Password Reset** – Email link (1-hr valid); single-use token

### **Module 2: Session Management (3 features)**
1. **Create Session** – Teacher clicks button → Unique 6-digit code A3B7C9 → Expires 10 min
2. **Student Join** – Enter code → Face verified OR PIN backup → Marked present
3. **Attendance Dashboard** – Live table (name, verified, time); teacher can override; export CSV

### **Module 3: Quiz Generation (3 features)**
1. **Upload Notes** – Teacher uploads PDF/DOC (max 50 MB); system extracts text
2. **Generate AI Quiz** – System sends notes to Gemini with prompt "Write 5 MCQs"; Gemini returns JSON
3. **Publish Quiz** – Teacher reviews 5 questions; can edit/delete/add; publish status = immutable

### **Module 4: Quiz Submission (2 features)**
1. **Take Quiz** – Student sees "Q1 of 5"; selects A/B/C/D; clicks Next; repeat for Q2–Q5
2. **Score & Feedback** – System calculates % instantly; shows "80% (4/5)", explanation per Q, class avg

### **Module 5: Reports (2 features)**
1. **Student Performance** – Line chart (score history), topics (strong/weak), class avg comparison
2. **Teacher Analytics** – Avg score by quiz, attendance trend, drill-down "Which students got Q3 wrong?"

### **Module 6: Admin (2 features)**
1. **Bulk Import** – Upload CSV (name, email, class); validate; import 150 users <1 min; send login emails
2. **Audit Log** – Shows date, time, user, action, IP; filter by user/action/date; export CSV; immutable

---

## **5. NON-FUNCTIONAL REQUIREMENTS**

| Category | Target | Why |
|----------|--------|-----|
| **Performance** | Page load <3 sec; quiz fetch <1 sec; face match <2 sec; AI gen <3 sec | User experience |
| **Uptime** | 99% (7 hrs down/month allowed) | School reliability |
| **Scalability** | 500 concurrent users; 1000+ queries/sec | Peak classroom load |
| **Security** | HTTPS, JWT, bcryptjs (pwd hash), role-based access, rate limiting (10 login/hr) | Protect data |
| **Accessibility** | WCAG 2.1 AA; keyboard nav; screen reader; 4.5:1 contrast; 16px base font | Inclusive |
| **Backup** | Daily automated; restore <1 hour | Disaster recovery |
| **Compatibility** | Chrome 90+, Safari 14+, Firefox 88+, Edge 90+ | All devices |

---

## **6. DESIGN CONSTRAINTS**

- **Stack (Fixed):** React 18 (school mandated), Node.js, PostgreSQL (not MongoDB), Google Gemini (not OpenAI, cost)
- **Architecture:** API-first, stateless backend (JWT tokens), containerized (Docker)
- **Database:** Single Postgres instance MVP; replication later
- **Fonts:** Segoe UI, Roboto (web-safe, no custom to reduce load)
- **Colors:** Blue (#0066CC), Green (#00AA00), Red (#CC0000), Gray (#666666)

---

## **7. SYSTEM ATTRIBUTES**

| Attribute | Specification |
|-----------|---|
| **Reliability** | MTBF >720 hrs; MTTR <30 min; ACID transactions; monthly restore tests |
| **Safety** | Data deletion within 24 hrs (logged); 2+ DB replicas; load balancer; rate limiting 1000 req/min per IP |
| **Usability** | 3-step onboarding (login → session → quiz); plain English errors; in-app tooltips; FAQ page |
| **Interoperability** | CSV export/import; REST APIs (Swagger docs); works with OAuth, Gemini, email services |

---

## **8. OTHER REQUIREMENTS**

| Category | Requirement |
|----------|---|
| **Legal** | GDPR/CCPA-compliant; MEITY guidelines (India); written parental consent for face data |
| **Privacy** | Face photos deleted 7 days; audit trail logged 1 year (immutable) |
| **Documentation** | API Swagger; admin/teacher/student guides; IT deployment guide (Docker, backup) |
| **Support** | Critical bugs: 24-hr fix; training: 1 hr each (teachers, admin); monthly check-ins |
| **Deployment** | Weekly releases (Mondays 8 PM IST); rollback <10 min; staging environment |
| **Monitoring** | Uptime, response times, error rates, user activity, DB performance; alerts if <99% uptime |
| **Training** | Teachers: 1 hr (notes upload, quiz gen, attendance); Admin: 1 hr (bulk import, consent, logs) |
| **Timeline** | 11 weeks: Wks 1–4 (auth + sessions), Wks 5–7 (quiz gen), Wks 8–10 (attendance + admin), Wk 11 (launch) |

---

## **ACCEPTANCE CRITERIA**

| Feature | Pass When |
|---------|-----------|
| Session Code | 6 digits, unique, expires exactly 10 min |
| Quiz Generation | Always 5 Q's, teacher editable, <3 sec |
| Attendance | Live table <500ms, face match <2 sec |
| Score | Instant (<1 sec), explanation per Q |
| Uptime | 99% (≤7 hrs down/month) |
| Page Load | <3 sec all pages |
| Accessibility | Keyboard nav works, screen reader reads content |

---

**Version:** 1.0 | **Date:** Feb 22, 2026 | **Owner:** Dev Team | **Next Review:** After stakeholder interviews

---

**END OF SRS (3 PAGES)**
