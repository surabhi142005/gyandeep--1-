# Gyandeep ER Diagram - Tabular Format

---

## 1. ENTITIES AND ATTRIBUTES

### 1.1 USERS
**Description**: Central user table storing all system users (students, teachers, admins)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique user identifier |
| email | TEXT | NOT NULL, UNIQUE | User email address |
| name | TEXT | NOT NULL | Full name |
| password_hash | TEXT | NULLABLE | Hashed password (NULL for OAuth) |
| role | user_role | NOT NULL, DEFAULT 'student' | Enum: student, teacher, admin |
| google_id | TEXT | UNIQUE | Google OAuth identifier |
| face_vector | VECTOR(128) | - | Face embedding for recognition |
| email_verified | BOOLEAN | NOT NULL, DEFAULT FALSE | Email verification status |
| xp | INT | NOT NULL, DEFAULT 0 | Experience points |
| coins | INT | NOT NULL, DEFAULT 0 | Virtual currency |
| preferences | JSONB | NOT NULL, DEFAULT '{}' | User settings and preferences |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

### 1.2 SUBJECTS
**Description**: Master list of academic subjects

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique subject identifier |
| name | TEXT | NOT NULL, UNIQUE | Subject name |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.3 CLASSES
**Description**: Class/section definitions taught by teachers

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique class identifier |
| name | TEXT | NOT NULL | Class name |
| #teacher_id# | UUID | FK → users(id), ON DELETE SET NULL | Assigned teacher |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.4 CLASS_ENROLLMENTS
**Description**: Many-to-many relationship between students and classes

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| #class_id# | UUID | FK → classes(id), ON DELETE CASCADE | Class identifier |
| #student_id# | UUID | FK → users(id), ON DELETE CASCADE | Student identifier |
| enrolled_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Enrollment timestamp |
| **PRIMARY KEY** | (class_id, student_id) | Composite key | - |

---

### 1.5 CLASS_SESSIONS
**Description**: Individual class sessions with attendance codes and geofencing

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique session identifier |
| #class_id# | UUID | NOT NULL, FK → classes(id), ON DELETE CASCADE | Parent class |
| #subject_id# | UUID | FK → subjects(id), ON DELETE SET NULL | Subject taught |
| code | CHAR(6) | NOT NULL | Attendance code |
| expiry | TIMESTAMPTZ | NOT NULL | Code expiration time |
| location | GEOMETRY(Point, 4326) | - | Teacher GPS location |
| radius_m | INT | NOT NULL, DEFAULT 100 | Geofencing radius in meters |
| notes_url | TEXT | - | URL to session notes |
| notes_hash | TEXT | - | SHA-256 hash for quiz cache |
| quiz_published | BOOLEAN | NOT NULL, DEFAULT FALSE | Quiz publication status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.6 ATTENDANCE
**Description**: Student attendance records with geolocation tracking

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| #session_id# | UUID | NOT NULL, FK → class_sessions(id), ON DELETE CASCADE | Class session |
| #student_id# | UUID | NOT NULL, FK → users(id), ON DELETE CASCADE | Student |
| status | attendance_status | NOT NULL, DEFAULT 'present' | present/absent/late/excused |
| geo_location | GEOMETRY(Point, 4326) | - | Student GPS location |
| verified_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Attendance timestamp |

**Note**: Partitioned by RANGE on verified_at (monthly partitions)

---

### 1.7 QUIZZES
**Description**: AI-generated quizzes linked to class sessions

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique quiz identifier |
| #session_id# | UUID | NOT NULL, FK → class_sessions(id), ON DELETE CASCADE | Parent session |
| questions | JSONB | NOT NULL | Quiz questions and answers |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.8 PERFORMANCE
**Description**: Student performance/scores tracking

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| #student_id# | UUID | NOT NULL, FK → users(id), ON DELETE CASCADE | Student |
| #subject_id# | UUID | FK → subjects(id), ON DELETE SET NULL | Subject |
| #session_id# | UUID | FK → class_sessions(id), ON DELETE SET NULL | Related session |
| score | DECIMAL(5,2) | NOT NULL | Achieved score |
| max_score | DECIMAL(5,2) | NOT NULL, DEFAULT 100 | Maximum possible score |
| recorded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Recording timestamp |

**Note**: Partitioned by RANGE on recorded_at

---

### 1.9 BADGES
**Description**: Gamification badge definitions

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | TEXT | NOT NULL, UNIQUE | Badge name |
| slug | TEXT | NOT NULL, UNIQUE | URL-friendly identifier |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | Badge properties (xp, icon, etc.) |

---

### 1.10 USER_BADGES
**Description**: Many-to-many relationship for awarded badges

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| #user_id# | UUID | FK → users(id), ON DELETE CASCADE | User identifier |
| #badge_id# | INT | FK → badges(id), ON DELETE CASCADE | Badge identifier |
| awarded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Award timestamp |
| **PRIMARY KEY** | (user_id, badge_id) | Composite key | - |

---

### 1.11 QUESTION_BANK
**Description**: Reusable quiz questions repository

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique question identifier |
| question | TEXT | NOT NULL | Question text |
| options | JSONB | NOT NULL | Answer options |
| correct_answer | TEXT | NOT NULL | Correct answer |
| subject | TEXT | - | Subject category |
| tags | JSONB | NOT NULL, DEFAULT '[]' | Question tags |
| difficulty | TEXT | NOT NULL, DEFAULT 'medium' | Difficulty level |
| notes_hash | TEXT | - | Links to source notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.12 GRADES
**Description**: Gradebook entries for assignments, tests, and assessments

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique grade identifier |
| #student_id# | UUID | NOT NULL, FK → users(id), ON DELETE CASCADE | Student |
| #teacher_id# | UUID | FK → users(id), ON DELETE SET NULL | Grading teacher |
| subject | TEXT | NOT NULL | Subject name |
| category | TEXT | NOT NULL | Grade category (test, homework, quiz) |
| title | TEXT | NOT NULL | Assignment title |
| score | DECIMAL(6,2) | NOT NULL | Achieved score |
| max_score | DECIMAL(6,2) | NOT NULL | Maximum score |
| weight | DECIMAL(4,2) | NOT NULL, DEFAULT 1 | Weight in final calculation |
| date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Grade date |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.13 OTP_CODES
**Description**: Temporary OTP and verification codes

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique OTP identifier |
| key | TEXT | NOT NULL, UNIQUE | Email or user ID |
| code | TEXT | NOT NULL | OTP code |
| purpose | TEXT | NOT NULL | Purpose: otp, reset, email_verify |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiration timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 1.14 AUDIT_LOGS
**Description**: System audit trail (append-only)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| ts | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Action timestamp |
| type | TEXT | NOT NULL | Action type |
| #user_id# | UUID | FK → users(id), ON DELETE SET NULL | Acting user |
| details | JSONB | NOT NULL, DEFAULT '{}' | Action details |

---

### 1.15 NOTIFICATIONS
**Description**: User notifications and announcements

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| **id** | UUID | PRIMARY KEY | Unique notification ID |
| #user_id# | UUID | FK → users(id), ON DELETE CASCADE | Target user (NULL = broadcast) |
| title | TEXT | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification body |
| type | TEXT | NOT NULL, DEFAULT 'info' | Notification type |
| read | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

## 2. RELATIONSHIPS TABLE

| # | Entity A | Relationship | Entity B | Cardinality | Description |
|---|----------|--------------|----------|-------------|-------------|
| 1 | **users** | teaches | classes | 1:N | A teacher can teach multiple classes |
| 2 | **users** | enrolls in | class_enrollments | 1:N | A student can enroll in multiple classes |
| 3 | **classes** | contains | class_enrollments | 1:N | A class can have multiple students |
| 4 | **classes** | has sessions | class_sessions | 1:N | A class can have multiple sessions |
| 5 | **subjects** | scheduled in | class_sessions | 1:N | A subject can be in multiple sessions |
| 6 | **class_sessions** | records | attendance | 1:N | A session can have multiple attendance records |
| 7 | **class_sessions** | generates | quizzes | 1:1 | Each session generates one quiz |
| 8 | **users** | marks | attendance | 1:N | A student can mark attendance multiple times |
| 9 | **users** | achieves | performance | 1:N | A student can have multiple performance records |
| 10 | **subjects** | measures | performance | 1:N | A subject can have multiple performance records |
| 11 | **class_sessions** | evaluates | performance | 1:N | A session can evaluate multiple performances |
| 12 | **users** | earns | user_badges | 1:N | A user can earn multiple badges |
| 13 | **badges** | awarded to | user_badges | 1:N | A badge can be awarded to multiple users |
| 14 | **users** | receives | grades | 1:N | A student can receive multiple grades |
| 15 | **users** | assigns | grades | 1:N | A teacher can assign multiple grades |
| 16 | **users** | performs | audit_logs | 1:N | A user can perform multiple actions |
| 17 | **users** | receives | notifications | 1:N | A user can receive multiple notifications |

---

## 3. CARDINALITY MATRIX

### 3.1 Entity-to-Entity Cardinality

| Entity A | Cardinality | Relationship | Cardinality | Entity B |
|----------|-------------|--------------|-------------|----------|
| users (teacher) | 1 | teaches | N | classes |
| users (student) | 1 | enrolled in | N | class_enrollments |
| classes | 1 | has | N | class_enrollments |
| classes | 1 | contains | N | class_sessions |
| subjects | 1 | scheduled in | N | class_sessions |
| class_sessions | 1 | has | N | attendance |
| class_sessions | 1 | generates | 1 | quizzes |
| users (student) | 1 | marks | N | attendance |
| users (student) | 1 | achieves | N | performance |
| subjects | 1 | measured in | N | performance |
| class_sessions | 1 | evaluates | N | performance |
| users | 1 | earns | N | user_badges |
| badges | 1 | awarded to | N | user_badges |
| users (student) | 1 | receives | N | grades |
| users (teacher) | 1 | assigns | N | grades |
| users | 1 | performs | N | audit_logs |
| users | 1 | receives | N | notifications |

### 3.2 Cardinality Summary (Visual)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CARDINALITY SUMMARY                             │
└─────────────────────────────────────────────────────────────────────────┘

USERS (1) ════════════════════════ (N) CLASSES
         [teacher teaches classes]

USERS (1) ════════════════════════ (N) CLASS_ENROLLMENTS
         [student enrolls in classes]

CLASSES (1) ════════════════════ (N) CLASS_ENROLLMENTS
           [class has students]

CLASSES (1) ════════════════════ (N) CLASS_SESSIONS
           [class has sessions]

SUBJECTS (1) ═══════════════════ (N) CLASS_SESSIONS
            [subject scheduled]

CLASS_SESSIONS (1) ═════════════ (N) ATTENDANCE
                [session records attendance]

CLASS_SESSIONS (1) ═════════════ (1) QUIZZES
                [session generates quiz]

USERS (1) ══════════════════════ (N) ATTENDANCE
         [student marks attendance]

USERS (1) ══════════════════════ (N) PERFORMANCE
         [student performance records]

SUBJECTS (1) ═══════════════════ (N) PERFORMANCE
            [subject performance records]

CLASS_SESSIONS (1) ═════════════ (N) PERFORMANCE
                [session performance records]

USERS (1) ══════════════════════ (N) USER_BADGES
         [user earns badges]

BADGES (1) ═════════════════════ (N) USER_BADGES
          [badge awarded to users]

USERS (1) ══════════════════════ (N) GRADES
         [student receives grades]

USERS (1) ══════════════════════ (N) GRADES
         [teacher assigns grades]

USERS (1) ══════════════════════ (N) AUDIT_LOGS
         [user performs actions]

USERS (1) ══════════════════════ (N) NOTIFICATIONS
         [user receives notifications]

┌─────────────────────────────────────────────────────────────────────────┐
│                         MANY-TO-MANY JUNCTIONS                          │
└─────────────────────────────────────────────────────────────────────────┘

CLASSES (N) ════════════════════ (N) USERS (students)
           via CLASS_ENROLLMENTS

USERS (N) ═════════════════════ (N) BADGES
           via USER_BADGES
```

---

## 4. FOREIGN KEY REFERENCE TABLE

| Source Table | Column | References Table | Reference Column | On Delete |
|--------------|--------|------------------|------------------|-----------|
| classes | teacher_id | users | id | SET NULL |
| class_enrollments | class_id | classes | id | CASCADE |
| class_enrollments | student_id | users | id | CASCADE |
| class_sessions | class_id | classes | id | CASCADE |
| class_sessions | subject_id | subjects | id | SET NULL |
| attendance | session_id | class_sessions | id | CASCADE |
| attendance | student_id | users | id | CASCADE |
| quizzes | session_id | class_sessions | id | CASCADE |
| performance | student_id | users | id | CASCADE |
| performance | subject_id | subjects | id | SET NULL |
| performance | session_id | class_sessions | id | SET NULL |
| user_badges | user_id | users | id | CASCADE |
| user_badges | badge_id | badges | id | CASCADE |
| grades | student_id | users | id | CASCADE |
| grades | teacher_id | users | id | SET NULL |
| audit_logs | user_id | users | id | SET NULL |
| notifications | user_id | users | id | CASCADE |

---

## 5. ENTITY RELATIONSHIP VISUAL DIAGRAM (Text)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GYANDEEP DATABASE                                │
│                         Entity Relationship Diagram                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐                    ┌──────────────┐
│   USERS      │◄───────────────────│    CLASSES   │
│──────────────│      1:N           │──────────────│
│ PK id (UUID) │                    │ PK id (UUID) │
│ email (TEXT) │                    │ name (TEXT)   │
│ name (TEXT)  │                    │ FK teacher_id │
│ role (ENUM)  │                    │ created_at   │
│ xp (INT)     │                    └──────┬───────┘
│ coins (INT)  │                           │
│ preferences  │                           │ 1:N
│ face_vector  │                           ▼
└──────┬───────┘                    ┌──────────────┐
       │                            │CLASS_SESSIONS│
       │                            │──────────────│
       │                            │ PK id (UUID) │
       │                            │ FK class_id  │
       │                            │ FK subject_id│
       │                            │ code (CHAR6) │
       │                            │ location     │
       │                            │ radius_m     │
       │                            │ quiz_published│
       │                            └──────┬───────┘
       │                                   │
       │                                   │ 1:N
       │                                   ▼
       │                            ┌──────────────┐      ┌──────────────┐
       │                            │  ATTENDANCE  │      │    QUIZZES   │
       │                            │──────────────│      │──────────────│
       │                            │ PK id (BIG)  │      │ PK id (UUID) │
       │                            │ FK session_id│      │ FK session_id│
       │                            │ FK student_id│      │ questions    │
       │                            │ status (ENUM)│      │ created_at   │
       │                            │ geo_location │      └──────────────┘
       │                            │ verified_at  │
       │                            └──────────────┘
       │                                   │
       │                                   │ 1:N
       │                                   ▼
       │                            ┌──────────────┐
       │                            │  PERFORMANCE │
       │                            │──────────────│
       │                            │ PK id (BIG)  │
       │                            │ FK student_id│
       │                            │ FK subject_id│
       │                            │ FK session_id│
       │                            │ score (DEC)  │
       │                            │ max_score    │
       │                            │ recorded_at  │
       │                            └──────────────┘
       │
       │ 1:N                           1:N
       ▼                               ▼
┌──────────────┐                 ┌──────────────┐
│    GRADES    │                 │   BADGES     │
│──────────────│                 │──────────────│
│ PK id (UUID) │                 │ PK id (SER)  │
│ FK student_id│                 │ name (TEXT)  │
│ FK teacher_id│                 │ slug (TEXT)  │
│ subject      │                 │ metadata     │
│ category     │                 └──────┬───────┘
│ title        │                        │
│ score        │                        │ 1:N
│ max_score    │                        ▼
│ weight       │                 ┌──────────────┐
│ date         │                 │  USER_BADGES │
│ created_at   │                 │──────────────│
└──────────────┘                 │ FK user_id   │
                                 │ FK badge_id  │
       ▲                         │ awarded_at   │
       │ 1:N                    └──────────────┘
       │
┌──────────────┐
│  QUESTION_   │
│    BANK      │
│──────────────│
│ PK id (UUID) │
│ question     │
│ options      │
│ correct_answer│
│ subject      │
│ tags         │
│ difficulty   │
│ notes_hash   │
│ created_at   │
└──────────────┘

┌──────────────┐                 ┌──────────────┐
│ SUBJECTS     │                 │CLASS_ENROLL  │
│──────────────│                 │   MENTS      │
│ PK id (UUID) │                 │──────────────│
│ name (TEXT)  │                 │ FK class_id  │
│ created_at   │                 │ FK student_id│
└──────────────┘                 │ enrolled_at  │
                                 └──────────────┘

┌──────────────┐                 ┌──────────────┐
│  OTP_CODES   │                 │ AUDIT_LOGS   │
│──────────────│                 │──────────────│
│ PK id (UUID) │                 │ PK id (BIG)  │
│ key (TEXT)   │                 │ ts           │
│ code (TEXT)  │                 │ type (TEXT)  │
│ purpose      │                 │ FK user_id   │
│ expires_at   │                 │ details      │
│ created_at   │                 └──────────────┘
└──────────────┘

┌──────────────┐
│NOTIFICATIONS │
│──────────────│
│ PK id (UUID) │
│ FK user_id   │
│ title        │
│ message      │
│ type         │
│ read (BOOL)  │
│ created_at   │
└──────────────┘
```

---

## 6. LEGEND

| Symbol | Meaning |
|--------|---------|
| **PK** | Primary Key |
| **FK** | Foreign Key |
| **#column#** | Foreign Key Column |
| **1:N** | One-to-Many relationship |
| **1:1** | One-to-One relationship |
| **N:N** | Many-to-Many relationship |
| UUID | Universally Unique Identifier |
| BIGSERIAL | Auto-incrementing 64-bit integer |
| SERIAL | Auto-incrementing 32-bit integer |
| JSONB | Binary JSON data type |
| GEOMETRY | Spatial/Geographic data type |
| VECTOR(128) | 128-dimensional vector (face embedding) |
| DEC | Decimal/Numeric data type |
| ENUM | Enumerated type with fixed values |
| TEXT | Variable-length character string |
| INT | Integer number |
| BOOL | Boolean (true/false) |
| CHAR(6) | Fixed-length 6 character string |

