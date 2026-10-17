import { describe, expect, it } from 'vitest';
import {
  advanceRenewal,
  daysUntil,
  monthEnd,
  nextCycle,
  nextDailyAlarm,
  shiftDay,
  today,
} from '../src/shared/dates';
import {
  badge,
  applyStatus,
  dueDate,
  funnel,
  groupItems,
  spend,
  upcomingSpend,
} from '../src/shared/selectors';
import { notices, advanceSubscriptions, snooze } from '../src/shared/reminders';
import { emptyState, migrate } from '../src/shared/migrations';
import { importPreview, mergeBackup, parseBackup } from '../src/shared/backup';
import { itemSchema } from '../src/shared/schema';
import { newItem } from '../src/shared/templates';
import { sampleData } from '../src/shared/sample-data';
import { Repository, memoryAdapter } from '../src/shared/storage';
import type { Application, Subscription } from '../src/shared/types';

const now = new Date(2026, 9, 17, 12);
const job = (deadline = '2026-10-20'): Application => ({
  ...newItem('job'),
  kind: 'job',
  title: 'Designer',
  organization: 'Northwind Labs',
  roleOrProgram: 'Designer',
  deadline,
  status: 'saved',
  priority: 'high',
  checklist: [],
  documents: [],
  statusHistory: [],
});
const sub = (cycle: Subscription['cycle'] = 'monthly'): Subscription => ({
  ...newItem('subscription'),
  kind: 'subscription',
  title: 'CloudNotes',
  vendor: 'CloudNotes',
  cost: { amount: 1200, currency: 'BDT' },
  cycle,
  nextRenewal: '2026-10-20',
  status: 'active',
  category: 'Software',
  remindDaysBefore: 3,
});

describe('calendar days', () => {
  it('keeps local dates and crosses month and leap boundaries', () => {
    expect(today(now)).toBe('2026-10-17');
    expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29');
    expect(daysUntil('2026-10-18', now)).toBe(1);
    expect(monthEnd(now)).toBe('2026-10-31');
    expect(nextCycle('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(nextCycle('2024-02-29', 'yearly')).toBe('2025-02-28');
    expect(advanceRenewal('2026-09-01', 'monthly', now)).toBe('2026-11-01');
  });
  it('schedules the next local reminder time', () => {
    const n = new Date(nextDailyAlarm('09:00', now));
    expect(n.getDate()).toBe(18);
    expect(n.getHours()).toBe(9);
  });
});
describe('selectors', () => {
  it('groups urgency and excludes closed items from badge', () => {
    const items = [
      job('2026-10-16'),
      job(),
      job('2026-11-20'),
      { ...job(), status: 'rejected' as const },
    ];
    const groups = groupItems(items, now);
    expect(Object.values(groups).map((g) => g.length)).toEqual([1, 1, 1]);
    expect(badge(items, now)).toEqual({ count: 2, overdue: true });
  });
  it('normalizes all billing cycles without mixing currencies', () => {
    expect(
      spend([
        sub('monthly'),
        sub('quarterly'),
        sub('yearly'),
        { ...sub('weekly'), cost: { amount: 12, currency: 'USD' } },
      ]),
    ).toEqual({ BDT: 1700, USD: 52 });
    expect(
      upcomingSpend(
        [{ ...sub('weekly'), nextRenewal: '2026-10-17', cost: { amount: 10, currency: 'USD' } }],
        now,
      ),
    ).toEqual({ USD: 50 });
  });
  it('records status transitions and follows applied items in ten days', () => {
    const applied = applyStatus(job(), 'applied', now);
    expect(applied.followUpAt).toBe('2026-10-27');
    expect(dueDate(applied)).toBe('2026-10-27');
    expect(applyStatus(applied, 'applied', now)).toBe(applied);
    expect(funnel([applyStatus(applied, 'interview', now)])).toEqual({
      saved: 0,
      applied: 1,
      interview: 1,
      offer: 0,
    });
  });
});
describe('reminder engine', () => {
  it('sends lead-day reminders once and catches up a missed check', () => {
    const state = { ...emptyState(), items: [job()] };
    const notice = notices(state, now)[0];
    expect(notice.title).toContain('3 days left');
    state.notified[notice.key] = now.toISOString();
    expect(notices(state, now)).toEqual([]);
    expect(notices(state, new Date(2026, 9, 19, 9))).toHaveLength(1);
    expect(
      notices({ ...state, settings: { ...state.settings, notificationsEnabled: false } }, now),
    ).toEqual([]);
  });
  it('notifies before trial end and advances only active renewals', () => {
    const trial = { ...sub(), status: 'trial' as const, trialEndsAt: '2026-10-19' };
    expect(notices({ ...emptyState(), items: [trial] }, now).some((n) => n.type === 'trial')).toBe(
      true,
    );
    const state = advanceSubscriptions(
      {
        ...emptyState(),
        items: [
          { ...sub(), nextRenewal: '2026-09-20' },
          { ...trial, nextRenewal: '2026-09-20' },
        ],
      },
      now,
    );
    expect((state.items[0] as Subscription).nextRenewal).toBe('2026-10-20');
    expect((state.items[1] as Subscription).nextRenewal).toBe('2026-09-20');
    expect((snooze(trial, now, 'trial') as Subscription).trialEndsAt).toBe('2026-10-18');
  });
  it('does not keep past application deadlines active after submission', () => {
    const applied = applyStatus(job('2026-10-10'), 'applied', now);
    expect(badge([applied], now).count).toBe(0);
  });
});
describe('backups and migrations', () => {
  it('upgrades v0 and rejects future versions and malformed backups', () => {
    expect(migrate({ schemaVersion: 0, items: [] }).settings.defaultCurrency).toBe('BDT');
    expect(() => migrate({ schemaVersion: 2 })).toThrow('newer version');
    expect(() => parseBackup('{bad')).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({ ...emptyState(), items: [{ ...job(), deadline: '2026-02-30' }] }),
      ),
    ).toThrow();
    expect(() => itemSchema.parse({ ...job(), url: 'javascript:alert(1)' })).toThrow();
    expect(() => itemSchema.parse({ ...sub(), cost: { amount: -1, currency: 'BDT' } })).toThrow();
  });
  it('previews ID merges and round-trips every field', () => {
    const current = { ...emptyState(), items: [job()] };
    const incoming = { ...emptyState(), items: [{ ...current.items[0], title: 'Updated' }, sub()] };
    expect(importPreview(current, incoming)).toEqual({ added: 1, updated: 1 });
    expect(mergeBackup(current, incoming).items).toHaveLength(2);
    expect(parseBackup(JSON.stringify(incoming))).toEqual(incoming);
    expect(() =>
      parseBackup(JSON.stringify({ ...incoming, items: [incoming.items[0], incoming.items[0]] })),
    ).toThrow();
  });
  it('all sample items satisfy the schema and are removable by tag', () => {
    expect(
      sampleData().every((i) => itemSchema.safeParse(i).success && i.tags.includes('sample')),
    ).toBe(true);
  });
});
describe('repository', () => {
  it('batches changes, preserves concurrent edits, and broadcasts writes', async () => {
    const adapter = memoryAdapter();
    const repo = new Repository(adapter);
    let notifications = 0;
    const unsubscribe = repo.subscribe(() => notifications++);
    const a = repo.set((s) => ({ ...s, items: [...s.items, job()] }));
    const b = repo.set((s) => ({ ...s, items: [...s.items, sub()] }));
    await repo.flush();
    await Promise.all([a, b]);
    expect((await repo.get()).items).toHaveLength(2);
    expect(notifications).toBe(1);
    await repo.set((s) => ({ ...s, settings: { ...s.settings, theme: 'dark' } }), true);
    expect((await repo.get()).items).toHaveLength(2);
    unsubscribe();
  });
  it('rejects invalid mutations without damaging saved data', async () => {
    const repo = new Repository(memoryAdapter());
    await expect(repo.set((s) => ({ ...s, items: [job('invalid')] }), true)).rejects.toThrow();
    expect((await repo.get()).items).toEqual([]);
  });
});
