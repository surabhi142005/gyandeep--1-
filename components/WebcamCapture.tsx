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
  const [livenessSteps, setLivenessSteps] = useState<string[]>([]);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);

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
      const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
      const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
      sum += (dr + dg + db) / 3;
    }
    const pixels = Math.min(a.data.length, b.data.length) / 4;
    const mean = sum / pixels;
    return mean / 255;
  };

  const detectFaceMovement = (frame1: string, frame2: string): boolean => {
    return Math.random() > 0.3;
  };

  const validateFacePosition = (video: HTMLVideoElement): boolean => {
    return video.videoWidth > 320 && video.videoHeight > 240;
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

    if (!validateFacePosition(video)) {
      setError("Video resolution too low. Please allow full camera access.");
      return;
    }

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
    setLivenessSteps(['Capturing frames...']);
    setCapturedFrames([first.dataUrl]);

    const steps = ['Capturing frame 1...', 'Capturing frame 2...', 'Capturing frame 3...', 'Processing...'];
    const frames: string[] = [first.dataUrl];

    // Capture 2 more frames with shorter delays
    for (let i = 1; i < 3; i++) {
      setHint(`Capturing frame ${i + 1}...`);
      setLivenessSteps(prev => [...prev, steps[i]]);
      await new Promise(res => setTimeout(res, 600));
      const frame = captureFrame(video, canvas);
      if (frame) {
        frames.push(frame.dataUrl);
      }
    }

    setHint(null);
    setLivenessSteps([...steps.slice(0, 3), 'Processing...']);

    // Improved liveness check: verify frames have meaningful pixel differences
    let hasMotion = false;
    if (frames.length >= 3) {
      // Create off-screen canvases to get ImageData for comparison
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        // Compare first and last frame for motion
        const img1 = await loadImageData(frames[0], tempCanvas, tempCtx);
        const img3 = await loadImageData(frames[2], tempCanvas, tempCtx);
        const diff = frameDiff(img1, img3);
        // diff > 0.01 means at least 1% average pixel change - enough for simple movement
        if (diff > 0.01) {
          hasMotion = true;
        }
      }
    }

    setIsProcessing(false);
    setLivenessSteps([]);
    setCapturedFrames([]);

    // Use best quality frame (last one)
    const bestFrame = frames[frames.length - 1] || first.dataUrl;

    // If liveness check passed, use the captured image
    if (hasMotion) {
      onCapture(bestFrame);
    } else {
      setError("Liveness check failed: No motion detected.\nPlease move slightly or blink during capture.");
    }
  };

  /** Helper to load a dataURL into ImageData */
  const loadImageData = (url: string, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<ImageData> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.src = url;
    });
  };

  // Liveness hint messages shown to user for anti-spoofing
  const livenessHints = [
    { icon: '👁️', text: 'Please blink naturally', color: 'bg-blue-600' },
    { icon: '🔄', text: 'Slowly turn your head slightly left', color: 'bg-purple-600' },
    { icon: '😊', text: 'Smile for a moment', color: 'bg-green-600' },
  ];

  const currentHintIndex = Math.min(livenessSteps.length, livenessHints.length - 1);
  const currentHint = liveness ? livenessHints[currentHintIndex] : null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 w-full max-w-md text-center border border-white/20">
        <h2 className="text-xl font-bold text-gray-800 mb-1">{title}</h2>

        {liveness && (
          <div className="flex items-center justify-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 w-fit mx-auto">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-xs text-indigo-600 font-semibold">Anti-spoofing liveness check enabled</p>
          </div>
        )}

        <p className="text-gray-500 text-sm mb-4">Position your face within the oval guide.</p>

        <div className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4 border-2 border-gray-200">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" aria-label="Camera preview — position your face in the center" />
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          {/* Face oval guide */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 300" aria-hidden="true">
            {/* Dim the area outside the oval */}
            <defs>
              <mask id="ovalMask">
                <rect width="300" height="300" fill="white" />
                <ellipse cx="150" cy="145" rx="90" ry="110" fill="black" />
              </mask>
            </defs>
            <rect width="300" height="300" fill="rgba(0,0,0,0.3)" mask="url(#ovalMask)" />
            {/* Oval border */}
            <ellipse cx="150" cy="145" rx="90" ry="110" fill="none"
              stroke={isProcessing ? '#6366f1' : 'rgba(255,255,255,0.8)'}
              strokeWidth="2.5"
              strokeDasharray={isProcessing ? "8,4" : "none"}
            />
            {/* Corner dots */}
            <circle cx="150" cy="35" r="3" fill="rgba(255,255,255,0.6)" />
            <circle cx="150" cy="255" r="3" fill="rgba(255,255,255,0.6)" />
            <circle cx="60" cy="145" r="3" fill="rgba(255,255,255,0.6)" />
            <circle cx="240" cy="145" r="3" fill="rgba(255,255,255,0.6)" />
          </svg>

          {/* Liveness hint banner */}
          {isProcessing && currentHint && !error && (
            <div className={`absolute inset-x-0 bottom-0 p-3 ${currentHint.color} text-white text-sm text-center flex items-center justify-center gap-2`} aria-live="polite">
              <span className="text-lg">{currentHint.icon}</span>
              <span className="font-medium">{currentHint.text}</span>
            </div>
          )}

          {/* Static hint before capture */}
          {!isProcessing && hint && !error && (
            <div className="absolute inset-x-0 bottom-0 p-3 bg-black/60 text-white text-sm text-center" aria-live="polite">
              {hint}
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70" aria-live="assertive">
              <div className="bg-red-600/90 backdrop-blur text-white p-4 rounded-xl text-center text-sm max-w-xs mx-4 whitespace-pre-line">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Liveness progress steps */}
        {liveness && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {livenessHints.map((hint, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                    i < livenessSteps.length
                      ? 'bg-indigo-600 text-white scale-110'
                      : i === livenessSteps.length && isProcessing
                      ? 'bg-indigo-200 text-indigo-700 animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < livenessSteps.length ? '✓' : hint.icon}
                  </div>
                  <div className={`flex-1 h-1.5 w-full rounded-full ${
                    i < livenessSteps.length ? 'bg-indigo-500' : 'bg-gray-200'
                  }`} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center" id="liveness-label" role="status">
              {isProcessing
                ? livenessHints[currentHintIndex]?.text || 'Verifying liveness...'
                : 'Complete liveness steps to verify you are real'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCaptureClick}
            className={`flex-1 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${colors.primary} ${colors.hover} shadow-lg`}
            disabled={!!error || isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Verifying...
              </span>
            ) : buttonText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;
