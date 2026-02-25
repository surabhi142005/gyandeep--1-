/**
 * public/workers/imageWorker.js
 * Web Worker — compresses webcam images off the main thread.
 * Converts raw base64 to a 300×300 JPEG at ~70% quality using OffscreenCanvas.
 *
 * Messages IN:
 *   { type: 'COMPRESS', payload: { dataUrl, width?, height?, quality? } }
 *
 * Messages OUT:
 *   { type: 'COMPRESSED', payload: { dataUrl, originalSize, compressedSize } }
 *   { type: 'ERROR',      payload: { message } }
 */

self.onmessage = async (e) => {
  const { type, payload, id } = e.data;

  if (type !== 'COMPRESS') {
    self.postMessage({ type: 'ERROR', payload: { message: 'Unknown type' } });
    return;
  }

  try {
    const { dataUrl, width = 300, height = 300, quality = 0.72 } = payload;
    const originalSize = Math.round(dataUrl.length * 0.75); // approx bytes

    // Decode base64 → ArrayBuffer → Blob → ImageBitmap
    const base64 = dataUrl.split(',')[1];
    const mimeMatch = dataUrl.match(/data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const byteChars = atob(base64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: mime });
    const bitmap = await createImageBitmap(blob);

    // Draw to OffscreenCanvas at target dimensions
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Export as JPEG blob
    const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    const reader = new FileReaderSync();
    const compressedDataUrl = reader.readAsDataURL(outBlob);
    const compressedSize = outBlob.size;

    self.postMessage({
      type: 'COMPRESSED',
      id,
      payload: { dataUrl: compressedDataUrl, originalSize, compressedSize },
    });
  } catch (err) {
    // OffscreenCanvas not supported (Firefox) — return original
    self.postMessage({
      type: 'COMPRESSED',
      id,
      payload: { dataUrl: payload.dataUrl, originalSize: 0, compressedSize: 0, fallback: true },
    });
  }
};
