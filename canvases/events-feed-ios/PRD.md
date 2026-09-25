# Events Feed (iOS)

> For a group of friends who keep making plans in a group chat, Events Feed is one scrolling home that shows the next few things you are all going to — each with its date, its place, its photos and who is coming — plus a story row for the ones happening now.

## Problem
A handful of friends planning a beach day, a rooftop night and a Friendsgiving keep all three in the same group chat, interleaved with everything else. Nobody can see the three as a list, the date of any one of them is somewhere in the scrollback, and the photos from the one that already happened are in a different thread again. The result is that the plan nearest in time is the hardest thing to find.

## Users
- Primary: someone in the group who wants to know what is next and where. Opens the app and reads the feed top-down; every card answers when, where and how many in one glance.
- Secondary: someone catching up on a plan that already happened. Reads a card whose body is a photo stack rather than a place — "Life Lately", dated today — and the friends' counts under it.
- Secondary: someone with a plan to propose. The floating **Create New Event** button follows the feed and never scrolls away.
- Secondary: someone posting from an event as it happens. The story row at the top of the feed holds "Your story" first and the live ones after it.

## Value
One vertical feed where a plan is a card, not a message. Time is the ordering — "In 2 Days", "Today", "Next Fri", "In 3 Weeks" — so what is next is at the top, and a plan that has passed stays in the same list as a record of itself rather than moving to an archive. Because every card carries its own photos and its own counts, the feed doubles as what the group chat was being used for.

## Scope
**In:** the feed as its own screen, scrolled; the event card in its two shapes (with a location pill and a still-to-come date, or with a photo stack and a past date); the story row; the search-and-notifications header that floats over the feed; the create-event button that floats over the bottom.

**Out:** creating or editing an event (the button is shown, what it opens is not), opening a single event, posting or viewing a story, search results, notifications, any account or profile screen, any second tab. The source recording is one uninterrupted scroll and shows none of these.

## Success
Someone who opens the app knows what the next plan is, on what date and at what place, without scrolling or tapping. Someone scrolling reaches a plan three weeks out in one flick. Proposing a plan is always one tap from wherever you are in the feed.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Feed, top | The feed unscrolled: header, story row, and the first card | card with a location pill and no photos; story row with "Your story" and four live stories |
| Life Lately | The same feed at scroll 258, on the card for a plan that has happened | card with a four-photo stack and no location pill |
| Rooftop Jazz | The same feed at scroll 336, on the next upcoming plan | card with a three-photo stack *and* a location pill; header blurring the card above it |
| Friendsgiving | The same feed at scroll 533, near the end of the list | card with a four-photo stack and a location pill; the next card's title entering at the bottom edge |

The four screens are one document at four scroll offsets, not four destinations. The header, the story row and the create button are the feed's own chrome: the header and the button float above the scrolling list and are on every board, the story row scrolls away with the content.

## Open questions
- What **Create New Event** opens. The recording never taps it.
- Whether a card with a photo stack is a different kind of object from a card with a location pill, or the same object after its date has passed. The two shapes differ only in the pill and the stack, which is consistent with either reading.
- What the counts under a card ("34", "6") count. Two icons, a bubble and a pair of people, imply comments and attendees, but no screen names them.
- Where the story row's content comes from, and what tapping a ring does.

## Riskiest assumptions
1. A group will keep its plans in a dedicated feed rather than in the chat they already have open. Cheapest test: instrument how many events get created from the app versus mentioned first in the group chat.
2. A past plan belongs in the same list as an upcoming one. Cheapest test: show the feed with "Life Lately" between "Beach Party" and "Rooftop Jazz" and ask five people what they expect to happen to it next week.
3. Time-relative labels ("In 2 Days", "Next Fri") are worth the ambiguity they carry over plain dates. Cheapest test: ask five people to name the date of each card and count how often they look at the second, absolute line.
