# Apple Photos (iOS)

> For anyone with photos on their iPhone, Photos is the single grid that holds every shot, with the update notes and permission prompts that gate seeing it, so it's what "look at my pictures" means on iOS.

## Problem
Someone wants to find or relive a photo they took. On iOS, Photos is the only place to do that — there's no OS-level alternative — so its grid, its update messaging and its permission asks are the entire experience of "open my pictures."

## Users
- Primary: someone browsing or hunting for a specific photo. All Photos.
- Secondary: someone who just updated the app. Shown What's New.
- Secondary: a first-run user deciding whether to allow notifications.

## Value
Every photo in one scrollable grid, with update messaging and permission asks layered over it rather than blocking it.

## Scope
**In:** the All Photos grid, the What's New sheet, the Notifications permission prompt.

**Out:** individual photo viewing or editing, albums, search, sharing, Memories/For You curation, iCloud sync status.

## Success
Someone lands on All Photos and can locate a recent photo without extra taps; What's New gets dismissed (read or skipped) without blocking the grid; the notifications prompt gets answered rather than stalling the app.

## Screens
| Screen | Purpose | States |
|---|---|---|
| All Photos | Full photo library grid | loaded grid with photos (not mocked: empty library, loading, permission-denied placeholder) |
| What's New | Update-announcement sheet | shown as an overlay over All Photos (not mocked: dismissed, multiple update pages) |
| Notifications | System-style permission prompt | shown as an alert over All Photos (not mocked: Allow / Don't Allow tapped) |

The app opens to All Photos. On first run after an update, What's New appears over it; dismissing returns to All Photos. The Notifications prompt can appear over All Photos independently of What's New.

## Open questions
- What All Photos looks like with zero photos.
- Whether What's New and the Notifications prompt can queue in the same session, and in what order.

## Riskiest assumptions
1. People read What's New rather than reflexively dismissing it. Cheapest test: show the board and time how long before someone taps away.
2. The notifications prompt's timing — over the grid, not before any content — doesn't feel like an ambush. Cheapest test: ask a few people mid-flow how the prompt felt.
3. A flat, unsorted grid is enough for someone to find a specific photo. Cheapest test: give someone a target photo and the board (or the real app), time how they search.
