import { extensionApi, maybeExtensionApi } from './browser';
import { migrate } from './migrations';
import { stateSchema } from './schema';
import type { State } from './types';

export const STORAGE_KEY = 'bellwork:v1';
export const RECOVERY_KEY = 'bellwork:recovery';
export interface RecoveryCopy {
  id: string;
  at: string;
  reason: string;
  data: unknown;
}
type Change = (state: State) => State;
export interface StorageAdapter {
  read(): Promise<unknown>;
  write(state: State): Promise<void>;
  listen(listener: () => void): () => void;
  checkpoint?(copy: RecoveryCopy): Promise<void>;
  recovery?(): Promise<RecoveryCopy[]>;
  erase?(): Promise<void>;
}
const fallbackLocks = new WeakMap<StorageAdapter, Promise<unknown>>();
async function storageLock<T>(adapter: StorageAdapter, operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks)
    return await navigator.locks.request(STORAGE_KEY, operation);
  const previous = fallbackLocks.get(adapter) ?? Promise.resolve();
  const next = previous.then(operation, operation);
  fallbackLocks.set(
    adapter,
    next.catch(() => {}),
  );
  return next;
}
export function memoryAdapter(): StorageAdapter {
  let value: unknown;
  let copies: RecoveryCopy[] = [];
  const listeners = new Set<() => void>();
  return {
    read: async () => structuredClone(value),
    checkpoint: async (copy) => {
      copies = [structuredClone(copy), ...copies].slice(0, 3);
    },
    recovery: async () => structuredClone(copies),
    erase: async () => {
      value = undefined;
      copies = [];
      listeners.forEach((listener) => listener());
    },
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
  erase: async () => {
    await extensionApi().storage.local.remove([STORAGE_KEY, RECOVERY_KEY]);
  },
  read: async () => (await extensionApi().storage.local.get(STORAGE_KEY))[STORAGE_KEY] as unknown,
  write: async (state) => {
    await extensionApi().storage.local.set({ [STORAGE_KEY]: state });
  },
  recovery: async () =>
    ((await extensionApi().storage.local.get(RECOVERY_KEY))[RECOVERY_KEY] as RecoveryCopy[]) ?? [],
  checkpoint: async (copy) => {
    const copies = (await extensionApi().storage.local.get(RECOVERY_KEY))[RECOVERY_KEY] as
      RecoveryCopy[] | undefined;
    await extensionApi().storage.local.set({
      [RECOVERY_KEY]: [copy, ...(copies ?? [])].slice(0, 3),
    });
  },
  listen: (listener) => {
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && STORAGE_KEY in changes) listener();
    };
    extensionApi().storage.onChanged.addListener(onChange);
    return () => extensionApi().storage.onChanged.removeListener(onChange);
  },
});
export class Repository {
  private pending: {
    change: Change;
    reason?: string;
    resolve: (s: State) => void;
    reject: (e: unknown) => void;
  }[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private adapter: StorageAdapter) {}
  async get() {
    return migrate(await this.adapter.read());
  }
  async raw() {
    return this.adapter.read();
  }
  async erase() {
    await this.flush();
    if (!this.adapter.erase) throw new Error('Storage cannot be erased.');
    const erase = () => this.adapter.erase!();
    await storageLock(this.adapter, erase);
  }
  async recovery() {
    return this.adapter.recovery?.() ?? [];
  }
  async restore(id: string) {
    const copy = (await this.recovery()).find((copy) => copy.id === id);
    if (!copy) throw new Error('Recovery copy is no longer available.');
    const restored = migrate(copy.data);
    return this.replace(restored, 'Before recovery restore');
  }
  async replace(state: State, reason: string) {
    const restored = stateSchema.parse(state);
    await this.flush();
    return storageLock(this.adapter, async () => {
      const raw = await this.adapter.read();
      if (raw)
        await this.adapter.checkpoint?.({
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          reason,
          data: raw,
        });
      await this.adapter.write(restored);
      return restored;
    });
  }
  set(change: Change, immediate = false, reason?: string): Promise<State> {
    const result = new Promise<State>((resolve, reject) =>
      this.pending.push({ change, reason, resolve, reject }),
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
        const raw = await this.adapter.read();
        const current = migrate(raw);
        const next = stateSchema.parse(
          batch.reduce((s, operation) => operation.change(s), current),
        );
        const upgrade =
          raw && typeof raw === 'object' && 'schemaVersion' in raw && raw.schemaVersion !== 2;
        const reason = batch.find((operation) => operation.reason)?.reason;
        if (upgrade || JSON.stringify(current) !== JSON.stringify(next)) {
          if (raw && (upgrade || reason))
            await this.adapter.checkpoint?.({
              id: crypto.randomUUID(),
              at: new Date().toISOString(),
              reason: upgrade ? 'Before v2 migration' : reason!,
              data: raw,
            });
          await this.adapter.write(next);
        }
        return next;
      };
      try {
        const next = await storageLock(this.adapter, transaction);
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
  maybeExtensionApi()?.storage?.local ? chromeAdapter() : memoryAdapter(),
);
if (typeof window !== 'undefined')
  window.addEventListener('pagehide', () => {
    void repository.flush();
  });
