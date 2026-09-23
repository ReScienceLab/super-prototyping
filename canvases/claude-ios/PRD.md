# Claude, iOS

> For anyone asking Claude a question, talking to it by voice, or handing it a file or photo, this is Anthropic's iOS app for doing that from a phone.

## Problem
A person wants an answer, a document explained, or a photo interpreted, right now, without switching to a laptop. Typing a long question on a phone is slow, so voice and attachments are how the app shortens that gap.

## Users
- Primary: someone typing or speaking a question to Claude and reading or hearing the answer.
- Secondary: someone who arrives with something already in hand — a PDF or a photo — and wants Claude to work from it rather than from a description typed out by hand.

## Value
Ask by typing or by voice, hand over a file or photo instead of retyping its contents, and get answers as reusable artifacts rather than only as chat text.

## Scope
**In:** the Home screen across its conversation states (empty, typed, sent, streaming), voice mode across its listening and interrupt states, an artifact card, the Add to Chat attachment sheet, and the file- and photo-attachment flows through to an answer.

**Out:** account and settings, conversation history and search, error states (a failed upload, a network error, a refused answer), what ends a voice session versus what resumes it, and anything past a single artifact card (editing or exporting it).

## Success
Someone finishing a voice turn can say when Claude was listening versus answering. Someone with a document or photo attaches it before typing rather than describing it in words. Someone who opens an artifact card expects a distinct, reusable result rather than another chat bubble.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Home | Ask a question from the composer and read the answer | empty, typed, sent, answer streaming; error sending (not mocked) |
| Voice | Speaking to Claude instead of typing | listening, listening (a later moment), interrupt |
| Artifact card | A distinct, reusable result surfaced from an answer | default |
| Add to Chat | Sheet for attaching a file or a photo | open |
| File attachment | Asking about an attached document | attached, sent, answered |
| Photo attachment | Asking about an attached photo | attached, typed, answered |

Home's composer, once something is typed, moves through sent to a streaming answer. The microphone opens Voice instead. The attachment icon opens Add to Chat, which leads into the file or photo flow. An answer can show an Artifact card.

## Open questions
- What ends or resumes a voice session after the interrupt state? (not shown)
- Is there a settings or account area, and how does someone reach it? (not in this set)
- What does a failed upload, a network error, or a refused answer look like? (not mocked)

## Riskiest assumptions
1. Voice mode's listening/interrupt visuals communicate turn-taking clearly enough that people know when to speak versus wait. Cheapest test: show a few people the three voice states out of context and ask them to describe what's happening in each.
2. Attaching a file or photo before typing is discoverable, rather than people expecting to type a description first. Cheapest test: a first-click test on Home, "how would you ask about this PDF?"
3. An artifact card reads as a separate, reusable output rather than just another message. Cheapest test: a short comprehension test showing the card and asking what tapping it would do.
