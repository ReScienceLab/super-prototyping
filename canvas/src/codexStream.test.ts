import { describe, expect, it } from 'vitest'
import { titleFilter } from './claudeStream'
import { codexEventsFromLine } from './codexStream'
import modelRefused from './fixtures/codex-0.146.0-model-refused.jsonl?raw'
import readsAFile from './fixtures/codex-0.146.0-reads-a-file.jsonl?raw'

// The fixtures are recordings of `codex exec --json` on codex-cli 0.146.0, the shape agents.ts
// spawns, with the working directory renamed; every frame is there, in its recorded order.
const events = (jsonl: string) => jsonl.trim().split('\n').flatMap(codexEventsFromLine)

describe('codexEventsFromLine', () => {
  it('reports each command as it starts and finishes, then the message whole, then the end', () => {
    const got = events(readsAFile)
    expect(got.map((e) => e.kind)).toEqual(['tool', 'tool_done', 'tool', 'tool_done', 'text', 'end'])
    expect(got[2]).toEqual({
      kind: 'tool',
      id: 'item_1',
      name: 'Shell',
      detail: '/bin/zsh -lc "sed -n \'1,20p\' hello.txt"',
    })
    expect(got[3]).toEqual({ kind: 'tool_done', id: 'item_1', ok: true })
    expect(got[4]).toEqual({ kind: 'text', text: 'It says the cat sat on the mat.' })
    expect(got.at(-1)).toEqual({ kind: 'end', ok: true })
  })

  it('ends a failed turn once, with the server\'s own words', () => {
    const got = events(modelRefused)
    // The two `error` items are warnings and the bare `error` frame repeats turn.failed: none
    // of them may end the run, or emit would refuse the second end.
    expect(got.map((e) => e.kind)).toEqual(['end'])
    expect(got[0]).toEqual({
      kind: 'end',
      ok: false,
      message: expect.stringContaining("The 'gpt-6-astra' model requires a newer version of Codex"),
    })
  })

  it('reads a file change and a reasoning summary', () => {
    // Open Design's recording of the same wire (json-event-stream.ts), verbatim but for the path.
    const started =
      '{"type":"item.started","item":{"id":"item_3","type":"file_change","changes":[{"path":"/p/page.html","kind":"add"}],"status":"in_progress"}}'
    expect(codexEventsFromLine(started)).toEqual([{ kind: 'tool', id: 'item_3', name: 'Edit', detail: '/p/page.html' }])
    const done =
      '{"type":"item.completed","item":{"id":"item_3","type":"file_change","changes":[{"path":"/p/page.html","kind":"add"}],"status":"completed"}}'
    expect(codexEventsFromLine(done)).toEqual([{ kind: 'tool_done', id: 'item_3', ok: true }])
    const reasoning = '{"type":"item.completed","item":{"id":"item_1","type":"reasoning","text":"**Reading the file**"}}'
    expect(codexEventsFromLine(reasoning)).toEqual([{ kind: 'thinking' }])
  })

  it('gives the title filter the whole reply in one event, which it can still lift the title from', () => {
    const line =
      '{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"<sp-title>Cat On Mat</sp-title>\\n\\nIt says the cat sat on the mat."}}'
    const got = [...codexEventsFromLine(line), ...codexEventsFromLine('{"type":"turn.completed"}')].flatMap(titleFilter())
    expect(got).toEqual([
      { kind: 'title', title: 'Cat On Mat' },
      { kind: 'text', text: 'It says the cat sat on the mat.' },
      { kind: 'end', ok: true },
    ])
  })
})
