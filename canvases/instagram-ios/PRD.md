# Instagram (iOS)

> For someone keeping a public or private photo-and-video profile, and for the people who follow them, Instagram is the one iOS app for browsing a profile's grid, Reels, Reposts and Tagged tabs, switching between a Following and a Favorites feed, watching Reels fullscreen, and checking in from the home screen without opening the app at all.

## Problem
Someone who posts photos and videos wants one public (or private) profile other people can browse, and someone who follows accounts wants a feed of what those accounts post. Without it, sharing is scattered across texts, camera-roll exports and single-purpose apps, and there is no one place to see a person's whole post history, their short-form video, or a smaller curated subset of who they follow apart from everyone else.

## Users
- Primary: someone browsing another account's profile. Its header, grid, Reels, Reposts and Tagged tabs, whether that account is a regular personal account, private, a verified business or a verified creator.
- Secondary: someone browsing their own home feed. Switching between everyone they follow and a smaller Favorites list, and watching Reels fullscreen.
- Secondary: someone who wants Instagram glanceable from the iOS home screen. Messages, Stories, Suggested Reels, Shortcuts and Search, without a launch.

## Value
One profile layout that adapts to account type — a locked panel for private, a category and link row for a business, a Subscribe button for a creator — so a visitor always knows what they can see and do. One feed with a fast switch to a smaller Favorites list. Home-screen widgets that show stories, messages and reels without opening the app.

## Scope
**In:** a profile at the top of the scroll and scrolled past the fold; its Reels, Reposts and Tagged tabs; a private account's locked state; a verified business profile; a verified creator profile; the same profile geometry filled from a live account; the home feed with the Following/Favorites switcher open; the Following feed; the Favorites feed both empty and populated; Reels fullscreen with and without the screen-recording toast; five iOS home-screen widgets.

**Out:** posting or composing a photo or Reel, Stories creation or fullscreen Stories viewing, Direct Messages beyond a widget's entry point, Explore or in-app search, commenting, liking, following/unfollowing, notifications, account settings.

## Success
A visitor to a private account understands they cannot see its content without asking; a visitor to a business or creator profile can tell what sets it apart (category, link, Subscribe) without a second read; someone with a Favorites list taps the switcher to reach it; someone who adds the widgets checks them before opening the app.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Profile | An account's header, story ring, bio, stats, buttons, highlights and grid | top of scroll (not mocked: loading, error) |
| Grid, scrolled | The same profile once the tab bar sticks under an opaque nav | scrolled past the fold |
| Reels tab | A profile's grid switched to its Reels | 9:16 tiles with view counts (not mocked: empty) |
| Reposts tab | A profile's grid switched to its Reposts | grid loaded (not mocked: empty) |
| Tagged tab | A profile's grid switched to posts it's tagged in | grid loaded (not mocked: empty) |
| Private account | A locked profile: no ring, no bio, two tabs at half opacity | locked panel |
| NYT Cooking | A verified business profile | category row, link row, Following pill |
| AGNEZ MO | A verified creator profile | Follow / Message / Subscribe, five highlights |
| Feed switcher | The Following/Favorites picker open over the home feed | popover open |
| Following feed | The home feed of everyone followed | two posts, second arriving at the fold (not mocked: loading more) |
| Favorites, empty | The Favorites feed with nobody added to it | empty illustration + CTA |
| Favorites feed | The Favorites feed with content | one muted reel, action rail, caption |
| Reels, fullscreen, toast | Fullscreen vertical reel playback | screen-recording toast showing |
| Reels, fullscreen | Fullscreen vertical reel playback | toast gone, scrubber further along (not mocked: paused, liked) |
| yilin0xx, live | Profile geometry filled with a live account's data instead of a capture | header + grid, no highlights/link/Threads row (this account has none) |
| Widget — Messages | Home-screen shortcut into Direct Messages | medium and small sizes, no profile picture |
| Widget — Stories | Home-screen widget showing story rings | Your story plus up to three rings |
| Widget — Suggested reels | Home-screen widget of suggested Reels | medium size, four thumbnails |
| Widget — Shortcuts | Four small app-shortcut widgets | Reels, Messages, Explore, Create |
| Widget — Search | Home-screen widget with a search field | field plus three shortcut tiles |

A profile's tab bar switches its grid between Reels, Reposts and Tagged; Profile and Grid, scrolled are one personal account at two scroll positions, and Private account, NYT Cooking, AGNEZ MO and yilin0xx, live are other accounts at the same geometry. The Feed switcher opens over the home feed and picks between the Following feed and the Favorites feed (empty or populated). Tapping a Reels post on either feed opens Reels fullscreen. Every widget is added from the iOS home screen's own edit mode, outside the app, and is not shown deep-linking back into it.

## Open questions
- What tapping Follow, Message or Subscribe on a business or creator profile leads to.
- Whether Favorites is curated from a settings screen or built automatically. Not shown in these boards.
- What a private account's Follow/Request action does once tapped.
- Whether a widget deep-links into the matching in-app screen when tapped. Not shown; each is a static render here.

## Riskiest assumptions
1. People want a widget-first glance at Instagram without opening the app. Cheapest test: ship the five widgets to a small beta and compare widget taps to app opens.
2. A Following/Favorites switcher is discoverable and used over one algorithmic feed. Cheapest test: for users who set up Favorites, measure how often they switch to it.
3. Profile visitors care about telling account types apart (private, verified business, verified creator) before deciding what to do next. Cheapest test: show all four profile variants to a handful of people and ask what they'd tap first on each.
