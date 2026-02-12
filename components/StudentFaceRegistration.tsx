import React, { useState, useRef, useEffect } from 'react'
import Spinner from './Spinner'

interface StudentFaceRegistrationProps {
  userId: string
  onSuccess?: () => void
  onClose?: () => void
}

const StudentFaceRegistration: React.FC<StudentFaceRegistrationProps> = ({ userId, onSuccess, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'capturing' | 'registering' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    checkIfRegistered()
  }, [userId])

  const checkIfRegistered = async () => {
    try {
      const response = await fetch('/api/face/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      const data = await response.json()
      setIsRegistered(data.registered)
    } catch (error) {
      console.error('Error checking face registration:', error)
    }
  }

  const startCamera = async () => {
    try {
      setRegistrationStatus('capturing')
      setErrorMessage('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      setErrorMessage('Could not access camera. Please check permissions.')
      setRegistrationStatus('error')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
  }

  const captureFace = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg')
    setCapturedImage(imageData)
    setCaptured(true)
    setFaceDetected(true)
    setRegistrationStatus('idle')
  }

  const registerFace = async () => {
    if (!capturedImage) {
      setErrorMessage('Please capture an image first')
      return
    }

    setLoading(true)
    setRegistrationStatus('registering')
    setErrorMessage('')

    try {
      const response = await fetch('/api/face/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          image: capturedImage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setRegistrationStatus('success')
      setIsRegistered(true)
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to register face'
      setErrorMessage(errorMsg)
      setRegistrationStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const retakePhoto = () => {
    setCaptured(false)
    setCapturedImage('')
    setFaceDetected(false)
    setRegistrationStatus('capturing')
    startCamera()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Register Your Face</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {isRegistered && registrationStatus === 'idle' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">✓ Face already registered</p>
              <p className="text-green-700 text-sm mt-1">You can use your registered face for authentication.</p>
            </div>
          )}

          {/* Camera Section */}
          {!captured && registrationStatus === 'capturing' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-green-500 rounded-lg flex items-center justify-center">
                  <div className="w-32 h-40 border-4 border-green-500 rounded-lg"></div>
                </div>
              </div>
              <p className="text-center text-gray-600 text-sm">Position your face in the frame</p>
              <button
                onClick={captureFace}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                📸 Capture Photo
              </button>
              <button
                onClick={() => {
                  stopCamera()
                  setRegistrationStatus('idle')
                  setCaptured(false)
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Captured Image Review */}
          {captured && capturedImage && (
            <div className="space-y-4">
              <div className="relative bg-gray-200 rounded-lg overflow-hidden aspect-video">
                <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
              </div>
              <p className="text-center text-gray-600 text-sm">Review your photo</p>
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Retake
                </button>
                <button
                  onClick={registerFace}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner size={4} /> : '✓'} Register
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {registrationStatus === 'success' && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✓</div>
              <p className="text-lg font-semibold text-green-600">Face Registered Successfully!</p>
              <p className="text-gray-600">You can now use your face for authentication.</p>
            </div>
          )}

          {/* Error State */}
          {registrationStatus === 'error' && errorMessage && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">⚠ Registration Failed</p>
                <p className="text-red-700 text-sm mt-2">{errorMessage}</p>
              </div>
              <button
                onClick={() => {
                  setRegistrationStatus('idle')
                  setErrorMessage('')
                  setCaptured(false)
                  setCapturedImage('')
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Initial State */}
          {registrationStatus === 'idle' && !captured && !isRegistered && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📷</div>
              <p className="text-gray-700">Register your face to use face-based authentication</p>
              <button
                onClick={startCamera}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Start Camera
              </button>
            </div>
          )}

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  )
}

export default StudentFaceRegistration
