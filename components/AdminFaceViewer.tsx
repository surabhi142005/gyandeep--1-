 import React, { useState, useEffect } from 'react'
import Spinner from './Spinner'

interface FaceRecord {
  userId: string
  fileName: string
  registered: boolean
  timestamp: string
}

interface AdminFaceViewerProps {
  onClose?: () => void
}

const AdminFaceViewer: React.FC<AdminFaceViewerProps> = ({ onClose }) => {
  const [faces, setFaces] = useState<FaceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchFacesList()
  }, [])

  const fetchFacesList = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/face/list')
      const data = await response.json()
      if (data.ok) {
        setFaces(data.faces)
      }
    } catch (error) {
      console.error('Error fetching faces:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewFaceImage = async (userId: string) => {
    try {
      setLoadingImage(true)
      const response = await fetch(`/api/face/${userId}`)
      const data = await response.json()
      if (data.ok) {
        setSelectedUserId(userId)
        setSelectedImage(data.image)
      }
    } catch (error) {
      console.error('Error loading face image:', error)
    } finally {
      setLoadingImage(false)
    }
  }

  const deleteFace = async (userId: string) => {
    try {
      const response = await fetch(`/api/face/${userId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.ok) {
        setFaces(faces.filter(f => f.userId !== userId))
        if (selectedUserId === userId) {
          setSelectedUserId(null)
          setSelectedImage(null)
        }
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Error deleting face:', error)
    }
  }

  const filteredFaces = faces.filter(face =>
    face.userId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Registered Student Faces</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Faces List */}
          <div className="flex-1 border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by Student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner size={8} />
                </div>
              ) : filteredFaces.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No registered faces found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-4">Total: {filteredFaces.length} student(s)</p>
                  {filteredFaces.map((face) => (
                    <div
                      key={face.userId}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedUserId === face.userId
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div onClick={() => viewFaceImage(face.userId)}>
                        <p className="font-semibold text-gray-800">{face.userId}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Registered: {new Date(face.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Image Preview */}
          <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
            {selectedImage ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Student: {selectedUserId}</h3>
                <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                  {loadingImage ? (
                    <Spinner size={8} />
                  ) : (
                    <img src={selectedImage} alt="Face" className="w-full h-full object-contain" />
                  )}
                </div>

                {deleteConfirm === selectedUserId ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <p className="text-red-800 font-medium">Delete this registered face?</p>
                    <p className="text-red-700 text-sm">This action cannot be undone. The student will need to re-register their face.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteFace(selectedUserId!)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(selectedUserId)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    🗑 Delete Face
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-4xl mb-4">👤</p>
                  <p className="text-gray-500 text-lg">Select a student to view their registered face</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminFaceViewer
