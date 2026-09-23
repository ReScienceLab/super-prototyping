# X

> For someone converting their account to a Professional one, and for someone tuning what X interrupts them about, X keeps the flow to a few clear screens instead of burying the choice in general settings.

## Problem
An account holder who wants to be treated as a business or creator has to find and complete an account-type conversion; a general user gets interrupted by location prompts, push notifications and Spaces reminders they may not want in their current form. Inferred from the screens; no interview.

## Users
- Primary: an account holder converting to a Professional (Business or Creator) account.
- Secondary: any user adjusting Explore's location setting, a push notification toggle, or setting a reminder for an upcoming Space.

## Value
Each of these is a short, linear flow — a splash, a couple of choices, a confirmation — rather than a single dense settings page, so a user completes it without hunting. It must make an infrequent, easy-to-avoid action (converting an account, turning off a notification, setting a Space reminder) quick enough to finish.

## Scope
**In:** editing a profile before conversion; the finished professional profile; the professional-account splash, category picker, account-type picker and welcome screen; Explore's location toggle (on and off) and the Explore tab itself; push notification settings (all on, and "new followers" off); setting and confirming a reminder for a Space, and the calendar it lives on.

**Out:** posting or composing, the home timeline, DMs, search itself (only the sheet reached from it is shown), any Professional-account dashboard after setup, joining a Space.

## Success
The professional conversion flow is completed rather than abandoned at the splash or category step; a location or notification toggle stays at the setting a user chose; a Space reminder set on the calendar results in a return visit near the event.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Edit profile | Edit profile fields before converting | sheet over the profile it edits |
| Professional profile | Show the finished professional profile | loaded, header + tabs + one post |
| X for Professionals | Pitch converting to a professional account | hero, pitch, legal note, "Agree & Continue" |
| Select a category | Choose the account's professional category | search field, ten rows, Next disabled |
| Category selected | Confirm the chosen category | one row checked, Next enabled |
| Select an account type | Choose Business or Creator | two cards |
| Welcome | Confirm the conversion and offer setup steps | "Welcome to X for Professionals", four rows |
| Explore settings | Show Explore's location setting | location on, picker row dimmed |
| Explore location off | Turn Explore's location off | switch off, picker row live |
| Explore | Browse Explore's live event and topics | live-event hero, five topic tabs, news list |
| Push notifications | Show all push notification toggles | all nine switches on |
| New followers off | Turn off one push notification | "new followers" switch off |
| Set a reminder | Set a reminder for a Space | sheet over a dimmed calendar, "Set reminder" live |
| Reminder set | Confirm the reminder was set | confirmation banner, button changed |
| Spaces in your calendar | Show the calendar a reminder was set from | host card, three events, one LIVE |

Edit profile → save → Professional profile. Professional profile → convert → X for Professionals → Agree & Continue → Select a category → pick one → Category selected → Next → Select an account type → pick one → Welcome. Explore settings → toggle off → Explore location off. Explore (tab) is reached independently. Push notifications → toggle "new followers" off → New followers off. Spaces in your calendar → tap a Space → Set a reminder → confirm → Reminder set.

## Open questions
Owner: product owner.

- What happens after Welcome's four setup rows are each completed — is there a dashboard this set doesn't show?
- Does turning Explore's location off change what Explore shows, or only stop asking for location?
- Does a Space reminder send a push, and how far ahead of the Space does it fire?

## Riskiest assumptions
1. The professional conversion flow is short enough that people finish it once started rather than abandoning at the category or account-type step. Cheapest test: watch five people run the flow in a clickable prototype and note where they hesitate or quit.
2. Turning off one push notification (new followers) is what people want, not all-or-nothing muting. Cheapest test: check, in a five-person diary study, how many people who mute anything mute only one toggle vs. several.
3. A Space reminder set from the calendar is remembered and acted on later rather than forgotten once the sheet closes. Cheapest test: set reminders for five real upcoming Spaces with test users and see who returns near start time.
