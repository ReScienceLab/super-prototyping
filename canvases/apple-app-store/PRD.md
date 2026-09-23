# App Store (iOS)

> For iPhone owners choosing, installing and paying for apps and games, the App Store is Apple's one storefront and account gate — so browsing, purchasing and sign-in all have to work one-handed without ever feeling in doubt about what's being charged.

## Problem
Someone wants a specific app, or just something new to play, and iOS gives them exactly one legitimate channel to get it. They arrive not knowing whether they'll be interrupted by a permission prompt, asked to sign in, or shown a subscription offer that isn't clearly one-time versus recurring. A returning shopper gets through; a first-run or mid-purchase stall (an unfamiliar sheet, an unexpected sign-in) is where they abandon.

## Users
- Primary: the browsing shopper. Opens the app to see what's new (Today), hunts a specific title (Search), or dips into a category (Games, Apps).
- Secondary: the returning subscriber. Comes back to Arcade for what a subscription includes, or to Apple Account to see what they're paying for.
- Secondary: the first-run device. A newly set-up iPhone that has never granted the App Store permission to send notifications.

## Value
One storefront Apple vouches for: the same account signs in everywhere, the same gate stands between browsing and paying, and every listing is reviewed before it ships. The one thing it must do well is get someone from "I want this" to "it's installed or subscribed" in the fewest, least surprising steps.

## Scope
**In:** first-run notifications onboarding and its system permission alert; the Today tab's editorial cards; the Apple Account sheet; Games and Apps category browsing; the Arcade subscription pitch; Search with its Browse tiles; the sign-in sheet that gates a purchase.

**Out:** the payment sheet past sign-in, individual app/game detail pages, ratings and reviews, family sharing, redeeming a code, parental controls, and the Updates tab.

## Success
A visitor gets past the notifications sheet (accept or dismiss) without leaving the app; opening Search lands them on a Browse tile or a result rather than a blank screen; reaching the sign-in sheet on a purchase ends in completing it, not backing out.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Notifications onboarding | First-run sheet asking to turn on App Store notifications | shown, over Today (not mocked: dismissed/declined) |
| Permission alert | The system-level notifications permission dialog | shown, over the onboarding sheet (not mocked: Allow / Don't Allow tapped) |
| Today | Editorial front page, three featured cards | loaded, three cards (not mocked: empty/offline, loading, scrolled further) |
| Apple Account sheet | Grouped list of account actions | signed in, loaded (not mocked: signed out, loading) |
| Games | Category browse for games | loaded grid (not mocked: empty, loading) |
| Apps | Category browse for apps | loaded grid (not mocked: empty, loading) |
| Arcade | Subscription pitch, one-month offer | offer shown (not mocked: already subscribed, offer redeemed/expired) |
| Search | Search tab with Browse discovery tiles | pre-query "Browse" state (not mocked: query typed, results list, no results) |
| Sign in to purchase | Sign-in sheet gating a purchase, keyboard up | credentials entry (not mocked: error, Face ID prompt, success) |

Today → (first run only) Notifications onboarding → Permission alert → back to Today. Today, Games, Apps, Arcade and Search are peer tabs on one tab bar. From any of them, Get/Buy → Sign in to purchase if not already signed in. The account glyph on any tab → Apple Account sheet.

## Open questions
- What happens right after a successful sign-in on a purchase — silent completion, or a confirmation state? Not shown in these boards.
- What Today shows with no cards or on a failed load. Not captured.
- Whether the "not mocked" states above (Search results, already-subscribed Arcade) belong in a next pass, who decides.

## Riskiest assumptions
1. A first-time user reads the notifications sheet as safe to decline rather than something they must resolve. Cheapest test: show the onboarding board to a handful of people and watch whether they tap Allow or dismiss.
2. The sign-in sheet, not something earlier, is where purchases are lost. Cheapest test: check the real app's funnel from Get/Buy to completed purchase for where the drop happens.
3. Search's Browse tiles get used before anyone types a query. Cheapest test: five-second test — show the Search board and ask what someone would tap first.
