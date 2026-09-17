import { describe, expect, it } from 'vitest'
import { chatEventsFromLine } from './claudeStream'
import sayHi from './fixtures/claude-2.1.274-say-hi.jsonl?raw'
import writeFile from './fixtures/claude-2.1.274-write-file.jsonl?raw'

// Both fixtures are recordings of `claude -p --input-format stream-json --output-format stream-json
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
    expect(got.map((e) => e.kind)).toEqual(['thinking', 'tool', 'tool_done', 'text', 'end'])
    const [, tool, done, text] = got
    expect(tool).toEqual({
      kind: 'tool',
      id: expect.stringMatching(/^toolu_/),
      name: 'Write',
      detail: '/home/user/project/hi.txt',
    })
    expect(done).toEqual({ kind: 'tool_done', id: (tool as { id: string }).id, ok: true })
    expect(text).toEqual({ kind: 'text', text: 'done' })
  })

  it('skips a sub-agent frame and says why a run failed', () => {
    const subagent =
      '{"type":"assistant","parent_tool_use_id":"toolu_1","message":{"content":[{"type":"tool_use","id":"x","name":"Read","input":{}}]}}'
    expect(chatEventsFromLine(subagent)).toEqual([])
    const failed = '{"type":"result","subtype":"error_during_execution","is_error":true,"result":"boom"}'
    expect(chatEventsFromLine(failed)).toEqual([{ kind: 'end', ok: false, message: 'boom' }])
  })
})
