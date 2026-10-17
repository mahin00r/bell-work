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
import type { Subscription } from './types';
export const today = (now = new Date()) => format(now, 'yyyy-MM-dd');
export const shiftDay = (day: string, days: number) => today(addDays(parseISO(day), days));
export const daysUntil = (day: string, now = new Date()) =>
  differenceInCalendarDays(parseISO(day), now);
export const monthEnd = (now = new Date()) => today(endOfMonth(now));
export function nextCycle(day: string, cycle: Subscription['cycle']) {
  const d = parseISO(day);
  return today(
    cycle === 'weekly'
      ? addWeeks(d, 1)
      : cycle === 'monthly'
        ? addMonths(d, 1)
        : cycle === 'quarterly'
          ? addMonths(d, 3)
          : addYears(d, 1),
  );
}
export function advanceRenewal(day: string, cycle: Subscription['cycle'], now = new Date()) {
  let next = day;
  while (next < today(now)) next = nextCycle(next, cycle);
  return next;
}
export function dueLabel(day?: string, now = new Date()) {
  if (!day) return 'No deadline';
  const n = daysUntil(day, now);
  return n < 0
    ? `${Math.abs(n)}d overdue`
    : n === 0
      ? 'Today'
      : n === 1
        ? 'Tomorrow'
        : `In ${n} days`;
}
export function nextDailyAlarm(time: string, now = new Date()) {
  const [hour, minute] = time.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime();
}
