import { advanceRenewal, daysUntil, shiftDay, today } from './dates';
import { actionable, dueDate, isSubscription } from './selectors';
import type { Item, State } from './types';
export interface Notice {
  key: string;
  itemId: string;
  title: string;
  message: string;
  date: string;
  type: 'deadline' | 'renewal' | 'trial' | 'followup';
}
export function notices(state: State, now = new Date()): Notice[] {
  if (!state.settings.notificationsEnabled) return [];
  const out: Notice[] = [];
  for (const i of state.items.filter(actionable)) {
    const events: { date?: string; type: Notice['type']; leads: number[] }[] = isSubscription(i)
      ? [
          {
            date: i.nextRenewal,
            type: 'renewal',
            leads: [i.remindDaysBefore, ...state.settings.reminderLeadDays, 0],
          },
          ...(i.status === 'trial'
            ? [{ date: i.trialEndsAt, type: 'trial' as const, leads: [2, 0] }]
            : []),
        ]
      : [
          {
            date: dueDate(i),
            type: ['applied', 'interview'].includes(i.status) ? 'followup' : 'deadline',
            leads: state.settings.reminderLeadDays.concat(0),
          },
        ];
    for (const event of events) {
      if (!event.date) continue;
      const days = daysUntil(event.date, now);
      if (days > Math.max(...event.leads)) continue;
      // A missed check catches up once for each reminder window.
      const lead =
        days < 0 ? 'overdue' : event.leads.filter((n) => days <= n).sort((a, b) => a - b)[0];
      if (lead === undefined) continue;
      const key = `${i.id}|${event.type}|${event.date}|${lead}`;
      if (state.notified[key]) continue;
      out.push({
        key,
        itemId: i.id,
        date: event.date,
        type: event.type,
        title: `${days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days} days left`}: ${i.title}`,
        message:
          event.type === 'trial'
            ? 'Your trial is ending. Review it before billing starts.'
            : event.type === 'followup'
              ? 'Time to follow up on your application.'
              : 'A little action today keeps your plans moving.',
      });
    }
  }
  return out;
}
export function advanceSubscriptions(state: State, now = new Date()): State {
  return {
    ...state,
    items: state.items.map((i) =>
      isSubscription(i) && !i.archivedAt && i.status === 'active' && i.nextRenewal < today(now)
        ? {
            ...i,
            nextRenewal: advanceRenewal(i.nextRenewal, i.cycle, now),
            updatedAt: now.toISOString(),
          }
        : i,
    ),
  };
}
export function snooze(item: Item, now = new Date(), type?: Notice['type']): Item {
  const date = shiftDay(today(now), 1);
  return {
    ...item,
    updatedAt: now.toISOString(),
    ...(isSubscription(item)
      ? type === 'trial' ||
        (!type &&
          item.status === 'trial' &&
          item.trialEndsAt &&
          item.trialEndsAt <= item.nextRenewal)
        ? { trialEndsAt: date }
        : { nextRenewal: date }
      : ['applied', 'interview'].includes(item.status)
        ? { followUpAt: date }
        : { deadline: date }),
  };
}
