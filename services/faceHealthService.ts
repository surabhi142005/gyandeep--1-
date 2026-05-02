import { FACE_MODELS_PATH, FACE_REQUIRED_FILES } from './faceApiLoader';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface FaceModelAssetStatus {
  path: string;
  ok: boolean;
  status: number | null;
}

export interface FaceBackendHealth {
  ok: boolean;
  verifier: {
    mode: string;
    descriptorLength: number;
    matchThreshold: number;
    minDetectionScore: number;
    embeddingVersion: string;
  };
  frontendModels: {
    basePath: string;
    requiredFiles: readonly string[];
  };
  timestamp: string;
}

export interface FaceSystemHealthReport {
  backend: FaceBackendHealth;
  modelAssets: FaceModelAssetStatus[];
  frontendReady: boolean;
  overallReady: boolean;
}

async function checkModelAsset(path: string): Promise<FaceModelAssetStatus> {
  try {
    const response = await fetch(path, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    return { path, ok: response.ok, status: response.status };
  } catch {
    return { path, ok: false, status: null };
  }
}

export async function fetchFaceSystemHealth(): Promise<FaceSystemHealthReport> {
  const backendResponse = await fetch(`${API_BASE}/api/face/health`, {
    credentials: 'include',
  });
  const backend = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    throw new Error(backend?.error || 'Failed to load face system health.');
  }

  const modelAssets = await Promise.all(
    FACE_REQUIRED_FILES.map((file) => checkModelAsset(`${FACE_MODELS_PATH}/${file}`))
  );
  const frontendReady = modelAssets.every((asset) => asset.ok);

  return {
    backend,
    modelAssets,
    frontendReady,
    overallReady: backend.ok === true && frontendReady,
  };
}
