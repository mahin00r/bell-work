import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Archive, ArrowUpRight, Check, Clock3, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button, Chip, EmptyState, IconButton, KindIcon, Segments } from '../../ui/primitives';
import {
  applyStatus,
  badge,
  dueDate,
  groupItems,
  isSubscription,
  upcoming,
} from '../../shared/selectors';
import { daysUntil, dueLabel } from '../../shared/dates';
import { money } from '../../shared/money';
import { archiveItem, updateItem, useStore } from '../../shared/store';
import { snooze } from '../../shared/reminders';
import { snappy, useReducedMotion } from '../../ui/motion';
import type { Item } from '../../shared/types';

export function DueChip({ item }: { item: Item }) {
  const date = dueDate(item);
  const n = date ? daysUntil(date) : Infinity;
  return <Chip tone={n < 0 ? 'danger' : n <= 3 ? 'warning' : ''}>{dueLabel(date)}</Chip>;
}
function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const end = parseISO(`${date}T23:59:59`).getTime();
  const total = Math.max(0, Math.floor((end - now) / 1000));
  const parts = [
    Math.floor(total / 86400),
    Math.floor(total / 3600) % 24,
    Math.floor(total / 60) % 60,
  ];
  return (
    <div
      className="countdown"
      aria-label={`${parts[0]} days, ${parts[1]} hours and ${parts[2]} minutes remaining`}
    >
      {parts.map((n, i) => (
        <span key={i}>
          <b>{String(n).padStart(2, '0')}</b>
          <small>{['days', 'hrs', 'min'][i]}</small>
        </span>
      ))}
    </div>
  );
}
export function Today({ onAdd, onOpen }: { onAdd: () => void; onOpen: (i: Item) => void }) {
  const items = useStore((s) => s.data.items);
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
              <span className="live-dot" /> Next up ·{' '}
              {isSubscription(next)
                ? 'Renewal'
                : ['applied', 'interview'].includes(next.status)
                  ? 'Follow-up'
                  : next.kind === 'study'
                    ? 'Study'
                    : 'Job'}
            </span>
            <span className="next-date">{format(parseISO(dueDate(next)!), 'MMM d')}</span>
          </div>
          <button className="hero-title" onClick={() => onOpen(next)}>
            {next.title} <ArrowUpRight size={17} />
          </button>
          <p>{isSubscription(next) ? next.vendor : next.organization}</p>
          <div className="between hero-bottom">
            <Countdown date={dueDate(next)!} />
            <Button onClick={() => onOpen(next)}>
              View details <ArrowUpRight size={13} />
            </Button>
          </div>
        </motion.section>
      )}
      <div className="today-toolbar">
        <Segments
          label="Filter items"
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
            aria-label="Search items"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimits({});
            }}
            placeholder="Find something…"
          />
        </div>
      </div>
      {all.length === 0 ? (
        <EmptyState
          title={query ? 'Nothing by that name' : 'A little space for what’s next'}
          description={
            query
              ? 'Try another title or organization.'
              : 'Add a deadline or renewal. We’ll keep it on your radar.'
          }
          action={<Button onClick={onAdd}>Add an item</Button>}
        />
      ) : (
        Object.entries(groups).map(
          ([name, group]) =>
            group.length > 0 && (
              <section className="today-group" key={name}>
                <h2 className={`group-label ${name === 'Overdue' ? 'overdue' : ''}`}>
                  {name} <span>{group.length}</span>
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
                                : item.organization || 'Application'}{' '}
                              <span className="row-dot">·</span>{' '}
                              {isSubscription(item) ? money(item.cost) : item.status}
                            </small>
                          </span>
                          <DueChip item={item} />
                        </button>
                        <div className="row-actions">
                          {!isSubscription(item) &&
                            !['applied', 'interview'].includes(item.status) && (
                              <IconButton
                                label={`Mark ${item.title} applied`}
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
                            label={`Snooze ${item.title} 1 day`}
                            onClick={() => {
                              void updateItem(item.id, (i) => snooze(i));
                            }}
                          >
                            <Clock3 size={14} />
                          </IconButton>
                          {item.url && (
                            <IconButton
                              label={`Open ${item.title} link`}
                              onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                            >
                              <ArrowUpRight size={14} />
                            </IconButton>
                          )}
                          <IconButton
                            label={`Archive ${item.title}`}
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
                      Show more · {group.length - (limits[name] ?? 12)} remaining
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
