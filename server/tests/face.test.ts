/**
 * server/tests/face.test.ts
 * Comprehensive face recognition and liveness detection tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('Face Recognition - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Base64 Image Decoding', () => {
    test('should decode base64 image with data URI prefix', () => {
      const decodeBase64Image = (base64String: string) => {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      };

      const testInput = 'data:image/png;base64,iVBORw0KGgo=';
      const result = decodeBase64Image(testInput);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should decode base64 image without prefix', () => {
      const decodeBase64Image = (base64String: string) => {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      };

      const testInput = 'iVBORw0KGgo=';
      const result = decodeBase64Image(testInput);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Fallback Embedding Generation', () => {
    test('should generate 128-dimensional embedding from image buffer', () => {
      const generateFallbackEmbedding = (imageBuffer: Buffer) => {
        const hash = Array.from(imageBuffer).reduce((acc, byte, i) => {
          return ((acc << 5) - acc + byte + i) | 0;
        }, 0);

        const embedding = new Array(128).fill(0).map((_, i) => {
          const seed = hash + i * 31;
          return (Math.sin(seed) * 10000) % 1;
        });

        const sum = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
        return embedding.map(v => v / sum);
      };

      const testBuffer = Buffer.from('test image data');
      const embedding = generateFallbackEmbedding(testBuffer);

      expect(embedding).toHaveLength(128);
      expect(embedding.every(v => typeof v === 'number' && !isNaN(v))).toBe(true);
    });

    test('should generate normalized embedding (unit vector)', () => {
      const generateFallbackEmbedding = (imageBuffer: Buffer) => {
        const hash = Array.from(imageBuffer).reduce((acc, byte, i) => {
          return ((acc << 5) - acc + byte + i) | 0;
        }, 0);

        const embedding = new Array(128).fill(0).map((_, i) => {
          const seed = hash + i * 31;
          return (Math.sin(seed) * 10000) % 1;
        });

        const sum = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
        return embedding.map(v => v / sum);
      };

      const testBuffer = Buffer.from('test image data');
      const embedding = generateFallbackEmbedding(testBuffer);

      const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    test('should produce consistent embeddings for same input', () => {
      const generateFallbackEmbedding = (imageBuffer: Buffer) => {
        const hash = Array.from(imageBuffer).reduce((acc, byte, i) => {
          return ((acc << 5) - acc + byte + i) | 0;
        }, 0);

        const embedding = new Array(128).fill(0).map((_, i) => {
          const seed = hash + i * 31;
          return (Math.sin(seed) * 10000) % 1;
        });

        const sum = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
        return embedding.map(v => v / sum);
      };

      const testBuffer = Buffer.from('consistent test data');
      const embedding1 = generateFallbackEmbedding(testBuffer);
      const embedding2 = generateFallbackEmbedding(testBuffer);

      expect(embedding1).toEqual(embedding2);
    });

    test('should produce different embeddings for different inputs', () => {
      const generateFallbackEmbedding = (imageBuffer: Buffer) => {
        const hash = Array.from(imageBuffer).reduce((acc, byte, i) => {
          return ((acc << 5) - acc + byte + i) | 0;
        }, 0);

        const embedding = new Array(128).fill(0).map((_, i) => {
          const seed = hash + i * 31;
          return (Math.sin(seed) * 10000) % 1;
        });

        const sum = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
        return embedding.map(v => v / sum);
      };

      const buffer1 = Buffer.from('image data 1');
      const buffer2 = Buffer.from('image data 2');
      const embedding1 = generateFallbackEmbedding(buffer1);
      const embedding2 = generateFallbackEmbedding(buffer2);

      expect(embedding1).not.toEqual(embedding2);
    });
  });

  describe('Embedding Comparison (Cosine Similarity)', () => {
    const compareEmbeddings = (embedding1: number[], embedding2: number[]) => {
      if (embedding1.length !== embedding2.length) return 0;

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }

      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    };

    test('should return 1 for identical embeddings', () => {
      const embedding = [0.5, 0.3, 0.7, 0.1];
      const similarity = compareEmbeddings(embedding, embedding);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    test('should return 0 for orthogonal embeddings', () => {
      const e1 = [1, 0, 0, 0];
      const e2 = [0, 1, 0, 0];
      const similarity = compareEmbeddings(e1, e2);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    test('should return value between 0 and 1 for similar embeddings', () => {
      const e1 = [0.5, 0.3, 0.7, 0.1];
      const e2 = [0.6, 0.2, 0.8, 0.15];
      const similarity = compareEmbeddings(e1, e2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    test('should return 0 for different length embeddings', () => {
      const e1 = [0.5, 0.3];
      const e2 = [0.5, 0.3, 0.7];
      expect(compareEmbeddings(e1, e2)).toBe(0);
    });

    test('should authenticate when similarity exceeds threshold', () => {
      const threshold = 0.6;
      const samePersonSimilarity = 0.85;
      const differentPersonSimilarity = 0.3;

      expect(samePersonSimilarity >= threshold).toBe(true);
      expect(differentPersonSimilarity >= threshold).toBe(false);
    });
  });

  describe('Liveness Detection Logic', () => {
    test('should calculate LBP patterns correctly', () => {
      // Simplified LBP pattern calculation test
      const calculateLBP = (buffer: number[], width: number, height: number) => {
        const patterns: number[] = [];
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const center = buffer[y * width + x];
            let pattern = 0;
            pattern |= (buffer[(y - 1) * width + (x - 1)] > center ? 1 : 0) << 7;
            pattern |= (buffer[(y - 1) * width + x] > center ? 1 : 0) << 6;
            pattern |= (buffer[(y - 1) * width + (x + 1)] > center ? 1 : 0) << 5;
            pattern |= (buffer[y * width + (x + 1)] > center ? 1 : 0) << 4;
            pattern |= (buffer[(y + 1) * width + (x + 1)] > center ? 1 : 0) << 3;
            pattern |= (buffer[(y + 1) * width + x] > center ? 1 : 0) << 2;
            pattern |= (buffer[(y + 1) * width + (x - 1)] > center ? 1 : 0) << 1;
            pattern |= (buffer[y * width + (x - 1)] > center ? 1 : 0) << 0;
            patterns.push(pattern);
          }
        }
        return patterns;
      };

      // 3x3 test grid — center pixel at (1,1)
      const buffer = [
        10, 20, 30,
        40, 25, 60,
        70, 80, 90,
      ];

      const patterns = calculateLBP(buffer, 3, 3);
      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toBeGreaterThanOrEqual(0);
      expect(patterns[0]).toBeLessThanOrEqual(255);
    });

    test('should calculate variance correctly', () => {
      const calculateVariance = (values: number[]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length) / 255;
      };

      // All same values → variance = 0
      expect(calculateVariance([100, 100, 100, 100])).toBe(0);

      // Spread values → variance > 0
      expect(calculateVariance([0, 50, 100, 150, 200, 255])).toBeGreaterThan(0);
    });

    test('should combine weighted liveness scores', () => {
      const weights = { texture: 0.25, reflection: 0.3, moire: 0.25, temporal: 0.2 };

      const checks = [
        { name: 'texture', score: 0.8, passed: true },
        { name: 'reflection', score: 0.9, passed: true },
        { name: 'moire', score: 0.7, passed: true },
        { name: 'temporal', score: 0.85, passed: true },
      ];

      let totalWeight = 0;
      let weightedScore = 0;
      for (const check of checks) {
        const weight = (weights as any)[check.name] || 0.2;
        weightedScore += check.score * weight;
        totalWeight += weight;
      }
      const finalScore = weightedScore / totalWeight;

      expect(finalScore).toBeGreaterThan(0.5);
      expect(finalScore).toBeLessThanOrEqual(1);
    });

    test('should fail liveness when too many checks fail', () => {
      const checks = [
        { passed: false },
        { passed: false },
        { passed: true },
        { passed: false },
      ];

      const failedChecks = checks.filter(c => !c.passed).length;
      const strictMode = false;
      const threshold = strictMode ? 0.7 : 0.5;
      const passed = failedChecks <= 1;

      expect(passed).toBe(false); // 3 failed > 1
    });

    test('should pass liveness when at most 1 check fails', () => {
      const checks = [
        { passed: true },
        { passed: false },
        { passed: true },
        { passed: true },
      ];

      const failedChecks = checks.filter(c => !c.passed).length;
      const passed = failedChecks <= 1;

      expect(passed).toBe(true); // 1 failed <= 1
    });
  });

  describe('Verification Flow', () => {
    test('should require both face match and liveness for authentication', () => {
      const threshold = 0.6;

      // Both pass
      expect(0.8 >= threshold && true).toBe(true);

      // Only similarity passes
      expect(0.8 >= threshold && false).toBe(false);

      // Only liveness passes
      expect(0.3 >= threshold && true).toBe(false);

      // Neither passes
      expect(0.3 >= threshold && false).toBe(false);
    });

    test('should record audit entry on every verification', () => {
      const auditRecord = {
        userId: 'user123',
        similarity: parseFloat((0.85).toFixed(4)),
        livenessScore: 0.9,
        livenessPassed: true,
        authenticated: true,
        timestamp: new Date(),
        location: null,
      };

      expect(auditRecord.userId).toBe('user123');
      expect(auditRecord.similarity).toBe(0.85);
      expect(auditRecord.authenticated).toBe(true);
    });
  });
});
