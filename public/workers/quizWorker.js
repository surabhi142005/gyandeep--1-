/**
 * public/workers/quizWorker.js
 * Web Worker — runs quiz generation & notes summarization off the main thread
 * so the UI never freezes.
 *
 * Messages IN:
 *   { type: 'GENERATE_QUIZ', payload: { notesText, subject, token, apiBase } }
 *   { type: 'SUMMARIZE',     payload: { text, subject, mode, token, apiBase } }
 *
 * Messages OUT:
 *   { type: 'QUIZ_RESULT',   payload: { quiz, fromCache } }
 *   { type: 'SUMMARY_RESULT',payload: { result } }
 *   { type: 'PROGRESS',      payload: { message } }
 *   { type: 'ERROR',         payload: { message } }
 */

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  const post = (t, p) => self.postMessage({ type: t, payload: p });

  try {
    if (type === 'GENERATE_QUIZ') {
      const { notesText, subject, token, apiBase = '' } = payload;
      post('PROGRESS', { message: 'Sending notes to AI...' });

      const res = await fetch(`${apiBase}/api/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notesText, subject }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      post('PROGRESS', { message: 'Parsing quiz...' });
      const data = await res.json();
      post('QUIZ_RESULT', { quiz: data.quiz, fromCache: data.fromCache || false });
    }

    else if (type === 'SUMMARIZE') {
      const { text, subject, mode = 'bullets', token, apiBase = '' } = payload;
      post('PROGRESS', { message: 'Summarizing notes...' });

      const res = await fetch(`${apiBase}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, subject, mode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const result = await res.json();
      post('SUMMARY_RESULT', { result });
    }

    else {
      post('ERROR', { message: `Unknown worker message type: ${type}` });
    }
  } catch (err) {
    post('ERROR', { message: err.message || 'Worker error' });
  }
};
