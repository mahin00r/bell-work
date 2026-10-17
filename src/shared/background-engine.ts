import { advanceSubscriptions, notices } from './reminders';
import { badge, dueDate, upcoming } from './selectors';
import { dueLabel, nextDailyAlarm, today } from './dates';
import type { Repository } from './storage';
export interface ReminderPort {
  notify(id: string, title: string, message: string, buttons: boolean): Promise<void>;
  existing(): Promise<Record<string, boolean>>;
  badge(count: number, overdue: boolean): Promise<void>;
  schedule(when: number): Promise<void>;
}
export const noticeId = (key: string) => `bellwork:${encodeURIComponent(key)}`;
export function noticeTarget(id: string) {
  if (!id.startsWith('bellwork:')) return null;
  try {
    const [itemId, type, date] = decodeURIComponent(id.slice(9)).split('|');
    return type && date ? { itemId, type } : null;
  } catch {
    return null;
  }
}
export async function runReminders(
  repo: Repository,
  port: ReminderPort,
  now = new Date(),
  daily = false,
) {
  const state = await repo.set((s) => advanceSubscriptions(s, now), true);
  const count = badge(state.items, now);
  await port.badge(count.count, count.overdue);
  await port.schedule(nextDailyAlarm(state.settings.reminderTime, now));
  const existing = await port.existing();
  for (const notice of notices(state, now)) {
    const id = noticeId(notice.key);
    if (!existing[id]) await port.notify(id, notice.title, notice.message, true);
    await repo.set(
      (s) => ({ ...s, notified: { ...s.notified, [notice.key]: now.toISOString() } }),
      true,
    );
  }
  const dailyKey = `daily:${today(now)}`;
  const closest = upcoming(state.items)
    .filter((i) => dueDate(i))
    .slice(0, 3);
  if (daily && state.settings.notificationsEnabled && !state.notified[dailyKey] && closest.length) {
    const id = noticeId(dailyKey);
    if (!existing[id])
      await port.notify(
        id,
        'Your day, in focus',
        closest.map((i) => `${i.title} · ${dueLabel(dueDate(i), now)}`).join('\n'),
        false,
      );
    await repo.set(
      (s) => ({ ...s, notified: { ...s.notified, [dailyKey]: now.toISOString() } }),
      true,
    );
  }
  // Keep dedupe records for a year so ordinary backups remain compact.
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  await repo.set(
    (s) => ({
      ...s,
      notified: Object.fromEntries(
        Object.entries(s.notified).filter(([, at]) => at >= cutoff.toISOString()),
      ),
    }),
    true,
  );
}
