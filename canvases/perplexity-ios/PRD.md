# Perplexity (iOS)

> For someone who wants a synthesized answer instead of a list of links to read themselves, Perplexity is the iOS app to sign up for by email, ask by typing or voice, and keep an eye on — via the Dynamic Island — while a voice or reasoning query is still running, without holding the app open.

## Problem
Someone asking a question today gets a list of links from a search engine and has to read several pages themselves, or gets an AI chat answer with no way to keep working — or leave the phone locked — while a slower voice or reasoning query is still thinking.

## Users
- **Primary: someone signing up by email and code, then asking questions from Home.** Typed or by voice.
- **Secondary: someone glancing at the Dynamic Island.** To see whether a voice or reasoning query is still running, without opening the app.
- **Secondary: someone deciding whether to buy Perplexity Pro.**

## Value
Email-and-code sign-up instead of a password to manage. One Home for typed or voice queries. A Live Activity so a slow answer's progress is visible from the lock screen or another app, instead of holding Perplexity open and waiting.

## Scope
**In:** email sign-up (empty, typed, check-your-email, code entry, code accepted); the Pro paywall and its purchase-confirmed state; Home before and after the voice tooltip; the Dynamic Island for a voice session and a reasoning session, each compact and expanded.

**Out:** the answer or chat screen itself once a query is open, account settings, canceling or managing a subscription, social sign-in beyond the pills shown on the splash, search history — none of these are among the boards here.

## Success
Observable signs it works: a new signer-up reaches Home without getting stuck at the code step; someone glancing at a compact island can tell a voice session from a reasoning session without opening the app; someone who dismisses the Home tooltip doesn't need it shown again to know where voice entry is.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Splash | App launch, sign-in options | four sign-in pills |
| Continue with email | Email sign-in field | empty, keyboard up |
| Address typed | Email sign-in field | address typed, button live |
| Check your email | Confirmation a code was sent | envelope lockup |
| Enter code | Code-entry field | focused, caret (not mocked: wrong code) |
| Code accepted | Code submitted | spinner, no caret |
| Perplexity Pro | Subscription paywall | serif hero, chip rows, two plans |
| Purchase confirmed | The paywall dimmed under the purchase alert | scrim + iOS alert on top |
| Home, voice tooltip | Home screen | tooltip pointing at voice entry |
| Home | Home screen at rest | tooltip dismissed |
| Voice, compact | Dynamic Island, a live voice session | collapsed pill |
| Voice, expanded | Dynamic Island, a live voice session | expanded panel |
| Reasoning, compact | Dynamic Island, a live reasoning session | collapsed pill |
| Reasoning, expanded | Dynamic Island, a live reasoning session | expanded panel, progress row |

Continue with email → Address typed → (submit) Check your email → Enter code → Code accepted → Home. Home shows the voice tooltip (Home, voice tooltip) until dismissed (Home). Starting a voice or reasoning query from Home surfaces a Live Activity on the Dynamic Island — Voice compact ↔ expanded, or Reasoning compact ↔ expanded — while the app is backgrounded or the phone is locked. Where the Pro paywall is reached from is not shown by these boards.

## Open questions
- 🔴 What the answer or chat screen itself looks like once a query completes. Not in scope of these boards.
- 🔴 What happens on a wrong code. Not shown; only the accepted path is mocked.
- 🔴 Where the paywall sits in the flow — first run, after a number of free queries, or opt-in from settings. Not shown by these boards alone.

## Riskiest assumptions
1. A one-time email code is an acceptable primary sign-up step alongside the Apple/Google pills shown on the splash. Cheapest test: measure completion on the pill path versus the email-code path.
2. Users will pay for Pro on first paywall exposure rather than needing a free-use period first. Cheapest test: A/B the paywall's timing — immediate versus after N free queries.
3. A Live Activity is something people actually leave running and glance at, rather than dismiss. Cheapest test: measure island engagement versus dismiss rate in a beta.
