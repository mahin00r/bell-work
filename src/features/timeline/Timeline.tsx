import { addDays, format, parseISO } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { Chip, EmptyState, KindIcon } from '../../ui/primitives';
import { actionable, dueDate, isSubscription } from '../../shared/selectors';
import { daysUntil, nextCycle, today } from '../../shared/dates';
import { useStore } from '../../shared/store';
import type { Item, Kind } from '../../shared/types';
export function timelineEvents(items: Item[], now = new Date()) {
  const events: { item: Item; date: string; label: string }[] = [];
  for (const item of items.filter(actionable)) {
    let date = dueDate(item);
    if (isSubscription(item)) {
      date = item.nextRenewal;
      while (daysUntil(date, now) < 0) date = nextCycle(date, item.cycle);
      while (daysUntil(date, now) < 60) {
        events.push({ item, date, label: 'Renewal' });
        date = nextCycle(date, item.cycle);
      }
      if (
        item.status === 'trial' &&
        item.trialEndsAt &&
        daysUntil(item.trialEndsAt, now) >= 0 &&
        daysUntil(item.trialEndsAt, now) < 60
      )
        events.push({ item, date: item.trialEndsAt, label: 'Trial ends' });
    } else if (date && daysUntil(date, now) >= 0 && daysUntil(date, now) < 60)
      events.push({
        item,
        date,
        label: ['applied', 'interview'].includes(item.status) ? 'Follow-up' : 'Deadline',
      });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
export function Timeline({ onOpen }: { onOpen: (i: Item) => void }) {
  const items = useStore((s) => s.data.items);
  const events = timelineEvents(items);
  const days = Array.from({ length: 60 }, (_, n) => addDays(new Date(), n));
  return (
    <>
      <div className="view-toolbar">
        <span className="inline muted text-xs">
          <CalendarRange size={16} />
          {format(new Date(), 'MMM d')} — {format(addDays(new Date(), 59), 'MMM d, yyyy')}
        </span>
        <Chip>{events.length} upcoming moments</Chip>
      </div>
      {!events.length ? (
        <EmptyState
          title="A clear horizon"
          description="Deadlines, follow-ups, and renewals in the next 60 days will appear here."
        />
      ) : (
        <div
          className="timeline-scroll"
          tabIndex={0}
          role="region"
          aria-label="60-day timeline; scroll horizontally to see later dates"
        >
          <div className="timeline-grid">
            <div className="timeline-dates">
              <span className="timeline-label">NEXT 60 DAYS</span>
              {days.map((date, n) => (
                <div key={today(date)} className={n === 0 ? 'current' : ''}>
                  <small>
                    {n === 0 || date.getDate() === 1 ? format(date, 'MMM') : format(date, 'EEE')}
                  </small>
                  <b>{format(date, 'd')}</b>
                  {n === 0 && <em>Today</em>}
                </div>
              ))}
            </div>
            {(['job', 'study', 'subscription'] as Kind[]).map((kind) => {
              const lane = events.filter((e) => e.item.kind === kind);
              return (
                <section key={kind} className="timeline-lane">
                  <div className="timeline-kind">
                    <KindIcon kind={kind} />
                    <b>{kind === 'job' ? 'Jobs' : kind === 'study' ? 'Study' : 'Subscriptions'}</b>
                    <small>{lane.length} moments</small>
                  </div>
                  <div
                    className="timeline-track"
                    style={{ minHeight: Math.max(100, lane.length * 42 + 20) }}
                  >
                    <div className="today-marker" />
                    {lane.map((e, n) => (
                      <button
                        key={`${e.item.id}-${e.date}-${e.label}`}
                        className={`timeline-event ${kind}`}
                        style={{ left: daysUntil(e.date) * 48 + 8, top: n * 42 + 12 }}
                        onClick={() => onOpen(e.item)}
                        title={`${e.item.title} · ${e.label} · ${format(parseISO(e.date), 'MMMM d')}`}
                      >
                        <span />
                        {e.item.title}
                        <small>{e.label}</small>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
