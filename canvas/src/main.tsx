import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled, not linked from a CDN. The canvas is mostly a local server, and a board that
// falls back to the system font offline measures differently. Fontsource splits each family by
// `unicode-range`, so only the latin subset is ever fetched.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import { loadCanvasIndex } from './canvasIndex'

// The index first, then the app: everything under src reads the index at module scope or during
// render, and a dynamic import is what keeps it from being evaluated before the fetch lands.
loadCanvasIndex()
  .then(async () => {
    const { default: App } = await import('./App.tsx')
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error) => {
    document.getElementById('root')!.textContent = String(error)
  })
