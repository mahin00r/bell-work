import { daysUntil, renewalDates, today } from './dates';
import type { ApplicationEvent, Item } from './types';

export type EventKind = 'deadline' | 'followup' | 'renewal' | 'trial' | ApplicationEvent['kind'];
const zoneFormatters = new Map<string, Intl.DateTimeFormat>();
const eventInstants = new Map<string, number | undefined>();
function zoneFormatter(timeZone: string) {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    if (zoneFormatters.size >= 50) zoneFormatters.delete(zoneFormatters.keys().next().value!);
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}
export function validTimeZone(timeZone: string) {
  try {
    zoneFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}
export interface ItemEvent {
  id: string;
  kind: EventKind;
  title: string;
  date: string;
  time?: string;
  timeZone?: string;
  location?: string;
  url?: string;
}
export const eventLabels: Record<EventKind, string> = {
  deadline: 'Deadline',
  followup: 'Follow-up',
  renewal: 'Renewal',
  trial: 'Trial ends',
  interview: 'Interview',
  document: 'Documents due',
  recommendation: 'Recommendation due',
  offer: 'Offer decision',
  custom: 'Reminder',
};
export const snoozeKey = (event: Pick<ItemEvent, 'id' | 'date'>) => `${event.id}|${event.date}`;
export function itemEvents(item: Item): ItemEvent[] {
  if (item.archivedAt || item.deletedAt) return [];
  if (item.kind === 'subscription') {
    if (item.status === 'cancelled') return [];
    return [
      ...(item.status !== 'cancelling' || !item.cancelAt || item.nextRenewal < item.cancelAt
        ? [{ id: 'renewal', kind: 'renewal' as const, title: 'Renewal', date: item.nextRenewal }]
        : []),
      ...(item.status === 'cancelling' && item.cancelAt
        ? [
            {
              id: 'cancellation',
              kind: 'custom' as const,
              title: 'Subscription cancellation',
              date: item.cancelAt,
            },
          ]
        : []),
      ...(item.renewalReviewAt
        ? [
            {
              id: 'missed-renewal',
              kind: 'renewal' as const,
              title: 'Review past renewal',
              date: item.renewalReviewAt,
            },
          ]
        : []),
      ...(item.status === 'trial' && item.trialEndsAt
        ? [{ id: 'trial', kind: 'trial' as const, title: 'Trial ends', date: item.trialEndsAt }]
        : []),
    ].sort((a, b) => a.date.localeCompare(b.date));
  }
  if (['accepted', 'rejected', 'withdrawn'].includes(item.status)) return [];
  const events: ItemEvent[] = (item.events ?? [])
    .filter((event) => !event.completedAt)
    .map((event) => ({ ...event, id: `event:${event.id}` }));
  if (['saved', 'preparing'].includes(item.status) && item.deadline)
    events.push({ id: 'deadline', kind: 'deadline', title: 'Deadline', date: item.deadline });
  if (['applied', 'interview', 'offer'].includes(item.status) && item.followUpAt)
    events.push({ id: 'followup', kind: 'followup', title: 'Follow-up', date: item.followUpAt });
  return events.sort(
    (a, b) =>
      (eventInstant(a) ?? new Date(`${a.date}T00:00:00`).getTime()) -
      (eventInstant(b) ?? new Date(`${b.date}T00:00:00`).getTime()),
  );
}
export function eventDisplayDate(event: ItemEvent) {
  const instant = eventInstant(event);
  return instant === undefined ? event.date : today(new Date(instant));
}
export function projectedEvents(items: Item[], now = new Date(), horizon = 60) {
  return items
    .flatMap((item) => {
      const events = itemEvents(item).filter(
        (event) => item.kind !== 'subscription' || event.kind !== 'renewal',
      );
      if (
        item.kind === 'subscription' &&
        !item.archivedAt &&
        !item.deletedAt &&
        item.status !== 'cancelled'
      )
        events.push(
          ...renewalDates(item, today(now), horizon).map((date) => ({
            id: 'renewal',
            kind: 'renewal' as const,
            title: 'Renewal',
            date,
          })),
        );
      return events
        .filter(
          (event) =>
            daysUntil(eventDisplayDate(event), now) >= 0 &&
            daysUntil(eventDisplayDate(event), now) < horizon,
        )
        .map((event) => ({
          ...event,
          displayDate: eventDisplayDate(event),
          item,
          label: eventLabels[event.kind],
        }));
    })
    .sort(
      (a, b) =>
        a.displayDate.localeCompare(b.displayDate) || (a.time ?? '').localeCompare(b.time ?? ''),
    );
}

// Resolve a wall-clock date in its stored IANA zone without using the device zone.
// Nonexistent daylight-saving times return undefined instead of moving the event.
export function eventInstant(event: {
  date: string;
  time?: string;
  timeZone?: string;
}): number | undefined {
  if (!event.time || !event.timeZone) return undefined;
  const key = `${event.date}|${event.time}|${event.timeZone}`;
  if (eventInstants.has(key)) return eventInstants.get(key);
  const target = `${event.date}T${event.time}`;
  const utc = Date.parse(`${target}:00Z`);
  const formatter = zoneFormatter(event.timeZone);
  const remember = (instant: number | undefined) => {
    if (eventInstants.size >= 1000) eventInstants.delete(eventInstants.keys().next().value!);
    eventInstants.set(key, instant);
    return instant;
  };
  const wall = (instant: number) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map(({ type, value }) => [type, value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  let instant = utc;
  for (let n = 0; n < 4; n++) {
    const actual = wall(instant);
    if (actual === target) return remember(instant);
    instant += utc - Date.parse(`${actual}:00Z`);
  }
  return remember(undefined);
}
