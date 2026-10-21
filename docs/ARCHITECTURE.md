# Architecture

Bell Work is a Manifest V3 extension built with WXT, React 18, and strict TypeScript. Production entrypoints require no network connection.

## Entrypoints

- `src/entrypoints/popup` renders the 400 × 600 Today check-in.
- `src/entrypoints/options` opens the full dashboard in a browser tab. Hash links select views or items; capture parameters open quick-add.
- `src/entrypoints/background.ts` registers browser events, the context menu, shortcut, alarms, and notification actions. Event listeners are registered synchronously when the worker starts.

## Data boundary

`src/shared/schema.ts` defines validation; `types.ts` exposes its inferred types. `storage.ts` owns the sole storage key, `bellwork:v1`, and is the only module that accesses browser storage. Reads go through the migration runner. UI and worker commits start immediately; optional batching remains available at the repository boundary. Web Locks serialize read-modify-write transactions across extension contexts so independent edits do not overwrite one another. Every transaction reads the latest stored state, validates its result, and skips unchanged writes.

Storage change events refresh the Zustand projection in each interface. Components issue repository mutations through `store.ts`; the store is a view of persisted data. Browserless component tests use an isolated memory adapter. A browserless development preview has ephemeral data; installed extension data always uses browser storage.

The internal schema is version 2 while the storage key remains stable. The raw prior state is checkpointed under `bellwork:recovery` before its first migrated write. Migration, import, and restore keep up to three recovery copies. Explicit erasure removes both keys. Unreadable records put the UI into recovery mode; validated restore or replacement preserves raw data before writing.

Backups use the same schemas and migration runner. Import previews conflicts and merges by ID, keeping newer records by default and current records on timestamp ties. Users can choose a different policy and optionally restore preferences. Unsupported future versions fail without modifying stored data. UI commits start immediately; repository batching remains available for callers that request it. Web Locks protect cross-context writes; a shared adapter queue serializes browserless fallback transactions. Drawer edits retain their original baseline and reject conflicting field changes.

## Reminder flow

The worker checks on startup, installation, daily alarm, and storage changes. `background-engine.ts` advances active subscriptions, computes the badge, schedules the next local-time alarm, and delegates notice creation to the Chrome adapter. `reminders.ts` determines lead windows, follow-ups, trial dates, and snooze changes. Durable keys identify the item, event, date, and reminder window. A stable notification ID allows a visible notification to be acknowledged after an interrupted worker, and failed delivery remains eligible for retry. Delivery history is retained for one year.

The worker keeps no authoritative application state in memory. Web Locks serialize overlapping checks, and each check reloads the repository. `events.ts` projects unfinished application events and subscription dates into a shared event model. Today, badges, timeline, reminders, review, filters, and calendar export use that model. Business dates stay separate from occurrence-specific snoozes. Billing anchors preserve original days and explicit month-end rules; recurrence projections also power spending forecasts. Missed active renewals remain flagged for review.

Alarms choose the next daily summary, timed event, or snooze expiry. Notification relevance is checked again after asynchronous browser calls. Larger backlogs use a digest and persist delivery keys in one transaction. Bounded caches hold time-zone formatters and resolved event instants; they contain no authoritative records. Date-only values stay local; timed events retain an IANA zone and resolve to an instant for device-local display and UTC calendar export. Browser shutdown and operating-system controls can delay delivery.

## Interface

`src/ui` contains theme tokens, accessible Radix primitives, shared springs, and reduced-motion helpers. `src/features` owns Today, board, subscriptions, timeline, insights, item editing, capture, command palette, settings, and onboarding. The board uses dnd-kit sensors plus an explicit status selector as an alternative interaction. Charts are small SVGs.

The popup paints a lightweight shell before loading its React interface. Today initially renders twelve rows per urgency group and progressively reveals more on request; search always covers every stored item. This keeps startup independent of the full list size.

To add a feature, put its screen and interactions in `src/features`, keep domain calculations in `src/shared`, and add navigation in the dashboard. Extend schemas and migrations before changing persisted fields. Keep all external navigation an explicit user action.

## Browser and language support

`browser.ts` resolves Firefox's promise API namespace or Chromium's `chrome` namespace. WXT builds Chrome MV3 and Firefox MV3 separately. Firefox omits notification action buttons and declares its minimum supported browser version and no data collection in its manifest.

`shared/i18n.ts` provides pure translations for the worker and domain messages. `ui/i18n.ts` reads the selected language for interface strings and date/currency formatting. User-entered titles, tags, and notes retain their original text. Inter and Noto Sans Bengali are bundled with license notices. Runtime operation has no network dependency.
