# Apple Calendar (iOS)

> For anyone who needs to know what's on their day, Calendar puts today's agenda, the month ahead, and a way to add or join an event one tap from the Home Screen, so a look at the day doesn't mean opening a different app for each piece of it.

## Problem
Someone glances at their phone to know what's next, plans around it, adds a new event, or joins a video call attached to one. Without a native calendar this is scattered across a paper planner, a messaging thread, or a different app per piece of the day.

## Users
- **Primary: someone checking or planning their own day.** Today and Month.
- **Secondary: someone scheduling something new.** New Event.
- **Secondary: someone joining a call tied to an event.** Event details' video call.
- **Secondary: a first-run or just-updated user.** Granting location/notification permissions, reading What's New.

## Value
One glance shows the day, one tap adds an event, and permissions (location, notifications) are asked for only when the feature that needs them is used, not up front.

## Scope
**In:** today's agenda with events and empty, the month grid, creating a new event, viewing an event's details, joining a video call from an event, granting location and notification permissions, the What's New sheet — each in light and dark appearance.

**Out:** multi-calendar management and settings, an invitee/contacts picker, recurring-event editing, a week view, search across events — none of these are among the nine boards here.

## Success
Observable signs it works: someone opens Today and can say what's next without extra taps; New Event gets saved rather than abandoned mid-form; the video call join control on Event details gets tapped rather than overlooked.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Today, with events | Day agenda showing scheduled events | light, dark |
| Today, empty | Day agenda with nothing scheduled | light, dark (not mocked: loading) |
| Month | Month grid view | light, dark |
| What's New | Feature-announcement sheet | light, dark, shown over Today (not mocked: dismissed, multi-page) |
| Location permission | Prompt requesting location access | light, dark (not mocked: Allow / Don't Allow tapped) |
| Notifications permission | Prompt requesting notification access | light, dark (not mocked: Allow / Don't Allow tapped) |
| New Event | Create-event form | light: blank form; dark: Title field focused, keyboard up (not mocked: validation error) |
| Event details | Read view of a scheduled event | light, dark |
| Event details, video call | Event details with a joinable video call | light, dark |

Today is the landing screen; Month is a peer view of the same data. Today → New Event (add) → saved, back to Today. Today or Month → an event → Event details, which shows a video-call join control when the event has one. First run or post-update → What's New over Today; the first use of a location- or notification-dependent feature → the matching permission prompt.

## Open questions
- 🔴 What happens right after New Event is saved — confirmation, or a silent return to Today? Not shown.
- 🔴 What the validation/error state looks like when New Event is saved with required fields missing. Not mocked.
- 🔴 Whether a week view is ever offered alongside Today and Month. Not in these boards.

## Riskiest assumptions
1. People want Month as a peer tab to Today rather than nested under it. Cheapest test: tree-test the two entry points with a handful of users.
2. The location and notification prompts land at a moment people will grant, not reflexively decline. Cheapest test: show the two permission boards standalone and ask "would you allow this here?"
3. Joining a video call straight from Event details gets noticed, not missed. Cheapest test: A/B the button's placement in a clickable prototype and watch whether people find it.
