# Gyandeep Database Design Document

---

## a. Introduction

Database design is the process of structuring and organizing data to efficiently store, retrieve, and manage information. A well-designed database ensures data integrity, reduces redundancy, and supports the application's functional requirements. The Gyandeep database follows a relational model using SQLite, implementing proper normalization, indexing, and relationships to support an educational platform with multiple user roles.

The design incorporates:
- **Normalization**: Tables are structured to minimize data redundancy
- **Referential Integrity**: Foreign key constraints maintain data consistency
- **Partitioning**: Time-series data (attendance, performance) uses table partitioning
- **Indexing**: Strategic indexes optimize query performance
- **JSON Support**: Flexible JSON/JSONB fields for dynamic data structures

---

## b. Purpose and Scope

### Purpose
The Gyandeep database serves as the central data repository for an AI-powered educational platform that connects students, teachers, and administrators. It supports:

- **User Management**: Multi-role authentication (Student, Teacher, Admin) with OAuth integration
- **Academic Tracking**: Grade management, attendance monitoring, and performance analytics
- **Content Delivery**: Centralized notes, AI-generated quizzes, and question banks
- **Communication**: Support tickets and notifications
- **Gamification**: XP points, coins, and badge reward systems
- **Security**: Audit logging and OTP verification

### Scope
The database design covers:
- Core user entities and authentication
- Class and subject management
- Academic records (grades, attendance, performance)
- Content management (notes, quizzes, questions)
- Administrative functions (tickets, audit logs, notifications)
- Gamification elements (badges, user rewards)

---

## c. Table Definitions

### 1. users
Stores all user accounts across different roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
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

### 2. subjects
Master list of academic subjects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique subject identifier |
| name | TEXT | NOT NULL, UNIQUE | Subject name |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 3. classes
Class/section definitions taught by teachers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique class identifier |
| name | TEXT | NOT NULL | Class name |
| teacher_id | UUID | FK → users(id), ON DELETE SET NULL | Assigned teacher |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 4. class_enrollments
Many-to-many relationship between students and classes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| class_id | UUID | FK → classes(id), ON DELETE CASCADE | Class identifier |
| student_id | UUID | FK → users(id), ON DELETE CASCADE | Student identifier |
| enrolled_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Enrollment timestamp |
| **PRIMARY KEY** | (class_id, student_id) | Composite key | - |

---

### 5. class_sessions
Individual class sessions with attendance codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique session identifier |
| class_id | UUID | NOT NULL, FK → classes(id), ON DELETE CASCADE | Parent class |
| subject_id | UUID | FK → subjects(id), ON DELETE SET NULL | Subject taught |
| code | CHAR(6) | NOT NULL | Attendance code for session |
| expiry | TIMESTAMPTZ | NOT NULL | Code expiration time |
| location | GEOMETRY(Point, 4326) | - | Teacher GPS location (PostGIS) |
| radius_m | INT | NOT NULL, DEFAULT 100 | Geofencing radius in meters |
| notes_url | TEXT | - | URL to session notes |
| notes_hash | TEXT | - | SHA-256 hash for quiz cache |
| quiz_published | BOOLEAN | NOT NULL, DEFAULT FALSE | Quiz publication status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 6. attendance
Student attendance records with geolocation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| session_id | UUID | NOT NULL, FK → class_sessions(id), ON DELETE CASCADE | Class session |
| student_id | UUID | NOT NULL, FK → users(id), ON DELETE CASCADE | Student |
| status | attendance_status | NOT NULL, DEFAULT 'present' | Enum: present, absent, late, excused |
| geo_location | GEOMETRY(Point, 4326) | - | Student GPS location |
| verified_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Attendance timestamp |

**Partitioning**: Partitioned by RANGE on verified_at (monthly partitions)

---

### 7. quizzes
AI-generated quizzes linked to class sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique quiz identifier |
| session_id | UUID | NOT NULL, FK → class_sessions(id), ON DELETE CASCADE | Parent session |
| questions | JSONB | NOT NULL | Quiz questions and answers |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 8. performance
Student performance/scores tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| student_id | UUID | NOT NULL, FK → users(id), ON DELETE CASCADE | Student |
| subject_id | UUID | FK → subjects(id), ON DELETE SET NULL | Subject |
| session_id | UUID | FK → class_sessions(id), ON DELETE SET NULL | Related session |
| score | DECIMAL(5,2) | NOT NULL | Achieved score |
| max_score | DECIMAL(5,2) | NOT NULL, DEFAULT 100 | Maximum possible score |
| recorded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Recording timestamp |

**Partitioning**: Partitioned by RANGE on recorded_at

---

### 9. badges
Gamification badge definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | TEXT | NOT NULL, UNIQUE | Badge name |
| slug | TEXT | NOT NULL, UNIQUE | URL-friendly identifier |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | Badge properties (xp, icon, etc.) |

---

### 10. user_badges
Many-to-many relationship for awarded badges.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FK → users(id), ON DELETE CASCADE | User identifier |
| badge_id | INT | FK → badges(id), ON DELETE CASCADE | Badge identifier |
| awarded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Award timestamp |
| **PRIMARY KEY** | (user_id, badge_id) | Composite key | - |

---

### 11. question_bank
Reusable quiz questions repository.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique question identifier |
| question | TEXT | NOT NULL | Question text |
| options | JSONB | NOT NULL | Answer options |
| correct_answer | TEXT | NOT NULL | Correct answer |
| subject | TEXT | - | Subject category |
| tags | JSONB | NOT NULL, DEFAULT '[]' | Question tags |
| difficulty | TEXT | NOT NULL, DEFAULT 'medium' | Difficulty level |
| notes_hash | TEXT | - | Links to source notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 12. grades
Gradebook entries for assignments/tests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique grade identifier |
| student_id | UUID | NOT NULL, FK → users(id), ON DELETE CASCADE | Student |
| teacher_id | UUID | FK → users(id), ON DELETE SET NULL | Grading teacher |
| subject | TEXT | NOT NULL | Subject name |
| category | TEXT | NOT NULL | Grade category (test, homework, quiz) |
| title | TEXT | NOT NULL | Assignment title |
| score | DECIMAL(6,2) | NOT NULL | Achieved score |
| max_score | DECIMAL(6,2) | NOT NULL | Maximum score |
| weight | DECIMAL(4,2) | NOT NULL, DEFAULT 1 | Weight in final calculation |
| date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Grade date |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 13. otp_codes
Temporary OTP and verification codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique OTP identifier |
| key | TEXT | NOT NULL, UNIQUE | Email or user ID |
| code | TEXT | NOT NULL | OTP code |
| purpose | TEXT | NOT NULL | Purpose: otp, reset, email_verify |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiration timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

### 14. audit_logs
System audit trail (append-only).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| ts | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Action timestamp |
| type | TEXT | NOT NULL | Action type |
| user_id | UUID | FK → users(id), ON DELETE SET NULL | Acting user |
| details | JSONB | NOT NULL, DEFAULT '{}' | Action details |

---

### 15. notifications
User notifications and announcements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique notification ID |
| user_id | UUID | FK → users(id), ON DELETE CASCADE | Target user (NULL = broadcast) |
| title | TEXT | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification body |
| type | TEXT | NOT NULL, DEFAULT 'info' | Notification type |
| read | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

## d. ER Diagram

```plantuml
@startuml Gyandeep_ER_Diagram

!define table(x) class x << (T,#FFAAAA) >>
!define primary_key(x) <u>x</u>
!define foreign_key(x) #x#

skinparam class {
    BackgroundColor White
    ArrowColor #666666
    BorderColor #333333
}

title Gyandeep Database - Entity Relationship Diagram

' ============== ENTITIES ==============

table(users) {
    primary_key(id)
    email
    name
    password_hash
    role
    google_id
    face_vector
    email_verified
    xp
    coins
    preferences
    created_at
    updated_at
}

table(subjects) {
    primary_key(id)
    name
    created_at
}

table(classes) {
    primary_key(id)
    name
    foreign_key(teacher_id)
    created_at
}

table(class_enrollments) {
    foreign_key(class_id)
    foreign_key(student_id)
    enrolled_at
}

table(class_sessions) {
    primary_key(id)
    foreign_key(class_id)
    foreign_key(subject_id)
    code
    expiry
    location
    radius_m
    quiz_published
    created_at
}

table(attendance) {
    primary_key(id)
    foreign_key(session_id)
    foreign_key(student_id)
    status
    geo_location
    verified_at
}

table(quizzes) {
    primary_key(id)
    foreign_key(session_id)
    questions
    created_at
}

table(performance) {
    primary_key(id)
    foreign_key(student_id)
    foreign_key(subject_id)
    foreign_key(session_id)
    score
    max_score
    recorded_at
}

table(badges) {
    primary_key(id)
    name
    slug
    metadata
}

table(user_badges) {
    foreign_key(user_id)
    foreign_key(badge_id)
    awarded_at
}

table(centralized_notes) {
    primary_key(id)
    foreign_key(class_id)
    foreign_key(teacher_id)
    foreign_key(subject_id)
    unit_number
    unit_name
    title
    content
    file_path
    file_type
    notes_hash
    created_at
}

table(grades) {
    primary_key(id)
    foreign_key(student_id)
    foreign_key(teacher_id)
    subject
    category
    title
    score
    max_score
    weight
    date
    created_at
}

table(audit_logs) {
    primary_key(id)
    ts
    type
    foreign_key(user_id)
    details
}

table(notifications) {
    primary_key(id)
    foreign_key(user_id)
    title
    message
    type
    read
    created_at
}

' ============== RELATIONSHIPS ==============

users "1" -- "N" classes : teaches (teacher_id)
users "1" -- "N" class_enrollments : enrolls (student_id)
classes "1" -- "N" class_enrollments : has
classes "1" -- "N" class_sessions : contains
subjects "1" -- "N" class_sessions : scheduled
class_sessions "1" -- "N" attendance : records
class_sessions "1" -- "1" quizzes : generates
users "1" -- "N" attendance : marks (student_id)
users "1" -- "N" performance : achieves (student_id)
subjects "1" -- "N" performance : measures
class_sessions "1" -- "N" performance : evaluates
users "1" -- "N" user_badges : earns
badges "1" -- "N" user_badges : awarded
users "1" -- "N" grades : receives (student_id)
users "1" -- "N" grades : assigns (teacher_id)
users "1" -- "N" audit_logs : performs
users "1" -- "N" notifications : receives

note right of users
  **Role-based Access:**
  - student: can enroll, attend, view grades
  - teacher: manages classes, grades, sessions
  - admin: system management, user oversight
end note

note bottom of class_sessions
  **Geofencing:**
  Sessions include GPS location
  and radius for attendance
  verification
end note

note bottom of attendance
  **Partitioned Table:**
  Monthly partitions by verified_at
  for performance optimization
end note

note right of question_bank
  **AI Integration:**
  Questions auto-generated
  from notes using AI
end note

@enduml
```

---

## Relationship Summary

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| users → classes | 1:N | Teacher teaches multiple classes |
| users → class_enrollments | 1:N | Student enrolls in multiple classes |
| classes → class_enrollments | 1:N | Class has multiple students |
| classes → class_sessions | 1:N | Class has multiple sessions |
| subjects → class_sessions | 1:N | Subject scheduled in multiple sessions |
| class_sessions → attendance | 1:N | Session has multiple attendance records |
| users → attendance | 1:N | Student has multiple attendance entries |
| class_sessions → quizzes | 1:1 | Session generates one quiz |
| users → performance | 1:N | Student has multiple performance records |
| users → grades | 1:N | Student receives multiple grades |
| users → user_badges | 1:N | User earns multiple badges |
| badges → user_badges | 1:N | Badge awarded to multiple users |
| users → audit_logs | 1:N | User performs multiple actions |
| users → notifications | 1:N | User receives multiple notifications |

---

## Indexes

| Table | Index Name | Type | Columns | Purpose |
|-------|------------|------|---------|---------|
| class_sessions | idx_sessions_code_hash | HASH | code | O(1) lookup for attendance codes |
| class_sessions | idx_sessions_location_gist | GiST | location | Spatial queries for geofencing |
| attendance | idx_attendance_verified_brin | BRIN | verified_at | Time-series optimization |
| performance | idx_perf_student_subject | B-tree | (student_id, subject_id) | Dashboard queries |
| users | idx_users_face_vector_ivfflat | IVFFlat | face_vector | Face recognition similarity search |

---

## Data Types Reference

| Type | Description |
|------|-------------|
| UUID | Universally unique identifier |
| user_role | ENUM: 'student', 'teacher', 'admin' |
| attendance_status | ENUM: 'present', 'absent', 'late', 'excused' |
| VECTOR(128) | pgvector type for face embeddings |
| GEOMETRY(Point, 4326) | PostGIS spatial type (WGS 84) |
| JSONB | Binary JSON for flexible schemas |
| TIMESTAMPTZ | Timestamp with timezone |
| DECIMAL(p,s) | Fixed-point decimal numbers |
| BIGSERIAL | Auto-incrementing 64-bit integer |

