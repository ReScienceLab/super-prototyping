# Apple Settings (iOS)

> For anyone who needs to change how their iPhone behaves, Settings is the one list that holds every toggle and sub-page the OS exposes, from developer options to how large the display renders — so getting to the right control fast is the entire job.

## Problem
Someone wants to change one specific thing about their phone — flip on a developer flag, make text bigger — and has to find it inside a long, nested list whose shape they don't fully know.

## Users
- **Primary: someone scanning the top-level list for a section.**
- **Secondary: a developer** digging into Developer options.
- **Secondary: someone adjusting Display Zoom** for readability.

## Value
Every setting reachable from one root list, organized into sections, with a search-free path down into a specific sub-page like Developer or Display Zoom.

## Scope
**In:** the top-level Settings list, the Developer sub-page, the Display Zoom sub-page, each in light and dark.

**Out:** the search bar's results, every other sub-page visible as a row but not opened (Wi-Fi, Notifications, and the rest), and actually applying a Display Zoom change — no before/after preview is shown.

## Success
Observable signs it works: someone scanning the root list finds the section they want without opening the wrong one first; Developer's toggles are legible enough to flip the right one; Display Zoom's choice reads clearly without the (unmocked) live preview.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Settings | Root, scrolling list of every settings section | loaded, scrolled to top (not mocked: search active, scrolled further) |
| Developer | Sub-page of developer-facing toggles and options | loaded, six sections (not mocked: a toggle mid-change) |
| Display Zoom | Sub-page for choosing display zoom level | loaded, options shown (not mocked: live before/after preview, selection confirmed) |

Settings (root) → tap a row → pushes to a sub-page. Developer is one such push; Display Zoom is reached from Developer, per this board's own Back label. Back returns to the page above.

## Open questions
- 🔴 Whether Display Zoom actually sits under Developer, or the source file placed it there for convenience rather than matching iOS's real information architecture.
- 🔴 What search from the root list does. Not shown.

## Riskiest assumptions
1. People can find Developer without knowing beforehand that it exists (it isn't visible by default on a real device). Cheapest test: card-sort — ask someone to find "developer options" starting from the root list alone.
2. Display Zoom's choice is understandable without the live preview the real page provides. Cheapest test: show the static board and ask what each option will do to their screen.
3. The root list's section grouping matches how people mentally sort settings. Cheapest test: give people the section names and ask them to group them their own way, compare to the shown order.
