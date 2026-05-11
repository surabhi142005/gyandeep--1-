import express from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';
import { callAI, parseAIJson } from '../services/aiService.js';

const router = express.Router();

// ── QUIZ GENERATION (AI-POWERED) ───────────────────────────────

async function handleQuizGeneration(req, res) {
  try {
    const { notesText, subject, count = 10, sessionId, classId, title } = req.body;
    const normalizedCount = Math.min(20, Math.max(1, Number(count) || 10));

    if (!notesText || !notesText.trim()) {
      return res.status(400).json({ error: 'Notes text is required' });
    }

    const quizPrompt = `Generate exactly ${normalizedCount} multiple choice quiz questions based on the following study content about ${subject || 'the topic'}.

Strict requirements:
- Return ONLY a JSON array of objects
- DO NOT wrap the array in an object (e.g., no { "questions": [...] })
- No markdown formatting, no backticks, no code fences
- Each question must have exactly 4 options
- "correctAnswer" must match one of the strings in the "options" array exactly
- Do not include any text outside the JSON array

Example structure:
[
  {
    "id": "q1",
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "explanation": "Simple arithmetic."
  }
]

Study content:
${notesText.slice(0, 8000)}`;

    const rawResponse = await callAI(quizPrompt, {
      temperature: 0.3,
      maxTokens: 4096,
      jsonMode: true,
      purpose: 'content'
    });

    console.log('[Quiz] Raw AI Response Length:', rawResponse?.length || 0);
    const quiz = parseQuizResponse(rawResponse, normalizedCount);
    console.log('[Quiz] Parsed Questions Count:', quiz?.length || 0);

    // Save quiz to MongoDB
    let quizId = null;
    try {
      const db = await connectToDatabase();
      const quizDoc = {
        sessionId: sessionId || null,
        classId: classId || null,
        title: title || `${subject || 'Quiz'} - ${new Date().toLocaleDateString()}`,
        questions: quiz,
        published: false,
        createdBy: req.user?.id || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection(COLLECTIONS.QUIZZES).insertOne(quizDoc);
      quizId = result.insertedId.toString();
    } catch (dbErr) {
      console.warn('[Quiz] Failed to save to database:', dbErr.message);
    }

    res.json({ quiz, subject, count: quiz.length, quizId, saved: !!quizId });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to generate quiz' });
  }
}

function parseQuizResponse(rawResponse, count) {
  let quiz = parseAIJson(rawResponse);
  
  // If AI returned an object with a property that is an array (e.g. { "quiz": [...] })
  if (!Array.isArray(quiz) && typeof quiz === 'object' && quiz !== null) {
    const arrayKey = Object.keys(quiz).find(key => Array.isArray(quiz[key]));
    if (arrayKey) {
      quiz = quiz[arrayKey];
    } else {
      // Maybe it's an object where values are the questions?
      const values = Object.values(quiz);
      if (values.length > 0 && values.every(v => v && typeof v === 'object' && v.question)) {
        quiz = values;
      }
    }
  }

  if (!Array.isArray(quiz) || quiz.length === 0) {
    throw new Error('AI did not return any quiz questions.');
  }

  const validQuestions = [];
  quiz.forEach((question, index) => {
    const options = Array.isArray(question.options) ? question.options.filter(Boolean).slice(0, 4) : [];
    
    if (!question.question || options.length < 2) {
      console.warn(`[Quiz] Malformed question at index ${index}:`, JSON.stringify(question).substring(0, 200));
      return; // Skip this one
    }

    let correctAnswer = question.correctAnswer;
    if (!options.includes(correctAnswer)) {
      correctAnswer = options[0];
    }

    validQuestions.push({
      id: question.id || `q${validQuestions.length + 1}`,
      question: question.question,
      options,
      correctAnswer,
      explanation: question.explanation || ''
    });
  });

  if (validQuestions.length === 0) {
    console.error('[Quiz] All generated questions were invalid. Raw:', rawResponse.substring(0, 500));
    throw new Error('AI returned invalid data format for all questions.');
  }

  return validQuestions.slice(0, count);
}

router.post('/generate', authMiddleware, handleQuizGeneration);
router.post('/', authMiddleware, handleQuizGeneration);

router.post('/publish-to-class', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { title, questions, classId, subject } = req.body;

    if (!classId || !questions) {
      return res.status(400).json({ error: 'classId and questions are required' });
    }

    const quiz = {
      classId: classId,
      questions,
      title: title || 'Class Quiz',
      subject: subject || 'General',
      published: true,
      publishedAt: new Date(),
      createdBy: req.user?.id || null,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(COLLECTIONS.QUIZZES).insertOne(quiz);

    res.status(201).json({ ok: true, quiz: { ...quiz, id: quiz._id.toString() } });
  } catch (error) {
    console.error('Publish to class error:', error);
    res.status(500).json({ error: 'Failed to publish quiz to class' });
  }
});

router.get('/available/:classId', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId } = req.params;

    const sessions = await db.collection(COLLECTIONS.CLASS_SESSIONS)
      .find({ classId }, { projection: { _id: 1, subjectId: 1, code: 1, sessionStatus: 1, expiry: 1 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    if (sessions.length === 0) {
      return res.json({ quizzes: [], total: 0 });
    }

    const sessionById = new Map(sessions.map((session) => [session._id.toString(), session]));
    const sessionIds = sessions.map((session) => session._id);

    const quizzes = await db.collection(COLLECTIONS.QUIZZES)
      .find({
        published: true,
        $or: [
          { classId },
          { sessionId: { $in: sessionIds } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const quizzesWithInfo = await Promise.all(quizzes.map(async (quiz) => {
      const session = sessionById.get(quiz.sessionId?.toString?.()) || null;
      const attempt = req.user?.id
        ? await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).findOne({
            quizId: quiz._id,
            studentId: req.user.id,
          })
        : null;

      return {
        id: quiz._id.toString(),
        sessionId: quiz.sessionId?.toString?.() || quiz.sessionId,
        title: quiz.title || 'Quiz',
        subject: session?.subjectId || null,
        sessionCode: session?.code || null,
        sessionStatus: session?.sessionStatus || null,
        questionCount: quiz.questions?.length || 0,
        questions: Array.isArray(quiz.questions) ? quiz.questions : [],
        createdAt: quiz.createdAt,
        alreadyAttempted: !!attempt,
        attemptScore: attempt?.score || null,
      };
    }));

    res.json({
      quizzes: quizzesWithInfo,
      total: quizzesWithInfo.length,
    });
  } catch (error) {
    console.error('Get available quizzes error:', error);
    res.status(500).json({ error: 'Failed to get available quizzes' });
  }
});

router.get('/:id/results', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id: quizId } = req.params;

    if (!ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quizObjectId = new ObjectId(quizId);
    const quiz = await db.collection(COLLECTIONS.QUIZZES).findOne({ _id: quizObjectId });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const attempts = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
      .find({ quizId: quizObjectId })
      .sort({ submittedAt: -1 })
      .toArray();

    const results = await Promise.all(attempts.map(async (attempt) => {
      const student = ObjectId.isValid(attempt.studentId)
        ? await db.collection(COLLECTIONS.USERS).findOne(
            { _id: new ObjectId(attempt.studentId) },
            { projection: { name: 1, email: 1 } }
          )
        : null;

      const timeTaken = attempt.submittedAt && attempt.createdAt
        ? Math.round((new Date(attempt.submittedAt) - new Date(attempt.createdAt)) / 1000)
        : null;

      return {
        attemptId: attempt._id?.toString() || attempt.id,
        studentId: attempt.studentId,
        studentName: student?.name || student?.email || 'Unknown',
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctCount: attempt.correctCount,
        percentage: attempt.score,
        submittedAt: attempt.submittedAt,
        timeTakenSeconds: timeTaken,
      };
    }));

    const summary = {
      totalAttempts: results.length,
      averageScore: results.length > 0
        ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
        : 0,
      highestScore: results.length > 0 ? Math.max(...results.map((result) => result.score)) : 0,
      lowestScore: results.length > 0 ? Math.min(...results.map((result) => result.score)) : 0,
      passRate: results.length > 0
        ? Math.round((results.filter((result) => result.score >= 60).length / results.length) * 100)
        : 0,
    };

    res.json({
      quiz: {
        id: quiz._id.toString(),
        title: quiz.title,
        questionCount: quiz.questions?.length || 0,
      },
      results,
      summary,
    });
  } catch (error) {
    console.error('Get quiz results error:', error);
    res.status(500).json({ error: 'Failed to get quiz results' });
  }
});

router.post('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid quiz id' });

    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.QUIZZES).updateOne(
      { _id: new ObjectId(id) },
      { $set: { published: true, publishedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ message: 'Quiz published successfully', published: true });
  } catch (error) {
    console.error('Publish quiz error:', error);
    res.status(500).json({ error: 'Failed to publish quiz' });
  }
});

router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { id: quizId } = req.params;
    const { answers } = req.body;

    if (!ObjectId.isValid(quizId)) return res.status(400).json({ error: 'Invalid quiz id' });
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'Answers array is required' });

    const db = await connectToDatabase();
    const quiz = await db.collection(COLLECTIONS.QUIZZES).findOne({ _id: new ObjectId(quizId) });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (!quiz.published) return res.status(403).json({ error: 'Quiz is not published yet' });

    const alreadyAttempt = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).findOne({
      quizId: new ObjectId(quizId),
      studentId: req.user.id,
    });
    if (alreadyAttempt) return res.status(400).json({ error: 'You have already submitted this quiz' });

    let correctCount = 0;
    answers.forEach((a) => {
      const question = quiz.questions[a.questionIndex];
      if (question && question.correctAnswer === a.selectedAnswer) correctCount++;
    });

    const totalQuestions = quiz.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const attemptDoc = {
      quizId: new ObjectId(quizId),
      studentId: req.user.id,
      answers,
      score,
      totalQuestions,
      correctCount,
      submittedAt: new Date(),
      createdAt: new Date(),
    };
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).insertOne(attemptDoc);

    const xpEarned = correctCount * 20;
    const student = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(req.user.id) });
    if (student) {
      const newXP = (student.xp || 0) + xpEarned;
      const newLevel = Math.floor(newXP / 100) + 1;
      const badges = [...(student.badges || [])];
      if (score === 100 && !badges.includes('perfect_score')) badges.push('perfect_score');
      await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: new ObjectId(req.user.id) },
        { $set: { xp: newXP, level: newLevel, badges, updatedAt: new Date() } }
      );
    }

    res.json({ score, totalQuestions, correctCount, xpEarned });
  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

export default router;
