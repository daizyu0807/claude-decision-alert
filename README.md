# decision-alert

A Claude Code / Claude desktop **mod** that pops up a native macOS window whenever a session needs your decision — so you can answer without hunting for the right session.

macOS only (uses `osascript` / AppKit).

## What it does

- **AskUserQuestion popup** — when the model asks you a question, a native alert appears with the project name in the title.
  - Single choice: a list with each option's description in grey; choose with **↑ / ↓** and confirm with **Enter**.
  - Multiple choice: checkboxes, then **確定**.
  - Your answer goes straight back to the model.
- **Permission popup** — for tool permission requests, **允許 / 拒絕 / 回到 session**. Enter defaults to "回到 session", so a stray key press never approves anything. Timeouts and errors fall back to Claude's own dialog; it never auto-allows.
- **回到 session** — closes the popup, switches the Claude desktop app to the session that asked (via the `claude://code/continue?session=…` deep link), and shows Claude's own dialog there.
- Text and number questions can't be answered in the popup; you only get a native notification.

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install decision-alert --marketplace daizyu0807/claude-decision-alert
```

From a shell:

```
claude plugin install decision-alert --marketplace daizyu0807/claude-decision-alert
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `daizyu0807/claude-decision-alert`, then **Add plugin**.

## Notes

- The "back to session" jump looks up the session's id in the Claude desktop app's local session store (`~/Library/Application Support/Claude/claude-code-sessions`). It only reads that folder and opens a `claude://` link.
- UI labels are in Traditional Chinese; edit `hooks/register.ts` to change them.
- Why it is built on hooks, and what I tried in other environments (terminals, another desktop app): [docs/approval-popup-notes.md](docs/approval-popup-notes.md) ([繁體中文](docs/approval-popup-notes.zh-TW.md)). Approach notes only; no code for those.

## License

MIT
