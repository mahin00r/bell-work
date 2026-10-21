import { migrate } from './migrations';
import type { State } from './types';
export function parseBackup(text: string) {
  if (text.length > 25 * 1024 * 1024) throw new Error('Backup must be smaller than 25 MB.');
  const input: unknown = JSON.parse(text);
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Choose a valid Bell Work backup.');
  return migrate(input);
}
export function importPreview(current: State, incoming: State) {
  const ids = new Set(current.items.map((i) => i.id));
  return {
    added: incoming.items.filter((i) => !ids.has(i.id)).length,
    updated: incoming.items.filter((i) => ids.has(i.id)).length,
  };
}
export type ConflictPolicy = 'newer' | 'current' | 'incoming';
export function backupConflicts(current: State, incoming: State) {
  const existing = new Map(current.items.map((item) => [item.id, item]));
  return incoming.items.flatMap((item) => {
    const local = existing.get(item.id);
    return local && JSON.stringify(local) !== JSON.stringify(item)
      ? [{ id: item.id, title: item.title, localAt: local.updatedAt, incomingAt: item.updatedAt }]
      : [];
  });
}
export function mergeBackup(
  current: State,
  incoming: State,
  policy: ConflictPolicy = 'newer',
  restoreSettings = false,
): State {
  const items = new Map(current.items.map((i) => [i.id, i]));
  incoming.items.forEach((i) => {
    const local = items.get(i.id);
    if (
      !local ||
      policy === 'incoming' ||
      (policy === 'newer' && Date.parse(i.updatedAt) > Date.parse(local.updatedAt))
    )
      items.set(i.id, i);
  });
  return {
    ...incoming,
    settings: restoreSettings ? incoming.settings : current.settings,
    focusIds: restoreSettings ? incoming.focusIds : current.focusIds,
    savedViews: [
      ...new Map(
        [...(incoming.savedViews ?? []), ...(current.savedViews ?? [])].map((view) => [
          view.id,
          view,
        ]),
      ).values(),
    ],
    items: [...items.values()],
    notified: { ...current.notified, ...incoming.notified },
  };
}
