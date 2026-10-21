import { daysUntil } from './dates';
import { eventDisplayDate, itemEvents } from './events';
import { applyStatus } from './selectors';
import type { Item, State, Status } from './types';
export type Filters = NonNullable<State['savedViews']>[number]['filters'];
export const defaultFilters: Filters = {
  query: '',
  kind: 'all',
  tag: '',
  status: '',
  priority: '',
  country: '',
  days: 'all',
};
export function filterItems(items: Item[], filters: Filters, now = new Date()) {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      !item.deletedAt &&
      !item.archivedAt &&
      (filters.kind === 'all' || item.kind === filters.kind) &&
      (!filters.tag || item.tags.includes(filters.tag)) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.priority || (item.kind !== 'subscription' && item.priority === filters.priority)) &&
      (!filters.country || (item.kind !== 'subscription' && item.country === filters.country)) &&
      (!query ||
        `${item.title} ${item.kind === 'subscription' ? item.vendor : item.organization} ${item.tags.join(' ')}`
          .toLocaleLowerCase()
          .includes(query)) &&
      (filters.days === 'all' ||
        itemEvents(item).some(
          (event) => daysUntil(eventDisplayDate(event), now) <= Number(filters.days),
        )),
  );
}
export function bulkChange(
  items: Item[],
  ids: Set<string>,
  operation: { archive?: boolean; tag?: string; status?: Status },
  now = new Date(),
) {
  return items.map((item) => {
    if (!ids.has(item.id) || item.deletedAt || item.archivedAt) return item;
    if (operation.status)
      return item.kind === 'subscription' ? item : applyStatus(item, operation.status, now);
    if (operation.tag?.trim())
      return {
        ...item,
        tags: [...new Set([...item.tags, operation.tag.trim()])],
        updatedAt: now.toISOString(),
      };
    return operation.archive
      ? { ...item, archivedAt: now.toISOString(), updatedAt: now.toISOString() }
      : item;
  });
}
