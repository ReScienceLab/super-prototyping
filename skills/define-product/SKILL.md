---
name: define-product
description: Work out with the user what their product is before anything is drawn, and write it down as PRD.md at the root of their project, where the canvas shows it as a tab, ending in a short PRD whose screen inventory new-ui-mock designs from. Use when a user starts a new product or project, says they have an idea, asks for a PRD, spec or product brief, or asks for screens when nobody has said who they are for or what problem they solve.
license: Apache-2.0
metadata:
  managed-by: super-prototyping
---

# Define the product

Before a screen, one page that says what the product is for. It is a
conversation with the user, and the page is its record: `PRD.md` at the
root of their project, beside `canvases/`. The canvas shows it as a tab
before the project's canvases and updates it when it is rewritten, so the
user watches it fill in. The user can edit it on that tab too, so read the
file again before rewriting it.

It is optional. Offer it when someone starts from an idea; never make it a
gate. A user who wants screens now gets screens, and the PRD can come later.

---

## 1. Interview, do not fill a template

The user knows things you do not, and a template filled from a one-line
idea is invented content that reads like decisions.

- Ask **one or two questions at a time**, in the user's language. Offer
  lettered options (`A.` `B.` `C.` and "or tell me") so a reply can be one
  letter, and say which you would pick and why.
- **Problem before solution.** Get these, in this order, before any feature:
  1. Who, specifically, has the problem. One person you could picture, not
     "users".
  2. What they do today instead, and what it costs them. A real moment
     beats a statistic.
  3. Why now, or why this person is the one to build it.
- Then the solution: the one thing it must do well, and what it will not do.
- Then success: how anyone would know it worked, as something observable.
- Push back once on a vague answer ("everyone", "it's faster", "an AI
  that...") with a sharper question. Do not push back twice; write TBD.
- Stop when every section in §2 is 🟢 or explicitly 🔴 TBD. For most ideas
  that is five to eight exchanges. Do not drag it out to be thorough.

Write the file after the first answers, not at the end. Update it as each
answer lands, so the tab is the conversation's running state.

---

## 2. What PRD.md holds

Keep it to one screen of reading.

```markdown
# <Product name>

> One sentence: who it is for, what it lets them do, and why that matters.

## Problem
The person, the moment, what they do today, what it costs them.

## Users
Primary user, and anyone secondary. What each one is trying to get done.

## Value
*Why this over what they do now, and the one thing it must do well.*

## Scope
**In:** the few things the first version does.

**Out:** what it deliberately does not, and why.

## Success
*Observable signs it worked: a behaviour, a number, a thing a user says.*

## Screens
| Screen | Purpose | States |
|---|---|---|
| Home | ... | empty, loaded, error |

The flows between them, one line each.

## Open questions
- ... (TBD, who decides)

## Riskiest assumptions
1. ... and the cheapest way to test it.
```

Keep a status line per section while it is being written (🟢 settled,
🟡 partial, 🔴 TBD) and drop the markers once it is settled. Never fill a
🔴 with a plausible guess: a TBD is honest and tells the user what is left
to decide, a guess gets built.

The Screens table is what new-ui-mock designs from. Each row is a board
`new-ui-mock` can make, and **States** are the unhappy states it must design
too: empty, loading, error, the longest plausible content.

---

## 3. Close it out

1. **Red-team it.** Name the assumptions that would sink the product if
   wrong, and the cheapest test of each. Write them under *Riskiest
   assumptions*. Keep it short and specific.
2. Read the one-sentence summary back to the user and ask if it is right.
3. Offer the next step: mock the first screen from the Screens table with
   `new-ui-mock`, or clone a reference app with `clone-prototype` when the
   user named one as "like X".

---

## Revisiting it

When a design decision on the canvas changes scope, a screen or an answer,
update PRD.md in the same turn and say what changed. When the user asks for
screens and a PRD.md exists, read it first: its users, copy and states
ground the mock.
