/**
 * server/routes/ai.js
 * AI-powered routes using Gemini API
 */

import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash';

async function callGemini(prompt, history = [], apiKey) {
  const contents = [
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const response = await fetch(
    `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

router.post('/ai-email', async (req, res) => {
  try {
    const { prompt, recipients, context } = req.body;
    
    if (!prompt || !recipients) {
      return res.status(400).json({ error: 'Prompt and recipients are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(501).json({ 
        error: 'AI not configured',
        message: 'Set GEMINI_API_KEY environment variable for AI email generation'
      });
    }

    const emailPrompt = `You are an AI assistant helping with email communication for Gyandeep educational platform.

Context: ${context || 'General communication'}
Recipients: ${recipients.join(', ')}

Generate a professional email based on: ${prompt}

Format your response as:
Subject: [your subject line here]
---
[your email body here]`;

    const reply = await callGemini(emailPrompt, [], process.env.GEMINI_API_KEY);
    const [subjectLine, ...bodyParts] = reply.split('---');
    
    const generatedEmail = {
      subject: subjectLine.replace(/^Subject:\s*/i, '').trim() || `Communication from ${context || 'Gyandeep'}`,
      body: bodyParts.join('---').trim() || reply,
      recipients,
    };

    res.json({ ok: true, email: generatedEmail });
  } catch (error) {
    console.error('AI email error:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        reply: 'AI chat requires GEMINI_API_KEY to be configured. Please set this environment variable.'
      });
    }

    const systemPrompt = `You are GyanDeep AI, a helpful educational assistant for a classroom management platform. You help students and teachers with:
- Answering questions about various subjects
- Explaining complex concepts
- Helping with study strategies
- Providing homework assistance
- Supporting classroom activities

Be friendly, encouraging, and educational in your responses.`;
    
    const chatHistory = [
      { role: 'user', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message },
    ];

    const reply = await callGemini(message, chatHistory.slice(0, -1), process.env.GEMINI_API_KEY);

    res.json({ 
      reply,
      sources: [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

router.post('/quiz/generate', async (req, res) => {
  try {
    const { notesText, subject, enableThinkingMode } = req.body;
    
    if (!notesText) {
      return res.status(400).json({ error: 'Notes text is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        quiz: generateMockQuiz(subject || 'General'),
        message: 'Using demo quiz (set GEMINI_API_KEY for AI generation)',
      });
    }

    const quizPrompt = `Generate 5 multiple choice quiz questions based on the following content about ${subject || 'the topic'}:

${notesText.slice(0, 3000)}

Format as JSON array:
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Brief explanation"
  }
]`;

    const response = await callGemini(quizPrompt, [], process.env.GEMINI_API_KEY);
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let quiz = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(quiz)) {
          quiz = [];
        }
        if (quiz.length > 5) {
          quiz = quiz.slice(0, 5);
        }
        return res.json({ quiz, subject });
      }
    } catch (parseError) {
      console.error('Failed to parse quiz JSON:', parseError);
    }

    res.json({ quiz: generateMockQuiz(subject || 'General'), subject });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

function generateMockQuiz(subject) {
  return [
    { id: 'q1', question: `Sample question 1 about ${subject}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'Demo explanation' },
    { id: 'q2', question: `Sample question 2 about ${subject}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', explanation: 'Demo explanation' },
    { id: 'q3', question: `Sample question 3 about ${subject}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 'C', explanation: 'Demo explanation' },
  ];
}

router.post('/grade', async (req, res) => {
  try {
    const { questions, answers } = req.body;

    if (!questions || !answers || !Array.isArray(questions) || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Questions and answers arrays are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        totalScore: 0,
        maxScore: questions.reduce((s, q) => s + (q.maxScore || 10), 0),
        results: questions.map((q, i) => ({
          score: 0,
          maxScore: q.maxScore || 10,
          feedback: 'AI grading not configured. Manual review required.',
          criteriaScores: [],
          overallComment: 'Please review manually.',
        })),
        overallFeedback: 'AI grading unavailable. Please review submissions manually.',
      });
    }

    const results = [];
    let totalScore = 0;
    let maxScore = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const studentAnswer = answers[i] || '';
      const qMaxScore = q.maxScore || 10;
      maxScore += qMaxScore;

      if (q.type === 'mcq') {
        const isCorrect = studentAnswer.toUpperCase().trim() === q.correctAnswer?.toUpperCase().trim();
        const score = isCorrect ? qMaxScore : 0;
        totalScore += score;
        results.push({
          score,
          maxScore: qMaxScore,
          feedback: isCorrect ? 'Correct!' : `Incorrect. Answer: ${q.correctAnswer}`,
          criteriaScores: [{
            criterion: 'Answer',
            score,
            maxScore: qMaxScore,
            comment: isCorrect ? 'Correct selection.' : `Selected "${studentAnswer}"`,
          }],
          overallComment: isCorrect ? 'Full marks.' : 'No marks.',
        });
      } else {
        const gradingPrompt = `Grade this answer:

Question: ${q.question}
Correct Answer: ${q.correctAnswer || 'N/A'}
Student Answer: ${studentAnswer}
Max Score: ${qMaxScore}

Respond with JSON: { "score": number, "feedback": "string", "comment": "string" }`;

        try {
          const response = await callGemini(gradingPrompt, [], process.env.GEMINI_API_KEY);
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const score = Math.min(qMaxScore, Math.max(0, parsed.score || 0));
            totalScore += score;
            results.push({
              score,
              maxScore: qMaxScore,
              feedback: parsed.feedback || 'Graded by AI.',
              criteriaScores: [{
                criterion: 'Quality',
                score,
                maxScore: qMaxScore,
                comment: parsed.comment || '',
              }],
              overallComment: parsed.feedback || '',
            });
          } else {
            results.push({
              score: Math.round(qMaxScore * 0.5),
              maxScore: qMaxScore,
              feedback: 'Could not parse AI response.',
              criteriaScores: [],
              overallComment: 'Manual review recommended.',
            });
            totalScore += Math.round(qMaxScore * 0.5);
          }
        } catch {
          results.push({
            score: Math.round(qMaxScore * 0.5),
            maxScore: qMaxScore,
            feedback: 'Grading failed. Partial credit assigned.',
            criteriaScores: [],
            overallComment: 'Please review manually.',
          });
          totalScore += Math.round(qMaxScore * 0.5);
        }
      }
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    let overallFeedback = '';
    if (percentage >= 90) overallFeedback = 'Excellent work!';
    else if (percentage >= 75) overallFeedback = 'Good job!';
    else if (percentage >= 60) overallFeedback = 'Passed. Review missed topics.';
    else if (percentage >= 40) overallFeedback = 'Needs improvement.';
    else overallFeedback = 'Significant review needed.';

    res.json({ totalScore, maxScore, results, overallFeedback });
  } catch (error) {
    console.error('Grading error:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

router.post('/extract-text', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(501).json({
        error: 'AI not configured',
        message: 'Set GEMINI_API_KEY for OCR functionality',
      });
    }

    const prompt = 'Extract all text from this image. Preserve structure. If no readable text, describe what you see.';

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.json({ text, success: true });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'Failed to extract text from image' });
  }
});

router.post('/summarize', async (req, res) => {
  try {
    const { text, subject, mode = 'bullets' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      const summarized = text.split('\n').slice(0, 5).join('\n');
      return res.json({ 
        result: summarized || 'Configure GEMINI_API_KEY for AI summarization',
        message: 'Demo mode - set GEMINI_API_KEY for full AI summarization'
      });
    }

    const modeInstructions = {
      bullets: 'Format as bullet points with key takeaways.',
      paragraph: 'Write a coherent summary paragraph.',
      flashcards: 'Create flashcards with question-answer pairs.',
    };

    const prompt = `Summarize the following notes about ${subject || 'the topic'}:

${text.slice(0, 5000)}

${modeInstructions[mode] || modeInstructions.bullets}

Keep the summary concise and educational.`;

    const response = await fetch(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.json({ result, success: true });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize notes' });
  }
});

export default router;
