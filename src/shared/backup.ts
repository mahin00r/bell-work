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
export function mergeBackup(current: State, incoming: State): State {
  const items = new Map(current.items.map((i) => [i.id, i]));
  incoming.items.forEach((i) => items.set(i.id, i));
  return {
    ...incoming,
    items: [...items.values()],
    notified: { ...current.notified, ...incoming.notified },
  };
}
