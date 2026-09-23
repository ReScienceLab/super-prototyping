# iPhone Home Screen & Lock Screen

> For anyone who picks up an iPhone, the Home Screen and Lock Screen are the first thing they see and touch — a wallpaper, the day's essentials, and one tap into the camera, flashlight or an app — so those two screens have to say something useful before a single app is opened.

## Problem
Someone picking up a locked phone wants the time, what's coming up, and a fast way into the camera or flashlight without unlocking. Once unlocked, they want their most-used apps and at-a-glance information (reminders, events) without opening those apps individually. The alternative — unlock straight into an app and hunt — costs a moment every single time the phone is picked up.

## Users
- **Primary: the owner**, whose wallpaper, widgets and app layout these are.
- **Secondary: anyone reading the phone in another language.** The Spanish, Chinese and French variants point to a global audience for the same layout.

## Value
A locked or resting phone already answers "what time is it, what's on my calendar or reminders, and can I get to camera, flashlight or search without unlocking."

## Scope
**In:** the Home Screen — wallpaper, app-icon dock, reminder and event widgets — light and dark, plus Spanish, Chinese and French strings; the Lock Screen — clock, widgets, camera/flashlight/search shortcuts — light and dark.

**Out:** unlocking itself (Face ID/passcode), widget editing or the jiggle/rearrange mode, folders, App Library, notifications stacked on the Lock Screen, and any locale beyond the three captured.

## Success
Observable signs it works: someone can name what's on their calendar from the Lock Screen alone, without unlocking; the camera opens from the Lock Screen shortcut without unlocking first; the localized Home Screens read correctly to a native speaker, with no truncated or overlapping text.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Home Screen | Wallpaper, app-icon dock, reminder and event widgets | light, dark, Spanish, Chinese, French (not mocked: jiggle/edit mode, folders, more apps than fit) |
| Lock Screen | Clock, widgets, camera/flashlight/search shortcuts | light, dark (not mocked: notifications present, media playing, localized) |

Lock Screen is what's shown before unlocking; unlocking (not mocked) leads to Home Screen. The two are otherwise independent boards with no in-app navigation between them here.

## Open questions
- 🔴 Whether notifications ever stack on this Lock Screen — every board here is notification-free.
- 🔴 What editing or rearranging the Home Screen (jiggle mode) looks like. Not mocked.
- 🔴 Whether locales beyond Spanish, Chinese and French are in scope for this set.

## Riskiest assumptions
1. The two widgets shown (reminders, events) are the ones people actually want glanceable without unlocking. Cheapest test: ask a handful of iPhone owners which single widget they'd keep if limited to one.
2. Localized strings fit their boxes at realistic, longer lengths, not just the ones captured here. Cheapest test: swap in a long reminder or event title per locale and check for truncation.
3. The Lock Screen's camera/flashlight/search shortcuts are found without being told they're there. Cheapest test: hand someone a locked phone (or this board) and ask them to open the camera without unlocking.
