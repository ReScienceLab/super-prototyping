// Render one board's CSS animation to PNG frames, through Chrome's DevTools protocol.
//
//   node frames.mjs <board.html> [--fps 24] [--seconds 10] [-o out/ui] [--scale 3]
//                   [--selector .phone] [--opaque] [--knots '[[0,0],[1,1]]']
//
// (bun runs it too. `sp` picks node where there is one and bun otherwise; so does this.)
//
// There is no screen recorder here on purpose. Every frame is a still: the board's
// animations are paused, and `animation-delay: -Ts` on every element scrubs the whole
// timeline to T. So a frame is exact, reproducible, and as slow to render as it needs
// to be -- a recorder would drop frames under load and there would be no way to tell.
//
// --selector clips to one element, the phone, and everything outside it comes out
// transparent, which is what the compositor wants. --opaque keeps the page background.
// --knots re-times the board onto a plate: [[plate_t, board_t], ...], linear between
// knots, so a hold in one is a hold in the other. Frames land as f0000.png, f0001.png …
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const flag = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1] }
const board = args[0]?.startsWith('-') ? null : args[0]
if (!board) { console.error('usage: node frames.mjs <board.html> [--fps 24] [--seconds 10] [-o out/ui]'); process.exit(2) }
const fps = Number(flag('--fps', 24)), seconds = Number(flag('--seconds', 10))
const scale = Number(flag('--scale', 3)), selector = flag('--selector', '.phone')
const opaque = args.includes('--opaque')
const outDir = resolve(flag('-o', flag('--out', 'out/ui')))
const knots = JSON.parse(flag('--knots', '[]'))
const boardTime = t => {
  if (knots.length < 2) return t
  let k = 1
  while (k < knots.length - 1 && knots[k][0] < t) k++
  const [a, b] = [knots[k - 1], knots[k]]
  return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0])
}

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9422 + (process.pid % 200)          // not 9333: something else on this machine listens there
const sleep = ms => new Promise(r => setTimeout(r, ms))
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/sp-frames-${process.pid}`, '--no-first-run', '--hide-scrollbars',
  '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' })

let targets
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break } catch {}
  await sleep(200)
}
const page = targets?.find(t => t.type === 'page')
if (!page) { chrome.kill(); throw new Error('Chrome never opened a debugging port') }
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => { ws.onopen = r })
let id = 0
const pending = new Map()
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (!m.id || !pending.has(m.id)) return
  const { res, rej } = pending.get(m.id); pending.delete(m.id)
  m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
}
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }))
})
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error('page: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result.value
}

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 500, height: 1000, deviceScaleFactor: scale, mobile: false })
if (!opaque) await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
await send('Page.navigate', { url: pathToFileURL(resolve(board)).href })
await sleep(1500)
await evaluate(`(() => {
  const s = document.createElement('style'); s.id = 'sp-scrub'; document.head.appendChild(s)
  ${opaque ? '' : `const b = document.createElement('style')
  b.textContent = 'html,body{background:transparent!important;margin:0}'; document.head.appendChild(b)`}
  return document.fonts.ready.then(() => 'ok')
})()`)
const clip = await evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)})
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 }
})()`)
if (!clip) { ws.close(); chrome.kill(); throw new Error(`no ${selector} on the board -- pass --selector`) }
console.log('clip', clip)

const n = Math.round(fps * seconds)
for (let i = 0; i < n; i++) {
  const t = boardTime(i / fps).toFixed(4)
  // One style rule scrubs every animation on the board at once, and two rAFs make sure it painted.
  await evaluate(`(() => {
    document.getElementById('sp-scrub').textContent =
      '${selector} *{animation-play-state:paused!important;animation-delay:-${t}s!important}'
    return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r('painted'))))
  })()`)
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true })
  writeFileSync(`${outDir}/f${String(i).padStart(4, '0')}.png`, Buffer.from(data, 'base64'))
  if (i % 48 === 0) console.log('frame', i, 'of', n)
}
ws.close(); chrome.kill()
console.log('wrote', n, 'frames to', outDir)
