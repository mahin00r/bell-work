import { daysUntil } from './dates';
import { eventDisplayDate, itemEvents } from './events';
import type { Item } from './types';

export function weeklyReview(items: Item[], now = new Date()) {
  const active = items.filter((item) => !item.archivedAt && !item.deletedAt);
  const applications = active.filter(
    (item) =>
      item.kind !== 'subscription' && !['accepted', 'rejected', 'withdrawn'].includes(item.status),
  );
  return {
    upcoming: active
      .flatMap((item) =>
        itemEvents(item)
          .filter((event) => daysUntil(eventDisplayDate(event), now) <= 14)
          .map((event) => ({ item, event })),
      )
      .sort((a, b) => eventDisplayDate(a.event).localeCompare(eventDisplayDate(b.event))),
    followups: applications.filter(
      (item) =>
        item.kind !== 'subscription' &&
        ['applied', 'interview'].includes(item.status) &&
        (!item.followUpAt || daysUntil(item.followUpAt, now) <= 0),
    ),
    incomplete: applications.filter(
      (item) => item.kind !== 'subscription' && item.checklist.some((task) => !task.done),
    ),
    subscriptions: active.filter(
      (item) =>
        item.kind === 'subscription' &&
        item.status !== 'cancelled' &&
        (item.unused ||
          item.renewalReviewAt ||
          item.status === 'trial' ||
          item.status === 'cancelling'),
    ),
  };
}
