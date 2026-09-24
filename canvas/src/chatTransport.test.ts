import { afterEach, describe, expect, it, vi } from 'vitest'
import { sseFrame } from './agentRun'
import { applyFrame, followRun, sseFrames, writingTo, type Block, type Frame, type Turn } from './chatTransport'
import type { ChatEvent } from './claudeStream'

const frame = (id: number, data: ChatEvent): Frame => ({ id, event: data.kind, data })

describe('applyFrame', () => {
  it('folds a run into one turn', () => {
    let turn: Turn = { runId: 'r', prompt: 'hi', blocks: [] }
    const frames = [
      frame(1, { kind: 'thinking' }),
      frame(2, { kind: 'tool', id: 't1', name: 'Write', detail: '/p/hi.txt' }),
      frame(3, { kind: 'tool_done', id: 't1', ok: true }),
      frame(4, { kind: 'text', text: 'do' }),
      frame(5, { kind: 'text', text: 'ne' }),
      frame(6, { kind: 'end', ok: true }),
    ]
    for (const f of frames) turn = applyFrame(turn, f)
    expect(turn.blocks).toEqual([
      { kind: 'thinking' },
      { kind: 'tool', id: 't1', name: 'Write', detail: '/p/hi.txt', ok: true },
      { kind: 'text', text: 'done' },
    ])
    expect(turn.end).toEqual({ ok: true, message: undefined })
  })

  it('takes the prompt and a first title from the start event, and the model\'s over it', () => {
    let turn = applyFrame(
      { runId: 'r', prompt: '', blocks: [] },
      frame(1, { kind: 'start', agent: 'claude', prompt: 'say hi\nplease', title: 'say hi', at: 5, project: 'p' }),
    )
    expect(turn).toMatchObject({ prompt: 'say hi\nplease', title: 'say hi' })
    turn = applyFrame(turn, frame(2, { kind: 'title', title: 'Greeting Exchange' }))
    expect(turn.title).toBe('Greeting Exchange')
  })

  it('keeps the attached images off the start event and a tool\'s shots off its done event', () => {
    let turn = applyFrame(
      { runId: 'r', prompt: '', blocks: [] },
      frame(1, {
        kind: 'start',
        agent: 'codex',
        prompt: 'fix #1',
        title: 'fix #1',
        at: 5,
        project: 'p',
        images: [{ n: 1, name: 'a.png' }],
      }),
    )
    turn = applyFrame(turn, frame(2, { kind: 'tool', id: 't1', name: 'Bash', detail: 'refkit shoot' }))
    turn = applyFrame(turn, frame(3, { kind: 'tool_done', id: 't1', ok: true, shots: [{ k: 1 }] }))
    expect(turn.images).toEqual([{ n: 1, name: 'a.png' }])
    expect(turn.blocks).toEqual([
      { kind: 'tool', id: 't1', name: 'Bash', detail: 'refkit shoot', ok: true, shots: [{ k: 1 }] },
    ])
  })
})

describe('writingTo', () => {
  const tool = (name: string, detail: string): Block => ({ kind: 'tool', id: detail, name, detail })

  it('names the canvases a turn wrote to, and not the ones it only looked at', () => {
    const blocks = [
      tool('Read', '/p/shop/canvases/cart/01-cart.html'),
      tool('Bash', 'ls /p/shop/canvases/checkout'),
      tool('Write', '/p/shop/canvases/home/gen.py'),
      tool('Bash', 'cd /p/shop/canvases/cart && python3 gen.py'),
      tool('Edit', '/p/shop/canvases/home/layout.json, /p/shop/canvases/menu/gen.py'),
      tool('Shell', 'python3 C:\\p\\shop\\canvases\\orders\\gen.py'),
    ]
    expect(writingTo(blocks)).toEqual(['home', 'cart', 'menu', 'orders'])
  })

  it('counts a shell write by redirect, in-place edit or Python, and not a read', () => {
    const dir = '"/Users/a/Documents/Super Prototyping/app/canvases/untitled"'
    const cases: [string, boolean][] = [
      [`cd ${dir}; cat > logo.html <<'EOF'\n<html>\nEOF`, true],
      [`cd ${dir}; sed -i '' 's/a/b/' logo.html`, true],
      [`cd ${dir}; python3 -c "import json;json.dump(d,open(p,'w'))"`, true],
      [`mkdir -p ${dir}`, true],
      [`cd ${dir}; cat layout.json 2>/dev/null; ls 2>&1 | head`, false],
      [`cd ${dir}; python3 -c "import json;print(json.load(open('canvas.json')))"`, false],
      [`cd ${dir}; grep -rl logo . > /dev/null`, false],
    ]
    for (const [command, writes] of cases)
      expect(writingTo([tool('Bash', command)]), command).toEqual(writes ? ['untitled'] : [])
  })
})

describe('sseFrames', () => {
  it('reads back what the server writes, skipping keepalives and keeping a partial frame', () => {
    const a = { id: 1, event: 'text', data: { kind: 'text', text: 'a' } }
    const b = { id: 2, event: 'end', data: { kind: 'end', ok: true } }
    const wire = sseFrame(a) + ': keepalive\n\n' + sseFrame(b)
    const cut = wire.length - 5
    const first = sseFrames(wire.slice(0, cut))
    expect(first.frames).toEqual([a])
    expect(sseFrames(first.rest + wire.slice(cut)).frames).toEqual([b])
  })
})

describe('followRun', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stream = (text: string, status = 200) =>
    new Response(status === 200 ? new Blob([text]).stream() : text, { status })

  it('reopens from the last id when the stream closes early, and stops at the end', async () => {
    const urls: string[] = []
    const one = frame(1, { kind: 'text', text: 'a' })
    const two = frame(2, { kind: 'end', ok: true })
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url)
      return stream(urls.length === 1 ? sseFrame(one) : sseFrame(two))
    })
    const seen: number[] = []
    await followRun('r', 0, (f) => seen.push(f.id), new AbortController().signal)
    expect(seen).toEqual([1, 2])
    const events = '/__sp/agent/run/r/events'
    expect(urls).toEqual([`${events}?after=0`, `${events}?after=1`])
  })

  it('reports a run the server does not know without retrying', async () => {
    const calls = vi.fn(async () => stream('no such run', 404))
    vi.stubGlobal('fetch', calls)
    await expect(followRun('r', 0, () => {}, new AbortController().signal)).rejects.toThrow('no such run')
    expect(calls).toHaveBeenCalledTimes(1)
  })
})
