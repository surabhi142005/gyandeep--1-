/**
 * @vladmandic/face-api configuration and utilities
 */

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  try {
    const faceapi = await import('@vladmandic/face-api');
    const MODEL_URL = '/models';

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face recognition models loaded successfully');
  } catch (error) {
    console.error('Failed to load face recognition models:', error);
    throw error;
  }
}

export async function isModelLoaded(): Promise<boolean> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }
  return modelsLoaded;
}

export async function detectFace(
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<any[]> {
  const faceapi: any = await import('@vladmandic/face-api');
  await isModelLoaded();
  
  const detections = await faceapi.detectAllFaces(
    image,
    new faceapi.TinyFaceDetector({ inputSize: 320, scoreThreshold: 0.5 })
  );
  
  return detections;
}

export function canvasToBase64(canvas: HTMLCanvasElement, quality = 0.8): string {
  return canvas.toDataURL('image/jpeg', quality);
}

export function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

export function videoToCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  return canvas;
}

export async function captureFaceFromVideo(video: HTMLVideoElement): Promise<string> {
  const canvas = videoToCanvas(video);
  return canvasToBase64(canvas);
}

export async function computeDescriptor(
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array> {
  await import('@vladmandic/face-api');
  await isModelLoaded();
  
  const detections = await detectFace(image);
  
  if (detections.length === 0) {
    throw new Error('No face detected in image');
  }
  
  if (detections.length > 1) {
    throw new Error('Multiple faces detected. Please use an image with a single face.');
  }
  
  return detections[0].descriptor;
}

export async function compareDescriptors(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): Promise<{ match: boolean; distance: number; confidence: number }> {
  const faceapi = await import('@vladmandic/face-api');
  
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  const matchThreshold = 0.6;
  const match = distance < matchThreshold;
  const confidence = 1 - distance;
  
  return { match, distance, confidence };
}

export async function captureAndDescribe(
  video: HTMLVideoElement
): Promise<{ descriptor: Float32Array; base64: string }> {
  const base64 = await captureFaceFromVideo(video);
  const img = await base64ToImage(base64);
  const descriptor = await computeDescriptor(img);
  
  return { descriptor, base64 };
}

export async function verifyFaceMatch(
  storedDescriptor: Float32Array,
  newImageBase64: string
): Promise<{ match: boolean; confidence: number }> {
  const img = await base64ToImage(newImageBase64);
  const newDescriptor = await computeDescriptor(img);
  const result = await compareDescriptors(storedDescriptor, newDescriptor);
  return { match: result.match, confidence: result.confidence };
}

export default {
  loadFaceModels,
  isModelLoaded,
  detectFace,
  compareDescriptors,
  computeDescriptor,
  captureFaceFromVideo,
  captureAndDescribe,
  verifyFaceMatch,
};
