import { create } from 'zustand';
import { emptyState } from './migrations';
import { repository } from './storage';
import type { Item, State } from './types';
interface Store {
  data: State;
  ready: boolean;
  error: string | null;
  loadFailed: boolean;
}
export const useStore = create<Store>(() => ({
  data: emptyState(),
  ready: false,
  error: null,
  loadFailed: false,
}));
export async function reload() {
  try {
    useStore.setState({
      data: await repository.get(),
      ready: true,
      error: null,
      loadFailed: false,
    });
  } catch {
    useStore.setState({
      ready: true,
      loadFailed: true,
      error:
        'Your data could not be loaded. Export a backup before changing anything, or try reopening Bell Work.',
    });
  }
}
let listening = false;
export function initializeStore() {
  if (!listening) {
    repository.subscribe(() => {
      void reload();
    });
    listening = true;
  }
  return reload();
}
export async function commit(change: (s: State) => State, reason?: string) {
  if (useStore.getState().loadFailed) return false;
  try {
    const data = await repository.set(change, true, reason);
    useStore.setState({ data, error: null });
    return true;
  } catch {
    useStore.setState({
      error: 'This change could not be saved. Please try again. Your previous data is safe.',
    });
    return false;
  }
}
export const updateItem = (id: string, update: (i: Item) => Item) =>
  commit((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? update(i) : i)) }));
export const archiveItem = (id: string) =>
  updateItem(id, (i) => ({
    ...i,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
