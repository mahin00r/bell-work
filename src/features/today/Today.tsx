import { eventTitle, formatDate as format, relativeDate as dueLabel } from '../../ui/i18n';
import { t } from '../../ui/i18n';
import { eventInstant, itemEvents, snoozeKey } from '../../shared/events';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Archive, ArrowUpRight, Check, Clock3, Search, Pin } from 'lucide-react';
import { parseISO } from 'date-fns';
import { Button, Chip, EmptyState, IconButton, KindIcon, Segments } from '../../ui/primitives';
import {
  applyStatus,
  badge,
  dueDate,
  groupItems,
  isSubscription,
  upcoming,
} from '../../shared/selectors';
import { daysUntil } from '../../shared/dates';
import { formatMoney as money } from '../../ui/i18n';
import { archiveItem, commit, updateItem, useStore } from '../../shared/store';
import { snooze } from '../../shared/reminders';
import { snappy, useReducedMotion } from '../../ui/motion';
import type { Item } from '../../shared/types';
export function DueChip({ item }: { item: Item }) {
  const date = dueDate(item);
  const n = date ? daysUntil(date) : Infinity;
  const event = itemEvents(item)[0];
  const deferred = event && item.reminderSnoozes?.[snoozeKey(event)];
  return (
    <Chip tone={n < 0 ? 'danger' : n <= 3 ? 'warning' : ''}>
      {dueLabel(date)}
      {deferred && Date.parse(deferred) > Date.now() ? t(' \u00B7 Snoozed') : ''}
    </Chip>
  );
}
function Countdown({ date, at }: { date: string; at?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const end = at ?? parseISO(`${date}T23:59:59`).getTime();
  const total = Math.max(0, Math.floor((end - now) / 1000));
  const parts = [
    Math.floor(total / 86400),
    Math.floor(total / 3600) % 24,
    Math.floor(total / 60) % 60,
  ];
  return (
    <div
      className="countdown"
      aria-label={t('{0} days, {1} hours and {2} minutes remaining', parts[0], parts[1], parts[2])}
    >
      {parts.map((n, i) => (
        <span key={i}>
          <b>{String(n).padStart(2, '0')}</b>
          <small>{t(['days', 'hrs', 'min'][i])}</small>
        </span>
      ))}
    </div>
  );
}
export function Today({ onAdd, onOpen }: { onAdd: () => void; onOpen: (i: Item) => void }) {
  const items = useStore((s) => s.data.items);
  const focusIds = useStore((s) => s.data.focusIds);
  const focused = upcoming(items).filter((item) => focusIds?.includes(item.id));
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [limits, setLimits] = useState<Record<string, number>>({});
  const reduced = useReducedMotion();
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (filter === 'all' || i.kind === filter) &&
          `${i.title} ${isSubscription(i) ? i.vendor : i.organization} ${i.tags.join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, filter, query],
  );
  const groups = groupItems(filtered);
  const all = upcoming(filtered);
  const next =
    all.find((i) => dueDate(i) && daysUntil(dueDate(i)!) >= 0) ?? all.find((i) => dueDate(i));
  const count = badge(items).count;
  let rowIndex = 0;
  return (
    <div className="today-view">
      {focused.length > 0 && (
        <section className="today-group">
          <h2 className="group-label">{t('Your focus')}</h2>
          {focused.map((item) => (
            <button className="archive-item" key={item.id} onClick={() => onOpen(item)}>
              <b>{item.title}</b>
              <DueChip item={item} />
            </button>
          ))}
        </section>
      )}
      {next && (
        <motion.section
          key={`${next.id}-${count}`}
          initial={reduced ? { opacity: 0.8 } : { scale: 0.99, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="next-card"
        >
          <div className="between">
            <span className="eyebrow">
              <span className="live-dot" />
              {t('Next up \u00B7')} {eventTitle(itemEvents(next)[0])}
            </span>
            <span className="next-date">{format(parseISO(dueDate(next)!), 'MMM d')}</span>
          </div>
          <button className="hero-title" onClick={() => onOpen(next)}>
            {next.title} <ArrowUpRight size={17} />
          </button>
          <p>{isSubscription(next) ? next.vendor : next.organization}</p>
          <div className="between hero-bottom">
            <Countdown date={dueDate(next)!} at={eventInstant(itemEvents(next)[0])} />
            <Button onClick={() => onOpen(next)}>
              {t('View details')}
              <ArrowUpRight size={13} />
            </Button>
          </div>
        </motion.section>
      )}
      <div className="today-toolbar">
        <Segments
          label={t('Filter items')}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setLimits({});
          }}
          values={[
            { value: 'all', label: 'All' },
            { value: 'job', label: 'Jobs' },
            { value: 'study', label: 'Study' },
            { value: 'subscription', label: 'Subscriptions' },
          ]}
        />
        <div className="search-field">
          <Search size={14} />
          <input
            aria-label={t('Search items')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimits({});
            }}
            placeholder={t('Find something\u2026')}
          />
        </div>
      </div>
      {all.length === 0 ? (
        <EmptyState
          title={query ? t('Nothing by that name') : t('A little space for what\u2019s next')}
          description={
            query
              ? t('Try another title or organization.')
              : t('Add a deadline or renewal. We\u2019ll keep it on your radar.')
          }
          action={<Button onClick={onAdd}>{t('Add an item')}</Button>}
        />
      ) : (
        Object.entries(groups).map(
          ([name, group]) =>
            group.length > 0 && (
              <section className="today-group" key={name}>
                <h2 className={`group-label ${name === 'Overdue' ? 'overdue' : ''}`}>
                  {t(name)} <span>{group.length}</span>
                </h2>
                <div>
                  {group.slice(0, limits[name] ?? 12).map((item) => {
                    const index = rowIndex++;
                    return (
                      <motion.article
                        key={item.id}
                        layout={!reduced ? 'position' : false}
                        initial={index < 8 ? { opacity: 0, y: reduced ? 0 : 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          ...snappy,
                          opacity: { duration: 0.22, delay: index < 8 ? index * 0.03 : 0 },
                        }}
                        className="today-row"
                      >
                        <button className="row-main" onClick={() => onOpen(item)}>
                          <KindIcon kind={item.kind} />
                          <span className="row-copy">
                            <strong>{item.title}</strong>
                            <small>
                              {isSubscription(item)
                                ? item.vendor
                                : item.organization || t('Application')}{' '}
                              <span className="row-dot">·</span>{' '}
                              {isSubscription(item) ? money(item.cost) : t(item.status)}
                            </small>
                          </span>
                          <DueChip item={item} />
                        </button>
                        <div className="row-actions">
                          <IconButton
                            label={t(
                              focusIds?.includes(item.id) ? 'Unpin {0}' : 'Pin {0} to focus',
                              item.title,
                            )}
                            disabled={!focusIds?.includes(item.id) && (focusIds?.length ?? 0) >= 3}
                            onClick={() => {
                              void commit((state) => ({
                                ...state,
                                focusIds: state.focusIds?.includes(item.id)
                                  ? state.focusIds.filter((id) => id !== item.id)
                                  : [...(state.focusIds ?? []), item.id],
                              }));
                            }}
                          >
                            <Pin size={14} />
                          </IconButton>
                          {!isSubscription(item) &&
                            !['applied', 'interview'].includes(item.status) && (
                              <IconButton
                                label={t('Mark {0} applied', item.title)}
                                onClick={() => {
                                  void updateItem(item.id, (i) =>
                                    isSubscription(i) ? i : applyStatus(i, 'applied'),
                                  );
                                }}
                              >
                                <Check size={14} />
                              </IconButton>
                            )}
                          <IconButton
                            label={t('Snooze {0} 1 day', item.title)}
                            onClick={() => {
                              void updateItem(item.id, (i) => snooze(i));
                            }}
                          >
                            <Clock3 size={14} />
                          </IconButton>
                          {item.url && (
                            <IconButton
                              label={t('Open {0} link', item.title)}
                              onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                            >
                              <ArrowUpRight size={14} />
                            </IconButton>
                          )}
                          <IconButton
                            label={t('Archive {0}', item.title)}
                            onClick={() => {
                              void archiveItem(item.id);
                            }}
                          >
                            <Archive size={14} />
                          </IconButton>
                        </div>
                      </motion.article>
                    );
                  })}
                  {group.length > (limits[name] ?? 12) && (
                    <Button
                      variant="ghost"
                      className="show-more"
                      onClick={() => setLimits((s) => ({ ...s, [name]: (s[name] ?? 12) + 24 }))}
                    >
                      {t('Show more \u00B7')}
                      {group.length - (limits[name] ?? 12)}
                      {t('remaining')}
                    </Button>
                  )}
                </div>
              </section>
            ),
        )
      )}
    </div>
  );
}
