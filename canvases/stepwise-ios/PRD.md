# Stepwise

> A step tracker for people who will not open a fitness app: it lives on one
> profile screen, wears a face you picked, and nudges you to move.

This PRD is **reconstructed from a screen recording**, not from the product
team. Everything below is inferred from two states of the shipping iOS app —
the profile screen and the avatar picker — and from what the interface itself
commits to. Where the recording does not say, the section says TBD rather
than guessing. It exists so the boards in this folder have a product behind
them, in the shape `define-product` asks for.

## Problem

Step counting is already free on every phone, and almost nobody looks at it.
The person here is someone who wants the nudge, not the dashboard: they have
Health, or Fitbit, or a watch, and the number sits in an app they open twice a
year. What they do today is nothing — they intend to walk more, the data
agrees they did not, and no screen ever said so at a moment when they could
act.

## Users

**Primary: the lapsed step-counter.** Has the data already, in one to three
other apps. Wants a daily target and a reason to care about it. Measures
success as "I moved today", not as a weekly trend chart.

**Secondary: none visible.** The recording shows no social graph, no friends,
no leaderboard and no sharing affordance. 🔴 TBD whether one exists deeper in.

## Value

*Personality is the retention mechanism.* The whole first screen is given over
to an avatar the size of a hero image, a shuffle button on it, and a picker of
a dozen faces — more screen area than the step count gets. The product's bet
is that a character you chose is what makes a notification land, where a bar
chart does not. The one thing it must do well is **the daily nudge**:
"Movement nudges" is the only toggle in the settings list and the only row
with a control rather than a chevron.

## Scope

**In:** one profile screen; a daily step target (10,000); connected step
sources ("3 apps added"); an avatar identity with a picker and a shuffle; a
movement-nudge notification; a paid tier ("Pro").

**Out:** history and trends, social features, workout types, manual entry.
None of them appear in either state, and the profile screen has no route to
them — the tab bar has exactly two tabs.

## Success

- The nudge is acted on, not dismissed: a walk inside an hour of it.
- The avatar gets changed at least once in the first week. Someone who opens
  the picker has decided the app is theirs.
- Pro conversion off a screen that never pitches: the Pro card on the profile
  is a *status* row ("You're a Pro member / Manage subscription"), so the sell
  happens somewhere this recording does not contain. 🔴 TBD where.

## Screens

| Screen | Purpose | States |
|---|---|---|
| Profile (`01-profile`) | The whole app: identity, target, sources, plan, settings | **as recorded (Pro, 3 apps, target set)**; free tier, where the Pro card is a pitch; no apps connected, where "3 apps added" is an empty prompt; target unset |
| Pick your vibe (`02-pick-your-vibe`) | Choose the avatar, over a dimmed profile | **as recorded (one of 12 selected)**; scrolled, if the grid is longer than the sheet; nothing selected on first run |

Bold is the state the boards draw, because it is the state the recording
contains. The others are named so a reader knows they were considered and not
measured.

**Flow.** Profile → tap the avatar or the shuffle badge → the picker rises as
a sheet over a dimmed profile → tap a face → it takes a green check → dismiss
by grabber or by tapping the scrim → back on the profile with the new face.
The recording shows the sheet already up and one face already checked; the
transition itself is not in it.

## Open questions

- What the second tab is. Its glyph is a person and the profile is already
  the screen in view, so the two tabs are probably Home and Profile with
  Profile selected — but Home is never shown. (Decides: whoever has the app.)
- Whether the avatar grid scrolls past twelve. The sheet's bottom edge is in
  frame and the last row is complete, so twelve may be all of them.
- What "3 apps added" links to, and what the three are. One icon is drawn on
  the tile and the other two are implied by the "+2"-style stack.
- Whether a free tier exists at all, or Pro is the only tier.

## Riskiest assumptions

1. **That a character is worth more than a chart.** Cheapest test: ship the
   picker to half of new users and the same app with a plain initial to the
   other half; compare day-7 nudge response, not installs.
2. **That "3 apps added" is trusted.** If the sources disagree — a watch and a
   phone double-counting — the target is met by arithmetic and the nudge
   stops firing. Cheapest test: instrument how often two sources report the
   same hour, before building any dedupe.
3. **That one toggle is enough notification control.** The moment a user wants
   "not before 9am", a single switch becomes an uninstall. Cheapest test:
   count how many people turn it off and never back on.
