/**
 * migrate-to-supabase.ts
 *
 * Reads data from the legacy SQLite database and JSON files,
 * then inserts into Supabase tables and uploads files to Storage.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-supabase.ts
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const dataDir = path.join(process.cwd(), 'server', 'data');

function readJson<T>(filename: string, fallback: T): T {
  const p = path.join(dataDir, filename);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function migrateUsers() {
  console.log('Migrating users...');
  const users: any[] = readJson('users.json', []);

  for (const u of users) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email || `${u.id}@gyandeep.local`,
      password: u.password || 'changeme123',
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role }
    });

    if (authError) {
      console.warn(`  Skipping user ${u.id} (${u.name}): ${authError.message}`);
      continue;
    }

    const authId = authData.user.id;

    // Update profile with full data
    const { error: profileError } = await supabase.from('profiles').update({
      name: u.name,
      role: u.role || 'student',
      face_image: u.faceImage || null,
      preferences: u.preferences || {},
      history: u.history || [],
      assigned_subjects: u.assignedSubjects || [],
      performance: u.performance || [],
      class_id: u.classId || null,
      xp: u.xp || 0,
      badges: u.badges || [],
      coins: u.coins || 0,
      level: u.level || 1
    }).eq('id', authId);

    if (profileError) {
      console.warn(`  Profile update failed for ${u.name}: ${profileError.message}`);
    } else {
      console.log(`  Migrated user: ${u.name} (${u.role})`);
    }
  }
}

async function migrateClasses() {
  console.log('Migrating classes...');
  const classes: any[] = readJson('classes.json', []);
  if (classes.length === 0) return;

  const { error } = await supabase.from('classes').upsert(
    classes.map(c => ({ id: c.id, name: c.name }))
  );
  if (error) console.error('  Classes error:', error.message);
  else console.log(`  Migrated ${classes.length} classes`);
}

async function migrateQuestions() {
  console.log('Migrating questions...');
  const questions: any[] = readJson('question-bank.json', []);
  if (questions.length === 0) return;

  const { error } = await supabase.from('questions').upsert(
    questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      tags: q.tags || [],
      difficulty: q.difficulty || 'medium',
      subject: q.subject || null
    }))
  );
  if (error) console.error('  Questions error:', error.message);
  else console.log(`  Migrated ${questions.length} questions`);
}

async function migrateGrades() {
  console.log('Migrating grades...');
  const grades: any[] = readJson('grades.json', []);
  if (grades.length === 0) return;
  console.log(`  Found ${grades.length} grades (skipping — need user ID mapping)`);
}

async function migrateTimetable() {
  console.log('Migrating timetable...');
  const entries: any[] = readJson('timetable.json', []);
  if (entries.length === 0) return;

  const { error } = await supabase.from('timetable').upsert(
    entries.map(e => ({
      id: e.id,
      day: e.day,
      start_time: e.startTime,
      end_time: e.endTime,
      subject: e.subject,
      room: e.room || null
    }))
  );
  if (error) console.error('  Timetable error:', error.message);
  else console.log(`  Migrated ${entries.length} timetable entries`);
}

async function migrateTickets() {
  console.log('Migrating tickets...');
  const tickets: any[] = readJson('tickets.json', []);
  if (tickets.length === 0) return;
  console.log(`  Found ${tickets.length} tickets (skipping — need user ID mapping)`);
}

async function migrateTagPresets() {
  console.log('Migrating tag presets...');
  const presets: Record<string, string[]> = readJson('tag-presets.json', {});
  const entries = Object.entries(presets);
  if (entries.length === 0) return;

  const { error } = await supabase.from('tag_presets').upsert(
    entries.map(([subject, tags]) => ({ subject, tags }))
  );
  if (error) console.error('  Tag presets error:', error.message);
  else console.log(`  Migrated ${entries.length} tag presets`);
}

async function migrateFaceImages() {
  console.log('Migrating face images to Storage...');
  const facesDir = path.join(dataDir, 'faces');
  if (!fs.existsSync(facesDir)) return;

  const files = fs.readdirSync(facesDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
  for (const file of files) {
    const filePath = path.join(facesDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    const userId = path.basename(file, path.extname(file));

    const { error } = await supabase.storage
      .from('faces')
      .upload(`${userId}/${file}`, fileBuffer, {
        contentType: file.endsWith('.png') ? 'image/png' : 'image/jpeg',
        upsert: true
      });

    if (error) console.warn(`  Face upload failed for ${file}: ${error.message}`);
    else console.log(`  Uploaded face: ${file}`);
  }
}

async function main() {
  console.log('=== Gyandeep Data Migration to Supabase ===\n');

  await migrateClasses();
  await migrateUsers();
  await migrateQuestions();
  await migrateGrades();
  await migrateTimetable();
  await migrateTickets();
  await migrateTagPresets();
  await migrateFaceImages();

  console.log('\n=== Migration Complete ===');
}

main().catch(console.error);
