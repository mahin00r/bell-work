import { describe, expect, it, vi } from 'vitest';
import { advanceRenewal, billingAnchor, nextCycle, renewalDates } from '../src/shared/dates';
import { itemEvents, eventInstant, projectedEvents } from '../src/shared/events';
import { advanceSubscriptions, nextReminderAlarm, notices, snooze } from '../src/shared/reminders';
import { migrate, emptyState } from '../src/shared/migrations';
import {
  Repository,
  memoryAdapter,
  type RecoveryCopy,
  type StorageAdapter,
} from '../src/shared/storage';
import { newItem } from '../src/shared/templates';
import { applicationEventSchema } from '../src/shared/schema';
import { mergeBackup } from '../src/shared/backup';
import { calendarExport } from '../src/shared/calendar';
import { defaultFilters, filterItems, bulkChange } from '../src/shared/filters';
import { badge, dueDate, upcomingSpend } from '../src/shared/selectors';
import { runReminders, type ReminderPort } from '../src/shared/background-engine';
import { translate } from '../src/shared/i18n';
import type { Application, Subscription } from '../src/shared/types';

const now = new Date(2026, 9, 21, 12);
const job = (): Application => ({
  ...newItem('job'),
  kind: 'job',
  title: 'Fellowship',
  organization: 'Harbor',
  roleOrProgram: 'Fellow',
  status: 'preparing',
  priority: 'high',
  deadline: '2026-10-23',
  checklist: [],
  documents: [],
  statusHistory: [],
});
const sub = (): Subscription => ({
  ...newItem('subscription'),
  kind: 'subscription',
  title: 'Notes',
  vendor: 'Notes',
  cost: { amount: 100, currency: 'BDT' },
  cycle: 'monthly',
  nextRenewal: '2026-01-31',
  status: 'active',
  category: 'Software',
  remindDaysBefore: 3,
});

describe('billing recurrence', () => {
  it('stops forecasts at a planned cancellation date while keeping a review reminder', () => {
    const item = {
      ...sub(),
      status: 'cancelling' as const,
      nextRenewal: '2026-10-23',
      cancelAt: '2026-11-23',
    };
    expect(renewalDates(item, '2026-10-21', 90)).toEqual(['2026-10-23']);
    expect(
      itemEvents(item).some((event) => event.id === 'cancellation' && event.date === item.cancelAt),
    ).toBe(true);
  });
  it('returns to the original billing day after February across separate worker runs', () => {
    const initial = { ...emptyState(), items: [sub()] };
    const february = advanceSubscriptions(initial, new Date(2026, 1, 1));
    expect(february.items[0]).toHaveProperty('nextRenewal', '2026-02-28');
    const march = advanceSubscriptions(february, new Date(2026, 2, 1));
    expect(march.items[0]).toHaveProperty('nextRenewal', '2026-03-31');
    expect(march.items[0]).toHaveProperty('renewalReviewAt', '2026-01-31');
    expect(itemEvents(march.items[0]).some((event) => event.id === 'missed-renewal')).toBe(true);
  });
  it('handles leap-year annual anchors, quarterly anchors, and explicit month end', () => {
    const leap = billingAnchor('2024-02-29');
    expect(advanceRenewal('2025-02-28', 'yearly', new Date(2028, 1, 1), leap)).toBe('2028-02-29');
    const anchor = billingAnchor('2026-01-31');
    expect(nextCycle(nextCycle('2026-01-31', 'quarterly', anchor), 'quarterly', anchor)).toBe(
      '2026-07-31',
    );
    expect(
      nextCycle('2026-04-30', 'monthly', { ...billingAnchor('2026-04-30'), endOfMonth: true }),
    ).toBe('2026-05-31');
  });
  it('shares anchored projections between calendar, timeline, and spend', () => {
    const item = sub();
    expect(renewalDates(item, '2026-02-01', 90)).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(projectedEvents([item], new Date(2026, 1, 1), 90).map((event) => event.date)).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(upcomingSpend([item], new Date(2026, 1, 1), 90)).toEqual({ BDT: 300 });
  });
  it('catches up old weekly records without walking each missed week', () => {
    expect(advanceRenewal('1900-01-01', 'weekly', now)).toBe('2026-10-26');
  });
});
describe('events and reminders', () => {
  it('uses the local display day for an interview stored across a time-zone date boundary', () => {
    const item: Application = {
      ...job(),
      deadline: undefined,
      events: [
        {
          id: 'tokyo',
          kind: 'interview',
          title: 'Tokyo interview',
          date: '2026-10-22',
          time: '00:30',
          timeZone: 'Asia/Tokyo',
        },
      ],
    };
    const clock = new Date('2026-10-21T12:00:00Z');
    expect(dueDate(item)).toBe('2026-10-21');
    expect(projectedEvents([item], new Date(2026, 9, 21), 1)).toHaveLength(1);
    expect(notices({ ...emptyState(), items: [item] }, clock)[0].title).toContain('Due today');
  });
  it('delivers a large backlog as one digest and remembers all included windows', async () => {
    const repo = new Repository(memoryAdapter());
    await repo.set(
      () => ({ ...emptyState(), items: Array.from({ length: 20 }, () => job()) }),
      true,
    );
    const port: ReminderPort = {
      notify: vi.fn().mockResolvedValue(undefined),
      existing: vi.fn().mockResolvedValue({}),
      badge: vi.fn().mockResolvedValue(undefined),
      schedule: vi.fn().mockResolvedValue(undefined),
    };
    await runReminders(repo, port, now);
    expect(port.notify).toHaveBeenCalledOnce();
    expect(Object.keys((await repo.get()).notified)).toHaveLength(20);
    await runReminders(repo, port, now);
    expect(port.notify).toHaveBeenCalledOnce();
  });
  it('snoozes one occurrence without changing business dates or hiding overdue badges', () => {
    const item = { ...job(), deadline: '2026-10-20' };
    const delayed = snooze(item, now);
    expect(delayed).toHaveProperty('deadline', item.deadline);
    expect(notices({ ...emptyState(), items: [delayed] }, now)).toEqual([]);
    expect(badge([delayed], now)).toEqual({ count: 1, overdue: true });
    expect(notices({ ...emptyState(), items: [delayed] }, new Date(2026, 9, 22, 12))).toHaveLength(
      1,
    );
  });
  it('redelivers a snoozed notice after the same window was already acknowledged', () => {
    const item = job();
    const state = { ...emptyState(), items: [item] };
    const original = notices(state, now)[0];
    state.notified[original.key] = now.toISOString();
    state.items = [snooze(item, now) as Application];
    const next = notices(state, new Date(2026, 9, 22, 12))[0];
    expect(next).toBeDefined();
    expect(next.key).not.toBe(original.key);
  });
  it('snoozes trial alerts independently and ignores stale renewal notification actions', () => {
    const item = {
      ...sub(),
      status: 'trial' as const,
      trialEndsAt: '2026-10-22',
      nextRenewal: '2026-10-23',
    };
    const delayed = snooze(item, now, 'trial', item.trialEndsAt);
    expect(delayed).toHaveProperty('trialEndsAt', '2026-10-22');
    expect(delayed).toHaveProperty('nextRenewal', '2026-10-23');
    expect(notices({ ...emptyState(), items: [delayed] }, now).map((event) => event.type)).toEqual([
      'renewal',
    ]);
    expect(snooze(item, now, 'renewal', '2026-09-23')).toBe(item);
  });
  it('tracks offer decisions and multiple events while excluding completed and deleted items', () => {
    const item: Application = {
      ...job(),
      status: 'offer',
      events: [
        { id: 'decision', kind: 'offer', title: 'Accept offer', date: '2026-10-22' },
        { id: 'docs', kind: 'document', title: 'Transcript', date: '2026-10-23' },
        {
          id: 'finished',
          kind: 'custom',
          title: 'Done',
          date: '2026-10-20',
          completedAt: now.toISOString(),
        },
      ],
    };
    expect(itemEvents(item)).toHaveLength(2);
    expect(notices({ ...emptyState(), items: [item] }, now)).toHaveLength(2);
    expect(itemEvents({ ...item, deletedAt: now.toISOString() })).toEqual([]);
  });
  it('resolves IANA time zones and rejects nonexistent daylight-saving times', () => {
    expect(eventInstant({ date: '2026-10-21', time: '18:30', timeZone: 'Asia/Dhaka' })).toBe(
      Date.parse('2026-10-21T12:30:00Z'),
    );
    expect(
      eventInstant({ date: '2026-03-08', time: '02:30', timeZone: 'America/New_York' }),
    ).toBeUndefined();
    expect(
      applicationEventSchema.safeParse({
        id: 'x',
        kind: 'interview',
        title: 'Interview',
        date: '2026-03-08',
        time: '02:30',
        timeZone: 'America/New_York',
      }).success,
    ).toBe(false);
  });
  it('rebuilds the nearest timed alarm and snooze alarm from persisted data', () => {
    const instant = Date.parse('2026-10-21T12:30:00Z');
    const item: Application = {
      ...job(),
      events: [
        {
          id: 'interview',
          kind: 'interview',
          title: 'Interview',
          date: '2026-10-21',
          time: '18:30',
          timeZone: 'Asia/Dhaka',
        },
      ],
    };
    const clock = new Date('2026-10-21T12:00:00Z');
    expect(nextReminderAlarm({ ...emptyState(), items: [item] }, clock)).toBe(instant);
  });
  it('rechecks relevance after waiting on browser notification state', async () => {
    const repo = new Repository(memoryAdapter());
    const item = job();
    await repo.set(() => ({ ...emptyState(), items: [item] }), true);
    const port: ReminderPort = {
      notify: vi.fn().mockResolvedValue(undefined),
      badge: vi.fn().mockResolvedValue(undefined),
      schedule: vi.fn().mockResolvedValue(undefined),
      existing: async () => {
        await repo.set((state) => ({ ...state, items: [] }), true);
        return {};
      },
    };
    await runReminders(repo, port, now);
    expect(port.notify).not.toHaveBeenCalled();
  });
});
describe('migration and recovery', () => {
  it('serializes multiple repository instances sharing a storage adapter', async () => {
    const adapter = memoryAdapter();
    const first = new Repository(adapter);
    const second = new Repository(adapter);
    await Promise.all([
      first.set((state) => ({ ...state, items: [...state.items, job()] }), true),
      second.set((state) => ({ ...state, items: [...state.items, sub()] }), true),
    ]);
    expect((await first.get()).items).toHaveLength(2);
  });
  it('restores a valid copy even when the current stored envelope is corrupt', async () => {
    const valid = { ...emptyState(), items: [job()] };
    let raw: unknown = { schemaVersion: 99 };
    const adapter: StorageAdapter = {
      read: async () => raw,
      write: async (state) => {
        raw = state;
      },
      listen: () => () => {},
      recovery: async () => [
        { id: 'known', at: now.toISOString(), reason: 'Before import', data: valid },
      ],
      checkpoint: vi.fn().mockResolvedValue(undefined),
    };
    const repo = new Repository(adapter);
    await repo.restore('known');
    expect((await repo.get()).items[0].id).toBe(valid.items[0].id);
    expect(adapter.checkpoint).toHaveBeenCalledWith(
      expect.objectContaining({ data: { schemaVersion: 99 } }),
    );
  });
  it('retains v1 fields and notification history and migrates idempotently', () => {
    const legacy = {
      ...emptyState(),
      schemaVersion: 1,
      items: [job(), sub()],
      notified: { old: now.toISOString() },
    };
    const migrated = migrate(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.items[0]).toMatchObject(jobShape(legacy.items[0]));
    expect(migrated.notified).toEqual(legacy.notified);
    expect(migrate(migrated)).toEqual(migrated);
  });
  it('preserves raw v1 data before writing migration and stops if the copy fails', async () => {
    const legacy = { ...emptyState(), schemaVersion: 1, items: [job()] };
    let raw: unknown = legacy;
    let copy: RecoveryCopy | undefined;
    const adapter: StorageAdapter = {
      read: async () => structuredClone(raw),
      write: vi.fn(async (state) => {
        expect(copy?.data).toEqual(legacy);
        raw = state;
      }),
      listen: () => () => {},
      checkpoint: vi.fn(async (value) => {
        copy = value;
      }),
    };
    const repo = new Repository(adapter);
    await repo.set((state) => state, true);
    expect(adapter.write).toHaveBeenCalledOnce();
    expect(copy?.reason).toBe('Before v2 migration');
    raw = legacy;
    vi.mocked(adapter.checkpoint!).mockRejectedValueOnce(new Error('Full disk'));
    vi.mocked(adapter.write).mockClear();
    await expect(repo.set((state) => state, true)).rejects.toThrow('Full disk');
    expect(adapter.write).not.toHaveBeenCalled();
    expect(raw).toEqual(legacy);
  });
  it('restores prior data and completely erases recovery copies on explicit deletion', async () => {
    const repo = new Repository(memoryAdapter());
    const item = job();
    await repo.set(() => ({ ...emptyState(), items: [item] }), true);
    await repo.set((state) => ({ ...state, items: [] }), true, 'Before import');
    const copy = (await repo.recovery())[0];
    await repo.restore(copy.id);
    expect((await repo.get()).items[0].id).toBe(item.id);
    await repo.erase();
    expect(await repo.recovery()).toEqual([]);
    expect(await repo.raw()).toBeUndefined();
  });
  it('never replaces corrupt or future stored data with an empty workspace', async () => {
    const raw = { schemaVersion: 99, privateRecord: 'Keep me' };
    const write = vi.fn();
    const repo = new Repository({ read: async () => raw, write, listen: () => () => {} });
    await expect(repo.set(() => emptyState(), true)).rejects.toThrow('newer version');
    expect(write).not.toHaveBeenCalled();
    expect(await repo.raw()).toEqual(raw);
  });
  it('keeps newer local changes by default and supports explicit import choices', () => {
    const item = job();
    const local = {
      ...emptyState(),
      items: [{ ...item, title: 'Local', updatedAt: '2026-10-21T12:00:00Z' }],
    };
    const incoming = {
      ...emptyState(),
      settings: { ...emptyState().settings, theme: 'dark' as const },
      items: [{ ...item, title: 'Backup', updatedAt: '2026-10-20T12:00:00Z' }],
    };
    expect(mergeBackup(local, incoming).items[0].title).toBe('Local');
    expect(mergeBackup(local, incoming).settings.theme).toBe('system');
    expect(mergeBackup(local, incoming, 'incoming', true).items[0].title).toBe('Backup');
    expect(mergeBackup(local, incoming, 'incoming', true).settings.theme).toBe('dark');
  });
});
describe('calendar and filters', () => {
  it('exports date-only events with exclusive end dates and timed events in UTC', () => {
    const item: Application = {
      ...job(),
      events: [
        {
          id: 'meeting',
          kind: 'interview',
          title: 'Interview',
          date: '2026-10-22',
          time: '18:30',
          timeZone: 'Asia/Dhaka',
        },
      ],
    };
    const calendar = calendarExport([item], now).replace(/\r\n /g, '');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20261023\r\nDTEND;VALUE=DATE:20261024');
    expect(calendar).toContain('DTSTART:20261022T123000Z');
    const uids = (text: string) => text.match(/UID:.+/g);
    expect(uids(calendarExport([item], now))).toEqual(
      uids(calendarExport([item], new Date(2026, 9, 21, 13))),
    );
  });
  it('escapes text and folds UTF-8 lines without splitting Bengali characters', () => {
    const item = {
      ...job(),
      title: 'পরিকল্পনা'.repeat(40),
      notes: 'One, two; three\nBEGIN:VEVENT',
    };
    const calendar = calendarExport([item], now);
    expect(calendar.replace(/\r\n /g, '')).toContain(
      'DESCRIPTION:One\\, two\\; three\\nBEGIN:VEVENT',
    );
    expect(
      calendar.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
    expect(calendar).not.toContain('\uFFFD');
  });
  it('combines filters and limits bulk changes to selected active items', () => {
    const item = { ...job(), tags: ['Scholarship'], country: 'Bangladesh' };
    const deleted = { ...job(), deletedAt: now.toISOString() };
    expect(
      filterItems(
        [item, sub(), deleted],
        { ...defaultFilters, tag: 'Scholarship', country: 'Bangladesh', days: '7' },
        now,
      ),
    ).toEqual([item]);
    const changed = bulkChange(
      [item, deleted],
      new Set([item.id, deleted.id]),
      { status: 'applied' },
      now,
    );
    expect(changed[0]).toHaveProperty('followUpAt', '2026-10-31');
    expect(changed[1]).toEqual(deleted);
  });
  it('translates notifications and preserves user-authored content', () => {
    expect(translate('Move {0} to status', 'bn', 'My fellowship')).toContain('My fellowship');
    const state = {
      ...emptyState(),
      settings: { ...emptyState().settings, language: 'bn' as const },
      items: [job()],
    };
    expect(notices(state, now)[0].title).toContain('Fellowship');
    expect(notices(state, now)[0].title).toContain('আর');
  });
});
function jobShape(item: Application | Subscription) {
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
