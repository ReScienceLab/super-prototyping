import { describe, expect, it } from 'vitest'
import { chatEventsFromLine, titleFilter } from './claudeStream'
import sayHi from './fixtures/claude-2.1.274-say-hi.jsonl?raw'
import titledHi from './fixtures/claude-2.1.274-titled-hi.jsonl?raw'
import writeFile from './fixtures/claude-2.1.274-write-file.jsonl?raw'

// The fixtures are recordings of `claude -p --input-format stream-json --output-format stream-json
// --verbose --include-partial-messages`, the shape vite.config.ts spawns, on Claude Code 2.1.274.
// The hook and init frames had their machine-local payloads cut down and the working directory
// was renamed; every frame is still there, in its recorded order.
const events = (jsonl: string) => jsonl.trim().split('\n').flatMap(chatEventsFromLine)

describe('chatEventsFromLine', () => {
  it('streams the text once and ends on the result frame', () => {
    const got = events(sayHi)
    const text = got.flatMap((e) => (e.kind === 'text' ? [e.text] : [])).join('')
    expect(text).toBe('Hi! 👋\n\nWhat are we working on?')
    expect(got.at(-1)).toEqual({ kind: 'end', ok: true })
  })

  it('reports a tool call with its target, then its result', () => {
    const got = events(writeFile)
    expect(got.map((e) => e.kind)).toEqual(['thinking', 'tool', 'tool_done', 'text', 'usage', 'end'])
    const [, tool, done, text] = got
    expect(tool).toEqual({
      kind: 'tool',
      id: expect.stringMatching(/^toolu_/),
      name: 'Write',
      detail: '/home/user/project/hi.txt',
    })
    expect(done).toEqual({ kind: 'tool_done', id: (tool as { id: string }).id, ok: true })
    expect(text).toEqual({ kind: 'text', text: 'done' })
    // Every token of the prompt, cached or not, plus the answer — and the window they went into,
    // which this turn's sub-agent has its own of, both 200k here.
    expect(got.at(-2)).toEqual({ kind: 'usage', used: 4 + 10505 + 31291 + 739, window: 200_000 })
  })

  it('skips a sub-agent frame and says why a run failed', () => {
    const subagent =
      '{"type":"assistant","parent_tool_use_id":"toolu_1","message":{"content":[{"type":"tool_use","id":"x","name":"Read","input":{}}]}}'
    expect(chatEventsFromLine(subagent)).toEqual([])
    const failed = '{"type":"result","subtype":"error_during_execution","is_error":true,"result":"boom"}'
    expect(chatEventsFromLine(failed)).toEqual([{ kind: 'end', ok: false, message: 'boom' }])
  })
})

describe('titleFilter', () => {
  const filtered = (jsonl: string) => events(jsonl).flatMap(titleFilter())
  const text = (got: ReturnType<typeof events>) =>
    got.flatMap((e) => (e.kind === 'text' ? [e.text] : [])).join('')

  it('lifts the title out of a reply that opens with the marker split across deltas', () => {
    // Recorded with the title sentence vite.config.ts appends to the system prompt; the marker
    // arrives as `<s`, `p`, `-title>Gre`, `eting`, ` Exchange</sp-title`, `>\n\nHi.`.
    const got = filtered(titledHi)
    expect(got.filter((e) => e.kind === 'title')).toEqual([{ kind: 'title', title: 'Greeting Exchange' }])
    expect(text(got)).toBe('Hi. What are we working on?')
    expect(got.at(-1)).toEqual({ kind: 'end', ok: true })
  })

  it('passes a reply without the marker through as it was', () => {
    expect(filtered(sayHi)).toEqual(events(sayHi))
  })

  it('releases held text once it cannot be the marker, and flushes the rest at the end', () => {
    const tag = titleFilter()
    expect(tag({ kind: 'text', text: '<s' })).toEqual([])
    expect(tag({ kind: 'text', text: 'pan>' })).toEqual([{ kind: 'text', text: '<span>' }])
    const cut = titleFilter()
    expect(cut({ kind: 'text', text: '<sp-t' })).toEqual([])
    expect(cut({ kind: 'end', ok: true })).toEqual([{ kind: 'text', text: '<sp-t' }, { kind: 'end', ok: true }])
  })

  it('drops the blank lines after the marker when they come in a later delta', () => {
    // Seen live: the closing tag as one delta, the model's first sentence in the next.
    const split = titleFilter()
    expect(split({ kind: 'text', text: '<sp-title>Saying Hi</sp-title>' })).toEqual([{ kind: 'title', title: 'Saying Hi' }])
    expect(split({ kind: 'text', text: '\n\nHi!' })).toEqual([{ kind: 'text', text: 'Hi!' }])
  })

  it('takes the title from the block after the tool call, which is where a working turn puts it', () => {
    // The ordinary shape: say what you are about to do, do it, then answer with the title on top.
    const later = titleFilter()
    expect(later({ kind: 'text', text: "I'll look at the folder." })).toEqual([
      { kind: 'text', text: "I'll look at the folder." },
    ])
    expect(later({ kind: 'tool', id: 't1', name: 'Bash', detail: 'ls' })).toEqual([
      { kind: 'tool', id: 't1', name: 'Bash', detail: 'ls' },
    ])
    expect(later({ kind: 'tool_done', id: 't1', ok: true })).toEqual([{ kind: 'tool_done', id: 't1', ok: true }])
    expect(later({ kind: 'text', text: '<sp-title>Reading The Folder</sp-title>\n\nTwenty-nine boards.' })).toEqual([
      { kind: 'title', title: 'Reading The Folder' },
      { kind: 'text', text: 'Twenty-nine boards.' },
    ])
    // One title per turn: a marker in a third block is text like any other.
    expect(later({ kind: 'tool', id: 't2', name: 'Bash', detail: 'ls' })).toHaveLength(1)
    expect(later({ kind: 'text', text: '<sp-title>Again</sp-title>' })).toEqual([
      { kind: 'text', text: '<sp-title>Again</sp-title>' },
    ])
  })
})
