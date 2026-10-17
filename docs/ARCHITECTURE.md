# Architecture

Bell Work is a Manifest V3 extension built with WXT, React 18, and strict TypeScript. Production entrypoints require no network connection.

## Entrypoints

- `src/entrypoints/popup` renders the 400 × 600 Today check-in.
- `src/entrypoints/options` opens the full dashboard in a browser tab. Hash links select views or items; capture parameters open quick-add.
- `src/entrypoints/background.ts` registers browser events, the context menu, shortcut, alarms, and notification actions. Event listeners are registered synchronously when the worker starts.

## Data boundary

`src/shared/schema.ts` defines validation; `types.ts` exposes its inferred types. `storage.ts` owns the sole storage key, `bellwork:v1`, and is the only module that accesses browser storage. Reads go through the migration runner. Writes batch for 60 ms in the UI and run immediately in the worker. Web Locks serialize read-modify-write transactions across extension contexts so independent edits do not overwrite one another. Every transaction reads the latest stored state, validates its result, and skips unchanged writes.

Storage change events refresh the Zustand projection in each interface. Components issue repository mutations through `store.ts`; the store is a view of persisted data. Browserless component tests use an isolated memory adapter. A browserless development preview has ephemeral data; installed extension data always uses browser storage.

Backups use the same schemas and migration runner. Import previews and merges by ID; the incoming item wins. Unsupported future versions fail without modifying stored data.

## Reminder flow

The worker checks on startup, installation, daily alarm, and storage changes. `background-engine.ts` advances active subscriptions, computes the badge, schedules the next local-time alarm, and delegates notice creation to the Chrome adapter. `reminders.ts` determines lead windows, follow-ups, trial dates, and snooze changes. Durable keys identify the item, event, date, and reminder window. A stable notification ID allows a visible notification to be acknowledged after an interrupted worker, and failed delivery remains eligible for retry. Delivery history is retained for one year.

The worker keeps no application state in memory. Web Locks serialize overlapping checks, and each check reloads the current repository state. Local calendar calculations in `dates.ts` avoid UTC drift. Browser shutdown and operating-system notification controls can delay delivery until a later check.

## Interface

`src/ui` contains theme tokens, accessible Radix primitives, shared springs, and reduced-motion helpers. `src/features` owns Today, board, subscriptions, timeline, insights, item editing, capture, command palette, settings, and onboarding. The board uses dnd-kit sensors plus an explicit status selector as an alternative interaction. Charts are small SVGs.

The popup paints a lightweight shell before loading its React interface. Today initially renders twelve rows per urgency group and progressively reveals more on request; search always covers every stored item. This keeps startup independent of the full list size.

To add a feature, put its screen and interactions in `src/features`, keep domain calculations in `src/shared`, and add navigation in the dashboard. Extend schemas and migrations before changing persisted fields. Keep all external navigation an explicit user action.
