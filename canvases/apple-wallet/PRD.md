# Apple Wallet, iOS

> For anyone who carries boarding passes, store cards, and keys, Apple Wallet puts them on the Lock Screen instead of in a paper stack or a stranger's front desk.

## Problem
A traveler at the gate patting down pockets for a printed boarding pass while the line backs up; a shopper digging through a keyring-sized stack of loyalty cards at checkout; a guest waiting at a hotel front desk for a physical key card because their phone can't unlock the door. Each is a small, recurring friction that a phone already in hand could remove.

## Users
- Primary: an iPhone owner who has been issued a pass, card, or key by an airline, retailer, hotel, or property, and wants to use it without a separate app or a separate physical item.
- Secondary: a first-time Wallet opener who hasn't added anything yet and needs to understand, from the Get Started screen alone, what the app is for.

## Value
One list, one tap. Wallet centralizes passes and keys issued by other companies, so the one thing it has to do well is show the right item fast — at the gate, the register, or the door, faster than a paper printout, an email, or a separate key card.

## Scope
**In:** the Cards list of stored passes (light and dark), the Get Started first-run screen (light and dark), and four pass templates — a boarding pass, a store/loyalty card, and three digital keys (home, car, hotel).

**Out:** adding a new pass or card (scanning, provisioning, linking an airline or hotel account), the tap-to-use / NFC / Lock Screen presentation flow, payment (credit or debit) cards, editing or removing a pass, and notifications for an upcoming flight or an expiring pass. These are left for a later pass: this set covers what's already in the wallet, not how it got there or how it's presented at the point of use.

## Success
A first-time visitor can say, after seeing Get Started alone, what Wallet is for. Someone with several passes finds the right one in the Cards list without searching. Nobody needs a second app open at the same time as Wallet to complete a boarding, a purchase, or an entry.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Cards | Home list of every stored pass, tap one to open it | populated (light, dark); no passes yet (not mocked) |
| Get Started | First-run screen shown before any pass has been added | default (light, dark) |
| Boarding Pass | An airline's boarding pass, presented at the gate | populated (light only — issuer passes render at a fixed appearance and don't switch with system dark mode) |
| Store Card | A retailer's loyalty or store card, presented at checkout | populated (light only) |
| Home Key | A digital front-door key | populated (light only) |
| Car Key | A digital car key | populated (light only) |
| Hotel Key | A digital hotel room key | populated (light only) |

Get Started leads to adding a first pass (not shown), which returns to Cards. From Cards, tapping any entry opens its own detail: Boarding Pass, Store Card, or one of the three Key screens.

## Open questions
- How does a user add a new pass or card? (not shown here; who decides: design)
- What does Cards look like with zero passes added?
- How is a pass used — NFC tap, Lock Screen, both — rather than viewed in-app?
- Do payment (credit/debit) cards live in this same Cards list, and if so what does that entry look like?

## Riskiest assumptions
1. Users trust storing a home, car, or hotel key on their phone as much as a physical one. Cheapest test: ask a handful of people with a digital key whether they'd leave the physical one at home.
2. One flat Cards list scales to however many passes a real traveler or commuter carries, without needing search or folders. Cheapest test: mock up a realistic set of passes and time how long people take to find one.
3. The Get Started screen alone, with no walkthrough of adding a pass, is enough for a first-time opener to understand the app. Cheapest test: show only Get Started to a few people and ask what they'd use it for.
