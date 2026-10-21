# Bell Work v2 status

Updated: 2026-10-21. Version: 2.0.0-beta.1. The local development beta is built and checked. It is not a store-approved public release.

## Implemented

- [x] Read v1 records and backups using schema v2 under the original storage key.
- [x] Preserve up to three raw recovery copies before migration, import, and restore; explicit data erasure also removes recovery copies.
- [x] Independent event snoozing, anchored monthly/quarterly/yearly billing, leap-year handling, and shared recurrence projections.
- [x] Application events with completion, times, IANA zones, locations, and links; shared reminder, badge, timeline, and calendar projection.
- [x] Review missed renewals, record payments manually, retain price history, and plan cancellation dates.
- [x] Weekly review, per-currency 30/90-day forecasts, and up to three pinned priorities.
- [x] Combined filters, saved views, bulk archive/tag/status, guarded undo, and recoverable trash.
- [x] Structured job capture, selected-text notes, source-date confirmation, and duplicate warnings.
- [x] Calendar snapshot export and conflict-aware backup import.
- [x] Recovery mode for unreadable storage, raw export, and validated backup replacement.
- [x] Preserve unrelated concurrent drawer changes and reject conflicting edits.
- [x] English/Bangla interface, date/currency formatting, local Bengali typography, and translated command search.
- [x] Firefox promise namespace support and a separate Firefox 140+ MV3 build; omit unsupported notification action buttons.

## Verified on the final source

- [x] `corepack pnpm check`: TypeScript, ESLint, all 64 tests across 9 files, Chrome build, and Firefox build.
- [x] V1 migration, backup conflict choices, recovery failure protection, raw-copy preservation, corruption recovery, and explicit erasure.
- [x] Snooze date preservation and redelivery, billing anchors, DST gaps, time-zone date boundaries, stale reminder relevance, digest delivery, and repository concurrency.
- [x] Event editing/completion, saved filters, bulk undo, duplicate/date confirmation, language switching, trash, price changes, and manual payment records.
- [x] UTF-8 calendar folding, escaped text, stable occurrence identifiers, all-day end dates, and UTC timed events.
- [x] Domain scale checks at 500 and 5,000 fictional applications, each with a deadline and a timed interview.
- [x] Browser preview smoke checks: combined filters, saved view, bulk archive and undo, Ctrl+K, and Bangla command search.
- [x] English/light and Bangla/dark layouts at desktop and compact breakpoints; no horizontal overflow at 1280 px or 390 px. Navigation returns to the top of the view.
- [x] Preview console check: no captured warnings or errors after the tested workflows.
- [x] Source network-call scan and generated-manifest review: seven existing permissions, no host permissions, and bundled fonts/licenses.

The browser preview uses isolated temporary memory. These checks did not modify an installed extension's records.

## Measured scale results

Representative timings from the final full check, in milliseconds:

| Records | Schema validation | Reminder/list/event projections | Calendar export | JSON backup round-trip |
| ------- | ----------------: | ------------------------------: | --------------: | ---------------------: |
| 500     |                61 |                              82 |              74 |                     56 |
| 5,000   |               311 |                             486 |             462 |                    285 |

These are domain-processing measurements under the local test runtime, not installed-popup startup measurements or universal performance guarantees. The 5,000-record fixture contains 10,000 calendar events. Bounded time-zone caches eliminated repeated formatter construction. Board, timeline, Today, library, and review lists reveal additional rows progressively.

## Local deliverables

- Chrome build: `.output/chrome-mv3`.
- Firefox build: `.output/firefox-mv3`.
- Development archives: `.output/bell-work-2.0.0-beta.1-chrome.zip` and `.output/bell-work-2.0.0-beta.1-firefox.zip`.
- Fictional-data preview screenshots: `.output/v2-english-desktop.jpg`, `.output/v2-bangla-desktop.jpg`, and `.output/v2-bangla-compact.jpg`.
- Installation and upgrade guidance: [README](../README.md). Privacy details: [PRIVACY](PRIVACY.md).

Build output, screenshots, source safety copies, and temporary verification scripts remain in ignored `.output/`. Version history preserves the original release as `v1.0.0` and identifies this beta as `v2.0.0-beta.1`. Installation into the user's browser profile and store submission remain pending.

## Still required before public release

- [ ] Real installed Chrome and Firefox checks: shortcut, context menu, OS notifications, restart/sleep, and upgrade from a populated v1 profile.
- [ ] Import exported calendars into Google Calendar, Outlook, and Apple Calendar and check each client's duplicate behavior.
- [ ] Measure installed-popup startup and interaction performance with representative large datasets.
- [ ] Beta feedback, accessibility review with assistive technology, and fixes.
- [ ] Store-ready screenshots and a short demo video. The saved preview screenshots are QA evidence.
- [ ] Store declarations, developer-account submission, review, and Firefox signing.

Known build warning: a shared UI chunk is approximately 572 kB minified and exceeds Vite's 500 kB advisory threshold. Both builds succeed. Further splitting should be guided by installed-popup profiling.

Site-specific capture adapters and chosen-folder backup remain optional follow-ups. Accounts, server sync, AI parsing, email access, mobile apps, and live calendar sync remain outside this release.
