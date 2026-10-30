/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Multiplayer server origin (server/index.js) when the frontend is hosted elsewhere; defaults to same origin. */
  readonly VITE_SERVER_URL?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $t: (key: string, params?: Record<string, string | number>) => string
  }
}

export {}
