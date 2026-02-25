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
        `INSERT OR REPLACE INTO teacher_insights (teacher_id, insight_text, generated_at)
         VALUES (?, ?, datetime('now'))`,
        [teacherId, insight],
      );
    } catch (e) {
      console.error('[weeklyInsights] Could not persist insight:', e.message);
    }
  }
}

async function generateInsightsForAll() {
  console.log('[weeklyInsights] Running Friday insight generation...');
  const llm = getLLMService();
  const teachers = await getTeachers();

  let generated = 0;
  for (const teacher of teachers) {
    try {
      const [attendance, quizStats] = await Promise.all([
        getWeeklyAttendanceSummary(teacher.id),
        getWeeklyQuizSummary(teacher.id),
      ]);

      const insight = await llm.analyticsInsights({ attendance, quizStats, teacherName: teacher.name });
      await saveInsight(teacher.id, insight);
      generated++;
      console.log(`[weeklyInsights] Insight generated for teacher: ${teacher.name}`);
    } catch (err) {
      console.error(`[weeklyInsights] Failed for teacher ${teacher.id}:`, err.message);
    }
  }

  console.log(`[weeklyInsights] Done. Generated ${generated}/${teachers.length} insights.`);
}

/**
 * Register the cron job.
 * Call this once from server/index.js: `import { registerWeeklyInsightsCron } from './cron/weeklyInsights.js'`
 */
export function registerWeeklyInsightsCron() {
  // Every Friday at 16:00
  cron.schedule('0 16 * * 5', generateInsightsForAll, {
    timezone: 'Asia/Kolkata',
  });
  console.log('[weeklyInsights] Cron registered: Fridays at 4:00 PM IST');
}

/** Manual trigger for testing: `node -e "import('./cron/weeklyInsights.js').then(m => m.runNow())"` */
export async function runNow() {
  await generateInsightsForAll();
}
