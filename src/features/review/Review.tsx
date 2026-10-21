import { t } from '../../ui/i18n';
import { useState } from 'react';
import { eventDisplayDate } from '../../shared/events';
import { Button, EmptyState } from '../../ui/primitives';
import { useStore, updateItem } from '../../shared/store';
import { weeklyReview } from '../../shared/review';
import { upcomingSpend } from '../../shared/selectors';
import { shiftDay, today } from '../../shared/dates';
import { eventTitle, relativeDate as dueLabel } from '../../ui/i18n';
import { formatMoney as money } from '../../ui/i18n';
import type { Item } from '../../shared/types';
export function Review({ onOpen }: { onOpen: (item: Item) => void }) {
  const items = useStore((store) => store.data.items);
  const review = weeklyReview(items);
  const [limit, setLimit] = useState(25);
  return (
    <div className="review-grid">
      <section className="settings-card">
        <h2>{t('Upcoming charges')}</h2>
        <p>{t('Forecast by currency, based on the current billing schedule.')}</p>
        {[30, 90].map((horizon) => (
          <div key={horizon}>
            <h3>{t('Next {0} days', horizon)}</h3>
            {Object.entries(upcomingSpend(items, new Date(), horizon)).map(([currency, amount]) => (
              <p key={currency}>
                <strong>{money({ currency, amount })}</strong>
              </p>
            ))}
          </div>
        ))}
      </section>
      <section className="settings-card">
        <h2>{t('Deadlines and events \u00B7 next 14 days')}</h2>
        {review.upcoming.length ? (
          review.upcoming.slice(0, limit).map(({ item, event }) => (
            <button
              className="archive-item"
              key={`${item.id}-${event.id}`}
              onClick={() => onOpen(item)}
            >
              <span>
                <b>{item.title}</b>
                <small>
                  {eventTitle(event)} · {dueLabel(eventDisplayDate(event))}
                  {event.time ? t(' \u00B7 {0} {1}', event.time, event.timeZone) : ''}
                </small>
              </span>
            </button>
          ))
        ) : (
          <p>{t('No events need attention in this window.')}</p>
        )}
      </section>
      <section className="settings-card">
        <h2>{t('Follow up')}</h2>
        {review.followups.slice(0, limit).map((item) => (
          <div key={item.id} className="review-row">
            <button className="archive-item" onClick={() => onOpen(item)}>
              <b>{item.title}</b>
            </button>
            <Button
              onClick={() => {
                void updateItem(item.id, (current) =>
                  current.kind === 'subscription'
                    ? current
                    : {
                        ...current,
                        followUpAt: shiftDay(today(), 3),
                        updatedAt: new Date().toISOString(),
                      },
                );
              }}
            >
              {t('Follow up in 3 days')}
            </Button>
          </div>
        ))}
        {!review.followups.length && <p>{t('Your follow-ups are up to date.')}</p>}
      </section>
      <section className="settings-card">
        <h2>{t('Finish your preparation')}</h2>
        {review.incomplete.slice(0, limit).map((item) => (
          <button className="archive-item" key={item.id} onClick={() => onOpen(item)}>
            <b>{item.title}</b>
            <small>
              {item.kind !== 'subscription' && item.checklist.filter((task) => !task.done).length}{' '}
              {t('tasks remaining')}
            </small>
          </button>
        ))}
        {!review.incomplete.length && <p>{t('No unfinished application checklists.')}</p>}
      </section>
      <section className="settings-card">
        <h2>{t('Review subscriptions')}</h2>
        {review.subscriptions.length ? (
          review.subscriptions.slice(0, limit).map((item) => (
            <button className="archive-item" key={item.id} onClick={() => onOpen(item)}>
              <b>{item.title}</b>
              <small>{t(item.status)}</small>
            </button>
          ))
        ) : (
          <EmptyState
            title={t('Nothing to review')}
            description={t(
              'Trials, cancellation plans, and subscriptions flagged as unused appear here.',
            )}
          />
        )}
      </section>
      {Object.values(review).some((items) => items.length > limit) && (
        <div>
          <p>{t('Showing up to {0} items per section.', limit)}</p>
          <Button onClick={() => setLimit((current) => current + 25)}>
            {t('Show more review items')}
          </Button>
        </div>
      )}
    </div>
  );
}
