import { daysUntil, nextCycle, today } from './dates';
import { monthlyCost } from './money';
import type { Application, Item, Subscription } from './types';

export const isApplication = (i: Item): i is Application => i.kind !== 'subscription';
export const isSubscription = (i: Item): i is Subscription => i.kind === 'subscription';
export function actionable(i: Item) {
  return (
    !i.archivedAt &&
    (isSubscription(i)
      ? i.status !== 'cancelled'
      : !['accepted', 'rejected', 'withdrawn', 'offer'].includes(i.status))
  );
}
export function dueDate(i: Item) {
  if (isSubscription(i))
    return i.status === 'trial' && i.trialEndsAt && i.trialEndsAt <= i.nextRenewal
      ? i.trialEndsAt
      : i.nextRenewal;
  return ['applied', 'interview'].includes(i.status) ? i.followUpAt : i.deadline;
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
    .filter((s) => !s.archivedAt && s.status !== 'cancelled'))
    totals[i.cost.currency] = (totals[i.cost.currency] ?? 0) + monthlyCost(i);
  return totals;
}
export function funnel(items: Item[]) {
  const apps = items.filter(isApplication).filter((i) => !i.archivedAt);
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
export function upcomingSpend(items: Item[], now = new Date()) {
  const totals: Record<string, number> = {};
  for (const s of items.filter(isSubscription).filter(actionable)) {
    let date = s.nextRenewal;
    while (daysUntil(date, now) < 0) date = nextCycle(date, s.cycle);
    while (daysUntil(date, now) < 30) {
      totals[s.cost.currency] = (totals[s.cost.currency] ?? 0) + s.cost.amount;
      date = nextCycle(date, s.cycle);
    }
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
