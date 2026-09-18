import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled, not linked from a CDN. The canvas is mostly a local dev server, and a board that
// falls back to the system font offline measures differently. Fontsource splits each family by
// `unicode-range`, so only the latin subset is ever fetched.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
