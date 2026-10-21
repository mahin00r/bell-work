import { translate } from '../shared/i18n';
import { useStore } from '../shared/store';
import { format } from 'date-fns';
import { bn as bangla } from 'date-fns/locale';
import { money } from '../shared/money';
import type { Money } from '../shared/types';
import { dueLabel } from '../shared/dates';
import type { ItemEvent } from '../shared/events';
export const t = (message: string, ...values: unknown[]) =>
  translate(message, useStore.getState().data.settings.language, ...values);
export const formatDate = (date: Date | string | number, pattern: string) => {
  const text = format(date, pattern, {
    locale: useStore.getState().data.settings.language === 'bn' ? bangla : undefined,
  });
  return useStore.getState().data.settings.language === 'bn'
    ? text.replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])
    : text;
};
export const formatMoney = (value: Money) =>
  money(value, useStore.getState().data.settings.language);
export const relativeDate = (day?: string, now = new Date()) =>
  dueLabel(day, now, useStore.getState().data.settings.language);
export const eventTitle = (event: ItemEvent) =>
  event.id.startsWith('event:') ? event.title : t(event.title);
