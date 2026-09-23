# ChatGPT, iOS

> For anyone who wants a fast, conversational answer or help with a piece of writing from their phone, ChatGPT is OpenAI's assistant app — sign up, ask, and keep the conversation organized.

## Problem
Someone reaches for their phone with a question, a draft to improve, or an image they want generated, and doesn't want to open a laptop or a browser tab to get it. Getting there today means finding the app, creating an account, and learning where past conversations live once there are more than a few of them.

## Users
- Primary: a new visitor moving through sign-up — email or an OAuth-style provider, a verification code, an age check, a use-case question, a notifications prompt — on the way to a first message.
- Secondary: a returning signed-in user who asks questions from Home, attaches content from the composer, and finds earlier conversations and projects through the sidebar.

## Value
One assistant, reachable in a few taps, that remembers the shape of a conversation and keeps work organized into projects instead of a flat, growing list of one-off chats.

## Scope
**In:** cold start through account creation and onboarding (splash, welcome, sign-in wall, login/signup sheet, password, email code, age, use case, notifications), the signed-in Home in its empty and populated states, the composer's attachment menu, two full-screen feature announcements (memory, an image-model update), the sidebar in three states, and a project's Chats and Sources tabs.

**Out:** an actual sent message and the assistant's reply (no board shows a live answer), account settings, billing and subscription, voice mode, search, sharing or exporting a chat, the real OAuth provider screens (only the web-view container is shown), and forgot-password.

## Success
A first-time visitor completes sign-up and sends a first message without abandoning partway through. A returning user finds an earlier conversation from the sidebar without asking for help. People open the composer's attachment menu to add something rather than describing it in text.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Splash | App launch | loading |
| Welcome | Marketing intro shown before any account exists | default |
| Home, signed out | Home shown before authentication, prompts sign-in | signed out |
| Auth wall | Full-screen gate forcing sign-in before continuing | default |
| Log in or sign up | Entry sheet offering email or an OAuth-style provider | default |
| Email entered | Email-address step of account creation | filled |
| Create account | Password step of account creation | default, password valid |
| Check inbox | Email verification code | sent, code entered |
| How old are you? | Age gate during onboarding | empty, filled |
| Notifications | Push notification opt-in prompt | default |
| Use case | "What brings you to ChatGPT" selector | unselected, selected |
| Memory announcement | Full-bleed sheet introducing memory | default |
| Home | Signed-in landing screen with the composer | empty, with example prompt carousel; mid-conversation (not mocked) |
| Composer menu | Attachment / quick-action menu opened from the composer | open |
| Image announcement | Full-bleed sheet introducing an image-model update | default |
| Sidebar | Chat history and navigation | empty, avatar loading, full |
| Project | A project's own tabs | Chats tab, Sources tab |

Splash leads to Welcome, or for a returning session past sign-in entirely. Welcome and Home (signed out) both lead into the Auth wall, which opens Log in or sign up; that flow runs Email entered → Create account → Check inbox → How old are you? → Notifications → Use case, ending at Home. From Home the composer opens the Composer menu; the sidebar opens a Project.

## Open questions
- What does an actual sent message and the assistant's reply look like in the thread? (not shown)
- Does onboarding return to Home automatically after Use case and Notifications, or is there another step? (not shown)
- Where do account, billing, and settings live? (not in this set)
- What do the real Google/Apple sign-in screens look like, past the web-view container? (not shown)

## Riskiest assumptions
1. New users complete the six-step sign-up (email, password, code, age, use case, notifications) rather than abandoning before Home. Cheapest test: walk a small unmoderated group through the flow and note where they stall.
2. The example-prompt carousel on empty Home shortens time to a first message compared to a blank composer. Cheapest test: A/B the carousel against no carousel with a small cohort.
3. People can tell where a chat from a few days ago lives — a plain chat in the sidebar, or inside a project — without asking. Cheapest test: a short tree-test, "find this chat from three days ago" vs. "find this project."
