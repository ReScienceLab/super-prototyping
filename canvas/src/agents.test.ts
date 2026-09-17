import { describe, expect, it } from 'vitest'
import { AGENTS } from './agents'
import cache from './fixtures/codex-0.154.0-models-cache.json'

const def = (id: string) => AGENTS.find((a) => a.id === id)!
const spec = { preamble: 'P', boards: '/boards', model: '', effort: '' }

describe('AGENTS', () => {
  it('sends no model or effort flag until the composer has picked one', () => {
    for (const agent of AGENTS) {
      const args = agent.args(spec).join(' ')
      expect(args).not.toMatch(/--model|--effort|model_reasoning_effort|(^| )-m( |$)/)
    }
  })

  it('puts the choice on each CLI in its own words', () => {
    expect(def('claude').args({ ...spec, model: 'opus', effort: 'high' })).toEqual(
      expect.arrayContaining(['--model', 'opus', '--effort', 'high']),
    )
    // Codex has no effort flag: the level is a config override, and the model a short flag.
    const codex = def('codex').args({ ...spec, model: 'gpt-6-astra', effort: 'xhigh' })
    expect(codex).toEqual(expect.arrayContaining(['-m', 'gpt-6-astra']))
    expect(codex).toEqual(expect.arrayContaining(['-c', 'model_reasoning_effort="xhigh"']))
  })

  // The fixture is ~/.codex/models_cache.json as codex 0.154.0 wrote it, with the fields this
  // does not read cut out; the models, their order and their levels are as recorded.
  it('reads codex models from the list codex itself caches, as its own picker shows them', () => {
    const models = def('codex').modelsFile!.read(cache)
    expect(models.map((m) => m.name)).toEqual([
      'GPT-5.6-Sol',
      'GPT-6-Astra',
      'GPT-5.6-Terra',
      'GPT-5.6-Luna',
      'GPT-5.5',
    ])
    expect(models[1]).toEqual({
      id: 'gpt-6-astra',
      name: 'GPT-6-Astra',
      window: 272_000,
      efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    })
    // Not every model takes every level, which is why the slider reads them off the model.
    expect(models.at(-1)!.efforts).toEqual(['low', 'medium', 'high', 'xhigh'])
  })

  it('offers nothing when codex has cached nothing', () => {
    expect(def('codex').modelsFile!.read({})).toEqual([])
  })
})
