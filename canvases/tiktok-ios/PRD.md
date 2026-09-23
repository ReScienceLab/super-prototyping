# TikTok

> For someone scrolling short videos and for someone about to post one, TikTok keeps the feed endless and personalized while making it fast to set up a profile and caption a new post.

## Problem
A viewer wants a feed of video that keeps being worth watching without them choosing what's next, and a creator who just recorded a clip wants to get it captioned and posted with minimal friction (a bio, hashtags, a caption) before the moment passes. 🔴 TBD: no interview record for this app; Problem is inferred from the two flows mocked (browsing For You, and bio/caption editing), not from user research captured here.

## Users
Primary: a viewer scrolling the For You feed, watching, scrubbing and reading captions. Secondary: a creator setting up their bio and captioning a post before publishing it.

## Value
For You keeps one video full-screen with everything else (scrubbing, captions, the marquee) layered on top rather than interrupting it; the bio and caption flows keep account setup and posting to a few short screens. The one thing it must do well: never make the viewer or the poster stop and think about the interface.

## Scope
**In:** editing a profile bio (empty and filled); the profile screen; captioning a new post (empty, with keyboard, with hashtag suggestions, with caption entered); the For You feed at rest, mid-scrub, released, playing, pull-to-refresh, and the next post; a caption shown expanded and collapsed.

**Out:** recording or editing the video itself, comments, DMs, LIVE, Shop, search, notifications, the Following/Friends feed tabs — none of these have a screen in this set.

## Success
Observable signs: a bio is filled in and saved rather than abandoned; a caption gets hashtags added rather than posted blank; a viewer scrubs to find a moment rather than abandoning the video; an expanded caption gets read rather than immediately collapsed again. 🔴 TBD: no usage data exists to confirm any of this.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Bio, empty | Start writing a profile bio | empty |
| Bio, filled | Confirm a written bio before saving | filled |
| Profile | Show the finished profile and its content | loaded |
| Post, empty | Start captioning a new post | empty |
| Post, keyboard | Type a caption | keyboard open |
| Post, hashtags | Add hashtags to a caption | hashtag suggestions showing |
| Post, caption | Confirm a finished caption before posting | caption entered |
| For You | Watch a video at rest | at rest, chip and two-line caption |
| Scrubbing | Seek within the playing video | finger down, time readout, paused |
| Scrub released | Settle after seeking | bar part-expanded |
| Playing | Watch the video play on | playing, caption marquee scrolling |
| Pull to refresh | Pull down to load a new post | mid-drag, "Drag down to refresh" |
| Next post | Land on the next video at rest | at rest, resting progress line |
| Caption expanded | Read a post's full caption | expanded, several lines |
| Caption collapsed | Return the caption to its compact form | collapsed, two lines |

Bio, empty → type → Bio, filled → Profile. Profile → start a post → Post, empty → Post, keyboard → Post, hashtags → Post, caption → post (leaves this set). For You → swipe → Next post; tap-hold → Scrubbing → release → Scrub released → Playing. Tap a caption → Caption expanded ⇄ Caption collapsed.

## Open questions
- 🔴 What decides what plays next in For You — this set only shows one account's clips, not the ranking behind them. (product owner)
- 🔴 Can a caption be posted with zero hashtags, or are hashtags required? (product owner)
- 🔴 Does pull-to-refresh reload the whole feed or insert one new post? (product owner)

## Riskiest assumptions
1. A viewer keeps watching without ever needing to search or browse deliberately — the feed alone is enough. Cheapest test: watch five people's first three minutes in a prototype feed and count any reach for search.
2. Hashtag suggestions actually get picked, rather than typed manually or skipped. Cheapest test: instrument the hashtag screen in a clickable prototype with ten testers captioning a real clip.
3. A collapsed caption is enough for most posts, and expansion is rare rather than the default reading mode. Cheapest test: show ten sample captions at the collapsed length and ask five readers whether they'd tap to expand.
