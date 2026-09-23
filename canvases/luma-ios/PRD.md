# Luma (iOS)

> For someone hosting a gathering and the people deciding whether to go, Luma is the one event page — read differently by a guest, an invitee or the host — plus a home feed of what you're going to, hosting, or could find nearby or later.

## Problem
Someone organizing a gathering needs one page that describes it, shows who's coming, and lets people RSVP, instead of a spreadsheet, a group text and a one-off invite link each doing part of the job. Someone looking for something to do wants a feed of what they're invited to, what they're hosting, and what's happening nearby or later, in one place rather than scattered across group chats and other people's stories.

## Users
- Primary: a guest deciding whether to attend. Reads the event page's top, its location, and its About section.
- Secondary: the host of the event. Sees the same page's guest-count stats and its manage-event actions instead of an RSVP button.
- Secondary: someone invited but not yet responded. A distinct read of the event page's top and About section.
- Secondary: anyone opening the Home tab. To see their own events, discover what's nearby, or see what's coming up later.

## Value
One event page that reads differently depending on who's looking — guest, invited, or host — instead of three separate builds. One Home tab that covers "what am I going to," "what's near me," and "what's later" without three different apps or a scroll through someone else's messages.

## Scope
**In:** the event page's top, location and about sections as a guest; the event page's top, guest-stats and manage sections as a host; the event page's top and about sections as someone invited; the Home tab empty, with the guest's own events, nearby, and later.

**Out:** creating or editing an event, RSVPing (the button is shown but no tapped/confirmed state is), ticketing or payment, messaging a host or guest, check-in at the door.

## Success
A guest can find what, where and when without more than the top and one scroll; a host can see how many people are coming without leaving the event page; someone with no events on Home has a clear next action rather than a blank tab.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Guest / top | Top of an event page for someone who hasn't RSVPed | hero, title, host row, RSVP button (not mocked: after RSVPing) |
| Guest / location | Same event page scrolled to the location section | map/location block |
| Guest / about | Same event page scrolled to the About section | description text |
| Host / top | Top of the same event page as its host | host-only header and actions |
| Host / guest stats | Host view scrolled to guest-list stats | RSVP counts |
| Host / manage event | Host view scrolled to event-management actions | manage actions |
| Invited / top | Top of the event page for someone invited, not yet responded | invited-state header |
| Invited / about | Invited view scrolled to the About section | description text |
| Home / empty | The Home tab with no events yet | empty-state illustration and CTA |
| Home / events | The Home tab listing the guest's own events | event list |
| Home / nearby | The Home tab's nearby-event discovery | nearby list |
| Home / later | The Home tab's later/upcoming section | later list |

Guest / top, / location and / about are one event page scrolled for a guest; Host / top, / guest stats and / manage event are the same page's host view; Invited / top and / about are the same page's invited view. Home / empty, / events, / nearby and / later are peer sections of one Home tab. Tapping an event from any Home section opens that event's page in the role the viewer holds.

## Open questions
- What RSVPing does once tapped — confirmation, or a state change on the same page.
- How a guest moves from Nearby or Later into attending (RSVP flow from discovery).
- What a host's manage-event actions (06) lead to individually. Not shown past the one board.

## Riskiest assumptions
1. People will discover and RSVP through a dedicated app rather than a shared link or a social post. Cheapest test: measure how often the Nearby/Later tabs get opened versus how often a direct event link is opened.
2. Hosts want in-app guest stats rather than an export or email summary. Cheapest test: show the guest-stats board to five hosts and ask if they'd check it over their current export/email habit.
3. "Nearby" is a discovery mode people want, versus following specific organizers or topics. Cheapest test: ship Nearby as a fake-door tab and measure how often it's opened.
