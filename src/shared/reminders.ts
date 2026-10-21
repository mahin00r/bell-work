import { advanceRenewal, billingAnchor, daysUntil, nextDailyAlarm } from './dates';
import { eventDisplayDate, eventInstant, itemEvents, snoozeKey, type EventKind } from './events';
import type { Item, State } from './types';
import { translate } from './i18n';
export interface Notice {
  key: string;
  itemId: string;
  eventId: string;
  title: string;
  message: string;
  date: string;
  type: EventKind;
}
export function notices(state: State, now = new Date()): Notice[] {
  if (!state.settings.notificationsEnabled) return [];
  const out: Notice[] = [];
  for (const item of state.items) {
    for (const event of itemEvents(item)) {
      const deferred = item.reminderSnoozes?.[snoozeKey(event)];
      if (deferred && Date.parse(deferred) > now.getTime()) continue;
      const leads =
        event.kind === 'trial'
          ? [2, 0]
          : item.kind === 'subscription'
            ? [item.remindDaysBefore, ...state.settings.reminderLeadDays, 0]
            : [...state.settings.reminderLeadDays, 0];
      const days = daysUntil(eventDisplayDate(event), now);
      if (days > Math.max(...leads)) continue;
      const instant = eventInstant(event);
      const lead =
        days < 0
          ? 'overdue'
          : instant !== undefined && instant <= now.getTime()
            ? 'event'
            : leads.filter((n) => days <= n).sort((a, b) => a - b)[0];
      if (lead === undefined) continue;
      const key = `${item.id}|${event.id}|${event.date}|${lead}${instant !== undefined ? `|at:${instant}` : ''}${deferred ? `|snooze:${deferred}` : ''}`;
      if (state.notified[key]) continue;
      out.push({
        key,
        itemId: item.id,
        eventId: event.id,
        date: event.date,
        type: event.kind,
        title: `${translate(days < 0 ? 'Overdue' : days === 0 ? 'Due today' : '{0} days left', state.settings.language, days)}: ${item.title}`,
        message: `${event.id.startsWith('event:') ? event.title : translate(event.title, state.settings.language)}${event.time ? ` · ${event.date} ${event.time} ${event.timeZone}` : ''}${event.location ? ` · ${event.location}` : ''}`,
      });
    }
  }
  return out;
}
export function nextReminderAlarm(state: State, now = new Date()) {
  let next = nextDailyAlarm(state.settings.reminderTime, now);
  if (!state.settings.notificationsEnabled) return next;
  for (const item of state.items)
    for (const event of itemEvents(item)) {
      const deferred = item.reminderSnoozes?.[snoozeKey(event)];
      const instant = eventInstant(event);
      for (const candidate of [deferred ? Date.parse(deferred) : undefined, instant])
        if (candidate !== undefined && candidate > now.getTime()) next = Math.min(next, candidate);
    }
  return next;
}
export function advanceSubscriptions(state: State, now = new Date()): State {
  return {
    ...state,
    items: state.items.map((item) => {
      if (
        item.kind !== 'subscription' ||
        item.archivedAt ||
        item.deletedAt ||
        item.status !== 'active'
      )
        return item;
      const anchor = item.billingAnchor ?? billingAnchor(item.nextRenewal);
      const nextRenewal = advanceRenewal(item.nextRenewal, item.cycle, now, anchor);
      return nextRenewal === item.nextRenewal && item.billingAnchor
        ? item
        : {
            ...item,
            billingAnchor: anchor,
            nextRenewal,
            renewalReviewAt:
              nextRenewal !== item.nextRenewal
                ? (item.renewalReviewAt ?? item.nextRenewal)
                : item.renewalReviewAt,
            updatedAt: now.toISOString(),
          };
    }),
  };
}
export function snooze(item: Item, now = new Date(), eventId?: string, date?: string): Item {
  const event = itemEvents(item).find(
    (event) => (!eventId || event.id === eventId) && (!date || event.date === date),
  );
  if (!event) return item;
  const until = new Date(now);
  until.setDate(until.getDate() + 1);
  return {
    ...item,
    updatedAt: now.toISOString(),
    reminderSnoozes: { ...item.reminderSnoozes, [snoozeKey(event)]: until.toISOString() },
  };
}
