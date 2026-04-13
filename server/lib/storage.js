/**
 * server/lib/storage.js
 * Cloud storage integration for R2/S3-compatible services
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'gyandeep-uploads';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${R2_ACCOUNT_ID}.r2.dev`;

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;

  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.dev`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    console.log('[Storage] R2/S3 client initialized');
  } else {
    console.warn('[Storage] Cloud storage not configured - falling back to base64');
  }

  return s3Client;
}

export async function uploadFile(buffer, key, contentType) {
  const client = getS3Client();
  
  if (!client) {
    throw new Error('Cloud storage not configured');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });

  await client.send(command);

  const url = `${R2_PUBLIC_URL}/${key}`;

  return {
    key,
    url,
    bucket: R2_BUCKET_NAME,
  };
}

export async function getFileUrl(key, expiresIn = 3600) {
  const client = getS3Client();
  
  if (!client) {
    throw new Error('Cloud storage not configured');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFile(key) {
  const client = getS3Client();
  
  if (!client) {
    throw new Error('Cloud storage not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
  return { deleted: true, key };
}

export async function getFileMetadata(key) {
  const client = getS3Client();
  
  if (!client) {
    throw new Error('Cloud storage not configured');
  }

  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await client.send(command);
  
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
  };
}

export async function checkStorageHealth() {
  const configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
  
  if (!configured) {
    return {
      configured: false,
      provider: 'none',
      message: 'Cloud storage not configured',
    };
  }

  try {
    const client = getS3Client();
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: '.health-check',
    });
    
    await client.send(command);
    
    return {
      configured: true,
      provider: 'cloudflare-r2',
      bucket: R2_BUCKET_NAME,
      message: 'Cloud storage is healthy',
    };
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return {
        configured: true,
        provider: 'cloudflare-r2',
        bucket: R2_BUCKET_NAME,
        message: 'Cloud storage configured (bucket accessible)',
      };
    }
    
    return {
      configured: false,
      provider: 'cloudflare-r2',
      error: error.message,
      message: 'Cloud storage configuration error',
    };
  }
}

export function isStorageConfigured() {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

export default {
  uploadFile,
  getFileUrl,
  deleteFile,
  getFileMetadata,
  checkStorageHealth,
  isStorageConfigured,
};
