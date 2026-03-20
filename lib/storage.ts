/**
 * lib/storage.ts
 * Cloudflare R2 / Backblaze B2 Storage (S3-compatible)
 * Free 10GB storage with complete upload implementation
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.B2_REGION || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || process.env.B2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.B2_SECRET_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || process.env.B2_BUCKET_NAME || 'gyandeep';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.B2_PUBLIC_URL || '';
const IS_R2 = !!process.env.R2_ACCOUNT_ID;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (IS_R2) {
      s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY,
          secretAccessKey: R2_SECRET_KEY,
        },
      });
    } else {
      s3Client = new S3Client({
        region: R2_ACCOUNT_ID,
        endpoint: `https://s3.${R2_ACCOUNT_ID}.backblazeb2.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY,
          secretAccessKey: R2_SECRET_KEY,
        },
        forcePathStyle: true,
      });
    }
  }
  return s3Client;
}

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
}

export interface UploadOptions {
  contentType?: string;
  public?: boolean;
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  const client = getS3Client();
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  const result = await client.send(command);

  const url = R2_PUBLIC_URL 
    ? `${R2_PUBLIC_URL}/${key}`
    : IS_R2
      ? `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
      : `https://${R2_BUCKET}.s3.${R2_ACCOUNT_ID}.backblazeb2.com/${key}`;

  return {
    key,
    url,
    etag: result.ETag,
  };
}

export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  await client.send(command);
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function uploadSessionNote(
  sessionId: string,
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `session-notes/${sessionId}/${Date.now()}-${safeName}`;
  return uploadFile(buffer, key, contentType);
}

export async function uploadCentralizedNote(
  classId: string | null,
  subjectId: string,
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const folder = classId ? `${classId}/${subjectId}` : `_shared/${subjectId}`;
  const key = `centralized-notes/${folder}/${Date.now()}-${safeName}`;
  return uploadFile(buffer, key, contentType);
}

export async function uploadProfileImage(
  userId: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
  const key = `profile-images/${userId}.${ext}`;
  return uploadFile(buffer, key, contentType);
}

export async function uploadFaceImage(
  userId: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  const key = `face-images/${userId}.jpg`;
  return uploadFile(buffer, key, contentType);
}

export async function deleteSessionNote(sessionId: string, filePath: string): Promise<void> {
  const key = extractKeyFromUrl(filePath, 'session-notes');
  if (key) await deleteFile(key);
}

export async function deleteCentralizedNote(filePath: string): Promise<void> {
  const key = extractKeyFromUrl(filePath, 'centralized-notes');
  if (key) await deleteFile(key);
}

function extractKeyFromUrl(url: string, prefix: string): string | null {
  if (!url) return null;
  const match = url.match(new RegExp(`${prefix}/.+`));
  return match ? match[0] : null;
}

export function generateFileKey(
  prefix: string,
  filename: string,
  userId?: string
): string {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const userPart = userId ? `${userId}/` : '';
  return `${prefix}/${userPart}${timestamp}-${safeName}`;
}

export function isStorageConfigured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY);
}

export const FILE_LIMITS = {
  maxFileSize: 50 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > FILE_LIMITS.maxFileSize) {
    return { valid: false, error: `File size exceeds ${FILE_LIMITS.maxFileSize / 1024 / 1024}MB limit` };
  }
  return { valid: true };
}

export default {
  uploadFile,
  deleteFile,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  uploadSessionNote,
  uploadCentralizedNote,
  uploadProfileImage,
  uploadFaceImage,
  deleteSessionNote,
  deleteCentralizedNote,
  generateFileKey,
  isStorageConfigured,
  FILE_LIMITS,
  validateFile,
};
