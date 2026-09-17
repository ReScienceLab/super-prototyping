import { describe, expect, it } from 'vitest'
import { titleFilter } from './claudeStream'
import { codexEventsFromLine } from './codexStream'
import modelRefused from './fixtures/codex-0.146.0-model-refused.jsonl?raw'
import editsAFile from './fixtures/codex-0.146.0-edits-a-file.jsonl?raw'
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

  it('ends a failed turn once, with the one sentence out of the response body', () => {
    const got = events(modelRefused)
    // The two `error` items are warnings and the bare `error` frame repeats turn.failed: none
    // of them may end the run, or emit would refuse the second end.
    expect(got.map((e) => e.kind)).toEqual(['end'])
    // Verbatim, but the sentence and not the JSON envelope codex wrapped it in.
    expect(got[0]).toEqual({
      kind: 'end',
      ok: false,
      message:
        "The 'gpt-6-astra' model requires a newer version of Codex. Please upgrade to the latest app or CLI and try again.",
    })
  })

  it('leaves a failure that is not a response body alone', () => {
    const line = '{"type":"turn.failed","error":{"message":"stream disconnected before completion"}}'
    expect(codexEventsFromLine(line)).toEqual([
      { kind: 'end', ok: false, message: 'stream disconnected before completion' },
    ])
  })

  it('reads a file change, a reasoning summary, and a reply on either side of the work', () => {
    const got = events(editsAFile)
    // A turn that thinks, says what it is about to do, patches a file, checks it, and answers:
    // the text is not one block at the end, which is as close to streaming as this wire gets.
    expect(got.map((e) => e.kind)).toEqual([
      'thinking',
      'text',
      'tool',
      'tool_done',
      'tool',
      'tool_done',
      'text',
      'end',
    ])
    expect(got[2]).toEqual({ kind: 'tool', id: 'item_2', name: 'Edit', detail: '/tmp/probe/note.txt' })
    expect(got[3]).toEqual({ kind: 'tool_done', id: 'item_2', ok: true })
    expect(got.at(-2)).toEqual({ kind: 'text', text: 'Done. `note.txt` now says `ping`.' })
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
