/**
 * hooks/useImageCompression.ts
 *
 * Wraps public/workers/imageWorker.js for off-main-thread webcam image compression.
 */

import { useRef, useEffect, useCallback, useState } from 'react';

interface CompressOptions {
  dataUrl: string;
  width?: number;
  height?: number;
  quality?: number;
}

interface CompressResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  fallback?: boolean;
}

export function useImageCompression() {
  const workerRef = useRef<Worker | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Map of pending promise handlers keyed by a request id
  const pendingRef = useRef<Map<number, { resolve: (r: CompressResult) => void; reject: (e: Error) => void }>>(new Map());
  const nextId = useRef(0);

  useEffect(() => {
    const worker = new Worker('/workers/imageWorker.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload, id } = e.data;
      const pending = pendingRef.current.get(id);
      if (!pending) return;
      pendingRef.current.delete(id);

      if (type === 'COMPRESSED') {
        setIsCompressing(false);
        pending.resolve(payload as CompressResult);
      } else if (type === 'ERROR') {
        setIsCompressing(false);
        pending.reject(new Error(payload.message));
      }
    };

    worker.onerror = (e) => {
      setIsCompressing(false);
      pendingRef.current.forEach(({ reject }) => reject(new Error(e.message || 'Worker error')));
      pendingRef.current.clear();
    };

    return () => worker.terminate();
  }, []);

  const compress = useCallback(
    (opts: CompressOptions): Promise<CompressResult> => {
      if (!workerRef.current) return Promise.reject(new Error('Worker not ready'));

      const id = nextId.current++;
      setIsCompressing(true);

      return new Promise((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        workerRef.current!.postMessage({ type: 'COMPRESS', id, payload: opts });
      });
    },
    [],
  );

  return { compress, isCompressing };
}
