import { formatDate as format } from '../../ui/i18n';
import { t } from '../../ui/i18n';
import { addDays, parseISO } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { Chip, EmptyState, KindIcon } from '../../ui/primitives';
import { projectedEvents } from '../../shared/events';
import { daysUntil, today } from '../../shared/dates';
import { useStore } from '../../shared/store';
import { useState } from 'react';
import { Button } from '../../ui/primitives';
import type { Item, Kind } from '../../shared/types';
export function timelineEvents(items: Item[], now = new Date()) {
  return projectedEvents(items, now, 60);
}
export function Timeline({ onOpen }: { onOpen: (i: Item) => void }) {
  const items = useStore((s) => s.data.items);
  const events = timelineEvents(items);
  const [limit, setLimit] = useState(50);
  const days = Array.from({ length: 60 }, (_, n) => addDays(new Date(), n));
  return (
    <>
      <div className="view-toolbar">
        <span className="inline muted text-xs">
          <CalendarRange size={16} />
          {format(new Date(), 'MMM d')} — {format(addDays(new Date(), 59), 'MMM d, yyyy')}
        </span>
        <Chip>
          {events.length} {t('upcoming moments')}
        </Chip>
      </div>
      {!events.length ? (
        <EmptyState
          title={t('A clear horizon')}
          description={t(
            'Deadlines, follow-ups, and renewals in the next 60 days will appear here.',
          )}
        />
      ) : (
        <div
          className="timeline-scroll"
          tabIndex={0}
          role="region"
          aria-label={t('60-day timeline; scroll horizontally to see later dates')}
        >
          <div className="timeline-grid">
            <div className="timeline-dates">
              <span className="timeline-label">{t('NEXT 60 DAYS')}</span>
              {days.map((date, n) => (
                <div key={today(date)} className={n === 0 ? 'current' : ''}>
                  <small>
                    {n === 0 || date.getDate() === 1 ? format(date, 'MMM') : format(date, 'EEE')}
                  </small>
                  <b>{format(date, 'd')}</b>
                  {n === 0 && <em>{t('Today')}</em>}
                </div>
              ))}
            </div>
            {(['job', 'study', 'subscription'] as Kind[]).map((kind) => {
              const lane = events.filter((e) => e.item.kind === kind);
              return (
                <section key={kind} className="timeline-lane">
                  <div className="timeline-kind">
                    <KindIcon kind={kind} />
                    <b>
                      {kind === 'job'
                        ? t('Jobs')
                        : kind === 'study'
                          ? t('Study')
                          : t('Subscriptions')}
                    </b>
                    <small>
                      {lane.length} {t('moments')}
                    </small>
                  </div>
                  <div
                    className="timeline-track"
                    style={{ minHeight: Math.max(100, Math.min(limit, lane.length) * 42 + 20) }}
                  >
                    <div className="today-marker" />
                    {lane.slice(0, limit).map((e, n) => (
                      <button
                        key={`${e.item.id}-${e.id}-${e.date}`}
                        className={`timeline-event ${kind}`}
                        style={{ left: daysUntil(e.displayDate) * 48 + 8, top: n * 42 + 12 }}
                        onClick={() => onOpen(e.item)}
                        title={t(
                          '{0} \u00B7 {1} \u00B7 {2}',
                          e.item.title,
                          e.label,
                          format(parseISO(e.date), 'MMMM d'),
                        )}
                      >
                        <span />
                        {e.item.title}
                        <small>
                          {t(e.label)}
                          {e.time ? ` · ${e.time} ${e.timeZone}` : ''}
                        </small>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {(['job', 'study', 'subscription'] as Kind[]).some(
        (kind) => events.filter((event) => event.item.kind === kind).length > limit,
      ) && <Button onClick={() => setLimit((current) => current + 50)}>{t('Show 50 more')}</Button>}
    </>
  );
}
