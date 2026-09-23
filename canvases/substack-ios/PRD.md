# Substack

> For a reader who follows several writers, Substack's home feed turns their scattered subscriptions into one place to catch a short note, get pulled back into an article, and find someone new worth following.

## Problem
Someone subscribed to several newsletters has no single place to catch the short, social-style updates (Notes) alongside their longer reads, and articles they started but didn't finish quietly drop out of sight. Inferred from the screens; no interview.

## Users
- Primary: a subscribed reader scrolling a combined feed of notes and article prompts.
- Secondary: a writer who wants their own new post, and their profile, noticed by their readers.

## Value
One feed mixes short notes, a nudge back to an unfinished article ("Keep reading"), a resurfaced older piece, and people to follow — instead of a reader having to check each publication separately. It must keep a reader coming back into the feed rather than letting a subscription go unread.

## Scope
**In:** the notes feed with a publication tile row; the "keep reading" toast reminding a reader of an in-progress article; a run of notes; a writer's own just-published post promoted above their tile row; an older archive piece resurfaced; people to follow; a share-your-profile sheet.

**Out:** the article reader itself, comments or replies on a note, notifications, payments and subscription management, a writer's publishing or analytics dashboard, direct messages.

## Success
A reader taps "Keep reading" and finishes the article; a note in the feed gets a reply or a like; a "people to follow" suggestion results in a new follow; a shared profile link is opened by someone new.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Note in the feed | Show a short social post from someone followed | loaded, with a publication tile row above it |
| Keep reading toast | Nudge a reader back to an unfinished article | article card plus toast |
| Three notes | Show a run of notes from different writers | loaded, one note carrying a badge |
| Just published | Promote a writer's own new post to their readers | loaded, above a scrolled tile row |
| From the archives | Resurface an older piece a reader may have missed | loaded |
| People to follow | Suggest new writers to follow | list at top, a quoted note beneath |
| Share your profile | Let a writer share their own profile | sheet over the feed |

The feed intermixes notes, tile rows, keep-reading toasts and resurfaced/archive prompts in one scroll. A note or tile tap opens the linked article or profile (not mocked here). Share your profile is reached from the writer's own profile (not mocked here) and returns to the feed.

## Open questions
Owner: product owner.

- What decides the mix and order of notes vs. article prompts in one scroll?
- Does "keep reading" expire, or does it always resurface the same unfinished article?
- Who is a "people to follow" suggestion based on?

## Riskiest assumptions
1. A reader wants notes and article prompts interleaved, rather than as two separate tabs. Cheapest test: five readers browsing a combined feed vs. two separate tabs, watch which one gets used unprompted.
2. "Keep reading" toasts get tapped rather than dismissed. Cheapest test: show the toast to ten existing subscribers with a real unfinished article and measure the tap rate.
3. People-to-follow suggestions convert to an actual follow rather than being scrolled past. Cheapest test: seed five suggestions per reader for ten readers and count follows after a week.
