# Duolingo, iOS

> For anyone building a daily language-learning habit, Duolingo turns a course into a path of bite-sized lessons with streaks and social pressure to keep coming back.

## Problem
Someone wants to learn a language but loses momentum without a routine — life gets in the way, a day is missed, the habit breaks. Duolingo's path, streaks, and interruption sheets exist to catch that moment before it becomes quitting.

## Users
- Primary: a learner working through the path lesson by lesson, day by day.
- Secondary: the same learner at a moment of risk — about to lose a streak, or seeing where they stand in their league — who the app is trying to keep engaged.

## Value
A single visible path shows progress and what's next; short interruption sheets (streak freeze, league promotion) step in at the moments most likely to cost retention, rather than leaving the learner to notice on their own.

## Scope
**In:** the learning path at three unit colors, a completed section, a locked upcoming section, the "Jump here" skip-ahead tooltip, and two interruption sheets (streak freeze, league promotion).

**Out:** the lesson and exercise screens themselves (answering a question, a listening or speaking exercise), the tab bar's other destinations (practice, leaderboard, profile), account and settings, and what happens after tapping into a locked section besides the Jump here tooltip.

## Success
Someone facing a locked section either keeps going on the unlocked path or successfully jumps ahead, rather than getting stuck. Someone shown the streak-freeze sheet while at risk keeps their streak. Someone can say what a path color represents without being told.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Path | Shows progress and the next lesson | green unit, red unit, blue unit |
| Section complete | Confirms a section just finished | default (purple header) |
| Up next | Shows the next, locked section | locked; unlocked (not mocked) |
| Jump here | Tooltip offering to skip ahead at a section divider | shown |
| Streak freeze | Sheet offering to protect a streak | open |
| League promotion | Sheet announcing a league promotion | open |

The path is the hub: finishing a section leads to Section complete, which returns to the path at the next, locked section (Up next). The path's own divider can show the Jump here tooltip. Streak freeze and League promotion are sheets that interrupt the path at their own trigger moments (not shown).

## Open questions
- What triggers Streak freeze and League promotion — a schedule, a specific risk condition? (not shown)
- What's on the tab bar below the path (practice, leaderboard, profile)? (not in this set)
- Is Jump here the only way past a locked section, or can it be reached another way? (not fully shown)

## Riskiest assumptions
1. Path colors are read as distinct topics or units rather than arbitrary decoration. Cheapest test: a short card sort — show the three colors and ask what differs.
2. The Jump here tooltip is understood as a way to skip ahead, not as a locked, blocked dead end. Cheapest test: a first-click test, "skip ahead to a later section."
3. Showing the streak-freeze sheet at the right moment is what saves the streak, not just the sheet's design. Cheapest test: compare streak continuation for a small group shown the sheet against a holdout who isn't.
