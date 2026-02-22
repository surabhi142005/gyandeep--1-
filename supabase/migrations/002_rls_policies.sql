-- 002_rls_policies.sql
-- Row Level Security policies for Gyandeep

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.questions enable row level security;
alter table public.grades enable row level security;
alter table public.timetable enable row level security;
alter table public.tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.webhooks enable row level security;
alter table public.tag_presets enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notes enable row level security;

-- Helper: get current user's role
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ─── Profiles ─────────────────────────────────────────────────────────────────

-- Anyone authenticated can read profiles
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins can update any profile
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- Admins can insert profiles (for bulk import)
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.get_user_role() = 'admin');

-- ─── Classes ──────────────────────────────────────────────────────────────────

create policy "classes_select"
  on public.classes for select
  to authenticated
  using (true);

create policy "classes_write_teachers_admins"
  on public.classes for all
  to authenticated
  using (public.get_user_role() in ('teacher', 'admin'))
  with check (public.get_user_role() in ('teacher', 'admin'));

-- ─── Questions ────────────────────────────────────────────────────────────────

create policy "questions_select"
  on public.questions for select
  to authenticated
  using (true);

create policy "questions_write_teachers_admins"
  on public.questions for all
  to authenticated
  using (public.get_user_role() in ('teacher', 'admin'))
  with check (public.get_user_role() in ('teacher', 'admin'));

-- ─── Grades ───────────────────────────────────────────────────────────────────

-- Students can see their own grades
create policy "grades_select_own"
  on public.grades for select
  to authenticated
  using (student_id = auth.uid());

-- Teachers and admins can see all grades
create policy "grades_select_staff"
  on public.grades for select
  to authenticated
  using (public.get_user_role() in ('teacher', 'admin'));

-- Teachers and admins can manage grades
create policy "grades_write_staff"
  on public.grades for all
  to authenticated
  using (public.get_user_role() in ('teacher', 'admin'))
  with check (public.get_user_role() in ('teacher', 'admin'));

-- ─── Timetable ────────────────────────────────────────────────────────────────

create policy "timetable_select"
  on public.timetable for select
  to authenticated
  using (true);

create policy "timetable_write_staff"
  on public.timetable for all
  to authenticated
  using (public.get_user_role() in ('teacher', 'admin'))
  with check (public.get_user_role() in ('teacher', 'admin'));

-- ─── Tickets ──────────────────────────────────────────────────────────────────

-- Users see their own tickets; admins see all
create policy "tickets_select_own"
  on public.tickets for select
  to authenticated
  using (user_id = auth.uid() or public.get_user_role() = 'admin');

-- Authenticated users can create tickets
create policy "tickets_insert"
  on public.tickets for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admins can update any ticket (reply, close)
create policy "tickets_update_admin"
  on public.tickets for update
  to authenticated
  using (public.get_user_role() = 'admin' or user_id = auth.uid());

-- ─── Notifications ────────────────────────────────────────────────────────────

-- Users see their own + broadcast (user_id = 'all')
create policy "notifications_select"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid()::text or user_id = 'all');

-- Authenticated can create notifications (teachers/admins in practice)
create policy "notifications_insert"
  on public.notifications for insert
  to authenticated
  with check (public.get_user_role() in ('teacher', 'admin'));

-- ─── Webhooks ─────────────────────────────────────────────────────────────────

create policy "webhooks_admin_only"
  on public.webhooks for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ─── Tag Presets ──────────────────────────────────────────────────────────────

create policy "tag_presets_select"
  on public.tag_presets for select
  to authenticated
  using (true);

create policy "tag_presets_write_staff"
  on public.tag_presets for all
  to authenticated
  using (public.get_user_role() in ('teacher', 'admin'))
  with check (public.get_user_role() in ('teacher', 'admin'));

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

create policy "audit_logs_admin_only"
  on public.audit_logs for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ─── Notes ────────────────────────────────────────────────────────────────────

create policy "notes_select"
  on public.notes for select
  to authenticated
  using (true);

create policy "notes_write_staff"
  on public.notes for all
  to authenticated
  using (public.get_user_role() in ('teacher', 'admin'))
  with check (public.get_user_role() in ('teacher', 'admin'));
