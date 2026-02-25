-- ============================================================
-- Gyandeep PostgreSQL Schema (production-grade, normalized)
-- Run: psql -d gyandeep -f schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";     -- GEOMETRY / POINT types
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector for face embeddings

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

CREATE TYPE user_role       AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- ─── CORE TABLES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  password_hash    TEXT,                              -- NULL for OAuth-only accounts
  role             user_role   NOT NULL DEFAULT 'student',
  google_id        TEXT        UNIQUE,
  face_vector      VECTOR(128),                       -- face embedding (pgvector)
  email_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  xp               INT         NOT NULL DEFAULT 0,
  coins            INT         NOT NULL DEFAULT 0,
  preferences      JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT  NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT  NOT NULL,
  teacher_id UUID  REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Many-to-many: students enrolled in classes
CREATE TABLE IF NOT EXISTS class_enrollments (
  class_id   UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id)   ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id       UUID        REFERENCES subjects(id) ON DELETE SET NULL,
  code             CHAR(6)     NOT NULL,
  expiry           TIMESTAMPTZ NOT NULL,
  location         GEOMETRY(Point, 4326),              -- teacher GPS (PostGIS)
  radius_m         INT         NOT NULL DEFAULT 100,
  notes_url        TEXT,
  notes_hash       TEXT,                               -- SHA-256 of notes for quiz cache
  quiz_published   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_active_code UNIQUE (code, expiry)
);

CREATE TABLE IF NOT EXISTS attendance (
  id           BIGSERIAL   PRIMARY KEY,
  session_id   UUID        NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id   UUID        NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  status       attendance_status NOT NULL DEFAULT 'present',
  geo_location GEOMETRY(Point, 4326),
  verified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
) PARTITION BY RANGE (verified_at);

-- Partition attendance by month (create as needed, automate with pg_partman)
CREATE TABLE IF NOT EXISTS attendance_y2025_m01
  PARTITION OF attendance FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS attendance_y2025_m02
  PARTITION OF attendance FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS attendance_default
  PARTITION OF attendance DEFAULT;

CREATE TABLE IF NOT EXISTS quizzes (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID  NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  questions  JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance (
  id          BIGSERIAL   PRIMARY KEY,
  student_id  UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  subject_id  UUID        REFERENCES subjects(id)             ON DELETE SET NULL,
  session_id  UUID        REFERENCES class_sessions(id)       ON DELETE SET NULL,
  score       DECIMAL(5,2) NOT NULL,
  max_score   DECIMAL(5,2) NOT NULL DEFAULT 100,
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

CREATE TABLE IF NOT EXISTS performance_default
  PARTITION OF performance DEFAULT;

CREATE TABLE IF NOT EXISTS badges (
  id       SERIAL PRIMARY KEY,
  name     TEXT   NOT NULL UNIQUE,
  slug     TEXT   NOT NULL UNIQUE,
  metadata JSONB  NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    UUID REFERENCES users(id)   ON DELETE CASCADE,
  badge_id   INT  REFERENCES badges(id)  ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Question bank
CREATE TABLE IF NOT EXISTS question_bank (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  question       TEXT  NOT NULL,
  options        JSONB NOT NULL,
  correct_answer TEXT  NOT NULL,
  subject        TEXT,
  tags           JSONB NOT NULL DEFAULT '[]',
  difficulty     TEXT  NOT NULL DEFAULT 'medium',
  notes_hash     TEXT,                                -- links to source notes
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grades (gradebook)
CREATE TABLE IF NOT EXISTS grades (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID  REFERENCES users(id) ON DELETE SET NULL,
  subject    TEXT  NOT NULL,
  category   TEXT  NOT NULL,
  title      TEXT  NOT NULL,
  score      DECIMAL(6,2) NOT NULL,
  max_score  DECIMAL(6,2) NOT NULL,
  weight     DECIMAL(4,2) NOT NULL DEFAULT 1,
  date       DATE  NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP / transient codes (prefer Redis; this is a DB fallback)
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT  NOT NULL UNIQUE,     -- email or userId
  code       TEXT  NOT NULL,
  purpose    TEXT  NOT NULL,            -- 'otp' | 'reset' | 'email_verify'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL   PRIMARY KEY,
  ts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type       TEXT        NOT NULL,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  details    JSONB       NOT NULL DEFAULT '{}'
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID  REFERENCES users(id) ON DELETE CASCADE,   -- NULL = broadcast
  title      TEXT  NOT NULL,
  message    TEXT  NOT NULL,
  type       TEXT  NOT NULL DEFAULT 'info',
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

-- Hash index: O(1) lookup for class session codes
CREATE INDEX IF NOT EXISTS idx_sessions_code_hash
  ON class_sessions USING HASH (code);

-- GiST index: spatial queries (geofencing) on session locations
CREATE INDEX IF NOT EXISTS idx_sessions_location_gist
  ON class_sessions USING GIST (location);

-- BRIN index: efficient for time-series attendance (linear growth)
CREATE INDEX IF NOT EXISTS idx_attendance_verified_brin
  ON attendance USING BRIN (verified_at);

-- Composite: student performance dashboard (line charts)
CREATE INDEX IF NOT EXISTS idx_perf_student_subject
  ON performance (student_id, subject_id);

-- Face vector similarity search (pgvector cosine distance)
CREATE INDEX IF NOT EXISTS idx_users_face_vector_ivfflat
  ON users USING ivfflat (face_vector vector_cosine_ops) WITH (lists = 100);

-- ─── MATERIALIZED VIEW: Attendance Summary ───────────────────────────────────
-- Refreshed by cron every 15 minutes; used by Teacher Dashboard instead of
-- real-time aggregation on millions of rows.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_summary AS
  SELECT
    cs.class_id,
    cs.subject_id,
    a.student_id,
    DATE_TRUNC('month', a.verified_at) AS month,
    COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
    COUNT(*) AS total_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE a.status = 'present') / NULLIF(COUNT(*), 0),
      2
    ) AS attendance_pct
  FROM attendance a
  JOIN class_sessions cs ON cs.id = a.session_id
  GROUP BY cs.class_id, cs.subject_id, a.student_id, DATE_TRUNC('month', a.verified_at)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_attendance_summary
  ON mv_attendance_summary (class_id, subject_id, student_id, month);

-- ─── SEED DATA (badges) ──────────────────────────────────────────────────────

INSERT INTO badges (name, slug, metadata) VALUES
  ('Perfect Score',    'perfect-score',   '{"xp": 50,  "icon": "star"}'),
  ('Attendance Streak','attend-streak',   '{"xp": 30,  "icon": "fire"}'),
  ('Quiz Master',      'quiz-master',     '{"xp": 100, "icon": "trophy"}'),
  ('Early Bird',       'early-bird',      '{"xp": 20,  "icon": "sunrise"}')
ON CONFLICT (slug) DO NOTHING;
