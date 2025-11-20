import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';

interface WebcamCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
  theme: string;
  title: string;
  buttonText: string;
  liveness?: boolean;
}

const THEME_COLORS: Record<string, Record<string, string>> = {
    indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700' },
    teal: { primary: 'bg-teal-600', hover: 'hover:bg-teal-700' },
    crimson: { primary: 'bg-red-600', hover: 'hover:bg-red-700' },
    purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-700' },
};

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onClose, theme, title, buttonText, liveness = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const colors = useMemo(() => THEME_COLORS[theme] || THEME_COLORS.indigo, [theme]);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Could not access webcam. Please grant camera permissions.");
    }
  }, []);

  useEffect(() => {
    startWebcam();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startWebcam]);

  const frameDiff = (a: ImageData, b: ImageData) => {
    let sum = 0;
    for (let i = 0; i < a.data.length && i < b.data.length; i += 4) {
      const dr = Math.abs(a.data[i] - b.data[i]);
      const dg = Math.abs(a.data[i+1] - b.data[i+1]);
      const db = Math.abs(a.data[i+2] - b.data[i+2]);
      sum += (dr + dg + db) / 3;
    }
    const pixels = Math.min(a.data.length, b.data.length) / 4;
    const mean = sum / pixels;
    return mean / 255;
  };

  const captureFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement): { dataUrl: string; image: ImageData } | null => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg');
    return { dataUrl: url, image: img };
  };

  const handleCaptureClick = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera is not ready.");
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const first = captureFrame(video, canvas);
    if (!first) {
      setError("Could not process the image.");
      return;
    }

    if (!liveness) {
      onCapture(first.dataUrl);
      return;
    }

    setIsProcessing(true);
    setHint("Move your head slightly or blink...");
    await new Promise(res => setTimeout(res, 800));
    const second = captureFrame(video, canvas);
    setIsProcessing(false);
    setHint(null);
    if (!second) {
      setError("Could not process the image.");
      return;
    }
    const diff = frameDiff(first.image, second.image);
    if (diff < 0.03) {
      setError("Liveness check failed. Please try again with movement.");
      return;
    }
    onCapture(second.dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-600 mb-4">Position your face within the frame.</p>
        <div className="relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4 border-4 border-gray-300">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {error && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50" aria-live="assertive"><p className="text-white text-lg">{error}</p></div>}
          {hint && !error && <div className="absolute inset-x-0 bottom-0 p-2 bg-black bg-opacity-50 text-white text-sm" aria-live="polite">{hint}</div>}
          {isProcessing && <div className="absolute inset-0 flex items-center justify-center"><div className="bg-black bg-opacity-40 text-white px-3 py-2 rounded">Processing...</div></div>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCaptureClick}
            className={`flex-1 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 disabled:opacity-50 ${colors.primary} ${colors.hover}`}
            disabled={!!error}
          >
            {buttonText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;
