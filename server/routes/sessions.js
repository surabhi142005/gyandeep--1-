/**
 * server/routes/sessions.js — Class session management with MongoDB
 * 
 * SESSION NOTES (Temporary - deleted after grading):
 * - POST /api/sessions              — Create new session
 * - POST /api/sessions/:id/notes    — Upload session notes
 * - GET  /api/sessions/:id/notes    — Get session notes
 * - POST /api/sessions/:id/quiz     — Generate quiz from session notes
 * - POST /api/sessions/:id/publish  — Publish quiz
 * - POST /api/sessions/:id/grade   — Grade and delete notes when all graded
 * - POST /api/sessions/:id/end     — End session and delete notes
 * 
 * CENTRALIZED NOTES (Persistent):
 * - POST /api/notes/centralized    — Upload persistent notes
 * - GET /api/notes/centralized     — Get persistent notes
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth.js';
import { ensureRole } from '../middleware/rbac.js';
import { asyncRoute } from '../middleware/validate.js';
import { getLLMService } from '../services/llmService.js';
import { getDB, COLLECTIONS, generateId, mongoOps } from '../db/mongo.js';
import { hashNotes, getCachedQuiz, cacheQuiz } from '../services/redisService.js';

const router = Router();

const storageDir = path.join(process.cwd(), 'server', 'storage');
const sessionNotesDir = path.join(storageDir, 'session-notes');

function ensureDirs() {
    if (!fs.existsSync(sessionNotesDir)) {
        fs.mkdirSync(sessionNotesDir, { recursive: true });
    }
}

function safeSeg(seg) {
    const s = path.basename(String(seg || '')).replace(/[^a-zA-Z0-9_\-\.]/g, '');
    return s.length > 0 ? s : null;
}

function insideBase(resolvedPath, base) {
    return resolvedPath.startsWith(base + path.sep) || resolvedPath === base;
}

const upload = multer({
    dest: sessionNotesDir,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['text/plain', 'text/markdown', 'application/pdf', 'image/jpeg', 'image/png'];
        cb(null, allowed.includes(file.mimetype));
    },
});

async function notifyUsers(userIds = [], payload = {}) {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)))
    if (ids.length === 0) return
    const docs = ids.map(id => ({
        _id: generateId(),
        userId: id,
        type: payload.type || 'system',
        title: payload.title || 'Notification',
        message: payload.message || '',
        relatedId: payload.relatedId || null,
        relatedType: payload.relatedType || null,
        read: false,
        createdAt: new Date(),
    }))
    await getDB().collection(COLLECTIONS.NOTIFICATIONS).insertMany(docs).catch(() => {})
}

async function extractTextFromFile(filePath, mimeType) {
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        return fs.readFileSync(filePath, 'utf8');
    }
    if (mimeType === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text || '';
    }
    if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
        const llm = getLLMService();
        if (!llm) throw new Error('LLM service not available for OCR');
        const buffer = fs.readFileSync(filePath);
        return llm.extractTextFromImage(buffer, mimeType);
    }
    throw new Error(`Cannot extract text from ${mimeType}`);
}

function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ── Create new session ─────────────────────────────────────────────────────
router.post('/', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const { classId, subjectId, durationMinutes = 60, timetableEntryId } = req.body || {};
    if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const code = generateSessionCode();
    const expiry = Date.now() + (durationMinutes * 60 * 1000);

    const session = {
        _id: id,
        code,
        teacher_id: req.user.id,
        class_id: classId || null,
        subject_id: subjectId,
        expiry,
        quiz_published: false,
        session_status: 'active',
        ended_at: null,
        timetable_entry_id: timetableEntryId || null,
        created_at: Date.now(),
    };

    await mongoOps.insertOne(COLLECTIONS.CLASS_SESSIONS, session);

    return res.json({
        ok: true,
        session: {
            id,
            code,
            classId: classId || null,
            subjectId,
            expiry,
            quizPublished: false,
            hasNotes: false,
            endedAt: null,
            timetableEntryId: timetableEntryId || null,
        },
    });
}));

// ── Upload session notes (TEMPORARY - will be deleted after grading) ─────────
router.post('/:id/notes', requireAuth, ensureRole('teacher'), upload.single('file'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;
    const { content } = req.body || {};
    const file = req.file;

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId, teacher_id: req.user.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const existingNote = await mongoOps.findOne(COLLECTIONS.SESSION_NOTES, { session_id: sessionId, deleted_at: { $exists: false } });
    if (existingNote) {
        return res.status(400).json({ error: 'Session already has notes. Delete existing notes first.' });
    }

    ensureDirs();
    const dir = path.resolve(sessionNotesDir, safeSeg(sessionId));
    if (!insideBase(dir, path.resolve(sessionNotesDir))) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let notesText = '';
    let filePath = null;

    if (file) {
        const extMap = {
            'application/pdf': '.pdf',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'text/plain': '.txt',
            'text/markdown': '.md',
        };
        const ext = extMap[file.mimetype] || '.bin';

        try {
            notesText = await extractTextFromFile(file.path, file.mimetype);
        } catch (err) {
            try { fs.unlinkSync(file.path) } catch {}
            return res.status(422).json({ error: `Text extraction failed: ${err.message}` });
        }

        const fileName = `notes_${Date.now()}${ext}`;
        const permanentPath = path.join(dir, fileName);
        fs.renameSync(file.path, permanentPath);
        filePath = permanentPath;
    } else if (content) {
        notesText = String(content);
        const fileName = `notes_${Date.now()}.txt`;
        const textPath = path.join(dir, fileName);
        fs.writeFileSync(textPath, notesText, 'utf8');
        filePath = textPath;
    } else {
        return res.status(400).json({ error: 'Either content or file is required' });
    }

    // Store session notes in dedicated collection
    const noteId = `sn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionNote = {
        _id: noteId,
        session_id: sessionId,
        content: notesText,
        file_path: filePath,
        extracted_text: notesText,
        deleted_at: null,
        created_at: Date.now(),
    };

    await mongoOps.insertOne(COLLECTIONS.SESSION_NOTES, sessionNote);

    return res.json({
        ok: true,
        noteId,
        notesText,
        extractedText: notesText.slice(0, 1000),
        totalLength: notesText.length,
        message: 'Session notes saved. These will be DELETED after all students are graded.',
    });
}));

// ── Get session notes ───────────────────────────────────────────────────────
router.get('/:id/notes', requireAuth, asyncRoute(async (req, res) => {
    const sessionId = req.params.id;

    const sessionNote = await mongoOps.findOne(COLLECTIONS.SESSION_NOTES, { session_id: sessionId });
    if (!sessionNote) {
        return res.json({ hasNotes: false, notes: null });
    }

    if (sessionNote.deleted_at) {
        return res.json({ hasNotes: false, notes: null, deleted: true });
    }

    return res.json({
        hasNotes: true,
        noteId: sessionNote._id,
        notes: sessionNote.extracted_text || sessionNote.content,
        createdAt: sessionNote.created_at,
    });
}));

// ── Generate quiz from session notes ────────────────────────────────────────
router.post('/:id/quiz', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;
    const { enableThinkingMode, quizType } = req.body || {};

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId, teacher_id: req.user.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const sessionNote = await mongoOps.findOne(COLLECTIONS.SESSION_NOTES, { session_id: sessionId, deleted_at: { $exists: false } });
    if (!sessionNote) return res.status(400).json({ error: 'No session notes uploaded for this session' });

    const notesText = sessionNote.extracted_text || sessionNote.content;

    const llm = getLLMService();
    if (!llm) return res.status(503).json({ error: 'AI features unavailable. Set GEMINI_API_KEY in environment.' });

    const notesHash = hashNotes(notesText);
    const cached = await getCachedQuiz(notesHash, session.subject_id);
    
    let quizQuestions = cached;

    if (!cached) {
        quizQuestions = await llm.generateQuiz(notesText, session.subject_id, {
            thinkingMode: !!enableThinkingMode,
        });
        await cacheQuiz(notesHash, session.subject_id, quizQuestions);
    }

    // Store quiz in quizzes collection
    const quizId = `qz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const quiz = {
        _id: quizId,
        session_id: sessionId,
        teacher_id: req.user.id,
        title: `Quiz - Session ${session.code}`,
        questions_json: JSON.stringify(quizQuestions),
        published: false,
        quiz_type: ['pre', 'post', 'main'].includes(quizType) ? quizType : 'main',
        created_at: Date.now(),
    };

    await mongoOps.insertOne(COLLECTIONS.QUIZZES, quiz);

    // Update session
    await mongoOps.updateOne(
        COLLECTIONS.CLASS_SESSIONS,
        { _id: sessionId },
        { $set: { quiz_questions: JSON.stringify(quizQuestions) } }
    );

    return res.json({
        quiz: quizQuestions,
        quizId,
        fromCache: !!cached,
        message: 'Quiz generated from SESSION NOTES. Publish to allow students to take.',
    });
}));

// ── Publish quiz to students ────────────────────────────────────────────────
router.post('/:id/publish', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId, teacher_id: req.user.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const quiz = await mongoOps.findOne(COLLECTIONS.QUIZZES, { session_id: sessionId });
    if (!quiz && !session.quiz_questions) return res.status(400).json({ error: 'Generate quiz first' });

    if (quiz) {
        await mongoOps.updateOne(
            COLLECTIONS.QUIZZES,
            { _id: quiz._id },
            { $set: { published: true, published_at: Date.now() } }
        );
    }

    await mongoOps.updateOne(
        COLLECTIONS.CLASS_SESSIONS,
        { _id: sessionId },
        { $set: { quiz_published: true, quiz_published_at: Date.now() } }
    );

    if (session.class_id) {
        const students = await getDB().collection(COLLECTIONS.USERS).find({ classId: session.class_id, role: 'student' }).project({ _id: 1, id: 1 }).toArray()
        await notifyUsers(
            students.map(s => s.id || s._id?.toString?.()),
            {
                type: 'quiz_published',
                title: 'New quiz published',
                message: `A new quiz for ${session.subject_id} is available.`,
                relatedId: sessionId,
                relatedType: 'session',
            }
        )
    }

    return res.json({ ok: true, published: true, message: 'Quiz published. Students can now take the quiz.' });
}));

// ── Get session ──────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, asyncRoute(async (req, res) => {
    const sessionId = req.params.id;

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (Date.now() > session.expiry) {
        return res.status(410).json({ error: 'Session has expired' });
    }

    if (req.user.role === 'student') {
        if (!session.quiz_published) {
            return res.status(403).json({ error: 'Quiz not yet published' });
        }
        return res.json({
            id: session._id,
            code: session.code,
            classId: session.class_id,
            subjectId: session.subject_id,
            quizPublished: !!session.quiz_published,
            quizQuestions: session.quiz_questions ? JSON.parse(session.quiz_questions) : null,
            endedAt: session.ended_at || null,
        });
    }

    // Teacher view - include session notes status
    const sessionNote = await mongoOps.findOne(COLLECTIONS.SESSION_NOTES, { session_id: sessionId, deleted_at: { $exists: false } });
    const quiz = await mongoOps.findOne(COLLECTIONS.QUIZZES, { session_id: sessionId });

    return res.json({
        id: session._id,
        code: session.code,
        classId: session.class_id,
        subjectId: session.subject_id,
        expiry: session.expiry,
        quizPublished: !!session.quiz_published,
        hasNotes: !!sessionNote,
        notesPreview: sessionNote ? (sessionNote.extracted_text || sessionNote.content)?.slice(0, 500) : null,
        quizQuestions: session.quiz_questions ? JSON.parse(session.quiz_questions) : null,
        quizId: quiz?._id || null,
        quizType: quiz?.quiz_type || 'main',
        endedAt: session.ended_at || null,
        timetableEntryId: session.timetable_entry_id || null,
    });
}));

// ── Join session by code ───────────────────────────────────────────────────
router.get('/code/:code', requireAuth, ensureRole('student'), asyncRoute(async (req, res) => {
    const code = req.params.code.toUpperCase();

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { code });
    if (!session) return res.status(404).json({ error: 'Invalid session code' });
    if (Date.now() > session.expiry) return res.status(410).json({ error: 'Session has expired' });
    if (!session.quiz_published) return res.status(403).json({ error: 'Quiz not yet published' });

    return res.json({
        sessionId: session._id,
        code: session.code,
        classId: session.class_id,
        subjectId: session.subject_id,
        quizQuestions: session.quiz_questions ? JSON.parse(session.quiz_questions) : null,
    });
}));

// ── Submit grade and DELETE session notes ───────────────────────────────────
router.post('/:id/grade', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;
    const { studentId, score, maxScore } = req.body || {};

    if (!studentId || score == null || maxScore == null) {
        return res.status(400).json({ error: 'studentId, score, and maxScore are required' });
    }

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId, teacher_id: req.user.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const quiz = await mongoOps.findOne(COLLECTIONS.QUIZZES, { session_id: sessionId });

    // Insert grade
    const gradeId = `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const grade = {
        _id: gradeId,
        studentId,
        subject: session.subject_id,
        category: 'quiz',
        title: `Quiz - Session ${session.code}`,
        score,
        maxScore,
        weight: 1,
        date: new Date().toISOString().split('T')[0],
        teacherId: req.user.id,
        sessionId,
        createdAt: Date.now(),
    };

    await mongoOps.insertOne(COLLECTIONS.GRADES, grade);

    // Update quiz attempt
    if (quiz) {
        await mongoOps.updateOne(
            COLLECTIONS.QUIZ_ATTEMPTS,
            { quiz_id: quiz._id, student_id: studentId },
            { $set: { grade_id: gradeId } }
        );
    }

    // Legacy: Update quiz submission
    await mongoOps.updateOne(
        COLLECTIONS.QUIZ_SUBMISSIONS,
        { session_id: sessionId, student_id: studentId },
        { $set: { grade_id: gradeId } }
    );

    // Check if ALL students graded
    const classStudents = await mongoOps.find(COLLECTIONS.USERS, { classId: session.class_id, role: 'student', active: true });
    const gradedCount = await mongoOps.count(COLLECTIONS.GRADES, { sessionId });

    await notifyUsers(
        [studentId],
        {
            type: 'grade_posted',
            title: 'Grade posted',
            message: `Your quiz for session ${session.code} scored ${score}/${maxScore}.`,
            relatedId: gradeId,
            relatedType: 'grade',
        }
    );

    const allGraded = classStudents.length > 0 && gradedCount >= classStudents.length;
    let notesDeleted = false;

    if (allGraded) {
        // DELETE SESSION NOTES!
        const sessionNote = await mongoOps.findOne(COLLECTIONS.SESSION_NOTES, { session_id: sessionId, deleted_at: { $exists: false } });
        
        if (sessionNote) {
            if (sessionNote.file_path && fs.existsSync(sessionNote.file_path)) {
                try { fs.unlinkSync(sessionNote.file_path) } catch {}
            }
            const dir = path.join(sessionNotesDir, safeSeg(sessionId));
            if (fs.existsSync(dir)) {
                try {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        fs.unlinkSync(path.join(dir, file));
                    }
                    fs.rmdirSync(dir);
                } catch {}
            }

            await mongoOps.updateOne(
                COLLECTIONS.SESSION_NOTES,
                { _id: sessionNote._id },
                { $set: { deleted_at: Date.now(), content: null, extracted_text: null } }
            );
            notesDeleted = true;
        }

        await mongoOps.updateOne(
            COLLECTIONS.CLASS_SESSIONS,
            { _id: sessionId },
            { $set: { session_status: 'completed' } }
        );
    }

    return res.json({
        ok: true,
        gradeId,
        notesDeleted,
        allGraded,
        message: allGraded 
            ? 'Grade saved. ALL SESSION NOTES DELETED as all students are graded.'
            : 'Grade saved. Session notes will be deleted when all students are graded.',
    });
}));

// ── End session and DELETE notes ────────────────────────────────────────────
router.post('/:id/end', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId, teacher_id: req.user.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Delete session notes
    const sessionNote = await mongoOps.findOne(COLLECTIONS.SESSION_NOTES, { session_id: sessionId, deleted_at: { $exists: false } });
    
    if (sessionNote) {
        if (sessionNote.file_path && fs.existsSync(sessionNote.file_path)) {
            try { fs.unlinkSync(sessionNote.file_path) } catch {}
        }
        const dir = path.join(sessionNotesDir, safeSeg(sessionId));
        if (fs.existsSync(dir)) {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    fs.unlinkSync(path.join(dir, file));
                }
                fs.rmdirSync(dir);
            } catch {}
        }

        await mongoOps.updateOne(
            COLLECTIONS.SESSION_NOTES,
            { _id: sessionNote._id },
            { $set: { deleted_at: Date.now(), content: null, extracted_text: null } }
        );
    }

    await mongoOps.updateOne(
        COLLECTIONS.CLASS_SESSIONS,
        { _id: sessionId },
        { $set: { expiry: Date.now(), session_status: 'ended', ended_at: Date.now() } }
    );

    if (session.class_id) {
        const students = await getDB().collection(COLLECTIONS.USERS).find({ classId: session.class_id, role: 'student' }).project({ _id: 1, id: 1 }).toArray()
        await notifyUsers(
            students.map(s => s.id || s._id?.toString?.()),
            {
                type: 'system',
                title: 'Session ended',
                message: `Session ${session.code} has ended.`,
                relatedId: sessionId,
                relatedType: 'session',
            }
        )
    }

    return res.json({ ok: true, ended: true, message: 'Session ended. Session notes deleted.' });
}));

// ── List teacher's sessions ─────────────────────────────────────────────────
router.get('/', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const sessions = await mongoOps.find(
        COLLECTIONS.CLASS_SESSIONS,
        { teacher_id: req.user.id, expiry: { $gt: Date.now() } },
        { sort: { created_at: -1 } }
    );

    return res.json(sessions.map(s => ({
        id: s._id,
        code: s.code,
        classId: s.class_id,
        subjectId: s.subject_id,
        expiry: s.expiry,
        quizPublished: !!s.quiz_published,
        hasNotes: !!s.quiz_questions,
        sessionStatus: s.session_status,
        endedAt: s.ended_at || null,
        timetableEntryId: s.timetable_entry_id || null,
        createdAt: s.created_at,
    })));
}));

// ── Get session results ───────────────────────────────────────────────────
router.get('/:id/results', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId, teacher_id: req.user.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const submissions = await mongoOps.aggregate(COLLECTIONS.QUIZ_SUBMISSIONS, [
        { $match: { session_id: sessionId } },
        {
            $lookup: {
                from: 'users',
                localField: 'student_id',
                foreignField: '_id',
                as: 'student',
            },
        },
        { $unwind: '$student' },
        {
            $lookup: {
                from: 'grades',
                localField: 'student_id',
                foreignField: 'studentId',
                as: 'grade',
            },
        },
        { $sort: { percentage: -1, submitted_at: 1 } },
    ]);

    return res.json({
        session: {
            id: session._id,
            code: session.code,
            subjectId: session.subject_id,
            classId: session.class_id,
            quizPublished: !!session.quiz_published,
            hasNotes: !!session.quiz_questions,
            sessionStatus: session.session_status,
            createdAt: session.created_at,
        },
        results: submissions,
    });
}));

// ── Student quiz submission ────────────────────────────────────────────────
router.post('/:id/submit-quiz', requireAuth, ensureRole('student'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;
    const { answers } = req.body || {};

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'answers array is required' });
    }

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (Date.now() > session.expiry) return res.status(410).json({ error: 'Session has expired' });
    if (!session.quiz_published) return res.status(403).json({ error: 'Quiz not yet published' });

    const existing = await mongoOps.findOne(COLLECTIONS.QUIZ_SUBMISSIONS, { session_id: sessionId, student_id: req.user.id });
    if (existing) return res.status(409).json({ error: 'Quiz already submitted' });

    const questions = JSON.parse(session.quiz_questions || '[]');
    let correctCount = 0;
    const gradedAnswers = answers.map((ans, idx) => {
        const question = questions[idx];
        const isCorrect = question && ans.answer === question.correctAnswer;
        if (isCorrect) correctCount++;
        return {
            questionIndex: idx,
            selectedAnswer: ans.answer,
            isCorrect,
            correctAnswer: question?.correctAnswer,
        };
    });

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const submission = {
        _id: submissionId,
        session_id: sessionId,
        student_id: req.user.id,
        answers_json: JSON.stringify(gradedAnswers),
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage,
        submitted_at: Date.now(),
        grade_id: null,
    };

    await mongoOps.insertOne(COLLECTIONS.QUIZ_SUBMISSIONS, submission);

    return res.json({
        ok: true,
        submissionId,
        correctCount,
        totalQuestions,
        percentage,
        answers: gradedAnswers,
    });
}));

// ── Get student's submission ────────────────────────────────────────────────
router.get('/:id/my-submission', requireAuth, ensureRole('student'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;

    const submission = await mongoOps.findOne(COLLECTIONS.QUIZ_SUBMISSIONS, { session_id: sessionId, student_id: req.user.id });
    if (!submission) return res.status(404).json({ error: 'No submission found' });

    return res.json({
        submissionId: submission._id,
        sessionId: submission.session_id,
        correctCount: submission.correct_count,
        totalQuestions: submission.total_questions,
        percentage: submission.percentage,
        submittedAt: submission.submitted_at,
        answers: JSON.parse(submission.answers_json || '[]'),
    });
}));

// ── Delete session notes manually ──────────────────────────────────────────
router.delete('/:id/notes', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
    const sessionId = req.params.id;

    const session = await mongoOps.findOne(COLLECTIONS.CLASS_SESSIONS, { _id: sessionId, teacher_id: req.user.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const sessionNote = await mongoOps.findOne(COLLECTIONS.SESSION_NOTES, { session_id: sessionId, deleted_at: { $exists: false } });
    if (!sessionNote) return res.status(400).json({ error: 'No session notes to delete' });

    // Delete files
    if (sessionNote.file_path && fs.existsSync(sessionNote.file_path)) {
        try { fs.unlinkSync(sessionNote.file_path) } catch {}
    }

    await mongoOps.updateOne(
        COLLECTIONS.SESSION_NOTES,
        { _id: sessionNote._id },
        { $set: { deleted_at: Date.now(), content: null, extracted_text: null } }
    );

    return res.json({ ok: true, message: 'Session notes deleted.' });
}));

export default router;
