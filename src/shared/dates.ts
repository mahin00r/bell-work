import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
} from 'date-fns';
import type { BillingAnchor, Subscription } from './types';
import { translate } from './i18n';
export const today = (now = new Date()) => format(now, 'yyyy-MM-dd');
export const shiftDay = (day: string, days: number) => today(addDays(parseISO(day), days));
export const daysUntil = (day: string, now = new Date()) =>
  differenceInCalendarDays(parseISO(day), now);
export const monthEnd = (now = new Date()) => today(endOfMonth(now));
export const billingAnchor = (day: string): BillingAnchor => ({
  day: Number(day.slice(8)),
  month: Number(day.slice(5, 7)),
  endOfMonth: false,
});
export function nextCycle(day: string, cycle: Subscription['cycle'], anchor = billingAnchor(day)) {
  return offsetCycle(day, cycle, anchor, 1);
}
function offsetCycle(
  day: string,
  cycle: Subscription['cycle'],
  anchor: BillingAnchor,
  steps: number,
) {
  const d = parseISO(day);
  const next =
    cycle === 'weekly'
      ? addWeeks(d, steps)
      : cycle === 'monthly'
        ? addMonths(d, steps)
        : cycle === 'quarterly'
          ? addMonths(d, steps * 3)
          : addYears(d, steps);
  if (cycle !== 'weekly') {
    if (cycle === 'yearly') next.setMonth(anchor.month - 1, 1);
    next.setDate(
      anchor.endOfMonth
        ? endOfMonth(next).getDate()
        : Math.min(anchor.day, endOfMonth(next).getDate()),
    );
  }
  return today(next);
}
export function advanceRenewal(
  day: string,
  cycle: Subscription['cycle'],
  now = new Date(),
  anchor = billingAnchor(day),
) {
  if (day >= today(now)) return day;
  const start = parseISO(day);
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  const steps =
    cycle === 'weekly'
      ? Math.max(1, Math.floor(-daysUntil(day, now) / 7))
      : Math.max(
          0,
          Math.floor(months / (cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12)),
        );
  let next = steps ? offsetCycle(day, cycle, anchor, steps) : day;
  while (next < today(now)) next = nextCycle(next, cycle, anchor);
  return next;
}
export function renewalDates(subscription: Subscription, from = today(), horizon = 60) {
  const anchor = subscription.billingAnchor ?? billingAnchor(subscription.nextRenewal);
  let date = advanceRenewal(subscription.nextRenewal, subscription.cycle, parseISO(from), anchor);
  const end = shiftDay(from, horizon);
  const dates: string[] = [];
  const cancelAt = subscription.status === 'cancelling' ? subscription.cancelAt : undefined;
  while (date < end && (!cancelAt || date < cancelAt)) {
    dates.push(date);
    date = nextCycle(date, subscription.cycle, anchor);
  }
  return dates;
}
export function dueLabel(day?: string, now = new Date(), language: 'en' | 'bn' = 'en') {
  if (!day) return translate('No deadline', language);
  const n = daysUntil(day, now);
  return n < 0
    ? translate('{0}d overdue', language, Math.abs(n))
    : n === 0
      ? translate('Today', language)
      : n === 1
        ? translate('Tomorrow', language)
        : translate('In {0} days', language, n);
}
export function nextDailyAlarm(time: string, now = new Date()) {
  const [hour, minute] = time.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime();
}
