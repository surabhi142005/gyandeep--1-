# 🗄️ Database Diagram - Gyandeep

## Complete Database Schema with Visual Tables

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     GYANDEEP DATABASE STRUCTURE                              │
│                    (All 17 Tables with Details)                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## CORE TABLES

### 1. USERS Table

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TABLE: USERS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Column Name        │ Data Type      │ Constraint    │ Description       │
├────────────────────┼────────────────┼───────────────┼───────────────────┤
│ user_id            │ UUID           │ PRIMARY KEY   │ Unique user ID    │
│ email              │ VARCHAR(255)   │ UNIQUE, NOT NULL │ Email address  │
│ password_hash      │ VARCHAR(255)   │ NOT NULL      │ Bcrypt hash      │
│ full_name          │ VARCHAR(100)   │ NOT NULL      │ User full name   │
│ user_type          │ ENUM           │ NOT NULL      │ Role: student,   │
│                    │                │               │ teacher,admin,   │
│                    │                │               │ parent           │
│ profile_picture    │ TEXT           │ NULL          │ URL to image     │
│ phone_number       │ VARCHAR(20)    │ NULL          │ Contact phone    │
│ date_of_birth      │ DATE           │ NULL          │ Birth date       │
│ gender             │ ENUM           │ NULL          │ M, F, Other      │
│ address            │ TEXT           │ NULL          │ Street address   │
│ city               │ VARCHAR(50)    │ NULL          │ City name        │
│ state              │ VARCHAR(50)    │ NULL          │ State/Province   │
│ country            │ VARCHAR(50)    │ NULL          │ Country name     │
│ pincode            │ VARCHAR(10)    │ NULL          │ Postal code      │
│ is_active          │ BOOLEAN        │ DEFAULT TRUE  │ Account active   │
│ is_verified        │ BOOLEAN        │DEFAULT FALSE  │ Email verified   │
│ two_factor_enabled │ BOOLEAN        │DEFAULT FALSE  │ 2FA enabled      │
│ last_login         │ TIMESTAMP      │ NULL          │ Last login time  │
│ login_attempts     │ INT            │ DEFAULT 0     │ Failed attempts  │
│ created_at         │ TIMESTAMP      │DEFAULT NOW()  │ Creation date    │
│ updated_at         │ TIMESTAMP      │ ON UPDATE NOW()│ Update date     │
│ deleted_at         │ TIMESTAMP      │ NULL          │ Soft delete      │
└─────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: user_id
├─ UNIQUE: email
└─ INDEX: user_type, is_active
```

---

### 2. BIOMETRIC_DATA Table

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TABLE: BIOMETRIC_DATA                               │
├─────────────────────────────────────────────────────────────────────────┤
│ Column Name       │ Data Type      │ Constraint    │ Description       │
├───────────────────┼────────────────┼───────────────┼───────────────────┤
│ biometric_id      │ UUID           │ PRIMARY KEY   │ Unique bio ID     │
│ user_id           │ UUID           │ FOREIGN KEY   │ Reference USERS   │
│                   │                │ UNIQUE,NOT NULL│ (1:1 relationship)
│ face_template     │ LONGBLOB       │ NOT NULL      │ Face embeddings   │
│ face_descriptor   │ JSON           │ NOT NULL      │ Detection params  │
│ liveness_score    │ DECIMAL(3,2)   │ NOT NULL      │ Score 0-1         │
│ image_quality     │ INT            │ NOT NULL      │ Quality % 0-100   │
│ enrollment_date   │ TIMESTAMP      │ NOT NULL      │ Enrollment time   │
│ last_verified     │ TIMESTAMP      │ NULL          │ Last verification │
│ verification_count│ INT            │ DEFAULT 0     │ Total attempts    │
│ failed_attempts   │ INT            │ DEFAULT 0     │ Failed auth count │
│ confidence_score  │ DECIMAL(3,2)   │ NOT NULL      │ Match confidence  │
│ is_active         │ BOOLEAN        │ DEFAULT TRUE  │ Active status     │
│ created_at        │ TIMESTAMP      │DEFAULT NOW()  │ Creation date     │
│ updated_at        │ TIMESTAMP      │ ON UPDATE NOW()│ Last update      │
└─────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: biometric_id
├─ FOREIGN KEY: user_id (refs USERS.user_id)
├─ UNIQUE: user_id
└─ INDEX: confidence_score, liveness_score
```

---

### 3. STUDENT_INFO Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      TABLE: STUDENT_INFO                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name      │ Data Type      │ Constraint    │ Description        │
├──────────────────┼────────────────┼───────────────┼────────────────────┤
│ student_id       │ UUID           │ PRIMARY KEY   │ Unique student ID  │
│ user_id          │ UUID           │ FOREIGN KEY   │ Ref USERS (1:1)    │
│                  │                │ UNIQUE,NOT NULL│                    │
│ roll_number      │ VARCHAR(20)    │ UNIQUE, NOT NULL│ Unique roll no  │
│ class_id         │ UUID           │ FOREIGN KEY   │ Ref CLASSES (N:1)  │
│ admission_number │ VARCHAR(50)    │ UNIQUE        │ Unique admission   │
│ admission_date   │ DATE           │ NOT NULL      │ Admission date     │
│ enrollment_status│ ENUM           │ NOT NULL      │ active, inactive   │
│                  │                │               │ suspended          │
│ blood_group      │ VARCHAR(5)     │ NULL          │ A+, O-, B+, etc    │
│ guardian_name    │ VARCHAR(100)   │ NULL          │ Guardian name      │
│ guardian_phone   │ VARCHAR(20)    │ NULL          │ Guardian contact   │
│ parent_contact_id│ UUID           │ FOREIGN KEY   │ Ref PARENT_CONTACT │
│                  │                │ NULL          │                    │
│ special_needs    │ TEXT           │ NULL          │ Requirements       │
│ learning_style   │ ENUM           │ NULL          │ V/A/K/Mixed        │
│ achievements     │ TEXT           │ NULL          │ Notable awards     │
│ hobbies          │ TEXT           │ NULL          │ Interests          │
│ transport_required│ BOOLEAN        │ DEFAULT FALSE │ Bus needed?        │
│ transport_mode   │ VARCHAR(50)    │ NULL          │ Bus, Van, etc      │
│ created_at       │ TIMESTAMP      │DEFAULT NOW()  │ Creation date      │
│ updated_at       │ TIMESTAMP      │ ON UPDATE NOW()│ Last update       │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: student_id
├─ FOREIGN KEY: user_id (refs USERS.user_id)
├─ FOREIGN KEY: class_id (refs CLASSES.class_id)
├─ UNIQUE: roll_number, admission_number
└─ INDEX: enrollment_status, class_id
```

---

### 4. TEACHER_INFO Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      TABLE: TEACHER_INFO                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name      │ Data Type      │ Constraint    │ Description        │
├──────────────────┼────────────────┼───────────────┼────────────────────┤
│ teacher_id       │ UUID           │ PRIMARY KEY   │ Unique teacher ID  │
│ user_id          │ UUID           │ FOREIGN KEY   │ Ref USERS (1:1)    │
│                  │                │ UNIQUE,NOT NULL│                    │
│ employee_id      │ VARCHAR(50)    │ UNIQUE, NOT NULL│ Employee ID      │
│ hire_date        │ DATE           │ NOT NULL      │ Employment start   │
│ department       │ VARCHAR(100)   │ NOT NULL      │ Dept/Faculty       │
│ designation      │ VARCHAR(100)   │ NOT NULL      │ Job title          │
│ qualification    │ VARCHAR(255)   │ NOT NULL      │ Degree/Cert        │
│ specialization   │ VARCHAR(100)   │ NULL          │ Subject expert in  │
│ experience_years │ INT            │ NULL          │ Years of exp       │
│ subject_expertise│ JSON           │ NULL          │ Array of subjects  │
│ office_hours     │ JSON           │ NULL          │ Available times    │
│ bio              │ TEXT           │ NULL          │ Biography          │
│ research_interests│ TEXT           │ NULL          │ Research areas     │
│ certifications   │ JSON           │ NULL          │ Array of certs     │
│ employment_status│ ENUM           │ NOT NULL      │ Full-time, PT, etc │
│ assigned_classes │ JSON           │ NULL          │ Class IDs array    │
│ is_active        │ BOOLEAN        │ DEFAULT TRUE  │ Employment status  │
│ created_at       │ TIMESTAMP      │DEFAULT NOW()  │ Creation date      │
│ updated_at       │ TIMESTAMP      │ ON UPDATE NOW()│ Last update       │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: teacher_id
├─ FOREIGN KEY: user_id (refs USERS.user_id)
├─ UNIQUE: employee_id
└─ INDEX: department, is_active
```

---

### 5. PARENT_CONTACT Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    TABLE: PARENT_CONTACT                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name    │ Data Type      │ Constraint    │ Description         │
├────────────────┼────────────────┼───────────────┼─────────────────────┤
│ parent_id      │ UUID           │ PRIMARY KEY   │ Unique parent ID    │
│ user_id        │ UUID           │ FOREIGN KEY   │ Ref USERS (1:N)     │
│                │                │ NOT NULL      │                     │
│ phone_number   │ VARCHAR(20)    │ NULL          │ Contact phone       │
│ address        │ TEXT           │ NULL          │ Address             │
│ relationship   │ VARCHAR(50)    │ NOT NULL      │ Father, Mother,     │
│                │                │               │ Guardian, etc       │
│ email          │ VARCHAR(255)   │ NULL          │ Contact email       │
│ emergency      │ BOOLEAN        │ DEFAULT FALSE │ Emergency contact?  │
│ occupation     │ VARCHAR(100)   │ NULL          │ Parent occupation   │
│ contact_preference│ ENUM         │ NULL          │ Email, SMS, Call    │
│ notification_enabled│ BOOLEAN    │ DEFAULT TRUE  │ Receive updates     │
│ created_at     │ TIMESTAMP      │DEFAULT NOW()  │ Creation date       │
│ updated_at     │ TIMESTAMP      │ ON UPDATE NOW()│ Last update        │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: parent_id
├─ FOREIGN KEY: user_id (refs USERS.user_id)
└─ INDEX: relationship, emergency
```

---

## CLASS & SUBJECT TABLES

### 6. SUBJECTS Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       TABLE: SUBJECTS                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name     │ Data Type      │ Constraint    │ Description        │
├─────────────────┼────────────────┼───────────────┼────────────────────┤
│ subject_id      │ UUID           │ PRIMARY KEY   │ Unique subject ID  │
│ subject_code    │ VARCHAR(20)    │ UNIQUE, NOT NULL│ Subject code     │
│ subject_name    │ VARCHAR(100)   │ NOT NULL      │ Subject name       │
│ description     │ TEXT           │ NULL          │ Subject description│
│ credit_hours    │ INT            │ NOT NULL      │ Credits awarded    │
│ max_marks       │ INT            │ NOT NULL      │ Total marks        │
│ pass_marks      │ INT            │ NOT NULL      │ Passing threshold  │
│ syllabus_url    │ TEXT           │ NULL          │ Syllabus link      │
│ course_level    │ ENUM           │ NOT NULL      │ Beginner, Inter,   │
│                 │                │               │ Advanced           │
│ prerequisites   │ JSON           │ NULL          │ Required subjects  │
│ learning_outcomes│ JSON           │ NULL          │ LOs array          │
│ is_active       │ BOOLEAN        │ DEFAULT TRUE  │ Active status      │
│ created_at      │ TIMESTAMP      │DEFAULT NOW()  │ Creation date      │
│ updated_at      │ TIMESTAMP      │ ON UPDATE NOW()│ Last update       │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: subject_id
├─ UNIQUE: subject_code
└─ INDEX: course_level, is_active
```

---

### 7. CLASSES Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       TABLE: CLASSES                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name      │ Data Type      │ Constraint    │ Description       │
├──────────────────┼────────────────┼───────────────┼───────────────────┤
│ class_id         │ UUID           │ PRIMARY KEY   │ Unique class ID   │
│ class_name       │ VARCHAR(100)   │ NOT NULL      │ Class name (10-A) │
│ section          │ VARCHAR(10)    │ NULL          │ Section letter    │
│ teacher_id       │ UUID           │ FOREIGN KEY   │ Ref TEACHER_INFO  │
│                  │                │ NOT NULL      │                   │
│ subject_id       │ UUID           │ FOREIGN KEY   │ Ref SUBJECTS      │
│                  │                │ NOT NULL      │                   │
│ academic_year    │ VARCHAR(9)     │ NOT NULL      │ 2024-2025         │
│ semester         │ INT            │ NULL          │ Semester number   │
│ class_type       │ ENUM           │ NOT NULL      │ Regular, Lab,     │
│                  │                │               │ Online, Hybrid    │
│ mode_of_instr    │ ENUM           │ NOT NULL      │ Offline, Online,  │
│                  │                │               │ Hybrid            │
│ max_students     │ INT            │ DEFAULT 30    │ Max capacity      │
│ current_students │ INT            │ DEFAULT 0     │ Enrolled count    │
│ room_number      │ VARCHAR(20)    │ NULL          │ Room location     │
│ schedule_json    │ JSON           │ NULL          │ Schedule details  │
│ start_date       │ DATE           │ NOT NULL      │ Class start date  │
│ end_date         │ DATE           │ NOT NULL      │ Class end date    │
│ status           │ ENUM           │ NOT NULL      │ Active, Inactive, │
│                  │                │               │ Completed         │
│ description      │ TEXT           │ NULL          │ Class notes       │
│ is_active        │ BOOLEAN        │ DEFAULT TRUE  │ Active status     │
│ created_at       │ TIMESTAMP      │DEFAULT NOW()  │ Creation date     │
│ updated_at       │ TIMESTAMP      │ ON UPDATE NOW()│ Last update      │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: class_id
├─ FOREIGN KEY: teacher_id (refs TEACHER_INFO.teacher_id)
├─ FOREIGN KEY: subject_id (refs SUBJECTS.subject_id)
└─ INDEX: academic_year, status, is_active
```

---

### 8. CLASS_TIMETABLE Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   TABLE: CLASS_TIMETABLE                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name    │ Data Type      │ Constraint    │ Description        │
├────────────────┼────────────────┼───────────────┼────────────────────┤
│ timetable_id   │ UUID           │ PRIMARY KEY   │ Unique timetable   │
│ class_id       │ UUID           │ FOREIGN KEY   │ Ref CLASSES (1:N)  │
│                │                │ NOT NULL      │                    │
│ teacher_id     │ UUID           │ FOREIGN KEY   │ Ref TEACHER_INFO   │
│ subject_id     │ UUID           │ FOREIGN KEY   │ Ref SUBJECTS       │
│ day_of_week    │ ENUM           │ NOT NULL      │ Mon-Sun, 1-7       │
│ start_time     │ TIME           │ NOT NULL      │ Start time HH:MM   │
│ end_time       │ TIME           │ NOT NULL      │ End time HH:MM     │
│ room_number    │ VARCHAR(20)    │ NULL          │ Room location      │
│ is_lab         │ BOOLEAN        │ DEFAULT FALSE │ Lab session?       │
│ capacity       │ INT            │ NULL          │ Lab/Room capacity  │
│ recurring      │ BOOLEAN        │ DEFAULT TRUE  │ Weekly recurring   │
│ created_at     │ TIMESTAMP      │DEFAULT NOW()  │ Creation date      │
│ updated_at     │ TIMESTAMP      │ ON UPDATE NOW()│ Last update       │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: timetable_id
├─ FOREIGN KEY: class_id (refs CLASSES.class_id)
├─ FOREIGN KEY: teacher_id (refs TEACHER_INFO.teacher_id)
├─ FOREIGN KEY: subject_id (refs SUBJECTS.subject_id)
└─ INDEX: day_of_week, start_time
```

---

## QUIZ & ASSESSMENT TABLES

### 9. QUIZZES Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       TABLE: QUIZZES                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name      │ Data Type      │ Constraint    │ Description       │
├──────────────────┼────────────────┼───────────────┼───────────────────┤
│ quiz_id          │ UUID           │ PRIMARY KEY   │ Unique quiz ID    │
│ class_id         │ UUID           │ FOREIGN KEY   │ Ref CLASSES (1:N) │
│                  │                │ NOT NULL      │                   │
│ teacher_id       │ UUID           │ FOREIGN KEY   │ Ref TEACHER_INFO  │
│                  │                │ NOT NULL      │                   │
│ quiz_title       │ VARCHAR(255)   │ NOT NULL      │ Quiz title        │
│ description      │ TEXT           │ NULL          │ Quiz description  │
│ quiz_type        │ ENUM           │ NOT NULL      │ MCQ, Short, Essay │
│ difficulty_level │ ENUM           │ NOT NULL      │ Easy, Med, Hard   │
│ total_questions  │ INT            │ NOT NULL      │ Question count    │
│ duration_minutes │ INT            │ NOT NULL      │ Time limit        │
│ total_marks      │ INT            │ NOT NULL      │ Total marks       │
│ pass_marks       │ INT            │ NOT NULL      │ Pass threshold    │
│ negative_marking │ DECIMAL(3,1)   │ NULL          │ Negative penalty  │
│ show_answers     │ BOOLEAN        │ DEFAULT TRUE  │ Show after submit │
│ shuffle_questions│ BOOLEAN        │ DEFAULT TRUE  │ Randomize order   │
│ shuffle_options  │ BOOLEAN        │ DEFAULT TRUE  │ Randomize options │
│ allow_review     │ BOOLEAN        │ DEFAULT TRUE  │ Review before sub │
│ attempts_allowed │ INT            │ DEFAULT 1     │ Max attempts      │
│ start_date       │ TIMESTAMP      │ NOT NULL      │ Available from    │
│ end_date         │ TIMESTAMP      │ NOT NULL      │ Available until   │
│ publish_results_date│TIMESTAMP     │ NULL          │ Results release   │
│ is_published     │ BOOLEAN        │ DEFAULT TRUE  │ Published status  │
│ is_active        │ BOOLEAN        │ DEFAULT TRUE  │ Active status     │
│ ai_generated     │ BOOLEAN        │ DEFAULT FALSE │ AI-generated      │
│ created_at       │ TIMESTAMP      │DEFAULT NOW()  │ Creation date     │
│ updated_at       │ TIMESTAMP      │ ON UPDATE NOW()│ Last update      │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: quiz_id
├─ FOREIGN KEY: class_id (refs CLASSES.class_id)
├─ FOREIGN KEY: teacher_id (refs TEACHER_INFO.teacher_id)
└─ INDEX: is_published, start_date, difficulty_level
```

---

### 10. QUIZ_QUESTIONS Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   TABLE: QUIZ_QUESTIONS                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name       │ Data Type      │ Constraint    │ Description       │
├───────────────────┼────────────────┼───────────────┼───────────────────┤
│ question_id       │ UUID           │ PRIMARY KEY   │ Unique question   │
│ quiz_id           │ UUID           │ FOREIGN KEY   │ Ref QUIZZES (1:N) │
│                   │                │ NOT NULL      │                   │
│ question_number   │ INT            │ NOT NULL      │ Order in quiz     │
│ question_text     │ LONGTEXT       │ NOT NULL      │ Question content  │
│ question_type     │ ENUM           │ NOT NULL      │ MCQ, Short,       │
│                   │                │               │ Essay, T/F        │
│ marks             │ INT            │ NOT NULL      │ Points available  │
│ difficulty_level  │ ENUM           │ NOT NULL      │ Easy, Med, Hard   │
│ topic             │ VARCHAR(100)   │ NULL          │ Topic category    │
│ learning_objective│ TEXT           │ NULL          │ Learning outcome  │
│ explanation       │ LONGTEXT       │ NULL          │ Answer explanation│
│ image_url         │ TEXT           │ NULL          │ Question image    │
│ source_reference  │ TEXT           │ NULL          │ Reference material│
│ is_mandatory      │ BOOLEAN        │ DEFAULT TRUE  │ Must answer       │
│ created_at        │ TIMESTAMP      │DEFAULT NOW()  │ Creation date     │
│ updated_at        │ TIMESTAMP      │ ON UPDATE NOW()│ Last update      │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: question_id
├─ FOREIGN KEY: quiz_id (refs QUIZZES.quiz_id)
└─ INDEX: difficulty_level, topic
```

---

### 11. QUIZ_ANSWERS Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   TABLE: QUIZ_ANSWERS                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name       │ Data Type      │ Constraint    │ Description       │
├───────────────────┼────────────────┼───────────────┼───────────────────┤
│ answer_id         │ UUID           │ PRIMARY KEY   │ Unique answer ID  │
│ question_id       │ UUID           │ FOREIGN KEY   │ Ref QUIZ_QUESTIONS│
│                   │                │ NOT NULL      │ (1:N)             │
│ answer_text       │ LONGTEXT       │ NOT NULL      │ Answer option     │
│ answer_number     │ INT            │ NOT NULL      │ A=1, B=2, etc     │
│ is_correct        │ BOOLEAN        │ NOT NULL      │ Correct option    │
│ explanation_if_wrong│LONGTEXT      │ NULL          │ Explanation       │
│ order             │ INT            │ NOT NULL      │ Display order     │
│ image_url         │ TEXT           │ NULL          │ Answer image      │
│ weight            │ DECIMAL(3,2)   │ DEFAULT 1     │ Partial credit    │
│ created_at        │ TIMESTAMP      │DEFAULT NOW()  │ Creation date     │
│ updated_at        │ TIMESTAMP      │ ON UPDATE NOW()│ Last update      │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: answer_id
├─ FOREIGN KEY: question_id (refs QUIZ_QUESTIONS.question_id)
└─ INDEX: is_correct, answer_number
```

---

### 12. QUIZ_RESPONSES Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  TABLE: QUIZ_RESPONSES                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name       │ Data Type      │ Constraint    │ Description       │
├───────────────────┼────────────────┼───────────────┼───────────────────┤
│ response_id       │ UUID           │ PRIMARY KEY   │ Unique response   │
│ student_id        │ UUID           │ FOREIGN KEY   │ Ref STUDENT_INFO  │
│                   │                │ NOT NULL      │ (1:N)             │
│ quiz_id           │ UUID           │ FOREIGN KEY   │ Ref QUIZZES (1:N) │
│                   │                │ NOT NULL      │                   │
│ attempt_number    │ INT            │ NOT NULL      │ Attempt #1, #2... │
│ started_at        │ TIMESTAMP      │ NOT NULL      │ When started      │
│ submitted_at      │ TIMESTAMP      │ NULL          │ When submitted    │
│ time_taken_seconds│ INT            │ NULL          │ Duration taken    │
│ student_score     │ INT            │ NULL          │ Score obtained    │
│ total_marks       │ INT            │ NOT NULL      │ Total marks       │
│ percentage        │ DECIMAL(5,2)   │ NULL          │ Percentage %      │
│ status            │ ENUM           │ NOT NULL      │ InProgress, Sub,  │
│                   │                │               │ Evaluated         │
│ is_passed         │ BOOLEAN        │ NULL          │ Pass/Fail flag    │
│ feedback          │ TEXT           │ NULL          │ Teacher feedback  │
│ evaluation_date   │ TIMESTAMP      │ NULL          │ Evaluation done   │
│ evaluated_by      │ UUID           │ NULL          │ Evaluator user ID │
│ question_responses│ JSON           │ NOT NULL      │ Detailed answers  │
│ is_flagged        │ BOOLEAN        │ DEFAULT FALSE │ Flagged for review│
│ offline_sync      │ BOOLEAN        │ DEFAULT FALSE │ Offline submitted │
│ created_at        │ TIMESTAMP      │DEFAULT NOW()  │ Creation date     │
│ updated_at        │ TIMESTAMP      │ ON UPDATE NOW()│ Last update      │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: response_id
├─ FOREIGN KEY: student_id (refs STUDENT_INFO.student_id)
├─ FOREIGN KEY: quiz_id (refs QUIZZES.quiz_id)
└─ INDEX: student_id, quiz_id, submitted_at, status
```

---

## ATTENDANCE & SESSION TABLES

### 13. CLASSROOM_SESSIONS Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                TABLE: CLASSROOM_SESSIONS                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name          │ Data Type      │ Constraint    │ Description    │
├──────────────────────┼────────────────┼───────────────┼────────────────┤
│ session_id           │ UUID           │ PRIMARY KEY   │ Unique session │
│ class_id             │ UUID           │ FOREIGN KEY   │ Ref CLASSES    │
│                      │                │ NOT NULL      │ (1:N)          │
│ teacher_id           │ UUID           │ FOREIGN KEY   │ Ref TEACHER_INFO
│                      │                │ NOT NULL      │                │
│ session_date         │ DATE           │ NOT NULL      │ Session date   │
│ start_time           │ TIME           │ NOT NULL      │ Start time     │
│ end_time             │ TIME           │ NOT NULL      │ End time       │
│ status               │ ENUM           │ NOT NULL      │ Scheduled,     │
│                      │                │               │ InProgress,    │
│                      │                │               │ Completed,     │
│                      │                │               │ Cancelled      │
│ session_topic        │ VARCHAR(255)   │ NULL          │ Topic covered  │
│ session_notes        │ TEXT           │ NULL          │ Session summary│
│ recording_url        │ TEXT           │ NULL          │ Recording link │
│ recording_size       │ BIGINT         │ NULL          │ File size bytes│
│ total_duration_minutes│ INT            │ NULL          │ Actual duration│
│ total_participants   │ INT            │ DEFAULT 0     │ Participants   │
│ present_count        │ INT            │ DEFAULT 0     │ Present count  │
│ absent_count         │ INT            │ DEFAULT 0     │ Absent count   │
│ late_count           │ INT            │ DEFAULT 0     │ Late count     │
│ engagement_score     │ INT            │ NULL          │ Engagement %   │
│ resources_shared     │ JSON           │ NULL          │ Resources array│
│ homework_assigned    │ TEXT           │ NULL          │ Homework desc  │
│ homework_due_date    │ DATE           │ NULL          │ Due date       │
│ created_at           │ TIMESTAMP      │DEFAULT NOW()  │ Creation date  │
│ updated_at           │ TIMESTAMP      │ ON UPDATE NOW()│ Last update   │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: session_id
├─ FOREIGN KEY: class_id (refs CLASSES.class_id)
├─ FOREIGN KEY: teacher_id (refs TEACHER_INFO.teacher_id)
└─ INDEX: session_date, status, start_time
```

---

### 14. ATTENDANCE_RECORDS Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                TABLE: ATTENDANCE_RECORDS                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name         │ Data Type      │ Constraint    │ Description    │
├─────────────────────┼────────────────┼───────────────┼────────────────┤
│ attendance_id       │ UUID           │ PRIMARY KEY   │ Unique record  │
│ student_id          │ UUID           │ FOREIGN KEY   │ Ref STUDENT_INFO
│                     │                │ NOT NULL      │ (1:N)          │
│ class_id            │ UUID           │ FOREIGN KEY   │ Ref CLASSES    │
│                     │                │ NOT NULL      │ (1:N)          │
│ session_id          │ UUID           │ FOREIGN KEY   │ Ref CLASSROOM_ │
│                     │                │ NULL          │ SESSIONS       │
│ attendance_date     │ DATE           │ NOT NULL      │ Attendance date│
│ check_in_time       │ TIME           │ NULL          │ Check-in time  │
│ check_out_time      │ TIME           │ NULL          │ Check-out time │
│ status              │ ENUM           │ NOT NULL      │ Present,       │
│                     │                │               │ Absent, Late,  │
│                     │                │               │ Excused        │
│ method              │ ENUM           │ NOT NULL      │ Face_Recog,    │
│                     │                │               │ RFID, QR, Manual
│ biometric_verified  │ BOOLEAN        │ DEFAULT FALSE │ Face verified  │
│ confidence_score    │ DECIMAL(3,2)   │ NULL          │ Match score    │
│ verified_by_id      │ UUID           │ NULL          │ Verifier user  │
│ remarks             │ TEXT           │ NULL          │ Notes/remarks  │
│ blockchain_tx_hash  │ VARCHAR(255)   │ NULL          │ Blockchain ref │
│ created_at          │ TIMESTAMP      │DEFAULT NOW()  │ Creation date  │
│ updated_at          │ TIMESTAMP      │ ON UPDATE NOW()│ Last update   │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: attendance_id
├─ FOREIGN KEY: student_id (refs STUDENT_INFO.student_id)
├─ FOREIGN KEY: class_id (refs CLASSES.class_id)
├─ FOREIGN KEY: session_id (refs CLASSROOM_SESSIONS.session_id)
└─ INDEX: attendance_date, student_id, status
```

---

## GRADES & ANALYTICS TABLES

### 15. GRADES Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TABLE: GRADES                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name         │ Data Type      │ Constraint    │ Description    │
├─────────────────────┼────────────────┼───────────────┼────────────────┤
│ grade_id            │ UUID           │ PRIMARY KEY   │ Unique grade   │
│ student_id          │ UUID           │ FOREIGN KEY   │ Ref STUDENT_INFO
│                     │                │ NOT NULL      │ (1:N)          │
│ subject_id          │ UUID           │ FOREIGN KEY   │ Ref SUBJECTS   │
│                     │                │ NOT NULL      │ (1:N)          │
│ class_id            │ UUID           │ FOREIGN KEY   │ Ref CLASSES    │
│                     │                │ NOT NULL      │ (1:N)          │
│ assessment_type     │ ENUM           │ NOT NULL      │ Quiz, Assign,  │
│                     │                │               │ Test, Project, │
│                     │                │               │ Exam           │
│ marks_obtained      │ DECIMAL(5,2)   │ NOT NULL      │ Score earned   │
│ marks_total         │ INT            │ NOT NULL      │ Total marks    │
│ percentage          │ DECIMAL(5,2)   │ NOT NULL      │ Percentage     │
│ letter_grade        │ VARCHAR(2)     │ NOT NULL      │ A, B, C, D, F  │
│ grade_point         │ DECIMAL(3,2)   │ NOT NULL      │ GPA points     │
│ assessment_date     │ DATE           │ NOT NULL      │ Assessment date│
│ assigned_by_id      │ UUID           │ NOT NULL      │ Teacher user ID│
│ remarks             │ TEXT           │ NULL          │ Teacher remarks│
│ blockchain_cert_hash│ VARCHAR(255)   │ NULL          │ Certificate ref│
│ is_final            │ BOOLEAN        │ DEFAULT FALSE │ Final or temp  │
│ created_at          │ TIMESTAMP      │DEFAULT NOW()  │ Creation date  │
│ updated_at          │ TIMESTAMP      │ ON UPDATE NOW()│ Last update   │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: grade_id
├─ FOREIGN KEY: student_id (refs STUDENT_INFO.student_id)
├─ FOREIGN KEY: subject_id (refs SUBJECTS.subject_id)
├─ FOREIGN KEY: class_id (refs CLASSES.class_id)
└─ INDEX: student_id, assessment_date, is_final
```

---

### 16. ANALYTICS_METRICS Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                TABLE: ANALYTICS_METRICS                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name          │ Data Type      │ Constraint    │ Description    │
├──────────────────────┼────────────────┼───────────────┼────────────────┤
│ metric_id            │ UUID           │ PRIMARY KEY   │ Unique metric  │
│ student_id           │ UUID           │ FOREIGN KEY   │ Ref STUDENT_INFO
│                      │                │ NOT NULL      │ (1:N)          │
│ quiz_id              │ UUID           │ FOREIGN KEY   │ Ref QUIZZES    │
│                      │                │ NULL          │ NULL (optional)│
│ metric_date          │ DATE           │ NOT NULL      │ Metric date    │
│ avg_score            │ DECIMAL(5,2)   │ NULL          │ Average score  │
│ accuracy_rate        │ DECIMAL(5,2)   │ NULL          │ Accuracy %     │
│ time_spent_learning_min│ INT           │ NULL          │ Learning time  │
│ quizzes_attempted    │ INT            │ DEFAULT 0     │ Quiz attempts  │
│ quizzes_passed       │ INT            │ DEFAULT 0     │ Passed count   │
│ engagement_score     │ INT            │ NULL          │ Engagement 0-100
│ learning_progress    │ INT            │ NULL          │ Progress %     │
│ topics_mastered      │ INT            │ DEFAULT 0     │ Topics mastered│
│ topics_in_progress   │ INT            │ DEFAULT 0     │ Topics started │
│ topics_weak          │ INT            │ DEFAULT 0     │ Weak topics    │
│ last_activity_date   │ DATE           │ NULL          │ Last activity  │
│ attendance_percentage│ DECIMAL(5,2)   │ NULL          │ Attendance %   │
│ performance_trend    │ ENUM           │ NULL          │ Improving,     │
│                      │                │               │ Stable, Declin │
│ created_at           │ TIMESTAMP      │DEFAULT NOW()  │ Creation date  │
│ updated_at           │ TIMESTAMP      │ ON UPDATE NOW()│ Last update   │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: metric_id
├─ FOREIGN KEY: student_id (refs STUDENT_INFO.student_id)
├─ FOREIGN KEY: quiz_id (refs QUIZZES.quiz_id)
└─ INDEX: student_id, metric_date
```

---

## BLOCKCHAIN & COMMUNICATION TABLES

### 17. BLOCKCHAIN_RECORDS Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│               TABLE: BLOCKCHAIN_RECORDS                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name         │ Data Type      │ Constraint    │ Description    │
├─────────────────────┼────────────────┼───────────────┼────────────────┤
│ record_id           │ UUID           │ PRIMARY KEY   │ Unique record  │
│ student_id          │ UUID           │ FOREIGN KEY   │ Ref STUDENT_INFO
│                     │                │ NOT NULL      │ (1:N)          │
│ record_type         │ ENUM           │ NOT NULL      │ Attendance,    │
│                     │                │               │ Grade, Cert    │
│ transaction_hash    │ VARCHAR(255)   │ UNIQUE, NOT NULL│ Tx hash      │
│ contract_address    │ VARCHAR(255)   │ NOT NULL      │ Contract addr  │
│ block_number        │ BIGINT         │ NOT NULL      │ Block #        │
│ timestamp           │ TIMESTAMP      │ NOT NULL      │ Transaction ts │
│ status              │ ENUM           │ NOT NULL      │ Pending,       │
│                     │                │               │ Confirmed,     │
│                     │                │               │ Failed         │
│ confirmation_count  │ INT            │ DEFAULT 0     │ Block confirms │
│ verification_proof  │ TEXT           │ NULL          │ Proof data     │
│ metadata_json       │ JSON           │ NULL          │ Extra metadata │
│ expiry_date         │ DATE           │ NULL          │ Certificate exp│
│ created_at          │ TIMESTAMP      │DEFAULT NOW()  │ Creation date  │
│ updated_at          │ TIMESTAMP      │ ON UPDATE NOW()│ Last update   │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: record_id
├─ FOREIGN KEY: student_id (refs STUDENT_INFO.student_id)
├─ UNIQUE: transaction_hash
└─ INDEX: student_id, record_type, status
```

---

### 18. CHAT_MESSAGES Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   TABLE: CHAT_MESSAGES                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name       │ Data Type      │ Constraint    │ Description       │
├───────────────────┼────────────────┼───────────────┼───────────────────┤
│ message_id        │ UUID           │ PRIMARY KEY   │ Unique message    │
│ sender_id         │ UUID           │ FOREIGN KEY   │ Ref USERS (1:N)   │
│                   │                │ NOT NULL      │                   │
│ receiver_id       │ UUID           │ FOREIGN KEY   │ Ref USERS (1:N)   │
│                   │                │ NOT NULL      │                   │
│ session_id        │ UUID           │ FOREIGN KEY   │ Ref CLASSROOM_    │
│                   │                │ NULL          │ SESSIONS          │
│ conversation_id   │ UUID           │ NULL          │ Thread ID         │
│ message_text      │ LONGTEXT       │ NOT NULL      │ Message content   │
│ message_type      │ ENUM           │ NOT NULL      │ Text, Image,      │
│                   │                │               │ File, Notif       │
│ attachment_url    │ TEXT           │ NULL          │ File/image link   │
│ is_read           │ BOOLEAN        │ DEFAULT FALSE │ Read status       │
│ is_edited         │ BOOLEAN        │ DEFAULT FALSE │ Edited flag       │
│ edited_at         │ TIMESTAMP      │ NULL          │ Edit timestamp    │
│ is_deleted        │ BOOLEAN        │ DEFAULT FALSE │ Soft delete       │
│ sent_at           │ TIMESTAMP      │ NOT NULL      │ Send timestamp    │
│ read_at           │ TIMESTAMP      │ NULL          │ Read timestamp    │
│ created_at        │ TIMESTAMP      │DEFAULT NOW()  │ Creation date     │
│ updated_at        │ TIMESTAMP      │ ON UPDATE NOW()│ Last update      │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: message_id
├─ FOREIGN KEY: sender_id (refs USERS.user_id)
├─ FOREIGN KEY: receiver_id (refs USERS.user_id)
├─ FOREIGN KEY: session_id (refs CLASSROOM_SESSIONS.session_id)
└─ INDEX: sender_id, receiver_id, sent_at, is_read
```

---

### 19. CERTIFICATES Table

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   TABLE: CERTIFICATES                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ Column Name          │ Data Type      │ Constraint    │ Description    │
├──────────────────────┼────────────────┼───────────────┼────────────────┤
│ cert_id              │ UUID           │ PRIMARY KEY   │ Unique cert ID │
│ student_id           │ UUID           │ FOREIGN KEY   │ Ref STUDENT_INFO
│                      │                │ NOT NULL      │ (1:N)          │
│ cert_type            │ ENUM           │ NOT NULL      │ Completion,    │
│                      │                │               │ Achievement,   │
│                      │                │               │ Merit, Part    │
│ name                 │ VARCHAR(255)   │ NOT NULL      │ Certificate name│
│ issue_date           │ DATE           │ NOT NULL      │ Issue date     │
│ expiry_date          │ DATE           │ NULL          │ Expiry date    │
│ certificate_number   │ VARCHAR(50)    │ UNIQUE, NOT NULL│ Cert number  │
│ issued_by_id         │ UUID           │ NOT NULL      │ Issuer user ID │
│ achievement_desc     │ TEXT           │ NULL          │ Achievement    │
│ criteria_met         │ TEXT           │ NULL          │ Criteria desc  │
│ blockchain_hash      │ VARCHAR(255)   │ NULL          │ Blockchain ref │
│ verification_url     │ TEXT           │ NULL          │ Verification   │
│ certificate_pdf_url  │ TEXT           │ NOT NULL      │ PDF link       │
│ status               │ ENUM           │ NOT NULL      │ Active,        │
│                      │                │               │ Expired, Revoke│
│ created_at           │ TIMESTAMP      │DEFAULT NOW()  │ Creation date  │
│ updated_at           │ TIMESTAMP      │ ON UPDATE NOW()│ Last update   │
└──────────────────────────────────────────────────────────────────────────┘

Indexes:
├─ PRIMARY KEY: cert_id
├─ FOREIGN KEY: student_id (refs STUDENT_INFO.student_id)
├─ UNIQUE: certificate_number
└─ INDEX: cert_type, status
```

---

## Table Summary Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│           COMPLETE TABLE SUMMARY (19 TABLES)                        │
├─────────────────────────────────────────────────────────────────────┤

USER MANAGEMENT (5 tables):
├─ USERS                    - Core user records
├─ BIOMETRIC_DATA           - Face recognition templates
├─ STUDENT_INFO             - Student-specific info
├─ TEACHER_INFO             - Teacher-specific info
└─ PARENT_CONTACT           - Parent contact records

ACADEMIC STRUCTURE (4 tables):
├─ SUBJECTS                 - Subject definitions
├─ CLASSES                  - Class sections
├─ CLASS_TIMETABLE          - Weekly schedules
└─ CLASSROOM_SESSIONS       - Actual class sessions

QUIZ & ASSESSMENT (4 tables):
├─ QUIZZES                  - Quiz definitions
├─ QUIZ_QUESTIONS           - Individual questions
├─ QUIZ_ANSWERS             - Answer options
└─ QUIZ_RESPONSES           - Student responses

ATTENDANCE & GRADING (4 tables):
├─ ATTENDANCE_RECORDS       - Attendance tracking
├─ GRADES                   - Grade records
├─ ANALYTICS_METRICS        - Performance metrics
└─ BLOCKCHAIN_RECORDS       - Immutable records

COMMUNICATION & CERTIFICATES (2 tables):
├─ CHAT_MESSAGES            - Message records
└─ CERTIFICATES             - Certificate awards

TOTAL TABLES: 19
TOTAL COLUMNS: 350+
TOTAL INDEXES: 100+
```

---

## Database Constraints Summary

### Unique Constraints (15)
```
1. USERS.email
2. STUDENT_INFO.roll_number
3. STUDENT_INFO.admission_number
4. TEACHER_INFO.employee_id
5. SUBJECTS.subject_code
6. BIOMETRIC_DATA.user_id
7. STUDENT_INFO.user_id
8. TEACHER_INFO.user_id
9. BLOCKCHAIN_RECORDS.transaction_hash
10. CERTIFICATES.certificate_number
11. + More for security
```

### Not Null Constraints (50+)
- All identification fields
- All required business fields
- All status indicators

### Check Constraints (20+)
- Percentage values (0-100)
- Marks > 0
- End date >= Start date
- Various enum validations

---

## Performance Indexes List

```
Total Indexes: 100+

Frequently Used Query Indexes:
├─ USERS (email, user_type, is_active)
├─ STUDENT_INFO (roll_number, class_id, enrollment_status)
├─ QUIZZES (class_id, is_published, start_date)
├─ QUIZ_RESPONSES (student_id, quiz_id, submitted_at)
├─ ATTENDANCE_RECORDS (attendance_date, student_id, status)
├─ GRADES (student_id, subject_id, assessment_date)
├─ ANALYTICS_METRICS (student_id, metric_date)
├─ CLASSROOM_SESSIONS (class_id, session_date)
└─ CHAT_MESSAGES (sender_id, receiver_id, sent_at)
```

---

**Total Database Size (Estimated)**: 
- Core Tables: ~100 MB
- With indexes: ~150 MB
- First year data: ~500 MB

