import { fileURLToPath } from 'node:url'
import * as pty from 'node-pty'

// Repo root — this file is canvas/scripts/, two levels below it. Must match vite.config.ts.
const cwd = fileURLToPath(new URL('../../', import.meta.url))
const terminal = pty.spawn('/bin/zsh', ['-lc', 'printf "PTY_OK:%s" "$PWD"'], {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
  cwd,
  env: { ...process.env, TERM: 'xterm-256color' },
})

const timeout = setTimeout(() => {
  terminal.kill()
  console.error('PTY smoke check timed out')
  process.exit(1)
}, 5_000)

let output = ''
terminal.onData((data) => {
  output += data
})
terminal.onExit(({ exitCode }) => {
  clearTimeout(timeout)
  const expected = `PTY_OK:${cwd}`
  if (exitCode !== 0 || !output.includes(expected)) {
    console.error(`PTY smoke check failed: ${JSON.stringify({ exitCode, output })}`)
    process.exit(1)
  }
  console.log(expected)
})
