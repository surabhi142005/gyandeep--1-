import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getStoredToken } from '../services/authService';

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  onUpload: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  uploadEndpoint?: string;
  className?: string;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = 10,
  multiple = true,
  onUpload,
  onError,
  uploadEndpoint = '/api/storage/upload',
  className = '',
  disabled = false,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `File ${file.name} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`;
      }
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        const hasMatchingType = acceptedTypes.some(
          (type) =>
            type === fileType ||
            type === fileName.slice(fileName.lastIndexOf('.')) ||
            (type.endsWith('/*') && fileType.startsWith(type.slice(0, -1)))
        );
        if (!hasMatchingType) {
          return `File ${file.name} is not an accepted type`;
        }
      }
      return null;
    },
    [accept, maxSize]
  );

  const uploadFile = useCallback(
    async (uploadedFile: UploadedFile) => {
      const controller = new AbortController();
      abortControllers.current.set(uploadedFile.id, controller);

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'uploading' } : f))
      );

      try {
        const formData = new FormData();
        formData.append('file', uploadedFile.file);

        const token = getStoredToken();
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const result = await response.json();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'success', progress: 100, url: result.url || result.path }
              : f
          )
        );
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }
        const errorMessage = error.message || 'Upload failed';
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: 'error', error: errorMessage } : f
          )
        );
        onError?.(errorMessage);
      } finally {
        abortControllers.current.delete(uploadedFile.id);
      }
    },
    [uploadEndpoint, onError]
  );

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      const fileArray = Array.from(newFiles);
      const remainingSlots = maxFiles - files.length;

      if (fileArray.length > remainingSlots && remainingSlots > 0) {
        onError?.(`Maximum ${maxFiles} files allowed`);
      }

      const filesToUpload = fileArray.slice(0, remainingSlots > 0 ? remainingSlots : 0);
      const uploadedFiles: UploadedFile[] = [];

      for (const file of filesToUpload) {
        const error = validateFile(file);
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        if (error) {
          onError?.(error);
          continue;
        }

        const uploadedFile: UploadedFile = {
          file,
          id,
          progress: 0,
          status: 'pending',
        };

        uploadedFiles.push(uploadedFile);
      }

      if (uploadedFiles.length > 0) {
        setFiles((prev) => [...prev, ...uploadedFiles]);
        uploadedFiles.forEach((f) => uploadFile(f));
      }
    },
    [files.length, maxFiles, validateFile, uploadFile, onError]
  );

  const removeFile = useCallback(
    (id: string) => {
      const controller = abortControllers.current.get(id);
      if (controller) {
        controller.abort();
        abortControllers.current.delete(id);
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        <Upload
          className={`w-10 h-10 mx-auto mb-3 ${
            isDragging ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'
          }`}
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-indigo-600 dark:text-indigo-400">Click to upload</span> or
          drag and drop
        </p>
        {accept && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {accept.split(',').join(', ')}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
          Max size: {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <File className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatSize(file.file.size)}</p>
                  {file.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                  {file.error && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {file.error}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {file.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
