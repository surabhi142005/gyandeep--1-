/**
 * server/routes/ai.js
 * AI-powered routes using unified AI service (Groq + Gemini)
 */

import express from 'express';
import Tesseract from 'tesseract.js';
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { callAI, callAIChat, callAIVision, parseAIJson, getAIStatus } from '../services/aiService.js';
import { optionalAuth, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Unified AI configuration
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

// ── TEST ENDPOINT ──────────────────────────────────────────────
// Verify AI service is working

router.get('/status', async (req, res) => {
  try {
    const status = getAIStatus();
    res.json({ ok: true, ...status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── CHAT ENDPOINT ──────────────────────────────────────────────

router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const {
      message,
      prompt,
      history,
      userName = 'Student',
      userRole = 'student',
      model
    } = req.body;

    const inputMessage = (message || prompt || '').trim();
    if (!inputMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('[Chat] Processing request:', { hasHistory: Array.isArray(history), historyLength: history?.length, model });

    const systemPrompt = `You are Gyandeep AI, a concise educational assistant for students and teachers.
Current user: ${userName} (${userRole}).
Answer clearly, accurately, and in a classroom-safe way.
Keep responses brief - 2 to 4 sentences unless explaining complex topics.`;

    const reply = await callAIChat(inputMessage, history || [], systemPrompt);

    res.json({ reply, text: reply, sources: [] });
  } catch (error) {
    console.error('[Chat] Error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Failed to process chat' });
  }
});

// ── QUIZ GENERATION ─────────────────────────────────────────────

async function handleQuizGeneration(req, res) {
  try {
    const { notesText, subject, count = 10, sessionId, classId, title } = req.body;
    const normalizedCount = Math.min(20, Math.max(1, Number(count) || 10));

    if (!notesText || !notesText.trim()) {
      return res.status(400).json({ error: 'Notes text is required' });
    }

    const quizPrompt = `Generate exactly ${normalizedCount} multiple choice quiz questions based on the following study content about ${subject || 'the topic'}.

Strict requirements:
- Return ONLY a JSON array
- No markdown
- No code fences
- Each question must include exactly 4 options
- correctAnswer must exactly match one of the options

JSON format:
[
  {
    "id": "q1",
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Short explanation"
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

    const quiz = parseQuizResponse(rawResponse, normalizedCount);

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
  const quiz = parseAIJson(rawResponse);
  if (!Array.isArray(quiz) || quiz.length === 0) {
    throw new Error('AI did not return any quiz questions.');
  }

  return quiz.slice(0, count).map((question, index) => {
    const options = Array.isArray(question.options) ? question.options.filter(Boolean).slice(0, 4) : [];
    if (!question.question || options.length < 2) {
      throw new Error(`AI returned invalid data for question ${index + 1}.`);
    }

    let correctAnswer = question.correctAnswer;
    if (!options.includes(correctAnswer)) {
      correctAnswer = options[0];
    }

    return {
      id: question.id || `q${index + 1}`,
      question: question.question,
      options,
      correctAnswer,
      explanation: question.explanation || ''
    };
  });
}

router.post('/quiz', authMiddleware, handleQuizGeneration);
router.post('/quiz/generate', authMiddleware, handleQuizGeneration);

// ── EMAIL GENERATION ──────────────────────────────────────────

router.post('/ai-email', authMiddleware, async (req, res) => {
  try {
    const { prompt, recipients, context } = req.body;

    if (!prompt || !recipients) {
      return res.status(400).json({ error: 'Prompt and recipients are required' });
    }

    const emailPrompt = `You are an AI assistant helping with email communication for Gyandeep educational platform.

Context: ${context || 'General communication'}
Recipients: ${Array.isArray(recipients) ? recipients.join(', ') : recipients}

Generate a professional email based on: ${prompt}

Format your response exactly as:
Subject: [your subject line here]
---
[your email body here]`;

    const reply = await callAI(emailPrompt, { temperature: 0.5, maxTokens: 1024, purpose: 'content' });
    const [subjectLine, ...bodyParts] = reply.split('---');

    res.json({
      ok: true,
      email: {
        subject: subjectLine.replace(/^Subject:\s*/i, '').trim() || `Communication from ${context || 'Gyandeep'}`,
        body: bodyParts.join('---').trim() || reply,
        recipients
      }
    });
  } catch (error) {
    console.error('AI email error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate email' });
  }
});

// ── GRADING ────────────────────────────────────────────────────

router.post('/grade', authMiddleware, async (req, res) => {
  try {
    const { questions, answers } = req.body;

    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Questions and answers arrays are required' });
    }

    const results = [];
    let totalScore = 0;
    let maxScore = 0;

    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];
      const studentAnswer = answers[index] || '';
      const questionMaxScore = question.maxScore || 10;
      maxScore += questionMaxScore;

      // MCQ grading is instant
      if (question.type === 'mcq') {
        const isCorrect =
          studentAnswer.toUpperCase().trim() === question.correctAnswer?.toUpperCase().trim() ||
          studentAnswer.trim() === question.correctAnswer?.trim();
        const score = isCorrect ? questionMaxScore : 0;
        totalScore += score;
        results.push({
          score,
          maxScore: questionMaxScore,
          feedback: isCorrect ? 'Correct!' : `Incorrect. Answer: ${question.correctAnswer}`,
          criteriaScores: [{
            criterion: 'Answer',
            score,
            maxScore: questionMaxScore,
            comment: isCorrect ? 'Correct selection.' : `Selected "${studentAnswer}"`
          }],
          overallComment: isCorrect ? 'Full marks.' : 'No marks.'
        });
        continue;
      }

      // Use AI for subjective grading
      const gradingPrompt = `You are an AI teacher grading a student's answer.

Question: ${question.question}
Correct Answer: ${question.correctAnswer || 'N/A'}
Student Answer: ${studentAnswer}
Max Score: ${questionMaxScore}

Respond ONLY with a JSON object:
{ "score": number, "feedback": "string", "comment": "string" }`;

      const response = await callAI(gradingPrompt, { temperature: 0.2, maxTokens: 512, jsonMode: true, purpose: 'content' });
      const parsed = parseAIJson(response);
      const score = Math.min(questionMaxScore, Math.max(0, parsed.score || 0));
      totalScore += score;
      results.push({
        score,
        maxScore: questionMaxScore,
        feedback: parsed.feedback || 'Graded by AI.',
        criteriaScores: [{
          criterion: 'Quality',
          score,
          maxScore: questionMaxScore,
          comment: parsed.comment || ''
        }],
        overallComment: parsed.feedback || ''
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    let overallFeedback = 'Significant review needed.';
    if (percentage >= 90) overallFeedback = 'Excellent work!';
    else if (percentage >= 75) overallFeedback = 'Good job!';
    else if (percentage >= 60) overallFeedback = 'Passed. Review missed topics.';
    else if (percentage >= 40) overallFeedback = 'Needs improvement.';

    res.json({ totalScore, maxScore, results, overallFeedback });
  } catch (error) {
    console.error('Grading error:', error);
    res.status(500).json({ error: error.message || 'Failed to grade submission' });
  }
});

// ── OCR - Text extraction from images ──────────────────────────

router.post('/extract-text', authMiddleware, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    // Primary: Tesseract.js (free, no API key needed)
    let text = '';
    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const { data: { text: extracted } } = await Tesseract.recognize(cleanBase64, 'eng');
      text = extracted.trim();
    } catch (tesseractError) {
      console.warn('[OCR] Tesseract.js failed:', tesseractError.message);
    }

    // Fallback: Gemini vision if Tesseract returned nothing
    if (!text) {
      try {
        text = await callAIVision(
          'Extract all readable text from this image. Preserve structure when possible.',
          imageBase64
        );
      } catch (visionError) {
        console.error('[OCR] Vision extraction failed:', visionError.message);
        throw new Error(`OCR extraction failed: ${visionError.message}`);
      }
    }

    if (!text) {
      return res.status(502).json({ error: 'OCR extraction failed: no text found' });
    }

    res.json({ text, success: true, provider: text ? 'tesseract' : 'gemini' });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract text from image' });
  }
});

// ── SUMMARIZATION ───────────────────────────────────────────────

router.post('/summarize', authMiddleware, async (req, res) => {
  try {
    const { text, subject, mode = 'bullets' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const modeInstructions = {
      bullets: 'Format as bullet points with key takeaways.',
      paragraph: 'Write a coherent summary paragraph.',
      flashcards: 'Create flashcards with question-answer pairs.'
    };

    const result = await callAI(
      `Summarize the following notes about ${subject || 'the topic'}:

${text.slice(0, 8000)}

${modeInstructions[mode] || modeInstructions.bullets}

Keep the summary concise and educational.`,
      { temperature: 0.5, maxTokens: 2048, purpose: 'content' }
    );

    res.json({ result, success: true });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize notes' });
  }
});

export default router;