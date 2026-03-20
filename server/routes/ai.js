/**
 * server/routes/ai.js
 * AI-powered routes
 */

import express from 'express';
const router = express.Router();

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

    const generatedEmail = {
      subject: `Communication from ${context || 'Gyandeep'}`,
      body: `Generated email based on: ${prompt}\n\nThis is a placeholder. Configure GEMINI_API_KEY for actual AI generation.`,
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

    res.json({ 
      reply: `I received your message: "${message}". AI chat requires proper configuration with Gemini API.`
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

export default router;
