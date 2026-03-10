# Gyandeep ER Diagram - Tabular Format

---

## 1. ENTITIES AND ATTRIBUTES

### 1.1 USERS
Central entity storing all system users (students, teachers, admins).

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique identifier for each user |
| email | TEXT | NOT NULL, UNIQUE | User's email address |
| name | TEXT | NOT NULL | Full name of the user |
| password_hash | TEXT | NULLABLE | Hashed password (NULL for OAuth users) |
| role | user_role | NOT NULL, DEFAULT 'student' | Role: student, teacher, or admin |
| google_id | TEXT | UNIQUE | Google OAuth identifier |
| face_vector | VECTOR(128) | - | Face embedding for recognition |
| email_verified | BOOLEAN | NOT NULL, DEFAULT FALSE | Email verification status |
| xp | INT | NOT NULL, DEFAULT 0 | Experience points (gamification) |
| coins | INT | NOT NULL, DEFAULT 0 | Virtual currency (gamification) |
| preferences | JSONB | NOT NULL, DEFAULT '{}' | User settings and preferences |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

### 1.2 SUBJECTS
Master table for academic subjects.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique subject identifier |
| name | TEXT | NOT NULL, UNIQUE | Subject name (e.g., Mathematics) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.3 CLASSES
Class or section definitions taught by teachers.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique class identifier |
| name | TEXT | NOT NULL | Class name (e.g., Class 10-A) |
| teacher_id | UUID | FOREIGN KEY → users(id) | Assigned teacher |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.4 CLASS_ENROLLMENTS
Junction table for many-to-many relationship between students and classes.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **class_id** | UUID | FOREIGN KEY → classes(id), PRIMARY KEY (composite) | Class identifier |
| **student_id** | UUID | FOREIGN KEY → users(id), PRIMARY KEY (composite) | Student identifier |
| enrolled_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Enrollment timestamp |

---

### 1.5 CLASS_SESSIONS
Individual class sessions with attendance codes and geofencing.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique session identifier |
| class_id | UUID | NOT NULL, FOREIGN KEY → classes(id) | Parent class reference |
| subject_id | UUID | FOREIGN KEY → subjects(id) | Subject taught in session |
| code | CHAR(6) | NOT NULL | 6-digit attendance code |
| expiry | TIMESTAMPTZ | NOT NULL | Code expiration time |
| location | GEOMETRY(Point) | - | Teacher's GPS location |
| radius_m | INT | NOT NULL, DEFAULT 100 | Geofencing radius in meters |
| notes_url | TEXT | - | URL to session notes |
| notes_hash | TEXT | - | SHA-256 hash for quiz cache |
| quiz_published | BOOLEAN | NOT NULL, DEFAULT FALSE | Quiz publication status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.6 ATTENDANCE
Student attendance records with geolocation tracking.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | BIGSERIAL | PRIMARY KEY | Auto-increment attendance ID |
| session_id | UUID | NOT NULL, FOREIGN KEY → class_sessions(id) | Class session reference |
| student_id | UUID | NOT NULL, FOREIGN KEY → users(id) | Student reference |
| status | attendance_status | NOT NULL, DEFAULT 'present' | present/absent/late/excused |
| geo_location | GEOMETRY(Point) | - | Student's GPS location |
| verified_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Attendance timestamp |

---

### 1.7 QUIZZES
AI-generated quizzes linked to class sessions.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique quiz identifier |
| session_id | UUID | NOT NULL, FOREIGN KEY → class_sessions(id) | Parent session |
| questions | JSONB | NOT NULL | Quiz questions and answers (JSON) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.8 PERFORMANCE
Student performance scores and analytics.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | BIGSERIAL | PRIMARY KEY | Auto-increment performance ID |
| student_id | UUID | NOT NULL, FOREIGN KEY → users(id) | Student reference |
| subject_id | UUID | FOREIGN KEY → subjects(id) | Subject reference |
| session_id | UUID | FOREIGN KEY → class_sessions(id) | Related session |
| score | DECIMAL(5,2) | NOT NULL | Achieved score |
| max_score | DECIMAL(5,2) | NOT NULL, DEFAULT 100 | Maximum possible score |
| recorded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Recording timestamp |

---

### 1.9 BADGES
Gamification badge definitions.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | SERIAL | PRIMARY KEY | Auto-increment badge ID |
| name | TEXT | NOT NULL, UNIQUE | Badge display name |
| slug | TEXT | NOT NULL, UNIQUE | URL-friendly identifier |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | Badge properties (xp, icon, etc.) |

---

### 1.10 USER_BADGES
Junction table linking users to their earned badges.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **user_id** | UUID | FOREIGN KEY → users(id), PRIMARY KEY (composite) | User reference |
| **badge_id** | INT | FOREIGN KEY → badges(id), PRIMARY KEY (composite) | Badge reference |
| awarded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Badge award timestamp |

---

### 1.11 QUESTION_BANK
Reusable quiz questions repository.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique question identifier |
| question | TEXT | NOT NULL | Question text |
| options | JSONB | NOT NULL | Answer options as JSON array |
| correct_answer | TEXT | NOT NULL | Correct answer |
| subject | TEXT | - | Subject category |
| tags | JSONB | NOT NULL, DEFAULT '[]' | Question tags |
| difficulty | TEXT | NOT NULL, DEFAULT 'medium' | easy/medium/hard |
| notes_hash | TEXT | - | Links to source notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.12 GRADES
Gradebook entries for assignments, tests, and assessments.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique grade identifier |
| student_id | UUID | NOT NULL, FOREIGN KEY → users(id) | Student reference |
| teacher_id | UUID | FOREIGN KEY → users(id) | Grading teacher |
| subject | TEXT | NOT NULL | Subject name |
| category | TEXT | NOT NULL | Grade category (test/homework/quiz) |
| title | TEXT | NOT NULL | Assignment title |
| score | DECIMAL(6,2) | NOT NULL | Achieved score |
| max_score | DECIMAL(6,2) | NOT NULL | Maximum possible score |
| weight | DECIMAL(4,2) | NOT NULL, DEFAULT 1 | Weight in final calculation |
| date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Grade date |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.13 OTP_CODES
Temporary OTP and verification codes.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique OTP identifier |
| key | TEXT | NOT NULL, UNIQUE | Email or user ID |
| code | TEXT | NOT NULL | OTP verification code |
| purpose | TEXT | NOT NULL | Purpose: otp/reset/email_verify |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiration timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.14 AUDIT_LOGS
System audit trail for security and compliance.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | BIGSERIAL | PRIMARY KEY | Auto-increment log ID |
| ts | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Action timestamp |
| type | TEXT | NOT NULL | Action type (login/update/delete) |
| user_id | UUID | FOREIGN KEY → users(id) | Acting user |
| details | JSONB | NOT NULL, DEFAULT '{}' | Action details as JSON |

---

### 1.15 NOTIFICATIONS
User notifications and system announcements.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique notification ID |
| user_id | UUID | FOREIGN KEY → users(id) | Target user (NULL = broadcast) |
| title | TEXT | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification body |
| type | TEXT | NOT NULL, DEFAULT 'info' | Notification type |
| read | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

## 2. RELATIONSHIPS AND CARDINALITY

### 2.1 Relationship Matrix

| # | Entity A | Entity B | Relationship | Cardinality | Description | Foreign Key |
|---|----------|----------|--------------|-------------|-------------|-------------|
| 1 | **USERS** | CLASSES | teaches | 1:N | One teacher teaches many classes | classes.teacher_id |
| 2 | **USERS** | CLASS_ENROLLMENTS | enrolls | 1:N | One student enrolls in many classes | class_enrollments.student_id |
| 3 | **CLASSES** | CLASS_ENROLLMENTS | has | 1:N | One class has many enrolled students | class_enrollments.class_id |
| 4 | **CLASSES** | CLASS_SESSIONS | contains | 1:N | One class contains many sessions | class_sessions.class_id |
| 5 | **SUBJECTS** | CLASS_SESSIONS | scheduled | 1:N | One subject scheduled in many sessions | class_sessions.subject_id |
| 6 | **CLASS_SESSIONS** | ATTENDANCE | records | 1:N | One session has many attendance records | attendance.session_id |
| 7 | **CLASS_SESSIONS** | QUIZZES | generates | 1:1 | One session generates one quiz | quizzes.session_id |
| 8 | **USERS** | ATTENDANCE | marks | 1:N | One student marks many attendances | attendance.student_id |
| 9 | **USERS** | PERFORMANCE | achieves | 1:N | One student has many performance records | performance.student_id |
| 10 | **SUBJECTS** | PERFORMANCE | measures | 1:N | One subject measures many performances | performance.subject_id |
| 11 | **CLASS_SESSIONS** | PERFORMANCE | evaluates | 1:N | One session evaluates many performances | performance.session_id |
| 12 | **USERS** | USER_BADGES | earns | 1:N | One user earns many badges | user_badges.user_id |
| 13 | **BADGES** | USER_BADGES | awarded | 1:N | One badge awarded to many users | user_badges.badge_id |
| 14 | **USERS** | GRADES | receives | 1:N | One student receives many grades | grades.student_id |
| 15 | **USERS** | GRADES | assigns | 1:N | One teacher assigns many grades | grades.teacher_id |
| 16 | **USERS** | AUDIT_LOGS | performs | 1:N | One user performs many actions | audit_logs.user_id |
| 17 | **USERS** | NOTIFICATIONS | receives | 1:N | One user receives many notifications | notifications.user_id |

---

### 2.2 Cardinality Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    CARDINALITY DIAGRAM                           │
└─────────────────────────────────────────────────────────────────┘

USERS (Teacher)          CLASSES
    ┌─────────┐ 1     N ┌─────────┐
    │ TEACHER ├─────────┤ CLASS   │
    └─────────┘ teaches └─────────┘
         │ 1
         │
         │ N
    ┌─────────┐          CLASS_SESSIONS
    │ GRADES  ├────────┐     ┌─────────┐
    └─────────┘        │  1  │ SESSION │
         ▲             └──N─┤         │
         │                   └────┬────┘
    1    │ 1                      │ 1
  ┌──────┴──────┐                 │
  │   USERS     │                 │ N
  │  (Student)  │            ┌────┴────┐
  └─────────────┘            │ATTENDANCE│
         │                   └─────────┘
         │ N
         │
    N    │ ┌─────────────┐
  ┌──────┴─┤CLASS_ENROLLMENTS├────┐
  │        └─────────────┘        │
  │ N                             │ 1
┌─┴─────────┐               ┌─────┴─────┐
│ CLASSES   │               │   USERS   │
└───────────┘               └───────────┘

USERS ───1:N─── USER_BADGES ───N:1─── BADGES

USERS ───1:N─── PERFORMANCE ───N:1─── SUBJECTS

USERS ───1:N─── AUDIT_LOGS

USERS ───1:N─── NOTIFICATIONS
```

---

### 2.3 Relationship Details by Entity

#### USERS Relationships

| Relationship Type | Related Entity | Cardinality | Cardinality Description |
|-------------------|----------------|-------------|-------------------------|
| teaches | CLASSES | 1:N | One teacher teaches many classes |
| enrolls | CLASS_ENROLLMENTS | 1:N | One student enrolls in many classes |
| marks | ATTENDANCE | 1:N | One student marks many attendances |
| achieves | PERFORMANCE | 1:N | One student has many performance records |
| receives | GRADES | 1:N | One student receives many grades |
| assigns | GRADES | 1:N | One teacher assigns many grades |
| earns | USER_BADGES | 1:N | One user earns many badges |
| performs | AUDIT_LOGS | 1:N | One user performs many actions |
| receives | NOTIFICATIONS | 1:N | One user receives many notifications |

#### CLASSES Relationships

| Relationship Type | Related Entity | Cardinality | Cardinality Description |
|-------------------|----------------|-------------|-------------------------|
| taught by | USERS | N:1 | Many classes taught by one teacher |
| has | CLASS_ENROLLMENTS | 1:N | One class has many enrolled students |
| contains | CLASS_SESSIONS | 1:N | One class contains many sessions |

#### CLASS_SESSIONS Relationships

| Relationship Type | Related Entity | Cardinality | Cardinality Description |
|-------------------|----------------|-------------|-------------------------|
| belongs to | CLASSES | N:1 | Many sessions belong to one class |
| scheduled | SUBJECTS | N:1 | Many sessions scheduled for one subject |
| records | ATTENDANCE | 1:N | One session has many attendance records |
| generates | QUIZZES | 1:1 | One session generates exactly one quiz |
| evaluates | PERFORMANCE | 1:N | One session evaluates many performances |

#### SUBJECTS Relationships

| Relationship Type | Related Entity | Cardinality | Cardinality Description |
|-------------------|----------------|-------------|-------------------------|
| scheduled in | CLASS_SESSIONS | 1:N | One subject scheduled in many sessions |
| measures | PERFORMANCE | 1:N | One subject measures many performances |

#### BADGES Relationships

| Relationship Type | Related Entity | Cardinality | Cardinality Description |
|-------------------|----------------|-------------|-------------------------|
| awarded | USER_BADGES | 1:N | One badge awarded to many users |

---

## 3. ENTITY RELATIONSHIP TABLE (Complete)

| Entity Name | Primary Key | Foreign Keys | Key Attributes | Relationships |
|-------------|-------------|--------------|----------------|---------------|
| **USERS** | id | - | email, name, role, xp, coins | 1:N with classes (teacher), 1:N with class_enrollments, 1:N with attendance, 1:N with performance, 1:N with grades (student), 1:N with grades (teacher), 1:N with user_badges, 1:N with audit_logs, 1:N with notifications |
| **SUBJECTS** | id | - | name | 1:N with class_sessions, 1:N with performance |
| **CLASSES** | id | teacher_id → users.id | name | N:1 with users (teacher), 1:N with class_enrollments, 1:N with class_sessions |
| **CLASS_ENROLLMENTS** | (class_id, student_id) | class_id → classes.id, student_id → users.id | enrolled_at | N:1 with classes, N:1 with users |
| **CLASS_SESSIONS** | id | class_id → classes.id, subject_id → subjects.id | code, expiry, location | N:1 with classes, N:1 with subjects, 1:N with attendance, 1:1 with quizzes, 1:N with performance |
| **ATTENDANCE** | id | session_id → class_sessions.id, student_id → users.id | status, verified_at | N:1 with class_sessions, N:1 with users |
| **QUIZZES** | id | session_id → class_sessions.id | questions | 1:1 with class_sessions |
| **PERFORMANCE** | id | student_id → users.id, subject_id → subjects.id, session_id → class_sessions.id | score, max_score | N:1 with users, N:1 with subjects, N:1 with class_sessions |
| **BADGES** | id | - | name, slug, metadata | 1:N with user_badges |
| **USER_BADGES** | (user_id, badge_id) | user_id → users.id, badge_id → badges.id | awarded_at | N:1 with users, N:1 with badges |
| **QUESTION_BANK** | id | - | question, options, difficulty | Standalone reference table |
| **GRADES** | id | student_id → users.id, teacher_id → users.id | score, max_score, weight | N:1 with users (student), N:1 with users (teacher) |
| **OTP_CODES** | id | - | key, code, expires_at | Standalone temporary storage |
| **AUDIT_LOGS** | id | user_id → users.id | type, details | N:1 with users |
| **NOTIFICATIONS** | id | user_id → users.id | title, message, read | N:1 with users |

---

## 4. KEY CONSTRAINTS SUMMARY

| Constraint Type | Count | Description |
|-----------------|-------|-------------|
| Primary Keys | 12 | Single-column and composite keys |
| Foreign Keys | 18 | Referential integrity constraints |
| Unique Constraints | 6 | Email, Google ID, badge slugs, OTP keys |
| NOT NULL Constraints | 35+ | Mandatory fields |
| Default Values | 20+ | Auto-generated timestamps and defaults |
| Check Constraints | 2 | Role and attendance status enums |

---

## 5. DATA FLOW RELATIONSHIPS

```
┌────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW DIAGRAM                            │
└────────────────────────────────────────────────────────────────────┘

                        ┌──────────┐
                        │  USERS   │
                        │(Teachers)│
                        └────┬─────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │ CLASSES  │  │ GRADES   │  │CLASS_SESSIONS│
        └────┬─────┘  └────┬─────┘  └──────┬───────┘
             │             │               │
             │             │      ┌────────┴────────┐
             │             │      │                 │
             ▼             ▼      ▼                 ▼
      ┌────────────┐  ┌────────┴──┐  ┌─────────┐ ┌─────────┐
      │CLASS_ENROLL│  │ USERS     │  │ATTENDANCE│ │ QUIZZES │
      │MENTS       │  │(Students) │  │         │ │         │
      └─────┬──────┘  └─────┬─────┘  └────┬────┘ └────┬────┘
            │               │             │           │
            │               │             │           │
            ▼               ▼             ▼           ▼
      ┌──────────┐    ┌──────────┐  ┌──────────┐ ┌──────────┐
      │  USERS   │    │USER_BADGES│ │PERFORMANCE│ │QUESTION_│
      │(Students)│    │          │  │          │  │BANK     │
      └──────────┘    └────┬─────┘  └──────────┘  └──────────┘
                           │
                           ▼
                    ┌──────────┐
                    │  BADGES  │
                    └──────────┘
```

---

## 6. ROLE-BASED TABLE ACCESS

| Role | Tables Accessed | Access Type |
|------|-----------------|-------------|
| **STUDENT** | users, class_enrollments, classes, attendance, performance, grades, user_badges, notifications | Read/Write limited to own records |
| **TEACHER** | users, classes, class_sessions, grades, attendance, quizzes, question_bank, notifications, audit_logs | Read/Write for assigned classes |
| **ADMIN** | All tables | Full CRUD access to all tables |

