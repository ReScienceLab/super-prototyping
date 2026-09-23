# Raycast (iOS): Ask AI, models & presets

> For someone who asks different AI models for different tasks, Raycast's iOS app is a fast keyboard-first composer that streams an answer with actions attached, and lets you switch models or pick a saved preset — a persona bundled with a provider — instead of rebuilding the same prompt every time.

## Problem
Someone who uses more than one AI model or provider for different tasks has to open a separate app or web tab for each, and re-type the same context or system prompt every time, when they want one fast place to ask a question and reuse a saved setup.

## Users
- **Primary: someone typing a question into the Ask AI composer and reading the streamed answer.** Copying it or acting on it.
- **Secondary: someone switching which model answers.** Via the Models sheet.
- **Secondary: someone picking a preset.** A bundled persona and provider, reflected back on the launcher afterward.

## Value
One quick-open composer that streams an answer with actions attached. A model picker and a presets list, so repeating a task with the same model or persona is one pick, not a rebuilt prompt.

## Scope
**In:** the Ask AI conversation end to end — empty, typed, thinking, streaming, answered with actions, scrolled; the Models sheet over the dimmed launcher; the launcher at rest; opening the Presets list and choosing from it, reflected on the launcher afterward.

**Out:** creating or editing a preset, account or API-key setup, conversation history or search, the rest of Raycast's command launcher, settings — none of these are among the boards here.

## Success
Observable signs it works: someone gets from an empty composer to a copyable answer without leaving the screen; someone can tell which model or preset is active from the launcher before typing; opening the Models sheet or the Presets list doesn't lose whatever was already typed in the composer.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Ask Anything | Empty composer, ready for a prompt | empty (not mocked: failed/errored request) |
| Prompt typed | Composer with a typed prompt | ready to send |
| Thinking | Answer pending | thinking indicator |
| Streaming | Answer arriving | partial text |
| Answer + actions | Completed answer | actions row visible (e.g. copy) |
| Answer scrolled | Same conversation | scrolled further |
| Models sheet | Model picker | sheet open over a dimmed launcher (not mocked: a model actually chosen) |
| Home + composer | Launcher at rest | idle composer |
| Presets opening | Presets list opening | mid-transition |
| Presets | Full presets list | eleven rows (ten providers plus Raycast) |
| Home / Perplexity | Launcher after a preset is picked | Perplexity preset reflected in the composer |

Ask Anything → Prompt typed → (send) Thinking → Streaming → Answer + actions → Answer scrolled. From any point, opening the model picker shows Models sheet over Home + composer. From Home + composer, opening Presets shows Presets opening → Presets; picking one returns to the launcher as Home / Perplexity, now reflecting that preset.

## Open questions
- 🔴 What happens to an in-progress prompt if the Models sheet or Presets list is opened mid-type. Not shown.
- 🔴 What a failed or errored answer looks like. Not mocked; only the successful path is shown.
- 🔴 How a preset is created or edited. Not in these boards.

## Riskiest assumptions
1. People want to pick a model per question rather than rely on one fixed default. Cheapest test: in a beta, log how often the Models sheet is opened versus how often the default is left alone.
2. Presets get reused rather than people just retyping instructions each time. Cheapest test: measure preset re-selection rate after someone's first use of one.
3. A mobile keyboard-first composer is fast enough to beat opening a browser tab to the same model directly. Cheapest test: a timed task comparing Raycast to a browser tab for the same prompt.
