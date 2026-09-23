# Spotify

> For a listener opening the app with nothing particular in mind, Spotify's home shows something to play immediately and makes it easy to pull a friend into the same listening session or hand someone a track with a scan.

## Problem
A listener opens a music app without a specific song in mind and either has to search for something or doesn't open it at all. Inferred from the screens; no interview.

## Users
- Primary: a returning listener browsing Home for something to play.
- Secondary: a listener who wants to listen together with someone else (Jam), or hand a track or playlist to someone in person (Spotify Codes).

## Value
Home replaces search-first behaviour with browse-first: a scrollable rail of picks plus full-bleed promos (a live event, an invite to a Jam). It must get someone from opening the app to something playing, or someone else joined, in as few taps as possible.

## Scope
**In:** the Home feed at rest and with its browse rail scrolled; the Jam invitation modal; a live-events promo card; the Spotify Codes share sheet, reached from Search.

**Out:** playback itself (the full-screen Now Playing player), the library/saved tab, actual search results, settings and account, podcast-specific screens.

## Success
A listener taps something from the Home rail rather than going straight to Search; a Jam invite is accepted by at least one other listener; a shared Spotify Code is scanned by someone else and opens the same content.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Home, rail scrolled | Browse personalized picks via a horizontal chip rail | scrolled, account circle pinned in header |
| Jam invitation | Invite others into a shared listening session | full-screen promo over dimmed Home |
| Live events | Promote a live event to the listener | promo card, five-dot carousel |
| Home | Land on personalized picks at rest | at rest, "All" chip selected |
| Spotify Codes | Hand someone a scannable code for a track or playlist | sheet over Search |

Home (at rest) → scroll the rail → Home (rail scrolled). Home → tap a Jam prompt → Jam invitation. Home → a promo slot → Live events. Search → open Codes → Spotify Codes sheet.

## Open questions
Owner: product owner.

- What decides what appears on Home — editorial curation, listening history, or both?
- Does declining a Jam invite dismiss it permanently or resurface it later?
- Who can scan a Spotify Code — anyone with the app, or only a contact?

## Riskiest assumptions
1. Home's picks are relevant enough that listeners stay in browse mode instead of typing into Search immediately. Cheapest test: watch five sessions and time how long each takes from open to first play, Home vs. Search.
2. Jam invites get accepted in the moment rather than ignored. Cheapest test: a Wizard-of-Oz Jam prompt sent to ten pairs of friends, measure the accept rate within five minutes.
3. Spotify Codes get scanned in a real physical handoff, not just glanced at. Cheapest test: print a code on paper for ten people to hand to a friend and see how many scan it.
