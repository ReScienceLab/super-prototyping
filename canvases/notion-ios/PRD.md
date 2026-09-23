# Notion (iOS)

> For someone taking notes, tracking tasks and asking questions about their own workspace, Notion is the one iOS app where search and an AI chat sit together, so a question about your own content doesn't need leaving what you were doing to answer it.

## Problem
Someone taking notes and tracking tasks in Notion today has to search manually across pages to answer a question about their own content, instead of asking it directly. Someone who keeps more than one Notion account (work and personal, say) or wants Notion AI has to leave whatever they were doing to switch accounts or upgrade.

## Users
- Primary: someone searching their workspace and asking Notion AI a question. From the search entry point, into a chat conversation.
- Secondary: someone reading a meeting's page. Its recording lockup and AI-generated summary.
- Secondary: someone managing a database's data sources. Adding one, and seeing the database (a to-do table) reflect it.
- Secondary: someone signing into an additional account, or deciding whether to buy Plus & AI.

## Value
Search and Ask AI live in one entry point, so a question about your own notes doesn't need a separate assistant. A to-do table can pull from more than one data source without leaving the table. Adding an account and upgrading to Plus & AI are in-app sheets, not a separate flow.

## Scope
**In:** the search entry point with its Ask AI option and one AI chat conversation; one meeting page with its AI summary; a date sheet and a share-settings sheet; the add/manage-data-source flow for a to-do table (list, add form, list with the new source, the resulting table); adding a second account (provider list, email, code); the Plus & Notion AI purchase sheet (monthly, yearly, success).

**Out:** creating a page or database from scratch, editing block content beyond what's shown, workspace-wide settings, notifications, collaboration or comments, signing out.

## Success
Someone using Ask AI gets an answer grounded in their own page rather than backing out to search manually; someone adding a data source reaches the to-do table using it without getting stuck on the picker; someone reaches Purchase success rather than abandoning the sheet at the price step.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Splash | App launch, before content loads | painted splash |
| Search / Ask AI | Search entry point with an Ask AI option | pre-query (not mocked: query typed, results list) |
| Notion AI chat | A chat conversation with Notion AI | one exchange shown (not mocked: multi-turn, loading) |
| Meeting page | A meeting recording's page with its AI-generated summary | summary expanded, cited bullet points (not mocked: summary loading/collapsed) |
| Date sheet | A date-picker sheet | calendar grid, a date selected |
| Share settings sheet | A page's share and permissions sheet | loaded (not mocked: permission changed) |
| Manage data sources | List of a database's data sources | one source listed |
| New data source | Form for adding a data source | add / link / learn options |
| Manage data sources, two | The list after a second source is added | two sources listed |
| To do list with a table | A to-do database as a table, with the floating Ask AI bar | table loaded, bar visible (not mocked: empty table) |
| Add an account | Sheet listing sign-in providers | six providers listed |
| Work email | Email step of adding an account | field empty, keyboard up |
| Email typed | Email step, address entered | address typed, validated |
| Verification code | Code step of adding an account | field empty, keyboard up, resend timer counting down |
| Code typed | Code step, code entered | code filled in |
| Plan sheet, monthly | Plus & Notion AI paywall | monthly price selected |
| Plan sheet, yearly | Plus & Notion AI paywall | yearly price selected |
| Purchase success | The monthly sheet dimmed under the purchase-confirmation alert | subscribe button spinning, alert shown |

Search / Ask AI → tapping Ask AI opens Notion AI chat. The meeting page's date field opens Date sheet; its share icon opens Share settings sheet. Manage data sources → New data source → Manage data sources, two (source added) → To do list with a table, which reads from those sources. Add an account → Work email → Email typed → Verification code → Code typed. Plan sheet (monthly or yearly) → choosing a plan leads to Purchase success.

## Open questions
- What the Notion AI chat answer looks like beyond the first reply. Not shown past one exchange.
- What happens right after Purchase success — return to wherever the paywall was opened from, or somewhere else.
- Whether "Manage data sources, two" is reached only via New data source, or is also editable directly (rename, remove).

## Riskiest assumptions
1. Users trust an AI chat answer about their own notes over reading the source page themselves. Cheapest test: watch whether test users tap Ask AI or a plain search result first, given the same question.
2. The multi-data-source concept is understandable to a typical user, not just someone already comfortable with databases. Cheapest test: five-user task ("add a second data source to this table"), timed to completion.
3. Bundling AI into a paid Plus tier converts, rather than needing a free trial of AI first. Cheapest test: show the paywall to a cohort and compare tap-through against a free-trial variant.
