/**
 * lib/env.ts
 * Environment validation for critical variables
 */

interface EnvConfig {
  required: string[];
  optional: string[];
  warnings: string[];
}

const ENV_CONFIG: EnvConfig = {
  required: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ],
  optional: [
    'MONGODB_URI',
    'MONGODB_DB',
    'GEMINI_API_KEY',
    'RESEND_API_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
    'ALLOWED_ORIGINS',
  ],
  warnings: [
    'MONGODB_URI',
    'GEMINI_API_KEY',
    'RESEND_API_KEY',
    'R2_ACCOUNT_ID',
  ],
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  for (const key of ENV_CONFIG.required) {
    const value = getEnv(key);
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
      missing.push(key);
    } else if (key.includes('SECRET') && value.length < 32) {
      errors.push(`${key} should be at least 32 characters for security`);
    }
  }

  for (const key of ENV_CONFIG.warnings) {
    const value = getEnv(key);
    if (!value) {
      warnings.push(`Optional environment variable not set: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing,
  };
}

export function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as any)[`VITE_${key}`] || (import.meta.env as any)[key];
  }
  return undefined;
}

export function getRequiredEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Required environment variable is not set: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue: string): string {
  return getEnv(key) || defaultValue;
}

export function logEnvironmentStatus(): void {
  const result = validateEnvironment();
  
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment validation passed');
    return;
  }

  if (result.errors.length > 0) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(e => console.error(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }
}

export function checkFeatureFlags(): Record<string, boolean> {
  return {
    aiEnabled: !!getEnv('GEMINI_API_KEY'),
    emailEnabled: !!getEnv('RESEND_API_KEY'),
    storageEnabled: !!(getEnv('R2_ACCOUNT_ID') && getEnv('R2_ACCESS_KEY_ID')),
    googleAuthEnabled: !!(getEnv('GOOGLE_CLIENT_ID') && getEnv('GOOGLE_CLIENT_SECRET')),
  };
}

export default {
  validateEnvironment,
  getEnv,
  getRequiredEnv,
  getOptionalEnv,
  logEnvironmentStatus,
  checkFeatureFlags,
};
