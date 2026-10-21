import type { Money, Subscription } from './types';
export function money(value: Money, language: 'en' | 'bn' = 'en') {
  const formatter = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-BD', {
    style: 'currency',
    currency: value.currency,
    maximumFractionDigits: 2,
  });
  return formatter
    .formatToParts(value.amount)
    .map((p) => (p.type === 'currency' && value.currency === 'BDT' ? '৳' : p.value))
    .join('');
}
export const monthlyCost = (s: Subscription) =>
  s.cost.amount * { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }[s.cycle];
