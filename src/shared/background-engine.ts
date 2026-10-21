import { advanceSubscriptions, nextReminderAlarm, notices } from './reminders';
import { badge, dueDate, upcoming } from './selectors';
import { dueLabel, today } from './dates';
import type { Repository } from './storage';
import { translate } from './i18n';
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
    return type && date ? { itemId, type, date } : null;
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
  await port.schedule(nextReminderAlarm(state, now));
  const existing = await port.existing();
  const pending = notices(await repo.get(), now);
  const digest = pending.length > 5;
  if (digest) {
    await port.notify(
      noticeId(`digest:${today(now)}`),
      translate('{0} reminders need attention', state.settings.language, pending.length),
      pending
        .slice(0, 3)
        .map((notice) => `${notice.title} · ${notice.message}`)
        .join('\n'),
      false,
    );
    await repo.set((current) => {
      const relevant = new Set(notices(current, now).map((notice) => notice.key));
      return {
        ...current,
        notified: {
          ...current.notified,
          ...Object.fromEntries(
            pending
              .filter((notice) => relevant.has(notice.key))
              .map((notice) => [notice.key, now.toISOString()]),
          ),
        },
      };
    }, true);
  }
  for (const notice of digest ? [] : pending) {
    const latest = notices(await repo.get(), now).find((candidate) => candidate.key === notice.key);
    if (!latest) continue;
    const id = noticeId(notice.key);
    if (!existing[id]) await port.notify(id, latest.title, latest.message, true);
    await repo.set(
      (s) => ({ ...s, notified: { ...s.notified, [notice.key]: now.toISOString() } }),
      true,
    );
  }
  const dailyKey = `daily:${today(now)}`;
  const summaryState = await repo.get();
  const closest = upcoming(summaryState.items)
    .filter((i) => dueDate(i))
    .slice(0, 3);
  const [hour, minute] = state.settings.reminderTime.split(':').map(Number);
  const summaryDue = now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
  if (
    daily &&
    !digest &&
    summaryDue &&
    summaryState.settings.notificationsEnabled &&
    !summaryState.notified[dailyKey] &&
    closest.length
  ) {
    const id = noticeId(dailyKey);
    if (!existing[id])
      await port.notify(
        id,
        translate('Your day, in focus', state.settings.language),
        closest
          .map((i) => `${i.title} · ${dueLabel(dueDate(i), now, state.settings.language)}`)
          .join('\n'),
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
