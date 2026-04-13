/**
 * services/faceApiLoader.ts
 * Pre-loads face-api.js models for faster face recognition login
 */

let modelsLoaded = false;
let modelsLoading = false;
let loadPromise: Promise<void> | null = null;

const MODELS_PATH = '/models';

export async function preloadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoading) return loadPromise!;

  modelsLoading = true;
  loadPromise = loadModelsInternal();
  return loadPromise;
}

async function loadModelsInternal(): Promise<void> {
  try {
    const faceApi = await import('@vladmandic/face-api');

    // Load all required models in parallel
    await Promise.all([
      faceApi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
      faceApi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
      faceApi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
    ]);

    modelsLoaded = true;
    console.log('[FaceAPI] Models pre-loaded successfully');
  } catch (error) {
    console.warn('[FaceAPI] Failed to pre-load models:', error);
    throw error;
  } finally {
    modelsLoading = false;
  }
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export function getFaceApi() {
  return import('@vladmandic/face-api');
}

// Auto-preload on app startup if user has face login enabled
export function initFaceApiPreloader(): void {
  // Preload after app mount to not block critical path
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      preloadFaceApiModels().catch(() => {
        // Silent fail - will retry on actual login attempt
      });
    }, 2000);
  }
}
