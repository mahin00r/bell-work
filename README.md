# Bell Work

**Never miss a deadline.**

A personal Chrome extension for job applications, higher-study applications, scholarships, and subscriptions. One calm workspace, stored entirely on your device.

## What it does

- Today popup with a live next-up countdown, urgency groups, search, and kind filters.
- Application board with pointer and keyboard dragging, plus a status selector on every card.
- Checklists, document links, recommenders, notes, priorities, and status history.
- Subscriptions with trial reminders, cancel candidates, and monthly and yearly totals per currency.
- A 60-day timeline, application insights, and a searchable command palette.
- Daily reminders, lead-day notifications, toolbar badge, snooze, and automatic follow-ups.
- Light, dark, and system themes; local Inter typography; reduced-motion support.
- Validated JSON backups with an import preview and sample data you can remove in one click.

## Install

Use Node.js 20.19 or newer and the pnpm version declared in `package.json`.

```sh
pnpm install
pnpm build
```

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose `.output/chrome-mv3`.
4. Pin Bell Work, open it, and add your first item or explore the sample data.

`pnpm zip` creates an extension archive in `.output`. Use `pnpm dev` for local development and `pnpm check` to run all quality checks.

## A daily rhythm

Open Today each morning. Save an opportunity with **Alt+Shift+B**, or right-click a page and choose **Add page to Bell Work**. Capture opens a dashboard tab with the title, URL, and site name filled in when the page permits it.

Use **Ctrl+K** on Windows/Linux or **Cmd+K** on macOS in either screen to add an item, find an item, switch views, toggle the theme, or export a backup. On the board, focus a drag handle, press Space, move with arrow keys, and press Space again to drop; Escape cancels. Each card also has a keyboard-operable status selector.

Marking an application applied creates a follow-up ten local calendar days later. Edit that date in the item drawer. Applications in applied or interview status use their follow-up date for Today and reminders. Closed applications remain on the board without deadline alerts.

Reminders default to 09:00 local time and 7, 3, and 1 days before a deadline, plus the due day. Trials also receive a reminder two days before they end. A missed reminder window catches up on the next check. Chrome must be running, and operating-system notification settings can affect delivery. The daily alarm is scheduled again using local calendar time to accommodate daylight-saving changes. Active subscriptions advance past renewals by their billing cycle; trial, cancelling, and cancelled items keep their dates for review. Month-end dates clamp to the last valid day of the destination month.

## Privacy and permissions

All data stays in `chrome.storage.local`. There is no account, server, sync, analytics, telemetry, or runtime network request. Fonts and icons ship with the extension. Links open only when you choose to visit them. No host permissions or persistent content scripts are installed.

| Permission         | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `storage`          | Save items, preferences, and reminder history locally.     |
| `unlimitedStorage` | Keep notes and backups without the standard storage quota. |
| `alarms`           | Schedule the daily check.                                  |
| `notifications`    | Show deadline and renewal reminders.                       |
| `activeTab`        | Read the page you explicitly choose to capture.            |
| `scripting`        | Read that page’s site name during capture.                 |
| `contextMenus`     | Offer the page capture action on right-click.              |

The development server uses a local connection for hot reload. The packaged extension operates offline.

## Backups

**Export regularly** from Settings. Removing the extension or its browser profile removes its local data. Export produces `bell-work-backup-YYYY-MM-DD.json`. Import accepts a validated backup up to 25 MB, shows new and matching item counts, merges by ID, and restores preferences and reminder history. Matching IDs use the incoming version. Currencies are never converted or combined.

Sample items use fictional organizations and carry a `sample` tag. Removing sample data deletes only items with that tag. Archive keeps an item available for restoration; deletion permanently removes it after confirmation.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module layout.

## License

[MIT](LICENSE). Inter is distributed under the SIL Open Font License; its notice is in [licenses/Inter-OFL.txt](licenses/Inter-OFL.txt).
