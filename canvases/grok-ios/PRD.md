# Grok, iOS

> For anyone who wants an AI assistant reachable from the Home Screen and by voice, the Grok app is xAI's iOS app for that, with a SuperGrok subscription and a Grok Bot upsell layered on top.

## Problem
Someone wants quick access to Grok without opening the app first — a Home Screen widget — or wants to talk to it rather than type. Along the way the app also has to move that person through a Terms update, a subscription pitch, and an unrelated bot product, without losing them before they reach Home.

## Users
- Primary: a new or existing Grok user setting up the Home Screen widget, deciding on SuperGrok, and using voice mode.
- Secondary: an existing user working through a required Terms-of-Service update and being introduced to Grok Bot along the way.

## Value
Grok reachable in one tap from the Home Screen, a voice mode presented as a companion rather than a plain waveform, and app-wide settings and account controls in one place.

## Scope
**In:** the Home Screen widget and its two-step setup guide, the Voice Settings sheet, the SuperGrok paywall, the Terms update interstitial (default and loading), the signed-in SuperGrok home with its composer, voice selection on two voices, Settings at three scroll positions, the Introducing Grok Bot sheet, and its App Store listing.

**Out:** what happens after "Upgrade to Access" on Grok Bot (an in-app screen or an external redirect), what SuperGrok home looks like for someone who declines the paywall, and anything past the three captured Settings scroll positions.

## Success
Someone who opens Voice settings understands the recording state and how to stop it. Someone shown the two-step widget guide completes it and adds the widget. Someone who reaches the Terms update and the Grok Bot sheet back-to-back still lands on Home rather than dropping off.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Home Screen widget | The widget on the system widget gallery | default |
| Widget guide | In-app walkthrough for adding the widget | step 1 (jiggle icons), step 4 (add widget) |
| Voice settings | Sheet over the voice companion scene while recording | recording |
| SuperGrok paywall | Subscription pitch, features and plans | default |
| Terms update | Required Terms-of-Service acknowledgment | default, signing out (loading) |
| SuperGrok home | Signed-in landing screen with the composer | default; mid-conversation (not mocked) |
| Voice selection | Choosing Grok's spoken voice | Ara selected, Eve selected |
| Settings | Account and app settings | top (profile, General), scrolled to Voice, bottom (Sign out) |
| Introducing Grok Bot | Announcement sheet over the Terms page | shown |
| App Store, Grok Bot | Store listing for the Grok Bot product | default |

The widget guide leads to the system Home Screen widget. Signing in or an app update shows the Terms update, which can lead into signing out (loading) or on to the Introducing Grok Bot sheet and its App Store listing; declining or completing either returns to SuperGrok home. From SuperGrok home, opening voice mode reaches Voice settings, and the composer's voice picker reaches Voice selection. Settings is reachable independently and scrolls through its three captured positions.

## Open questions
- What happens after "Upgrade to Access" on the Grok Bot sheet — an in-app screen or an external link? (not shown)
- What does SuperGrok home look like for someone who declines the paywall? (not shown)
- What's above and below the three captured Settings scroll positions? (partially shown)

## Riskiest assumptions
1. The two-step guide is enough to get someone to add the Home Screen widget, without a stronger in-app nudge. Cheapest test: a moderated walkthrough measuring who reaches "Add Widget."
2. The 3D voice companion makes voice mode feel more engaging rather than reading as decorative and battery-heavy. Cheapest test: a short reaction test comparing voice mode with and without the companion visual.
3. Sequencing a Terms update and a Grok Bot upsell back-to-back, before Home, doesn't push people to abandon. Cheapest test: a funnel test measuring drop-off across that sequence with a small cohort.
