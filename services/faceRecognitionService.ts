import { getFaceApi, preloadFaceApiModels } from './faceApiLoader';

export interface FaceDescriptorPayload {
  faceDescriptor: number[];
  detectionScore: number | null;
  descriptorModel: string;
}

const MIN_DESCRIPTOR_SCORE = 0.45;

export function formatFaceAuthError(error: unknown, action: 'register' | 'login' | 'verify' = 'verify'): string {
  const fallback =
    action === 'register'
      ? 'Face registration failed. Capture your face again and try once more.'
      : action === 'login'
        ? 'Face login failed. Try again or use email and password.'
        : 'Face verification failed. Capture your face again and try once more.';

  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();

  if (lower.includes('multiple faces')) {
    return 'Multiple faces detected. Ensure only one person is visible in the camera frame.';
  }
  if (lower.includes('no face detected') || lower.includes('no clear face detected')) {
    return 'No face detected. Center your face, remove glare, and use better lighting.';
  }
  if (lower.includes('models could not load') || lower.includes('/models')) {
    return 'Face ID models could not load from /models. Refresh the page. If this continues, ask an admin to verify the Vercel model files.';
  }
  if (lower.includes('quality too low') || lower.includes('lighting') || lower.includes('low confidence')) {
    return 'Face capture quality is too low. Move closer, face the camera directly, and improve lighting.';
  }
  if (lower.includes('descriptor')) {
    return 'Face capture failed before matching. Refresh the page and try the camera again.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Face service is unreachable right now. Check your network connection or backend deployment and try again.';
  }
  if (lower.includes('authentication required') || lower.includes('invalid token') || lower.includes('token expired')) {
    return 'Your session expired. Sign in again and retry Face ID.';
  }
  if (lower.includes('no registered face found')) {
    return 'No Face ID is registered for this account yet.';
  }
  if (lower.includes('face not matched')) {
    return 'Face did not match the registered profile. Look straight at the camera and try again.';
  }

  return message;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load captured face image.'));
    image.src = src;
  });
}

export async function buildFaceDescriptorPayload(imageDataUrl: string): Promise<FaceDescriptorPayload> {
  try {
    await preloadFaceApiModels();
  } catch {
    throw new Error('Face ID models could not load from /models.');
  }

  const faceApi = await getFaceApi();
  const image = await loadImage(imageDataUrl);

  const detections = await faceApi
    .detectAllFaces(image, new faceApi.SsdMobilenetv1Options({ minConfidence: MIN_DESCRIPTOR_SCORE }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!detections.length) {
    throw new Error('No face detected. Use good lighting and keep one face centered.');
  }

  if (detections.length > 1) {
    throw new Error('Multiple faces detected. Keep only one face in the frame.');
  }

  const detection = detections[0];
  const score = typeof detection.detection?.score === 'number' ? detection.detection.score : null;

  if (score != null && score < MIN_DESCRIPTOR_SCORE) {
    throw new Error('Face detected with low confidence. Improve lighting and keep your face centered.');
  }

  if (!detection?.descriptor) {
    throw new Error('No clear face detected. Use good lighting and keep one face centered.');
  }

  return {
    faceDescriptor: Array.from(detection.descriptor),
    detectionScore: score,
    descriptorModel: 'face-api-ssd-mobilenetv1',
  };
}
