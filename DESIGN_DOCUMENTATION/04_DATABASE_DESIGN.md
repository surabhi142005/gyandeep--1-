# 🗄️ Database Design & ER Diagrams - Gyandeep

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GYANDEEP DATABASE ER DIAGRAM                             │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │      USERS      │
                          ├─────────────────┤
                          │ user_id (PK)    │
                          │ email           │◄─────────────┐
                          │ password_hash   │              │
                          │ full_name       │              │
                          │ user_type       │              │
                          │ created_at      │              │
                          │ updated_at      │              │
                          └────────┬────────┘              │
                                   │                       │
                    ┌──────────────┼──────────────┐        │
                    │              │              │        │
                    │   1:1        │    1:N       │        │
                    ▼              ▼              ▼        │
        ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
        │ BIOMETRIC_DATA   │  │STUDENT_INFO  │  │PARENT_CONTACT│
        ├──────────────────┤  ├──────────────┤  ├──────────────┤
        │ biometric_id(PK) │  │student_id(PK)   │parent_id(PK) │
        │ user_id (FK)────►│  │user_id(FK)──┐   │user_id(FK)───┤
        │ face_template    │  │class_id(FK) │   │phone_number  │
        │ liveness_data    │  │roll_number  │   │address       │
        │ enrollment_date  │  │date_of_birth   │relationship   │
        │ last_verified    │  │enrollment_date │email          │
        │ verification_count   │enrollment_status   │emergency    │
        └──────────────────┘  └──┬──────────┘  └──────────────┘
                                 │
                       ┌─────────┼─────────┐
                       │         │         │
                       │  1:N    │  1:N    │
                       ▼         ▼         ▼
            ┌──────────────────┐  ┌──────────────┐
            │QUIZ_RESPONSES    │  │CLASS_TIMETABLE
            ├──────────────────┤  ├──────────────┤
            │response_id(PK)   │  │timetable_id  │
            │student_id(FK)───┐   │class_id(FK)  │
            │quiz_id(FK)──┐   │   │teacher_id(FK)
            │answer_given │   │   │subject_id(FK)
            │score        │   │   │day_of_week   │
            │attempt_date │   │   │start_time    │
            │time_taken   │   │   │end_time      │
            │submitted_at │   │   │room_number   │
            └──────────────────┘  └──────────────┘
                      ▲                │
                      │                │
                      │      ┌─────────┤
                      │      │         │
                      │ 1:N  │ 1:N     │ 1:N
                      │      │         │
        ┌─────────────┴──────┘    ┌────▼────────────┐
        │                          │CLASSES          │
        │                          ├──────────────────
        │                          │class_id(PK)     │
        │                          │class_name       │
        │                          │teacher_id(FK)──►
        │                          │subject_id(FK)──►
        │                          │semester         │
        │                          │max_students     │
        │                          │current_students │
        │                          │created_at       │
        │                          └────┬────────────┘
        │                               │
        │              ┌────────────────┼────────────────┐
        │              │                │                │
        │          1:N │            1:N │            1:N │
        │              ▼                ▼                ▼
        │     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │     │ QUIZZES      │  │SUBJECTS      │  │TEACHERS      │
        │     ├──────────────┤  ├──────────────┤  ├──────────────┤
        │     │ quiz_id(PK)  │  │subject_id(PK)   │teacher_id(PK)
        │     │ class_id(FK)─┤  │subject_name  │  │user_id(FK)───┤
        │     │ teacher_id---┼──►FK)          │  │department    │
        │     │ title        │  │description   │  │qualification │
        │     │ description  │  │credit_hours  │  │experience    │
        │     │ duration     │  │max_marks     │  │hire_date     │
        │     │ max_marks    │  │pass_marks    │  │status        │
        │     │ pass_marks   │  └──────────────┘  └──────────────┘
        │     │ created_date │
        │     │ due_date     │
        │     │ is_published │
        │     └──┬───────────┘
        │        │
        │ 1:N    │
        │        ▼
        │   ┌──────────────────┐
        │   │QUIZ_QUESTIONS    │
        │   ├──────────────────┤
        │   │question_id(PK)   │
        │   │quiz_id(FK)───────┤
        │   │question_text     │
        │   │question_type     │
        │   │difficulty_level  │
        │   │marks             │
        │   │explanation       │
        │   │created_at        │
        │   │updated_at        │
        │   └────┬─────────────┘
        │        │
        │ 1:N    │
        └────────┤
             1:N │
                 ▼
        ┌──────────────────────┐
        │QUIZ_ANSWERS          │
        ├──────────────────────┤
        │answer_id(PK)         │
        │question_id(FK)──────►
        │answer_text          │
        │is_correct            │
        │order                 │
        │explanation_if_wrong  │
        └──────────────────────┘

        ┌──────────────────────┐
        │ATTENDANCE_RECORDS    │
        ├──────────────────────┤
        │attendance_id(PK)     │
        │student_id(FK)───────►
        │class_id(FK)─────────►
        │session_id(FK)───────►
        │date                  │
        │check_in_time         │
        │check_out_time        │
        │status                │
        │method                │
        │biometric_verified    │
        │verified_by(FK)──────►
        │created_at            │
        │blockchain_tx_hash    │
        └──────────────────────┘

        ┌──────────────────────┐
        │CLASSROOM_SESSIONS    │
        ├──────────────────────┤
        │session_id(PK)        │
        │class_id(FK)──────────┤
        │teacher_id(FK)────────┤
        │session_date          │
        │start_time            │
        │end_time              │
        │status                │
        │recording_url         │
        │total_participants    │
        │present_count         │
        │absent_count          │
        │created_at            │
        └──────────────────────┘

        ┌──────────────────────┐
        │GRADES                │
        ├──────────────────────┤
        │grade_id(PK)          │
        │student_id(FK)────────┤
        │subject_id(FK)────────┤
        │assessment_type       │
        │marks_obtained        │
        │marks_total           │
        │percentage            │
        │letter_grade          │
        │grade_point           │
        │assessment_date       │
        │assigned_by(FK)──────►
        │remarks               │
        │blockchain_cert_hash  │
        │created_at            │
        └──────────────────────┘

        ┌──────────────────────┐
        │ANALYTICS_METRICS     │
        ├──────────────────────┤
        │metric_id(PK)         │
        │student_id(FK)────────┤
        │quiz_id(FK)───────────┤
        │avg_score             │
        │accuracy_rate         │
        │time_spent_learning   │
        │engagement_score      │
        │learning_progress     │
        │last_activity_date    │
        │updated_at            │
        └──────────────────────┘

        ┌──────────────────────┐
        │BLOCKCHAIN_RECORDS    │
        ├──────────────────────┤
        │record_id(PK)         │
        │student_id(FK)────────┤
        │record_type           │
        │transaction_hash      │
        │contract_address      │
        │block_number          │
        │timestamp             │
        │status                │
        │verification_proof    │
        │created_at            │
        └──────────────────────┘

        ┌──────────────────────┐
        │CHAT_MESSAGES         │
        ├──────────────────────┤
        │message_id(PK)        │
        │sender_id(FK)─────────┤
        │receiver_id(FK)──────►
        │session_id(FK)────────┤
        │message_text          │
        │attachment_url        │
        │is_read               │
        │sent_at               │
        │read_at               │
        └──────────────────────┘

        ┌──────────────────────┐
        │CERTIFICATES          │
        ├──────────────────────┤
        │cert_id(PK)           │
        │student_id(FK)────────┤
        │cert_type             │
        │issue_date            │
        │expiry_date           │
        │cert_number           │
        │issued_by(FK)─────────┤
        │blockchain_hash       │
        │verification_url      │
        │created_at            │
        └──────────────────────┘
```

---

## Complete Table Schema

### 1. USERS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| user_id | UUID | PRIMARY KEY | Unique identifier for user |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) |
| full_name | VARCHAR(100) | NOT NULL | Full name of user |
| user_type | ENUM | NOT NULL | student, teacher, admin, parent |
| profile_picture | TEXT | NULL | URL to profile picture |
| phone_number | VARCHAR(20) | NULL | Contact phone number |
| date_of_birth | DATE | NULL | User's DOB |
| gender | ENUM | NULL | Male, Female, Other |
| address | TEXT | NULL | Residential address |
| city | VARCHAR(50) | NULL | City |
| state | VARCHAR(50) | NULL | State/Province |
| country | VARCHAR(50) | NULL | Country |
| pincode | VARCHAR(10) | NULL | Postal code |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| is_verified | BOOLEAN | DEFAULT FALSE | Email verified status |
| two_factor_enabled | BOOLEAN | DEFAULT FALSE | 2FA enabled |
| last_login | TIMESTAMP | NULL | Last login timestamp |
| login_attempts | INT | DEFAULT 0 | Failed login count |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

---

### 2. BIOMETRIC_DATA Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| biometric_id | UUID | PRIMARY KEY | Unique biometric ID |
| user_id | UUID | FOREIGN KEY | Reference to users table |
| face_template | LONGBLOB | NOT NULL | Face embedding vector |
| face_descriptor | JSON | NOT NULL | Face detection data |
| liveness_score | DECIMAL(3,2) | NOT NULL | Liveness detection score (0-1) |
| image_quality | INT | NOT NULL | Quality score of face image |
| enrollment_date | TIMESTAMP | NOT NULL | Face enrollment date |
| last_verified | TIMESTAMP | NULL | Last successful verification |
| verification_count | INT | DEFAULT 0 | Total verifications |
| failed_attempts | INT | DEFAULT 0 | Failed verification count |
| confidence_score | DECIMAL(3,2) | NOT NULL | Recognition confidence (0-1) |
| is_active | BOOLEAN | DEFAULT TRUE | Biometric active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 3. STUDENT_INFO Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| student_id | UUID | PRIMARY KEY | Unique student ID |
| user_id | UUID | FOREIGN KEY | Reference to users table (1:1) |
| roll_number | VARCHAR(20) | UNIQUE, NOT NULL | Student roll number |
| class_id | UUID | FOREIGN KEY | Reference to classes table |
| admission_number | VARCHAR(50) | UNIQUE | Admission number |
| admission_date | DATE | NOT NULL | Student admission date |
| enrollment_status | ENUM | NOT NULL | active, inactive, suspended |
| blood_group | VARCHAR(5) | NULL | Blood group (A+, O-, etc.) |
| guardian_name | VARCHAR(100) | NULL | Guardian name |
| guardian_phone | VARCHAR(20) | NULL | Guardian contact |
| parent_contact_id | UUID | NULL | Reference to parent contact |
| special_needs | TEXT | NULL | Special requirements/disabilities |
| learning_style | ENUM | NULL | Visual, Auditory, Kinesthetic |
| achievements | TEXT | NULL | Notable achievements |
| hobbies | TEXT | NULL | Student hobbies |
| transport_required | BOOLEAN | DEFAULT FALSE | Transportation needed |
| transport_mode | VARCHAR(50) | NULL | Bus, Van, etc. |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 4. TEACHER_INFO Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| teacher_id | UUID | PRIMARY KEY | Unique teacher ID |
| user_id | UUID | FOREIGN KEY | Reference to users table (1:1) |
| employee_id | VARCHAR(50) | UNIQUE, NOT NULL | Employee identification |
| hire_date | DATE | NOT NULL | Employment start date |
| department | VARCHAR(100) | NOT NULL | Department/Faculty |
| designation | VARCHAR(100) | NOT NULL | Job title |
| qualification | VARCHAR(255) | NOT NULL | Educational qualification |
| specialization | VARCHAR(100) | NULL | Subject specialization |
| experience_years | INT | NULL | Years of experience |
| subject_expertise | JSON | NULL | Array of subject expertise |
| office_hours | JSON | NULL | Available office hours |
| bio | TEXT | NULL | Teacher biography |
| research_interests | TEXT | NULL | Research areas |
| certifications | JSON | NULL | Professional certifications |
| employment_status | ENUM | NOT NULL | Full-time, Part-time, Contract |
| assigned_classes | JSON | NULL | Classes taught (array) |
| is_active | BOOLEAN | DEFAULT TRUE | Employment status |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 5. CLASSES Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| class_id | UUID | PRIMARY KEY | Unique class ID |
| class_name | VARCHAR(100) | NOT NULL | Class name (e.g., 10-A) |
| section | VARCHAR(10) | NULL | Section identifier |
| teacher_id | UUID | FOREIGN KEY | Reference to teachers table |
| subject_id | UUID | FOREIGN KEY | Reference to subjects table |
| academic_year | VARCHAR(9) | NOT NULL | Year (e.g., 2024-2025) |
| semester | INT | NULL | Semester number |
| class_type | ENUM | NOT NULL | Regular, Lab, Online, Hybrid |
| mode_of_instruction | ENUM | NOT NULL | Offline, Online, Hybrid |
| max_students | INT | DEFAULT 30 | Maximum capacity |
| current_students | INT | DEFAULT 0 | Current enrollment |
| room_number | VARCHAR(20) | NULL | Physical room location |
| schedule_json | JSON | NULL | Class schedule details |
| start_date | DATE | NOT NULL | Class start date |
| end_date | DATE | NOT NULL | Class end date |
| status | ENUM | NOT NULL | Active, Inactive, Completed |
| description | TEXT | NULL | Class description/notes |
| is_active | BOOLEAN | DEFAULT TRUE | Current status |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 6. SUBJECTS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| subject_id | UUID | PRIMARY KEY | Unique subject ID |
| subject_code | VARCHAR(20) | UNIQUE, NOT NULL | Subject code |
| subject_name | VARCHAR(100) | NOT NULL | Subject name |
| description | TEXT | NULL | Subject description |
| credit_hours | INT | NOT NULL | Credit hours |
| max_marks | INT | NOT NULL | Maximum marks |
| pass_marks | INT | NOT NULL | Passing marks |
| syllabus_url | TEXT | NULL | Syllabus document link |
| course_level | ENUM | NOT NULL | Beginner, Intermediate, Advanced |
| prerequisites | JSON | NULL | Prerequisite subjects array |
| learning_outcomes | JSON | NULL | Course learning outcomes |
| is_active | BOOLEAN | DEFAULT TRUE | Subject active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 7. QUIZZES Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| quiz_id | UUID | PRIMARY KEY | Unique quiz ID |
| class_id | UUID | FOREIGN KEY | Reference to classes table |
| teacher_id | UUID | FOREIGN KEY | Reference to teachers table |
| quiz_title | VARCHAR(255) | NOT NULL | Quiz title |
| description | TEXT | NULL | Quiz description |
| quiz_type | ENUM | NOT NULL | MCQ, Short_Answer, Essay, Mixed |
| difficulty_level | ENUM | NOT NULL | Easy, Medium, Hard |
| total_questions | INT | NOT NULL | Number of questions |
| duration_minutes | INT | NOT NULL | Time limit in minutes |
| total_marks | INT | NOT NULL | Maximum marks |
| pass_marks | INT | NOT NULL | Minimum passing marks |
| negative_marking | DECIMAL(3,1) | NULL | Negative marking scheme |
| show_answers | BOOLEAN | DEFAULT TRUE | Show answers after submission |
| shuffle_questions | BOOLEAN | DEFAULT TRUE | Randomize question order |
| shuffle_options | BOOLEAN | DEFAULT TRUE | Randomize answer options |
| allow_review | BOOLEAN | DEFAULT TRUE | Allow review before submit |
| attempts_allowed | INT | DEFAULT 1 | Maximum attempts per student |
| start_date | TIMESTAMP | NOT NULL | Quiz availability start |
| end_date | TIMESTAMP | NOT NULL | Quiz availability end |
| publish_results_date | TIMESTAMP | NULL | When to publish results |
| is_published | BOOLEAN | DEFAULT TRUE | Quiz published status |
| is_active | BOOLEAN | DEFAULT TRUE | Quiz active status |
| ai_generated | BOOLEAN | DEFAULT FALSE | AI-generated flag |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 8. QUIZ_QUESTIONS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| question_id | UUID | PRIMARY KEY | Unique question ID |
| quiz_id | UUID | FOREIGN KEY | Reference to quizzes table |
| question_number | INT | NOT NULL | Question order |
| question_text | LONGTEXT | NOT NULL | Question content |
| question_type | ENUM | NOT NULL | MCQ, Short_Answer, Essay, True_False |
| marks | INT | NOT NULL | Marks for this question |
| difficulty_level | ENUM | NOT NULL | Easy, Medium, Hard |
| topic | VARCHAR(100) | NULL | Topic category |
| learning_objective | TEXT | NULL | Associated learning outcome |
| explanation | LONGTEXT | NULL | Explanation/solution |
| image_url | TEXT | NULL | Question image/diagram |
| source_reference | TEXT | NULL | Reference material |
| is_mandatory | BOOLEAN | DEFAULT TRUE | Question must be answered |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 9. QUIZ_ANSWERS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| answer_id | UUID | PRIMARY KEY | Unique answer ID |
| question_id | UUID | FOREIGN KEY | Reference to questions table |
| answer_text | LONGTEXT | NOT NULL | Answer option text |
| answer_number | INT | NOT NULL | Answer option number (A, B, C, D) |
| is_correct | BOOLEAN | NOT NULL | Correctness flag |
| explanation_if_wrong | LONGTEXT | NULL | Explanation for wrong answer |
| order | INT | NOT NULL | Display order |
| image_url | TEXT | NULL | Answer image (if applicable) |
| weight | DECIMAL(3,2) | DEFAULT 1 | Scoring weight for partial credit |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 10. QUIZ_RESPONSES Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| response_id | UUID | PRIMARY KEY | Unique response ID |
| student_id | UUID | FOREIGN KEY | Reference to students table |
| quiz_id | UUID | FOREIGN KEY | Reference to quizzes table |
| attempt_number | INT | NOT NULL | Attempt number |
| started_at | TIMESTAMP | NOT NULL | Quiz start time |
| submitted_at | TIMESTAMP | NULL | Quiz submission time |
| time_taken_seconds | INT | NULL | Total time taken |
| student_score | INT | NULL | Score obtained |
| total_marks | INT | NOT NULL | Total marks available |
| percentage | DECIMAL(5,2) | NULL | Score percentage |
| status | ENUM | NOT NULL | InProgress, Submitted, Evaluated |
| is_passed | BOOLEAN | NULL | Pass/Fail status |
| feedback | TEXT | NULL | Teacher/AI feedback |
| evaluation_date | TIMESTAMP | NULL | Evaluation completion time |
| evaluated_by | UUID | NULL | Teacher/AI evaluator ID |
| question_responses | JSON | NOT NULL | Detailed responses array |
| is_flagged | BOOLEAN | DEFAULT FALSE | Flagged for review |
| offline_sync | BOOLEAN | DEFAULT FALSE | Submitted offline initially |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 11. ATTENDANCE_RECORDS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| attendance_id | UUID | PRIMARY KEY | Unique attendance record ID |
| student_id | UUID | FOREIGN KEY | Reference to students table |
| class_id | UUID | FOREIGN KEY | Reference to classes table |
| session_id | UUID | FOREIGN KEY | Reference to sessions table |
| attendance_date | DATE | NOT NULL | Attendance date |
| check_in_time | TIME | NULL | Check-in time |
| check_out_time | TIME | NULL | Check-out time |
| status | ENUM | NOT NULL | Present, Absent, Late, Excused |
| method | ENUM | NOT NULL | Face_Recognition, RFID, Manual, QR_Code |
| biometric_verified | BOOLEAN | DEFAULT FALSE | Face verification status |
| confidence_score | DECIMAL(3,2) | NULL | Face match confidence score |
| verified_by_id | UUID | NULL | Verifying teacher/system |
| remarks | TEXT | NULL | Attendance remarks (e.g., medical leave) |
| blockchain_tx_hash | VARCHAR(255) | NULL | Blockchain transaction hash |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 12. CLASSROOM_SESSIONS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| session_id | UUID | PRIMARY KEY | Unique session ID |
| class_id | UUID | FOREIGN KEY | Reference to classes table |
| teacher_id | UUID | FOREIGN KEY | Reference to teachers table |
| session_date | DATE | NOT NULL | Session date |
| start_time | TIME | NOT NULL | Session start time |
| end_time | TIME | NOT NULL | Session end time |
| status | ENUM | NOT NULL | Scheduled, InProgress, Completed, Cancelled |
| session_topic | VARCHAR(255) | NULL | Topic covered |
| session_notes | TEXT | NULL | Session notes/summary |
| recording_url | TEXT | NULL | Recorded session link |
| recording_size | BIGINT | NULL | Recording file size |
| total_duration_minutes | INT | NULL | Actual session duration |
| total_participants | INT | DEFAULT 0 | Participants count |
| present_count | INT | DEFAULT 0 | Students present |
| absent_count | INT | DEFAULT 0 | Students absent |
| late_count | INT | DEFAULT 0 | Students late |
| engagement_score | INT | NULL | Class engagement metric |
| resources_shared | JSON | NULL | Shared resources array |
| homework_assigned | TEXT | NULL | Homework description |
| homework_due_date | DATE | NULL | Homework submission deadline |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 13. GRADES Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| grade_id | UUID | PRIMARY KEY | Unique grade ID |
| student_id | UUID | FOREIGN KEY | Reference to students table |
| subject_id | UUID | FOREIGN KEY | Reference to subjects table |
| class_id | UUID | FOREIGN KEY | Reference to classes table |
| assessment_type | ENUM | NOT NULL | Quiz, Assignment, Test, Project, Exam |
| marks_obtained | DECIMAL(5,2) | NOT NULL | Marks scored |
| marks_total | INT | NOT NULL | Total marks |
| percentage | DECIMAL(5,2) | NOT NULL | Score percentage |
| letter_grade | VARCHAR(2) | NOT NULL | Letter grade (A, B, C, etc.) |
| grade_point | DECIMAL(3,2) | NOT NULL | Grade point (GPA) |
| assessment_date | DATE | NOT NULL | Assessment date |
| assigned_by_id | UUID | NOT NULL | Teacher ID |
| remarks | TEXT | NULL | Remarks/comments |
| blockchain_cert_hash | VARCHAR(255) | NULL | Blockchain certificate hash |
| is_final | BOOLEAN | DEFAULT FALSE | Final vs interim grade |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 14. ANALYTICS_METRICS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| metric_id | UUID | PRIMARY KEY | Unique metric ID |
| student_id | UUID | FOREIGN KEY | Reference to students table |
| quiz_id | UUID | NULL | Reference to quizzes (optional) |
| metric_date | DATE | NOT NULL | Date of metric |
| avg_score | DECIMAL(5,2) | NULL | Average score |
| accuracy_rate | DECIMAL(5,2) | NULL | Accuracy percentage |
| time_spent_learning_minutes | INT | NULL | Total learning time |
| quizzes_attempted | INT | DEFAULT 0 | Total quizzes taken |
| quizzes_passed | INT | DEFAULT 0 | Passed quizzes count |
| engagement_score | INT | NULL | Engagement metric (0-100) |
| learning_progress | INT | NULL | Progress percentage |
| topics_mastered | INT | DEFAULT 0 | Mastered topics count |
| topics_in_progress | INT | DEFAULT 0 | In-progress topics |
| topics_weak | INT | DEFAULT 0 | Weak areas count |
| last_activity_date | DATE | NULL | Last activity date |
| attendance_percentage | DECIMAL(5,2) | NULL | Attendance rate |
| performance_trend | ENUM | NULL | Improving, Stable, Declining |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 15. BLOCKCHAIN_RECORDS Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| record_id | UUID | PRIMARY KEY | Unique record ID |
| student_id | UUID | FOREIGN KEY | Reference to students table |
| record_type | ENUM | NOT NULL | Attendance, Grade, Certificate |
| transaction_hash | VARCHAR(255) | UNIQUE, NOT NULL | Blockchain tx hash |
| contract_address | VARCHAR(255) | NOT NULL | Smart contract address |
| block_number | BIGINT | NOT NULL | Block number |
| timestamp | TIMESTAMP | NOT NULL | Transaction timestamp |
| status | ENUM | NOT NULL | Pending, Confirmed, Failed |
| confirmation_count | INT | DEFAULT 0 | Block confirmations |
| verification_proof | TEXT | NULL | Verification data |
| metadata_json | JSON | NULL | Additional metadata |
| expiry_date | DATE | NULL | Certificate expiry |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 16. CHAT_MESSAGES Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| message_id | UUID | PRIMARY KEY | Unique message ID |
| sender_id | UUID | FOREIGN KEY | Reference to users table |
| receiver_id | UUID | FOREIGN KEY | Reference to users table |
| session_id | UUID | NULL | Reference to classroom session |
| conversation_id | UUID | NULL | Conversation thread ID |
| message_text | LONGTEXT | NOT NULL | Message content |
| message_type | ENUM | NOT NULL | Text, Image, File, Notification |
| attachment_url | TEXT | NULL | File/image attachment URL |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| is_edited | BOOLEAN | DEFAULT FALSE | Edited flag |
| edited_at | TIMESTAMP | NULL | Modification time |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| sent_at | TIMESTAMP | NOT NULL | Message send time |
| read_at | TIMESTAMP | NULL | Message read time |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

### 17. CERTIFICATES Table

| Column Name | Data Type | Constraint | Description |
|-------------|-----------|------------|-------------|
| cert_id | UUID | PRIMARY KEY | Unique certificate ID |
| student_id | UUID | FOREIGN KEY | Reference to students table |
| cert_type | ENUM | NOT NULL | Completion, Achievement, Merit, Participation |
| name | VARCHAR(255) | NOT NULL | Certificate name |
| issue_date | DATE | NOT NULL | Certificate issue date |
| expiry_date | DATE | NULL | Certificate expiry date |
| certificate_number | VARCHAR(50) | UNIQUE, NOT NULL | Certificate ID number |
| issued_by_id | UUID | NOT NULL | Issuing authority (Teacher/Admin) |
| achievement_description | TEXT | NULL | Achievement description |
| criteria_met | TEXT | NULL | Criteria satisfied |
| blockchain_hash | VARCHAR(255) | NULL | Blockchain verification hash |
| verification_url | TEXT | NULL | Public verification URL |
| certificate_pdf_url | TEXT | NOT NULL | PDF certificate link |
| status | ENUM | NOT NULL | Active, Expired, Revoked |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Last update time |

---

## Database Relationships

| Table 1 | Relationship | Table 2 | Description |
|---------|-------------|---------|-------------|
| USERS | 1:1 | STUDENT_INFO | One user record per student |
| USERS | 1:1 | TEACHER_INFO | One user record per teacher |
| STUDENT_INFO | N:1 | CLASSES | Many students in one class |
| TEACHER_INFO | N:1 | CLASSES | One teacher per class (primary) |
| CLASSES | N:1 | SUBJECTS | Many classes of one subject |
| QUIZZES | N:1 | CLASSES | Many quizzes per class |
| QUIZ_QUESTIONS | N:1 | QUIZZES | Many questions per quiz |
| QUIZ_ANSWERS | N:1 | QUIZ_QUESTIONS | Many options per question |
| QUIZ_RESPONSES | N:1 | QUIZZES | Many student responses per quiz |
| QUIZ_RESPONSES | N:1 | STUDENT_INFO | Many responses from one student |
| ATTENDANCE_RECORDS | N:1 | STUDENT_INFO | Many attendance records per student |
| CLASSROOM_SESSIONS | N:1 | CLASSES | Many sessions per class |
| GRADES | N:1 | STUDENT_INFO | Many grades for one student |
| GRADES | N:1 | SUBJECTS | Many grades for one subject |
| ANALYTICS_METRICS | N:1 | STUDENT_INFO | One metric record per student |
| BLOCKCHAIN_RECORDS | N:1 | STUDENT_INFO | Many records per student |
| CHAT_MESSAGES | N:1 | USERS | Many messages from one user |
| CERTIFICATES | N:1 | STUDENT_INFO | Many certificates per student |

---

## Indexing Strategy

```sql
-- Performance Indexes
CREATE INDEX idx_users_email ON USERS(email);
CREATE INDEX idx_users_user_type ON USERS(user_type);
CREATE INDEX idx_student_roll ON STUDENT_INFO(roll_number);
CREATE INDEX idx_quizzes_class ON QUIZZES(class_id);
CREATE INDEX idx_quizzes_published ON QUIZZES(is_published, start_date);
CREATE INDEX idx_responses_student ON QUIZ_RESPONSES(student_id);
CREATE INDEX idx_responses_quiz ON QUIZ_RESPONSES(quiz_id);
CREATE INDEX idx_responses_submitted ON QUIZ_RESPONSES(submitted_at);
CREATE INDEX idx_attendance_date ON ATTENDANCE_RECORDS(attendance_date);
CREATE INDEX idx_attendance_student ON ATTENDANCE_RECORDS(student_id);
CREATE INDEX idx_grades_student ON GRADES(student_id);
CREATE INDEX idx_grades_subject ON GRADES(subject_id);
CREATE INDEX idx_analytics_student ON ANALYTICS_METRICS(student_id);
CREATE INDEX idx_blockchain_hash ON BLOCKCHAIN_RECORDS(transaction_hash);
CREATE INDEX idx_chat_sender ON CHAT_MESSAGES(sender_id);
CREATE INDEX idx_chat_receiver ON CHAT_MESSAGES(receiver_id);
CREATE INDEX idx_messages_read ON CHAT_MESSAGES(is_read, sent_at);
```

