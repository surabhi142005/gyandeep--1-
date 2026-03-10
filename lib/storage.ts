/**
 * lib/storage.ts
 * Cloudflare R2 / Backblaze B2 Storage (S3-compatible)
 * Free 10GB storage
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.B2_REGION || 'us-west-002';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || process.env.B2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.B2_SECRET_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || process.env.B2_BUCKET_NAME || 'gyandeep';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.B2_PUBLIC_URL || '';

// Create S3 client for Backblaze R2
const s3 = new S3Client({
  region: R2_ACCOUNT_ID,
  endpoint: `https://s3.${R2_ACCOUNT_ID}.backblazeb2.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
  forcePathStyle: true, // Required for Backblaze
});

/**
 * Upload a file to cloud storage
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(command);

  // Return public URL if available, otherwise construct from bucket
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  return `https://${R2_BUCKET}.s3.${R2_ACCOUNT_ID}.backblazeb2.com/${key}`;
}

/**
 * Delete a file from cloud storage
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  await s3.send(command);
}

/**
 * Get a signed URL for downloading a file
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Upload session notes
 */
export async function uploadSessionNote(
  sessionId: string,
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `session-notes/${sessionId}/${Date.now()}-${filename}`;
  return uploadFile(buffer, key, contentType);
}

/**
 * Upload centralized notes
 */
export async function uploadCentralizedNote(
  classId: string | null,
  subjectId: string,
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const folder = classId ? `${classId}/${subjectId}` : `_shared/${subjectId}`;
  const key = `centralized-notes/${folder}/${Date.now()}-${filename}`;
  return uploadFile(buffer, key, contentType);
}

/**
 * Upload profile image
 */
export async function uploadProfileImage(
  userId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
  const key = `profile-images/${userId}.${ext}`;
  return uploadFile(buffer, key, contentType);
}

/**
 * Delete session notes
 */
export async function deleteSessionNote(sessionId: string, filePath: string): Promise<void> {
  // Extract key from full path
  const key = filePath.replace(`${R2_PUBLIC_URL}/`, '').replace(/^.+\/session-notes\//, 'session-notes/');
  await deleteFile(key);
}

/**
 * Delete centralized note
 */
export async function deleteCentralizedNote(filePath: string): Promise<void> {
  const key = filePath.replace(`${R2_PUBLIC_URL}/`, '').replace(/^.+\/centralized-notes\//, 'centralized-notes/');
  await deleteFile(key);
}

export default {
  uploadFile,
  deleteFile,
  getSignedDownloadUrl,
  uploadSessionNote,
  uploadCentralizedNote,
  uploadProfileImage,
  deleteSessionNote,
  deleteCentralizedNote,
};
