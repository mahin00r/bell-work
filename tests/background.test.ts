import { expect, it, vi } from 'vitest';
import {
  runReminders,
  noticeId,
  noticeTarget,
  type ReminderPort,
} from '../src/shared/background-engine';
import { Repository, memoryAdapter } from '../src/shared/storage';
import { newItem } from '../src/shared/templates';
import { emptyState } from '../src/shared/migrations';
const now = new Date(2026, 9, 17, 9);
const port = (): ReminderPort => ({
  notify: vi.fn().mockResolvedValue(undefined),
  existing: vi.fn().mockResolvedValue({}),
  badge: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
});
it('rebuilds alarms and badge from disk, dedupes across worker restarts', async () => {
  const adapter = memoryAdapter();
  const repo = new Repository(adapter);
  const effects = port();
  const item = { ...newItem('job'), title: 'Designer', deadline: '2026-10-20' };
  await repo.set(() => ({ ...emptyState(), items: [item] }), true);
  await runReminders(repo, effects, now, true);
  expect(effects.badge).toHaveBeenCalledWith(1, false);
  expect(effects.notify).toHaveBeenCalledTimes(2);
  await runReminders(new Repository(adapter), effects, now, true);
  expect(effects.notify).toHaveBeenCalledTimes(2);
  expect(new Date(vi.mocked(effects.schedule).mock.calls[0][0]).getHours()).toBe(9);
});
it('retries failed notices and acknowledges an already visible notice', async () => {
  const repo = new Repository(memoryAdapter());
  const effects = port();
  const item = { ...newItem('study'), title: 'Fellowship', deadline: '2026-10-20' };
  await repo.set(() => ({ ...emptyState(), items: [item] }), true);
  vi.mocked(effects.notify).mockRejectedValueOnce(new Error('Unavailable'));
  await expect(runReminders(repo, effects, now)).rejects.toThrow();
  expect(Object.keys((await repo.get()).notified)).toHaveLength(0);
  vi.mocked(effects.existing).mockResolvedValue({
    [noticeId(`${item.id}|deadline|2026-10-20|3`)]: true,
  });
  await runReminders(repo, effects, now);
  expect(effects.notify).toHaveBeenCalledTimes(1);
  expect(Object.keys((await repo.get()).notified)).toHaveLength(1);
});
it('round-trips notification targets and tolerates unrelated IDs', () => {
  expect(noticeTarget(noticeId('abc_123|trial|2026-10-20|2'))).toEqual({
    itemId: 'abc_123',
    type: 'trial',
    date: '2026-10-20',
  });
  expect(noticeTarget('other')).toBeNull();
  expect(noticeTarget('bellwork:%bad')).toBeNull();
});
