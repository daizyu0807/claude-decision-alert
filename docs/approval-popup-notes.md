# Background: native approval popups for AI coding tools, four attempts

English | [繁體中文](approval-popup-notes.zh-TW.md)

AI coding tools stop and ask before they run a command or edit a file. When several of them run at once, in terminal panes or desktop app sessions, those prompts sit unnoticed. The work is blocked and nobody knows.

I wanted one thing: a native macOS window that appears on top of whatever I am doing, shows what is being asked, and sends my answer back to the session that asked.

I ended up building it four times, once per environment. decision-alert is one of the four. This page explains why one version was not enough, and what I would do first if I started again. For the other three it describes the approach only, with no code.

## The short version

The popup is the easy part and it is the same everywhere. What differs in every environment is the two ends:

1. **Detection.** How do you find out that a prompt is waiting?
2. **Reply.** How do you send the answer back to the right session?

Every environment answers those two questions differently, which is why I have four implementations and not one.

## The four attempts

| Environment | AI tools covered | Detection | Reply | What breaks it |
|---|---|---|---|---|
| Terminal with a scripting API (iTerm2) | Claude Code, Codex, Gemini CLI | Read each pane's screen and match the prompt text | Type the option's key into that pane | Any tool rewording its prompt |
| Terminal without screen access (Ghostty) | Claude Code | The tool's own permission hook | Return a decision to the hook as JSON | Still a prototype; only as wide as the tools that offer such a hook |
| Desktop app that runs several models (T3 Code) | Whatever the app runs | Watch the app's local state for pending requests | Answer through the app's local interface | The app changing its internals |
| Claude desktop app | Claude | The app's hook system, packaged as a mod | Return a decision to the hook | Changes to the hook contract |

The Claude desktop version is this repository; see the [README](../README.md). The other three are described here as approach only. This plugin does not support those tools.

## What I learned

### Reading the screen works everywhere and breaks often

Matching prompt text is the only method that covers a tool with no hook. It was also the version I had to fix most: twice within a week, when one tool's permission prompt showed a different number of options and then different wording per tool.

If you take this route, keep the matching rules in one place and write tests from real prompt text. Expect to update them.

### A hook that takes a decision is the closest thing to a general answer

When the tool itself tells you "I need permission for this" and accepts the decision as a return value, both hard problems go away. There is no screen to read and no keystroke to send, so the terminal no longer matters.

The limit is coverage. I have this working for one tool. For the others I only have placeholders, because I did not want to guess at an interface I had not confirmed.

### Reading an app's internals is the most fragile route

It works, and it covers every model the app runs, but it depends on structures the app never promised to keep. Treat it as something that can stop working on any update.

### The popup needs a few safety rules

- **Enter must not approve.** The default button should be "go back to the session", so a stray key press never lets a command through.
- **Auto-confirm is off by default.** I added an optional "confirm after N seconds idle" checkbox. It is opt-in, it shows the countdown on the button, and any mouse or keyboard activity resets it.
- **Show enough to decide.** Project name, the session or thread, the command or file, and the reason if the tool gives one.
- **Close the popup if the request was answered elsewhere.** Otherwise you answer a question that no longer exists.
- **Free-text questions do not belong in a popup.** Send a notification and take the person back to the session.

## If you want to build this for another environment

Answer these before writing anything:

1. Does the AI tool offer a hook that fires on a permission request and accepts a decision? If yes, use it and stop here.
2. If not, can something outside the tool read the session's screen, and can it type into that specific session?
3. If the tool runs inside a desktop app, does the app expose pending requests anywhere you are allowed to read?
4. How will you identify which session asked, so the answer does not land in the wrong one?

The order matters. Each step down is more work to maintain than the one above it.

## Status

These are notes on what I tried, not a maintained tool. The environments above change, and details here will go out of date.
