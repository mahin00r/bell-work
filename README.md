# Bell Work

**Never miss a deadline.**

A private, offline browser extension for job applications, higher-study applications, scholarships, and subscriptions. One workspace, stored on your device.

**Current version: 2.0.0-beta.1.** Chrome and Firefox packages are development builds. Installed-browser checks, calendar-client imports, and store review remain release gates; see [v2 status](docs/V2-STATUS.md) and [changelog](CHANGELOG.md).

## What it does

- Today popup with urgency groups, search, up to three pinned priorities, and a next-event countdown.
- Application board with pointer and keyboard dragging and a status selector on each card.
- Separate interviews, document deadlines, recommendation deadlines, offer decisions, and custom reminders, with optional times, IANA time zones, locations, and links.
- Checklists, document links, recommenders, notes, priorities, and status history.
- Subscriptions with anchored billing dates, trials, cancellation plans, price history, and manual payment records.
- Per-currency monthly totals and 30/90-day forecasts, plus a guided weekly review.
- Combined filters, saved views, bulk archive/tag/status actions, and undo that preserves subsequent edits.
- A 60-day timeline, application insights, and a searchable command palette.
- Daily reminders, exact-time event alarms, toolbar badges, independent snoozing, and a digest for larger reminder backlogs.
- Recoverable trash, validated JSON backups, conflict previews, and local recovery copies.
- Calendar snapshots as `.ics` files for the next 90 days or selected items.
- English and Bangla interfaces, locally bundled fonts, light/dark/system themes, keyboard controls, and reduced motion.

## Install for development

Use Node.js 20.19 or newer and pnpm 10.11.0, pinned in `package.json`. If Corepack is available, `corepack pnpm` selects that version.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `.output/chrome-mv3`. Pin Bell Work and open it.

For Firefox 140 or newer:

```sh
corepack pnpm build:firefox
```

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `.output/firefox-mv3/manifest.json`. Temporary installation lasts until the browser restarts. Public Firefox distribution requires signing. Firefox notifications open Bell Work when clicked; use the popup to snooze because notification action buttons are omitted in that build.

`pnpm zip` and `pnpm zip:firefox` create browser archives in `.output`. `pnpm dev` starts extension development; `pnpm check` runs TypeScript, lint, tests, and both production builds.

## Upgrade from v1

Export a JSON backup from v1 first, then reload the same installed extension with the v2 build. Keep its existing installation and profile to retain its storage. Loading another copy or changing browsers can create a separate workspace.

V2 reads existing records under the same storage key and preserves the raw previous state before its first persisted migration. V1 JSON backups also import into v2. V2 exports require v2 and should not be treated as a downgrade backup for v1.

Older snoozes may already have moved dates in v1; review those dates. Billing anchors begin with the saved renewal date, so any earlier billing drift must be corrected by editing the next renewal. Future snoozes preserve real dates, and anchored billing returns to the original day after shorter months.

## Daily use

Save an opportunity with **Alt+Shift+B** or the page context menu. Capture reads the page only when requested. Where available, it suggests structured job metadata and saves selected text as notes. Review the source date and confirm possible duplicates before saving.

Use **Ctrl+K** on Windows/Linux or **Cmd+K** on macOS to find items, switch views, add an item, change theme, or export a backup. On the board, focus a drag handle, press Space, use arrow keys, and press Space to drop; Escape cancels. A status selector provides an alternative.

Marking an application applied creates a follow-up ten local calendar days later. Submitted applications stop using the original submission deadline for alerts; additional unfinished events remain visible. Offer decisions can remain active. Accepted, rejected, withdrawn, archived, and trashed applications stop generating alerts.

Open **All items** for combined filters, saved views, selected-item calendar export, or bulk changes. **Weekly review** brings together upcoming events, follow-ups, preparation tasks, subscription reviews, and charge forecasts. Large lists progressively reveal more records.

## Reminders and billing

Defaults are 09:00 local time and 7, 3, and 1 days before a deadline, plus the due day. Trials also receive a reminder two days before ending. Timed events retain their chosen time zone. Nonexistent daylight-saving times are rejected rather than silently changed.

Snooze defers one event's notification until the same local time tomorrow. It does not change its deadline, trial end, or renewal date, and overdue items remain visible. Larger backlogs produce a summary instead of many simultaneous notifications.

The browser must be running to deliver notifications. Sleep, browser shutdown, and operating-system settings can delay delivery. Bell Work rebuilds alarms from stored records on startup and subsequent checks; reminders are not a guarantee of exact-time delivery.

Active subscriptions advance to their next billing occurrence while retaining the original anchor and a reminder to review a missed renewal. This does not confirm a payment. Manual payment records are user-entered. Cancellation plans do not cancel anything with the provider; forecasts exclude charges on or after a chosen cancellation date and assume that plan succeeds. Totals remain separate by currency.

## Backups, recovery, and calendars

**Export regularly** from Settings. Removing the extension or browser profile removes local records and recovery copies.

JSON import accepts validated backups up to 25 MB, previews matching items, and lets you keep newer versions, current versions, or incoming versions. Equal timestamps keep the current item by default. Restoring preferences is optional. Migration, import, and recovery restore preserve up to three local copies; these are not external backups. Settings can restore a copy or export raw stored data if normal loading fails. Explicit **Delete all data** also removes recovery copies.

Deleting an individual item moves it to Trash and stops its reminders. Restore it there. Archive also preserves records. Sample data uses fictional organizations and a `sample` tag.

Calendar export produces an `.ics` snapshot with stable occurrence identifiers, all-day dates, and timed events in UTC. It is not live or two-way synchronization. Import behavior, including duplicate handling, depends on the calendar application; Google Calendar, Outlook, and Apple Calendar imports remain manual release checks.

## Privacy and permissions

All records use the browser's local extension storage. There are no accounts, backend, cloud sync, analytics, telemetry, remote fonts, or runtime network requests from the packaged core. External links open only when chosen. No host permissions or persistent content scripts are installed. Local storage and downloaded backups are not encrypted by Bell Work.

| Permission         | Purpose                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| `storage`          | Save records, preferences, reminder history, and recovery copies.      |
| `unlimitedStorage` | Accommodate local notes and recovery copies beyond the standard quota. |
| `alarms`           | Schedule daily, timed-event, and snooze checks.                        |
| `notifications`    | Display reminders and summaries.                                       |
| `activeTab`        | Access the page explicitly chosen for capture.                         |
| `scripting`        | Read metadata and selected text during capture.                        |
| `contextMenus`     | Offer page capture on right-click.                                     |

The development server uses a local connection for hot reload. A browserless preview uses temporary memory and does not change installed-extension records. See [privacy details](docs/PRIVACY.md).

## Development and license

See [contributing](CONTRIBUTING.md), [architecture](docs/ARCHITECTURE.md), and [v2 verification status](docs/V2-STATUS.md).

[MIT](LICENSE). Bundled fonts use the SIL Open Font License: [Inter](licenses/Inter-OFL.txt) and [Noto Sans Bengali](licenses/Noto-Sans-Bengali-OFL.txt). Copies of their notices ship inside each extension build.
