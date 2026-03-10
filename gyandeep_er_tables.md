# Gyandeep ER Diagram - Table Format

## 1. ENTITIES WITH ATTRIBUTES

### 1.1 TEACHER
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Unique teacher ID |
| name | TEXT | NOT NULL | Full name |
| email | TEXT | NOT NULL | Email address |
| password | TEXT | NOT NULL | Hashed password |
| googleId | TEXT | - | Google OAuth ID |
| faceImage | TEXT | - | Base64 face image |
| emailVerified | INTEGER | - | Email verified flag |
| preferences | TEXT | - | User preferences JSON |
| history | TEXT | - | Activity history |
| assignedSubjects | TEXT | NOT NULL | Subjects assigned to teacher |
| createdAt | INTEGER | - | Creation timestamp |

### 1.2 STUDENT
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Unique student ID |
| name | TEXT | NOT NULL | Full name |
| email | TEXT | NOT NULL | Email address |
| password | TEXT | NOT NULL | Hashed password |
| googleId | TEXT | - | Google OAuth ID |
| faceImage | TEXT | - | Base64 face image |
| emailVerified | INTEGER | - | Email verified flag |
| preferences | TEXT | - | User preferences JSON |
| history | TEXT | - | Activity history |
| performance | TEXT | NOT NULL | Student performance data |
| classId | TEXT | NOT NULL | Assigned class ID |
| createdAt | INTEGER | - | Creation timestamp |

### 1.3 ADMIN
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Unique admin ID |
| name | TEXT | NOT NULL | Full name |
| email | TEXT | NOT NULL | Email address |
| password | TEXT | NOT NULL | Hashed password |
| googleId | TEXT | - | Google OAuth ID |
| faceImage | TEXT | - | Base64 face image |
| emailVerified | INTEGER | - | Email verified flag |
| preferences | TEXT | - | User preferences JSON |
| history | TEXT | - | Activity history |
| createdAt | INTEGER | - | Creation timestamp |

---

### 1.4 CLASSES
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Unique class ID |
| name | TEXT | NOT NULL | Class name |
| teacherId | TEXT | FK | Teacher who owns class |

---

### 1.5 GRADES
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Grade ID |
| studentId | TEXT | FK | Student who received grade |
| subject | TEXT | NOT NULL | Subject name |
| category | TEXT | NOT NULL | test/homework/quiz |
| title | TEXT | NOT NULL | Assignment title |
| score | REAL | NOT NULL | Student score |
| maxScore | REAL | NOT NULL | Maximum score |
| weight | REAL | - | Weight in final grade |
| date | TEXT | NOT NULL | Date (YYYY-MM-DD) |
| teacherId | TEXT | FK | Teacher who graded |
| createdAt | INTEGER | - | Creation timestamp |

---

### 1.6 ATTENDANCE
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | INTEGER | PK | Auto-increment ID |
| session_id | TEXT | - | Class session ID |
| studentId | TEXT | FK | Student ID |
| status | TEXT | NOT NULL | present/absent/late |
| verified_at | TEXT | - | Verification timestamp |

---

### 1.7 QUESTION_BANK
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Question ID |
| question | TEXT | NOT NULL | Question text |
| options | TEXT | NOT NULL | Answer options JSON |
| correctAnswer | TEXT | NOT NULL | Correct answer |
| tags | TEXT | - | Question tags |
| difficulty | TEXT | - | easy/medium/hard |
| subject | TEXT | - | Subject |
| createdBy | TEXT | FK | Teacher who created |

---

### 1.8 TIMETABLE
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Entry ID |
| day | TEXT | NOT NULL | Day of week |
| startTime | TEXT | NOT NULL | Start time |
| endTime | TEXT | NOT NULL | End time |
| subject | TEXT | NOT NULL | Subject |
| teacherId | TEXT | FK | Teacher ID |
| classId | TEXT | FK | Class ID |
| room | TEXT | - | Room number |
| createdAt | INTEGER | - | Created timestamp |
| updatedAt | INTEGER | - | Updated timestamp |

---

### 1.9 TICKETS
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Ticket ID |
| userId | TEXT | FK | Creator ID |
| userName | TEXT | NOT NULL | Creator name |
| subject | TEXT | NOT NULL | Subject |
| message | TEXT | NOT NULL | Message |
| category | TEXT | - | Category |
| status | TEXT | NOT NULL | open/closed |
| assignedTo | TEXT | FK | Assigned admin/teacher |
| createdAt | INTEGER | - | Created timestamp |
| updatedAt | INTEGER | - | Updated timestamp |
| version | INTEGER | - | Concurrency version |

---

### 1.10 CENTRALIZED_NOTES
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | TEXT | PK | Note ID |
| classId | TEXT | FK | Class ID |
| subjectId | TEXT | - | Subject ID |
| unitNumber | INTEGER | - | Unit number |
| unitName | TEXT | - | Unit name |
| title | TEXT | NOT NULL | Note title |
| content | TEXT | NOT NULL | Note content |
| filePath | TEXT | - | File path |
| noteType | TEXT | - | Type |
| teacherId | TEXT | FK | Teacher ID |
| createdAt | INTEGER | - | Created timestamp |

---

### 1.11 AUDIT_LOGS
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| id | INTEGER | PK | Log ID |
| ts | INTEGER | NOT NULL | Timestamp |
| type | TEXT | NOT NULL | Action type |
| userId | TEXT | FK | User ID |
| details | TEXT | - | JSON details |

---

### 1.12 OTP
| Attribute | Type | Constraints | Description |
|----------|------|-------------|-------------|
| userId | TEXT | PK, FK | User ID |
| code | TEXT | NOT NULL | OTP code |
| expires | INTEGER | NOT NULL | Expiry timestamp |

---

## 2. RELATIONSHIPS MATRIX

| # | Entity A | Entity B | Relationship | Type | Description |
|---|----------|----------|---------------|------|-------------|
| 1 | TEACHER | CLASSES | teaches | 1:N | Teacher teaches multiple classes |
| 2 | TEACHER | GRADES | assigns | 1:N | Teacher assigns grades to students |
| 3 | TEACHER | TIMETABLE | manages | 1:N | Teacher manages timetable |
| 4 | TEACHER | CENTRALIZED_NOTES | uploads | 1:N | Teacher uploads notes |
| 5 | TEACHER | QUESTION_BANK | creates | 1:N | Teacher creates questions |
| 6 | TEACHER | OTP | has | 1:1 | Teacher owns OTP |
| 7 | TEACHER | AUDIT_LOGS | performs | 1:N | Teacher performs actions |
| 8 | STUDENT | CLASSES | belongs_to | N:1 | Student belongs to class |
| 9 | STUDENT | GRADES | receives | N:1 | Student receives grades |
| 10 | STUDENT | ATTENDANCE | marks | N:1 | Student marks attendance |
| 11 | STUDENT | OTP | has | 1:1 | Student owns OTP |
| 12 | STUDENT | AUDIT_LOGS | performs | N:1 | Student performs actions |
| 13 | STUDENT | TICKETS | creates | N:1 | Student creates tickets |
| 14 | ADMIN | CLASSES | manages | 1:N | Admin manages classes |
| 15 | ADMIN | TICKETS | assigns | 1:N | Admin assigns tickets |
| 16 | ADMIN | OTP | has | 1:1 | Admin owns OTP |
| 17 | ADMIN | AUDIT_LOGS | performs | 1:N | Admin performs actions |
| 18 | ADMIN | CENTRALIZED_NOTES | uploads | N:1 | Admin uploads notes |
| 19 | CLASSES | TIMETABLE | has | 1:N | Class has timetable |
| 20 | CLASSES | CENTRALIZED_NOTES | has | 1:N | Class has notes |
| 21 | CLASSES | GRADES | has | 1:N | Class has grades |

---

## 3. CARDINALITY SUMMARY

```
TEACHER (1) ──────────────── (N) CLASSES
TEACHER (1) ──────────────── (N) GRADES
TEACHER (1) ──────────────── (N) TIMETABLE
TEACHER (1) ──────────────── (N) CENTRALIZED_NOTES
TEACHER (1) ──────────────── (N) QUESTION_BANK
TEACHER (1) ──────────────── (1) OTP
TEACHER (1) ──────────────── (N) AUDIT_LOGS

STUDENT (N) ──────────────── (1) CLASSES
STUDENT (N) ──────────────── (1) GRADES
STUDENT (N) ──────────────── (1) ATTENDANCE
STUDENT (1) ──────────────── (1) OTP
STUDENT (N) ──────────────── (1) AUDIT_LOGS
STUDENT (N) ──────────────── (1) TICKETS

ADMIN (1) ──────────────── (N) CLASSES
ADMIN (1) ──────────────── (N) TICKETS
ADMIN (1) ──────────────── (1) OTP
ADMIN (1) ──────────────── (N) AUDIT_LOGS
ADMIN (N) ──────────────── (1) CENTRALIZED_NOTES

CLASSES (1) ──────────────── (N) TIMETABLE
CLASSES (1) ──────────────── (N) CENTRALIZED_NOTES
CLASSES (1) ──────────────── (N) GRADES
```

---

## 4. ROLE-WISE RESPONSIBILITIES

| Role | Tables Affected | Responsibilities |
|------|-----------------|------------------|
| **TEACHER** | CLASSES, GRADES, TIMETABLE, CENTRALIZED_NOTES, QUESTION_BANK, OTP, AUDIT_LOGS | Teach classes, assign grades, manage timetable, upload notes, create questions |
| **STUDENT** | CLASSES, GRADES, ATTENDANCE, TICKETS, OTP, AUDIT_LOGS | Belong to class, receive grades, mark attendance, create tickets |
| **ADMIN** | CLASSES, TICKETS, CENTRALIZED_NOTES, OTP, AUDIT_LOGS | Manage classes, assign tickets, upload notes, system administration |

---

## 5. PRIMARY KEYS & FOREIGN KEYS

| Table | Primary Key | Foreign Keys |
|-------|------------|--------------|
| TEACHER | id | - |
| STUDENT | id | - |
| ADMIN | id | - |
| CLASSES | id | teacherId → TEACHER(id) |
| GRADES | id | studentId → STUDENT(id), teacherId → TEACHER(id) |
| ATTENDANCE | id | studentId → STUDENT(id) |
| QUESTION_BANK | id | createdBy → TEACHER(id) |
| TIMETABLE | id | teacherId → TEACHER(id), classId → CLASSES(id) |
| TICKETS | id | userId → STUDENT(id), assignedTo → ADMIN(id) |
| CENTRALIZED_NOTES | id | classId → CLASSES(id), teacherId → TEACHER(id) |
| AUDIT_LOGS | id | userId → TEACHER/STUDENT/ADMIN(id) |
| OTP | userId | userId → TEACHER/STUDENT/ADMIN(id) |
