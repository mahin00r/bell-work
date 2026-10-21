import { daysUntil, renewalDates, today } from './dates';
import { eventDisplayDate, itemEvents } from './events';
import { monthlyCost } from './money';
import type { Application, Item, Subscription } from './types';

export const isApplication = (i: Item): i is Application => i.kind !== 'subscription';
export const isSubscription = (i: Item): i is Subscription => i.kind === 'subscription';
export function actionable(i: Item) {
  return (
    !i.archivedAt &&
    !i.deletedAt &&
    (isSubscription(i)
      ? i.status !== 'cancelled'
      : !['accepted', 'rejected', 'withdrawn'].includes(i.status) &&
        (i.status !== 'offer' || itemEvents(i).length > 0))
  );
}
export function dueDate(i: Item) {
  const event = itemEvents(i)[0];
  return event ? eventDisplayDate(event) : undefined;
}
export function upcoming(items: Item[]) {
  return items
    .filter(actionable)
    .sort((a, b) => (dueDate(a) ?? '9999').localeCompare(dueDate(b) ?? '9999'));
}
export function groupItems(items: Item[], now = new Date()) {
  const groups: Record<'Overdue' | 'Next 7 days' | 'Later', Item[]> = {
    Overdue: [],
    'Next 7 days': [],
    Later: [],
  };
  for (const i of upcoming(items)) {
    const date = dueDate(i);
    const n = date ? daysUntil(date, now) : Infinity;
    groups[n < 0 ? 'Overdue' : n <= 7 ? 'Next 7 days' : 'Later'].push(i);
  }
  return groups;
}
export function badge(items: Item[], now = new Date()) {
  const due = upcoming(items).filter((i) => dueDate(i) && daysUntil(dueDate(i)!, now) <= 3);
  return { count: due.length, overdue: due.some((i) => daysUntil(dueDate(i)!, now) < 0) };
}
export function spend(items: Item[]) {
  const totals: Record<string, number> = {};
  for (const i of items
    .filter(isSubscription)
    .filter((s) => !s.archivedAt && !s.deletedAt && s.status !== 'cancelled'))
    totals[i.cost.currency] = (totals[i.cost.currency] ?? 0) + monthlyCost(i);
  return totals;
}
export function funnel(items: Item[]) {
  const apps = items.filter(isApplication).filter((i) => !i.archivedAt && !i.deletedAt);
  return Object.fromEntries(
    ['saved', 'applied', 'interview', 'offer'].map((status) => [
      status,
      apps.filter(
        (i) =>
          i.status === status ||
          i.statusHistory.some((h) => h.status === status) ||
          (status === 'offer' && i.status === 'accepted'),
      ).length,
    ]),
  );
}
export function upcomingSpend(items: Item[], now = new Date(), horizon = 30) {
  const totals: Record<string, number> = {};
  for (const s of items.filter(isSubscription).filter(actionable)) {
    const occurrences = renewalDates(s, today(now), horizon).length;
    if (occurrences)
      totals[s.cost.currency] = (totals[s.cost.currency] ?? 0) + s.cost.amount * occurrences;
  }
  return totals;
}
export function applyStatus(
  item: Application,
  status: Application['status'],
  now = new Date(),
): Application {
  if (item.status === status) return item;
  return {
    ...item,
    status,
    updatedAt: now.toISOString(),
    statusHistory: [...item.statusHistory, { status, at: now.toISOString() }],
    ...(status === 'applied'
      ? { followUpAt: today(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10)) }
      : {}),
  };
}
