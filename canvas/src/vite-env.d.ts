/// <reference types="vite/client" />

interface SnapCanvasApi {
  describe(): unknown
  dispatch(command: unknown): unknown
}

interface Window {
  snapCanvas?: SnapCanvasApi
}
