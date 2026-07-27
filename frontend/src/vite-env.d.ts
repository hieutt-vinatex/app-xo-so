/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SSE_RECONNECT_BASE_MS?: string;
  readonly VITE_SSE_RECONNECT_MAX_MS?: string;
  readonly VITE_FALLBACK_POLL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
