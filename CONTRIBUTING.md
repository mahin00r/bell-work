# Contributing to Bell Work

Use Node.js 20.19 or newer and the pinned pnpm version in `package.json`. Install with `pnpm install`, then run `pnpm dev`. WXT opens a development browser; changes reload locally. Production output is in `.output/chrome-mv3` after `pnpm build`.

## Scripts

| Command              | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `pnpm dev`           | Start the extension development server.               |
| `pnpm typecheck`     | Prepare entrypoint types and check strict TypeScript. |
| `pnpm lint`          | Run ESLint.                                           |
| `pnpm format`        | Format source and documentation with Prettier.        |
| `pnpm test`          | Run domain and component tests once.                  |
| `pnpm icons`         | Resize the source SVG into the four packaged icons.   |
| `pnpm build`         | Create the production extension.                      |
| `pnpm build:firefox` | Create the Firefox MV3 development build.             |
| `pnpm zip`           | Build and package an archive.                         |
| `pnpm zip:firefox`   | Package the unsigned Firefox development archive.     |
| `pnpm check`         | Run typecheck, lint, tests, and both browser builds.  |

Keep changes small and typed. Use the shared repository for every storage operation. Store calendar dates as local `YYYY-MM-DD` strings and timestamps as ISO strings. Keep currency totals independent. Add focused tests when changing reminders, migrations, validation, or calculations.

Pull requests should describe the user-visible change, explain meaningful tradeoffs, and report validation. Run `pnpm check` before submitting. For interface changes, include screenshots of light and dark themes and check keyboard operation and reduced motion. Test page capture and reminders in an unpacked production build. Do not add network access, accounts, remote fonts, or permissions without a separate scope discussion.
