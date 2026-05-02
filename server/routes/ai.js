/**
 * server/routes/ai.js
 * AI-powered routes using Google Gemini API
 */

import express from 'express';

const router = express.Router();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || '';
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim() || '';
}

function buildAiError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .map((item) => ({
      role: item?.role === 'user' ? 'user' : 'model',
      text: item?.content || item?.text || '',
    }))
    .filter((item) => item.text.trim().length > 0)
    .slice(-10);
}

async function callGemini({
  prompt,
  history = [],
  model = DEFAULT_MODEL,
  temperature = 0.7,
  maxTokens = 2048,
  inlineData = null,
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw buildAiError('GEMINI_API_KEY is not configured on the backend.', 503);
  }

  const contents = [
    ...normalizeHistory(history).map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    })),
    {
      role: 'user',
      parts: inlineData
        ? [{ text: prompt }, inlineData]
        : [{ text: prompt }],
    },
  ];

  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 40,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Gemini API request failed with status ${response.status}`;
    throw buildAiError(message, response.status === 429 ? 429 : 502);
  }

  const data = await response.json();
  return extractGeminiText(data);
}

function parseQuizResponse(rawResponse, count) {
  const cleaned = rawResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw buildAiError('AI returned an unexpected quiz format.', 502);
  }

  let quiz = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(quiz) || quiz.length === 0) {
    throw buildAiError('AI did not return any quiz questions.', 502);
  }

  quiz = quiz.slice(0, count).map((question, index) => {
    const options = Array.isArray(question.options) ? question.options.filter(Boolean).slice(0, 4) : [];
    if (!question.question || options.length < 2) {
      throw buildAiError(`AI returned invalid data for question ${index + 1}.`, 502);
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
      explanation: question.explanation || '',
    };
  });

  return quiz;
}

router.post('/ai-email', async (req, res) => {
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

    const reply = await callGemini({ prompt: emailPrompt, temperature: 0.5 });
    const [subjectLine, ...bodyParts] = reply.split('---');

    res.json({
      ok: true,
      email: {
        subject: subjectLine.replace(/^Subject:\s*/i, '').trim() || `Communication from ${context || 'Gyandeep'}`,
        body: bodyParts.join('---').trim() || reply,
        recipients,
      },
    });
  } catch (error) {
    console.error('AI email error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to generate email' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message, prompt, history, userName = 'Student', userRole = 'student', model } = req.body;
    const inputMessage = (message || prompt || '').trim();

    if (!inputMessage) {
      return res.status(400).json({ error: 'Message or prompt is required' });
    }

    const chatPrompt = `You are Gyandeep AI, a concise educational assistant for students and teachers.
Current user: ${userName} (${userRole}).
Answer clearly, accurately, and in a classroom-safe way.

User message:
${inputMessage}`;

    const reply = await callGemini({
      prompt: chatPrompt,
      history,
      model: model === 'smart' ? DEFAULT_MODEL : DEFAULT_MODEL,
      temperature: model === 'smart' ? 0.5 : 0.7,
      maxTokens: 1024,
    });

    res.json({
      reply,
      text: reply,
      sources: [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to process chat' });
  }
});

async function handleQuizGeneration(req, res) {
  try {
    const { notesText, subject, count = 10 } = req.body;
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

    const rawResponse = await callGemini({
      prompt: quizPrompt,
      temperature: 0.3,
      maxTokens: 4096,
    });

    const quiz = parseQuizResponse(rawResponse, normalizedCount);
    res.json({ quiz, subject, count: quiz.length });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to generate quiz' });
  }
}

router.post('/quiz', handleQuizGeneration);
router.post('/quiz/generate', handleQuizGeneration);

router.post('/grade', async (req, res) => {
  try {
    const { questions, answers } = req.body;

    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Questions and answers arrays are required' });
    }

    const results = [];
    let totalScore = 0;
    let maxScore = 0;

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const studentAnswer = answers[index] || '';
      const questionMaxScore = question.maxScore || 10;
      maxScore += questionMaxScore;

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
            comment: isCorrect ? 'Correct selection.' : `Selected "${studentAnswer}"`,
          }],
          overallComment: isCorrect ? 'Full marks.' : 'No marks.',
        });
        continue;
      }

      const gradingPrompt = `You are an AI teacher grading a student's answer.

Question: ${question.question}
Correct Answer: ${question.correctAnswer || 'N/A'}
Student Answer: ${studentAnswer}
Max Score: ${questionMaxScore}

Respond ONLY with a JSON object:
{ "score": number, "feedback": "string", "comment": "string" }`;

      const response = await callGemini({
        prompt: gradingPrompt,
        temperature: 0.2,
        maxTokens: 512,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw buildAiError('Could not parse grading response.', 502);
      }

      const parsed = JSON.parse(jsonMatch[0]);
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
          comment: parsed.comment || '',
        }],
        overallComment: parsed.feedback || '',
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
    res.status(error.status || 500).json({ error: error.message || 'Failed to grade submission' });
  }
});

router.post('/extract-text', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    const text = await callGemini({
      prompt: 'Extract all readable text from this image. Preserve structure when possible.',
      temperature: 0.1,
      maxTokens: 2048,
      inlineData: {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      },
    });

    res.json({ text, success: true });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to extract text from image' });
  }
});

router.post('/summarize', async (req, res) => {
  try {
    const { text, subject, mode = 'bullets' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const modeInstructions = {
      bullets: 'Format as bullet points with key takeaways.',
      paragraph: 'Write a coherent summary paragraph.',
      flashcards: 'Create flashcards with question-answer pairs.',
    };

    const result = await callGemini({
      prompt: `Summarize the following notes about ${subject || 'the topic'}:

${text.slice(0, 8000)}

${modeInstructions[mode] || modeInstructions.bullets}

Keep the summary concise and educational.`,
      temperature: 0.5,
      maxTokens: 2048,
    });

    res.json({ result, success: true });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to summarize notes' });
  }
});

export default router;
