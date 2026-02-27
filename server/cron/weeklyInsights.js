/**
 * server/cron/weeklyInsights.js
 *
 * Cron job: every Friday at 4:00 PM, generate AI-powered insights
 * for each teacher based on their class attendance and quiz performance
 * for the past week, then persist/email the report.
 *
 * Schedule: '0 16 * * 5'  (minute=0, hour=16, any day, any month, weekday=5/Friday)
 */

import cron from 'node-cron';
import crypto from 'crypto';
import { getLLMService } from '../services/llmService.js';
import { query } from '../db/pg.js';
import { run } from '../database.js';

/** Fetch teachers from storage (PostgreSQL or SQLite/JSON fallback). */
async function getTeachers() {
  try {
    const result = await query(
      `SELECT id, name, email, assigned_subjects FROM users WHERE role = 'teacher'`,
    );
    return result.rows;
  } catch {
    // SQLite/JSON fallback
    const { readUsers } = await import('../controllers/userStore.js');
    const all = await readUsers();
    return all.filter((u) => u.role === 'teacher');
  }
}

/** Get attendance summary for a teacher's subjects over the last 7 days. */
async function getWeeklyAttendanceSummary(teacherId) {
  try {
    const result = await query(
      `SELECT
         s.subject,
         COUNT(*) FILTER (WHERE a.status = 'present') AS present,
         COUNT(*) AS total
       FROM attendance a
       JOIN class_sessions s ON a.session_id = s.id
       WHERE s.teacher_id = $1
         AND a.marked_at >= NOW() - INTERVAL '7 days'
       GROUP BY s.subject`,
      [teacherId],
    );
    return result.rows;
  } catch {
    return [];
  }
}

/** Get quiz performance summary for a teacher's subjects over the last 7 days. */
async function getWeeklyQuizSummary(teacherId) {
  try {
    const result = await query(
      `SELECT
         subject,
         ROUND(AVG(score)::numeric, 1) AS avg_score,
         COUNT(*) AS attempts
       FROM performance
       WHERE teacher_id = $1
         AND recorded_at >= NOW() - INTERVAL '7 days'
       GROUP BY subject`,
      [teacherId],
    );
    return result.rows;
  } catch {
    return [];
  }
}

/** Persist generated insight to DB for later retrieval in dashboard. */
async function saveInsight(teacherId, insight) {
  try {
    await query(
      `INSERT INTO teacher_insights (teacher_id, insight_text, generated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (teacher_id, DATE(generated_at))
       DO UPDATE SET insight_text = EXCLUDED.insight_text, generated_at = NOW()`,
      [teacherId, insight],
    );
  } catch {
    // Fallback: SQLite
    try {
      await run(
        `INSERT INTO teacher_insights (teacher_id, insight_text, generated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(teacher_id, DATE(generated_at))
         DO UPDATE SET insight_text = excluded.insight_text, generated_at = datetime('now')`,
        [teacherId, insight],
      );
    } catch (e) {
      console.error('[weeklyInsights] Could not persist insight:', e.message);
    }
  }
}

function deterministicDelayMs(teacherId, maxWindowMs) {
  const hash = crypto.createHash('sha256').update(String(teacherId)).digest();
  const bucket = hash.readUInt32BE(0);
  return bucket % maxWindowMs;
}

async function generateInsightForTeacher(teacher, llm) {
  const [attendance, quizStats] = await Promise.all([
    getWeeklyAttendanceSummary(teacher.id),
    getWeeklyQuizSummary(teacher.id),
  ]);

  const insight = await llm.analyticsInsights({ attendance, quizStats, teacherName: teacher.name });
  await saveInsight(teacher.id, insight);
}

async function generateInsightsForAll() {
  const llm = getLLMService();
  if (!llm) {
    console.warn('[weeklyInsights] Skipped: LLM service unavailable');
    return;
  }

  const windowHours = Number(process.env.WEEKLY_INSIGHTS_WINDOW_HOURS || 4);
  const windowMs = Math.max(1, Math.floor(windowHours * 60 * 60 * 1000));
  const teachers = await getTeachers();

  console.log(`[weeklyInsights] Running Friday insight generation for ${teachers.length} teachers over ${windowHours}h window...`);

  let generated = 0;
  let failed = 0;

  const tasks = teachers.map((teacher) => {
    const delay = deterministicDelayMs(teacher.id, windowMs);
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await generateInsightForTeacher(teacher, llm);
          generated++;
          console.log(`[weeklyInsights] Insight generated for teacher=${teacher.id} delayMs=${delay}`);
        } catch (err) {
          failed++;
          console.error(`[weeklyInsights] Failed for teacher=${teacher.id}:`, err.message);
        } finally {
          resolve();
        }
      }, delay);
    });
  });

  await Promise.all(tasks);
  console.log(`[weeklyInsights] Done. Generated ${generated}/${teachers.length}; failed=${failed}.`);
}

/**
 * Register the cron job.
 * Call this once from server/index.js: `import { registerWeeklyInsightsCron } from './cron/weeklyInsights.js'`
 */
export function registerWeeklyInsightsCron() {
  const expression = process.env.WEEKLY_INSIGHTS_CRON || '0 16 * * 5';
  const timezone = process.env.WEEKLY_INSIGHTS_TIMEZONE || 'Asia/Kolkata';

  cron.schedule(expression, generateInsightsForAll, { timezone });
  console.log(`[weeklyInsights] Cron registered: expr=${expression} timezone=${timezone} windowHours=${process.env.WEEKLY_INSIGHTS_WINDOW_HOURS || 4}`);
}

/** Manual trigger for testing: `node -e "import('./cron/weeklyInsights.js').then(m => m.runNow())"` */
export async function runNow() {
  await generateInsightsForAll();
}
