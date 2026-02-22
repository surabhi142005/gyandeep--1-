-- 001_initial_schema.sql
-- Gyandeep: Initial database schema for Supabase

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Classes ──────────────────────────────────────────────────────────────────
create table public.classes (
  id   text primary key,
  name text not null
);

-- ─── Profiles (extends auth.users) ────────────────────────────────────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text not null,
  email             text,
  role              text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  face_image        text,                    -- base64 data URL
  preferences       jsonb default '{}'::jsonb,
  history           jsonb default '[]'::jsonb,
  assigned_subjects text[] default '{}',
  performance       jsonb default '[]'::jsonb,
  class_id          text references public.classes(id) on delete set null,
  xp                integer default 0,
  badges            text[] default '{}',
  coins             integer default 0,
  level             integer default 1,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── Questions (Question Bank) ────────────────────────────────────────────────
create table public.questions (
  id              text primary key,
  question        text not null,
  options         jsonb not null,            -- array of strings
  correct_answer  text not null,
  tags            text[] default '{}',
  difficulty      text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  subject         text,
  created_at      timestamptz default now()
);

-- ─── Grades ───────────────────────────────────────────────────────────────────
create table public.grades (
  id         text primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject    text not null,
  category   text,
  title      text,
  score      numeric not null,
  max_score  numeric not null default 100,
  weight     numeric default 1.0,
  date       date default current_date,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── Timetable ────────────────────────────────────────────────────────────────
create table public.timetable (
  id         text primary key,
  day        text not null,
  start_time text not null,
  end_time   text not null,
  subject    text not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  class_id   text references public.classes(id) on delete set null,
  room       text
);

-- ─── Support Tickets ──────────────────────────────────────────────────────────
create table public.tickets (
  id         text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  user_name  text,
  subject    text not null,
  message    text not null,
  category   text,
  status     text default 'open' check (status in ('open', 'closed')),
  replies    jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
create table public.notifications (
  id         text primary key,
  user_id    text not null,               -- UUID or 'all' for broadcast
  title      text,
  message    text not null,
  type       text default 'info',
  read       boolean default false,
  created_at timestamptz default now()
);

-- ─── Webhooks ─────────────────────────────────────────────────────────────────
create table public.webhooks (
  id      text primary key,
  url     text not null,
  events  text[] default '{}',
  name    text,
  active  boolean default true
);

-- ─── Tag Presets ──────────────────────────────────────────────────────────────
create table public.tag_presets (
  subject text primary key,
  tags    jsonb not null default '[]'::jsonb
);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
create table public.audit_logs (
  id      bigint generated always as identity primary key,
  ts      timestamptz default now(),
  type    text,
  user_id text,
  details jsonb default '{}'::jsonb
);

-- ─── Notes ────────────────────────────────────────────────────────────────────
create table public.notes (
  id           text primary key,
  class_id     text references public.classes(id) on delete cascade,
  subject_id   text,
  storage_path text not null,               -- path in Supabase Storage
  file_name    text,
  created_at   timestamptz default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_class on public.profiles(class_id);
create index idx_grades_student on public.grades(student_id);
create index idx_grades_teacher on public.grades(teacher_id);
create index idx_timetable_class on public.timetable(class_id);
create index idx_tickets_user on public.tickets(user_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_questions_subject on public.questions(subject);
create index idx_notes_class_subject on public.notes(class_id, subject_id);

-- ─── Enable Realtime ──────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.grades;
