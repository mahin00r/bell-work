import { migrate } from './migrations';
import { stateSchema } from './schema';
import type { State } from './types';

export const STORAGE_KEY = 'bellwork:v1';
type Change = (state: State) => State;
export interface StorageAdapter {
  read(): Promise<unknown>;
  write(state: State): Promise<void>;
  listen(listener: () => void): () => void;
}
export function memoryAdapter(): StorageAdapter {
  let value: unknown;
  const listeners = new Set<() => void>();
  return {
    read: async () => structuredClone(value),
    write: async (s) => {
      value = structuredClone(s);
      listeners.forEach((l) => l());
    },
    listen: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
const chromeAdapter = (): StorageAdapter => ({
  read: async () => (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as unknown,
  write: async (state) => {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
  },
  listen: (listener) => {
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && STORAGE_KEY in changes) listener();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  },
});
export class Repository {
  private pending: { change: Change; resolve: (s: State) => void; reject: (e: unknown) => void }[] =
    [];
  private timer?: ReturnType<typeof setTimeout>;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private adapter: StorageAdapter) {}
  async get() {
    return migrate(await this.adapter.read());
  }
  set(change: Change, immediate = false): Promise<State> {
    const result = new Promise<State>((resolve, reject) =>
      this.pending.push({ change, resolve, reject }),
    );
    clearTimeout(this.timer);
    if (immediate) void this.flush();
    else
      this.timer = setTimeout(() => {
        void this.flush();
      }, 60);
    return result;
  }
  async flush() {
    clearTimeout(this.timer);
    const batch = this.pending.splice(0);
    if (!batch.length) return this.chain;
    const run = async () => {
      const transaction = async () => {
        const current = await this.get();
        const next = stateSchema.parse(
          batch.reduce((s, operation) => operation.change(s), current),
        );
        if (JSON.stringify(current) !== JSON.stringify(next)) await this.adapter.write(next);
        return next;
      };
      try {
        const next =
          typeof navigator !== 'undefined' && navigator.locks
            ? await navigator.locks.request(STORAGE_KEY, transaction)
            : await transaction();
        batch.forEach((op) => op.resolve(next));
      } catch (e) {
        batch.forEach((op) => op.reject(e));
      }
    };
    this.chain = this.chain.then(run, run);
    return this.chain;
  }
  subscribe(listener: () => void) {
    return this.adapter.listen(listener);
  }
}
export const repository = new Repository(
  typeof chrome !== 'undefined' && chrome.storage?.local ? chromeAdapter() : memoryAdapter(),
);
if (typeof window !== 'undefined')
  window.addEventListener('pagehide', () => {
    void repository.flush();
  });
