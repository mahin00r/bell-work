import { z } from 'zod';
import { settingsSchema, stateSchema } from './schema';
import type { State } from './types';
export const emptyState = (): State => ({
  schemaVersion: 2,
  items: [],
  settings: settingsSchema.parse({}),
  notified: {},
});
export function migrate(input: unknown): State {
  if (input === undefined || input === null) return emptyState();
  const envelope = z.object({ schemaVersion: z.number().int() }).parse(input);
  if (envelope.schemaVersion > 2)
    throw new Error('This backup needs a newer version of Bell Work.');
  if (envelope.schemaVersion === 0) {
    const old = z
      .object({
        items: z.array(z.unknown()).default([]),
        settings: z.record(z.unknown()).default({}),
      })
      .parse(input);
    return stateSchema.parse({
      schemaVersion: 2,
      items: old.items,
      settings: old.settings,
      notified: {},
    });
  }
  if (envelope.schemaVersion === 1) {
    const old = z
      .object({ items: z.array(z.unknown()), settings: z.unknown(), notified: z.unknown() })
      .parse(input);
    const parsed = stateSchema.parse({ ...old, schemaVersion: 2 });
    return {
      ...parsed,
      items: parsed.items.map((item) =>
        item.kind === 'subscription'
          ? {
              ...item,
              billingAnchor: {
                day: Number(item.nextRenewal.slice(8)),
                month: Number(item.nextRenewal.slice(5, 7)),
                endOfMonth: false,
              },
            }
          : { ...item, events: item.events ?? [] },
      ),
    };
  }
  if (envelope.schemaVersion !== 2) throw new Error('Unsupported Bell Work data version.');
  return stateSchema.parse(input);
}
