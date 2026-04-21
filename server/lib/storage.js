/**
 * server/lib/storage.js
 * File storage using Cloudinary (free 25GB)
 */

import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

let cloudinaryConfigured = false;

function initCloudinary() {
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
    cloudinaryConfigured = true;
    console.log('[Storage] Cloudinary initialized');
  } else {
    console.warn('[Storage] Cloudinary not configured - using base64 storage');
  }
}

initCloudinary();

export async function uploadFile(buffer, key, contentType) {
  if (!cloudinaryConfigured) {
    throw new Error('Cloud storage not configured');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'gyandeep',
        public_id: key.replace(/\.[^/.]+$/, ''),
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            key,
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
}

export async function getFileUrl(key, expiresIn = 3600) {
  if (!cloudinaryConfigured) {
    throw new Error('Cloud storage not configured');
  }

  return cloudinary.url(key, {
    secure: true,
    sign_url: true,
    expires: Math.floor(Date.now() / 1000) + expiresIn,
  });
}

export async function deleteFile(key) {
  if (!cloudinaryConfigured) {
    throw new Error('Cloud storage not configured');
  }

  const result = await cloudinary.uploader.destroy(key);
  return { deleted: true, key };
}

export async function getFileMetadata(key) {
  if (!cloudinaryConfigured) {
    throw new Error('Cloud storage not configured');
  }

  const result = await cloudinary.api.resource(key);
  return {
    contentType: result.format,
    contentLength: result.bytes,
    lastModified: result.created_at,
    etag: result.asset_id,
  };
}

export async function checkStorageHealth() {
  if (!cloudinaryConfigured) {
    return {
      configured: false,
      provider: 'none',
      message: 'Cloudinary not configured',
    };
  }

  try {
    await cloudinary.api.ping();
    return {
      configured: true,
      provider: 'cloudinary',
      message: 'Cloudinary is healthy',
    };
  } catch (error) {
    return {
      configured: false,
      provider: 'cloudinary',
      error: error.message,
      message: 'Cloudinary configuration error',
    };
  }
}

export function isStorageConfigured() {
  return cloudinaryConfigured;
}

export default {
  uploadFile,
  getFileUrl,
  deleteFile,
  getFileMetadata,
  checkStorageHealth,
  isStorageConfigured,
};