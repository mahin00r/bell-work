import { t } from '../../ui/i18n';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Button, EmptyState, Tick } from '../../ui/primitives';
import { commit, useStore } from '../../shared/store';
import { itemSchema, statuses } from '../../shared/schema';
import { bulkChange, defaultFilters, filterItems, type Filters } from '../../shared/filters';
import { exportCalendar } from '../../shared/export';
import type { Item, Status } from '../../shared/types';
import { DueChip } from '../today/Today';
export function Library({ onOpen }: { onOpen: (item: Item) => void }) {
  const data = useStore((store) => store.data);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<Status>('applied');
  const [limit, setLimit] = useState(50);
  const [undo, setUndo] = useState<{
    before: Item[];
    after: Item[];
  } | null>(null);
  const matches = filterItems(data.items, filters);
  const ids = new Set(matches.filter((item) => selected.has(item.id)).map((item) => item.id));
  const set = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setSelected(new Set());
    setLimit(50);
  };
  async function bulk(operation: Parameters<typeof bulkChange>[2]) {
    let snapshot: {
      before: Item[];
      after: Item[];
    } | null = null;
    if (
      await commit((state) => {
        const items = bulkChange(state.items, ids, operation);
        snapshot = {
          before: state.items.filter((item) => ids.has(item.id)),
          after: items.filter((item) => ids.has(item.id)).map((item) => itemSchema.parse(item)),
        };
        return { ...state, items };
      })
    ) {
      setUndo(snapshot);
      setSelected(new Set());
    }
  }
  const tags = [
    ...new Set(
      data.items.filter((item) => !item.deletedAt && !item.archivedAt).flatMap((item) => item.tags),
    ),
  ].sort();
  const countries = [
    ...new Set(
      data.items.flatMap((item) =>
        item.kind !== 'subscription' && !item.deletedAt && !item.archivedAt && item.country
          ? [item.country]
          : [],
      ),
    ),
  ].sort();
  return (
    <div className="form-stack">
      <div className="library-filters">
        <label className="field">
          <span>{t('Search')}</span>
          <input value={filters.query} onChange={(e) => set({ query: e.target.value })} />
        </label>
        <label className="field">
          <span>{t('Type')}</span>
          <select
            value={filters.kind}
            onChange={(e) => set({ kind: e.target.value as Filters['kind'] })}
          >
            {['all', 'job', 'study', 'subscription'].map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('Tag')}</span>
          <select value={filters.tag} onChange={(e) => set({ tag: e.target.value })}>
            <option value="">{t('All tags')}</option>
            {tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('Status')}</span>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">{t('All statuses')}</option>
            {[...new Set([...statuses, 'active', 'trial', 'cancelling', 'cancelled'])].map(
              (value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="field">
          <span>{t('Priority')}</span>
          <select value={filters.priority} onChange={(e) => set({ priority: e.target.value })}>
            <option value="">{t('All priorities')}</option>
            {['low', 'medium', 'high'].map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('Country')}</span>
          <select value={filters.country} onChange={(e) => set({ country: e.target.value })}>
            <option value="">{t('All countries')}</option>
            {countries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('Due within')}</span>
          <select
            value={filters.days}
            onChange={(e) => set({ days: e.target.value as Filters['days'] })}
          >
            <option value="all">{t('Any time')}</option>
            {['7', '30', '90'].map((value) => (
              <option key={value} value={value}>
                {t(value)} {t('days, including overdue')}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="saved-views">
        <label className="field">
          <span>{t('Saved views')}</span>
          <select
            value=""
            onChange={(e) => {
              const view = data.savedViews?.find((view) => view.id === e.target.value);
              if (view) set(view.filters);
            }}
          >
            <option value="">{t('Choose a view')}</option>
            {data.savedViews?.map((view) => (
              <option value={view.id} key={view.id}>
                {view.name}
              </option>
            ))}
          </select>
        </label>
        <input
          aria-label={t('New view name')}
          placeholder={t('Name this view')}
          maxLength={500}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          disabled={!name.trim() || (data.savedViews?.length ?? 0) >= 50}
          onClick={async () => {
            if (
              await commit((state) => ({
                ...state,
                savedViews: [
                  ...(state.savedViews ?? []),
                  { id: nanoid(), name: name.trim(), filters },
                ],
              }))
            )
              setName('');
          }}
        >
          {t('Save view')}
        </Button>
        <Button onClick={() => set(defaultFilters)}>{t('Clear filters')}</Button>
      </div>
      <div className="bulk-toolbar">
        <Tick
          label={t('Select all matching items')}
          checked={matches.length > 0 && matches.every((item) => selected.has(item.id))}
          onChange={(checked) =>
            setSelected(checked ? new Set(matches.map((item) => item.id)) : new Set())
          }
        />
        <span>{t('{0} selected', ids.size)}</span>
        <Button
          disabled={!ids.size}
          onClick={() => {
            void bulk({ archive: true });
          }}
        >
          {t('Archive selected')}
        </Button>
        <input
          aria-label={t('Tag selected items')}
          placeholder={t('Add tag')}
          maxLength={500}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <Button
          disabled={!ids.size || !tag.trim()}
          onClick={() => {
            void bulk({ tag });
          }}
        >
          {t('Tag selected')}
        </Button>
        <select
          aria-label={t('Status for selected applications')}
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t(value)}
            </option>
          ))}
        </select>
        <Button
          disabled={!ids.size}
          onClick={() => {
            void bulk({ status });
          }}
        >
          {t('Update application status')}
        </Button>
        <Button
          disabled={!ids.size}
          onClick={() => exportCalendar(matches.filter((item) => ids.has(item.id)))}
        >
          {t('Export selected to calendar')}
        </Button>
        {undo && (
          <Button
            onClick={async () => {
              if (
                await commit((state) => ({
                  ...state,
                  items: state.items.map((item) => {
                    const after = undo.after.find((entry) => entry.id === item.id);
                    return after && JSON.stringify(after) === JSON.stringify(item)
                      ? undo.before.find((entry) => entry.id === item.id)!
                      : item;
                  }),
                }))
              )
                setUndo(null);
            }}
          >
            {t('Undo last bulk change')}
          </Button>
        )}
      </div>
      <p className="muted text-xs">
        {t(
          '{0} matching items. Undo preserves items edited since the bulk change.',
          matches.length,
        )}
      </p>
      {matches.slice(0, limit).map((item) => (
        <div className="library-row" key={item.id}>
          <Tick
            label={t('Select {0}', item.title)}
            checked={selected.has(item.id)}
            onChange={(checked) =>
              setSelected((current) => {
                const next = new Set(current);
                if (checked) next.add(item.id);
                else next.delete(item.id);
                return next;
              })
            }
          />
          <button className="archive-item" onClick={() => onOpen(item)}>
            <span>
              <b>{item.title}</b>
              <small>
                {t(item.kind)} · {t(item.status)} · {item.tags.join(', ')}
              </small>
            </span>
            <DueChip item={item} />
          </button>
        </div>
      ))}
      {!matches.length && (
        <EmptyState
          title={t('No matching items')}
          description={t('Adjust your filters or add an item.')}
        />
      )}
      {matches.length > limit && (
        <Button onClick={() => setLimit((current) => current + 50)}>{t('Show 50 more')}</Button>
      )}
    </div>
  );
}
