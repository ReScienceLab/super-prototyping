import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled, not linked from a CDN. The canvas is mostly a local server, and a board that
// falls back to the system font offline measures differently. Fontsource splits each family by
// `unicode-range`, so only the latin subset is ever fetched.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import { loadCanvasIndex } from './canvasIndex'
import { windowUrl } from './canvasUrl'

// The canvas is a frame in the window (AppShell.tsx), which holds the bar and the agent's panel.
// Opened on its own, it goes to that window at this address, which is what was meant.
if (window.parent === window) location.replace(windowUrl(location.href))
// The index first, then the app: everything under src reads the index at module scope or during
// render, and a dynamic import is what keeps it from being evaluated before the fetch lands.
else loadCanvasIndex()
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
