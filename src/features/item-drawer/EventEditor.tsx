import { t } from '../../ui/i18n';
import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Tick } from '../../ui/primitives';
import { eventKinds } from '../../shared/schema';
import { eventLabels } from '../../shared/events';
import { today } from '../../shared/dates';
import type { ApplicationEvent } from '../../shared/types';
export function EventEditor({
  events,
  onChange,
}: {
  events: ApplicationEvent[];
  onChange: (events: ApplicationEvent[]) => void;
}) {
  const update = (id: string, patch: Partial<ApplicationEvent>) =>
    onChange(events.map((event) => (event.id === id ? { ...event, ...patch } : event)));
  return (
    <section className="editor-section">
      <div className="between">
        <h3>{t('Application events')}</h3>
        <Button
          variant="ghost"
          disabled={events.length >= 200}
          onClick={() =>
            onChange([
              ...events,
              { id: nanoid(), kind: 'interview', title: 'Interview', date: today() },
            ])
          }
        >
          <Plus size={12} />
          {t('Add event')}
        </Button>
      </div>
      <p className="muted text-xs">
        {t('Track interviews, documents, recommendations, and offer decisions separately.')}
      </p>
      {events.map((event, index) => (
        <fieldset className="event-editor" key={event.id}>
          <legend>
            {t('Event')}
            {index + 1}
          </legend>
          <div className="between">
            <Tick
              label={t('Complete event {0}', index + 1)}
              checked={Boolean(event.completedAt)}
              onChange={(done) =>
                update(event.id, { completedAt: done ? new Date().toISOString() : undefined })
              }
            />
            <IconButton
              label={t('Remove event {0}', index + 1)}
              onClick={() => onChange(events.filter((entry) => entry.id !== event.id))}
            >
              <Trash2 size={13} />
            </IconButton>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>{t('Event type')}</span>
              <select
                value={event.kind}
                onChange={(e) =>
                  update(event.id, { kind: e.target.value as ApplicationEvent['kind'] })
                }
              >
                {eventKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(eventLabels[kind])}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('Event title')}</span>
              <input
                value={event.title}
                maxLength={500}
                onChange={(e) => update(event.id, { title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{t('Event date')}</span>
              <input
                type="date"
                value={event.date}
                onChange={(e) => update(event.id, { date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{t('Time \u00B7 optional')}</span>
              <input
                type="time"
                value={event.time ?? ''}
                onChange={(e) =>
                  update(event.id, {
                    time: e.target.value || undefined,
                    timeZone: e.target.value
                      ? (event.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
                      : undefined,
                  })
                }
              />
            </label>
            {event.time && (
              <label className="field">
                <span>{t('Time zone')}</span>
                <input
                  value={event.timeZone ?? ''}
                  placeholder={t('Asia/Dhaka')}
                  onChange={(e) => update(event.id, { timeZone: e.target.value })}
                />
              </label>
            )}
            <label className="field">
              <span>{t('Location \u00B7 optional')}</span>
              <input
                value={event.location ?? ''}
                maxLength={500}
                onChange={(e) => update(event.id, { location: e.target.value || undefined })}
              />
            </label>
            <label className="field">
              <span>{t('Event link \u00B7 optional')}</span>
              <input
                type="url"
                value={event.url ?? ''}
                onChange={(e) => update(event.id, { url: e.target.value || undefined })}
              />
            </label>
          </div>
        </fieldset>
      ))}
    </section>
  );
}
