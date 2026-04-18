/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_RESEND_API_KEY: string
  readonly VITE_FROM_EMAIL: string
  readonly VITE_APP_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}