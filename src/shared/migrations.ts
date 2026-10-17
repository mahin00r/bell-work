import { z } from 'zod';
import { settingsSchema, stateSchema } from './schema';
import type { State } from './types';
export const emptyState = (): State => ({
  schemaVersion: 1,
  items: [],
  settings: settingsSchema.parse({}),
  notified: {},
});
export function migrate(input: unknown): State {
  if (input === undefined || input === null) return emptyState();
  const envelope = z.object({ schemaVersion: z.number().int() }).parse(input);
  if (envelope.schemaVersion > 1)
    throw new Error('This backup needs a newer version of Bell Work.');
  if (envelope.schemaVersion === 0) {
    const old = z
      .object({
        items: z.array(z.unknown()).default([]),
        settings: z.record(z.unknown()).default({}),
      })
      .parse(input);
    return stateSchema.parse({
      schemaVersion: 1,
      items: old.items,
      settings: old.settings,
      notified: {},
    });
  }
  return stateSchema.parse(input);
}
