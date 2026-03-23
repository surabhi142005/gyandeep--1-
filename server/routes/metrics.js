import express from 'express';
import { getMetrics, getContentType } from '../services/metrics.js';
import { recordRequest } from '../services/metrics.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const start = process.hrtime();
  
  try {
    res.set('Content-Type', getContentType());
    res.end(await getMetrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
  
  const [seconds, nanoseconds] = process.hrtime(start);
  const duration = seconds + nanoseconds / 1e9;
  recordRequest('GET', '/metrics', 200, duration);
});

export default router;
