# Changelog

## 2.0.0-beta.1 — 2026-10-21, local development beta

- Upgrade v1 records in place, keeping a recovery copy before the first persisted migration.
- Snooze individual reminders without changing deadlines, trial dates, or renewal dates.
- Preserve the original billing day across short months and leap years.
- Keep missed renewals available for review, with manual payment records, price history, and planned cancellation dates.
- Add separate application events for interviews, documents, recommendations, offer decisions, and custom reminders, including time zones and completion.
- Use shared events for reminders, the timeline, and downloadable calendar snapshots.
- Add weekly review, saved filters, bulk changes with undo, and recoverable trash.
- Pin up to three daily priorities and protect edits made in another window.
- Capture structured job metadata and selected text, with date confirmation and duplicate warnings.
- Preview backup conflicts, choose a merge policy, optionally restore preferences, and restore local recovery copies.
- Recover from unreadable storage through raw export or validated backup replacement.
- Add English/Bangla interface support, bundled Bengali typography, and Firefox MV3 build commands.
- Pass 64 automated tests, both production builds, and focused browser preview smoke checks.

Release checks, browser verification, and remaining work are recorded in [docs/V2-STATUS.md](docs/V2-STATUS.md).

## 1.0.0

Initial local Chrome release with Today, applications, subscriptions, timeline, insights, page capture, reminders, and JSON backups.
