/// <reference types="vite/client" />

interface SnapCanvasApi {
  dispatch(slug: string, command: unknown): Promise<unknown>
}

interface Window {
  snapCanvas?: SnapCanvasApi
}
