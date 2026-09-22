import { describe, expect, it } from 'vitest'
import { attach, emit, ended, newRun, runSummary, sseFrame } from './agentRun'

describe('attach', () => {
  it('replays from the cursor, then follows, until detached', () => {
    const run = newRun('r1')
    emit(run, 'text', { text: 'a' })
    emit(run, 'text', { text: 'b' })
    const seen: number[] = []
    const detach = attach(run, 1, (e) => seen.push(e.id))
    expect(seen).toEqual([2])
    emit(run, 'text', { text: 'c' })
    expect(seen).toEqual([2, 3])
    detach()
    emit(run, 'end', { ok: true })
    expect(seen).toEqual([2, 3])
    expect(ended(run)).toBe(true)
  })

  it('gives a fresh page the whole run from zero', () => {
    const run = newRun('r2')
    emit(run, 'text', { text: 'a' })
    emit(run, 'end', { ok: true })
    const seen: string[] = []
    attach(run, 0, (e) => seen.push(e.event))
    expect(seen).toEqual(['text', 'end'])
  })

  it('refuses an event after the end', () => {
    const run = newRun('r3')
    emit(run, 'end', { ok: false, message: 'stopped' })
    expect(() => emit(run, 'text', { text: 'late' })).toThrow(/has ended/)
  })
})

describe('sseFrame', () => {
  it('writes id, event and json data', () => {
    expect(sseFrame({ id: 7, event: 'text', data: { text: 'hi\n' } })).toBe(
      'id: 7\nevent: text\ndata: {"text":"hi\\n"}\n\n',
    )
  })
})

describe('runSummary', () => {
  it('reads the history entry off the events', () => {
    const run = newRun('r')
    emit(run, 'start', { kind: 'start', agent: 'claude', prompt: 'say hi', title: 'say hi', at: 5, project: 'p' })
    expect(runSummary(run)).toEqual({ id: 'r', agent: 'claude', title: 'say hi', startedAt: 5, project: 'p', status: 'running' })
    emit(run, 'title', { kind: 'title', title: 'Greeting Exchange' })
    emit(run, 'end', { kind: 'end', ok: false, message: 'stopped' })
    expect(runSummary(run)).toEqual({ id: 'r', agent: 'claude', title: 'Greeting Exchange', startedAt: 5, project: 'p', status: 'failed' })
    expect(() => runSummary(newRun('x'))).toThrow('no start event')
  })
})
