# SnapAction

> For someone with too many flight confirmations, meeting invites and registration deadlines buried in screenshots and messages, SnapAction turns a snapped photo into a dated card it will remind you about before it's too late.

## Problem
People collect things worth acting on later — a flight itinerary, a meeting invite shared in a message, an event registration with a deadline — as screenshots and photos that then sit forgotten in a camera roll. By the time the flight or the registration cutoff arrives, the photo is one of hundreds and nothing showed it in time. Inferred from the screens; no interview.

## Users
- Primary: someone who photographs or forwards things with a date attached (flights, meetings, event registrations, deadlines) and wants them tracked without manual data entry.
- Secondary: 🔴 TBD — whether this is aimed at individuals only, or also collections shared with others.

## Value
A snapped resource becomes a dated card automatically, sorted into a timeline and a day agenda, with expiry countdowns ("3 days left", "overdue") so nothing quietly expires unseen. It must turn a photo into a trustworthy date-aware reminder.

## Scope
**In:** a chronological timeline of saved resources; a day agenda view; batch-selecting resources; grouping resources into tagged collections; a resource detail view (e.g. a flight); viewing a resource that arrived inside another app's thread (e.g. a shared message) as a light sheet.

**Out:** capturing or importing the photo itself, editing or tagging a resource, reminder notifications firing, search, account and sync settings.

## Success
A user opens the timeline and recognizes an item before its deadline rather than after; a batch selection is used to clear or file several expired items at once; a collection holds resources a user returns to.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Timeline | Browse saved resources in date order | loaded, dark appearance; empty (not mocked); light appearance (not mocked) |
| Batch select | Select multiple timeline cards to act on together | selection mode with floating action bar |
| Agenda | See one day's resources at a glance | loaded, blurred header, FAB |
| Collection | Browse a saved, tagged group of resources | loaded (two photos, tag chips, tab bar); empty collection (not mocked) |
| Resource detail | Read one resource's full detail (e.g. a flight) | loaded, mid-scroll |
| View resource | Preview a resource surfaced inside another app's content | sheet over a linked thread, light appearance |

Timeline → tap a card → Resource detail. Timeline → enter select mode → Batch select → act on the selection. Agenda and Timeline list from the same store, filtered to one day vs. all. Collection groups resource cards by tag. View resource is reached from outside the app (a shared link) rather than from Timeline.

## Open questions
Owner: product owner.

- What triggers capture — a share extension, a screenshot listener, a manual photo picker?
- What happens when a deadline passes beyond the card reading "overdue" — does it change state or notify?
- Is this single-user, or does a collection get shared with others?

## Riskiest assumptions
1. People will reliably route the things worth tracking (flights, invites, deadlines) into this app rather than leaving them in Photos/Messages. Cheapest test: a share-sheet prototype with five target users tracking a real week's flights and invites, see how many end up in the app.
2. A snapped photo alone (no manual entry) yields dates and deadlines accurate enough to trust the countdown on. Cheapest test: run extraction against twenty real screenshots of flights, invites and registrations and check the error rate by hand.
3. "Overdue" framing motivates action rather than becoming background noise a user learns to ignore. Cheapest test: a five-person diary study watching whether overdue cards get dismissed unread after the first week.
