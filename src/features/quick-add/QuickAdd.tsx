import { t } from '../../ui/i18n';
import { captureDuplicates } from '../../shared/capture';
import { useStore } from '../../shared/store';
import { useState } from 'react';
import { ArrowRight, Link2 } from 'lucide-react';
import { Button, Modal, Segments, Tick } from '../../ui/primitives';
import { newItem } from '../../shared/templates';
import { itemSchema } from '../../shared/schema';
import { today, shiftDay, monthEnd } from '../../shared/dates';
import type { Capture } from '../../shared/capture';
import type { Item, Kind } from '../../shared/types';
export function QuickAdd({
  prefill,
  currency,
  onSave,
  onClose,
}: {
  prefill: Capture;
  currency: string;
  onSave: (i: Item) => Promise<boolean>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>('job');
  const [title, setTitle] = useState(prefill.title);
  const [organization, setOrganization] = useState(prefill.organization);
  const [url, setUrl] = useState(prefill.url ?? '');
  const [date, setDate] = useState(prefill.deadline ?? '');
  const [confirmedDate, setConfirmedDate] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);
  const items = useStore((store) => store.data.items);
  const duplicates = captureDuplicates(items, { title, organization, url });
  const needsDateConfirmation =
    kind !== 'subscription' && prefill.deadline && date === prefill.deadline && !confirmedDate;
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (needsDateConfirmation || (duplicates.length > 0 && !confirmedDuplicate)) {
      setError(t('Review the suggested date and any matching items before saving.'));
      return;
    }
    const draft = newItem(kind, currency);
    const common = {
      ...draft,
      title: title.trim(),
      url: url.trim() || undefined,
      notes: prefill.selectedText || undefined,
    };
    const item =
      draft.kind === 'subscription'
        ? {
            ...draft,
            ...common,
            vendor: organization.trim(),
            cost: { amount: amount.trim() ? Number(amount) : NaN, currency },
            nextRenewal: date,
          }
        : {
            ...draft,
            ...common,
            organization: organization.trim(),
            roleOrProgram: title.trim(),
            deadline: date || undefined,
            country: prefill.country,
          };
    const parsed = itemSchema.safeParse(item);
    if (!parsed.success) {
      setError(
        !title.trim()
          ? t('Give your item a title.')
          : kind === 'subscription' && !date
            ? t('Choose the next renewal date.')
            : parsed.error.issues[0].message,
      );
      return;
    }
    setSaving(true);
    setError('');
    if (await onSave(parsed.data)) onClose();
    else setError(t('Could not save. Please try again.'));
    setSaving(false);
  }
  return (
    <Modal
      open
      onOpenChange={(v) => {
        if (!v && !saving) onClose();
      }}
      title={t('A new possibility')}
      description={t('Capture it now. Make your next move later.')}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          void save(e);
        }}
        noValidate
      >
        <Segments
          label={t('Item type')}
          value={kind}
          onChange={(v) => {
            setKind(v as Kind);
            setDate(v === 'subscription' ? '' : (prefill.deadline ?? ''));
            setConfirmedDate(false);
          }}
          values={[
            { value: 'job', label: 'Job' },
            { value: 'study', label: 'Study' },
            { value: 'subscription', label: 'Subscription' },
          ]}
        />
        <label className="field">
          <span>
            {kind === 'subscription'
              ? t('Subscription name')
              : kind === 'study'
                ? t('Program or scholarship')
                : t('Job title')}
          </span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === 'job'
                ? t('e.g. Product designer')
                : kind === 'study'
                  ? t('e.g. Graduate scholarship')
                  : t('e.g. CloudNotes Pro')
            }
            maxLength={500}
          />
        </label>
        <label className="field">
          <span>{kind === 'subscription' ? t('Vendor') : t('Organization')}</span>
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder={t('Who is it with?')}
          />
        </label>
        <label className="field">
          <span className="inline">
            <Link2 size={12} />
            {t('Page link')}
            <small>{t('optional')}</small>
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={'https://'}
          />
        </label>
        {kind === 'subscription' && (
          <label className="field">
            <span>{t('Monthly cost · {0}', currency)}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={'0.00'}
            />
          </label>
        )}
        <label className="field">
          <span>{kind === 'subscription' ? t('Next renewal') : t('Deadline \u00B7 optional')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="date-shortcuts">
          <Button onClick={() => setDate(shiftDay(today(), 3))}>{t('+3 days')}</Button>
          <Button onClick={() => setDate(shiftDay(today(), 7))}>{t('+1 week')}</Button>
          <Button onClick={() => setDate(monthEnd())}>{t('End of month')}</Button>
        </div>
        {kind !== 'subscription' && prefill.deadline && date === prefill.deadline && (
          <div className="capture-review">
            <p className="muted text-xs">
              {t('Suggested date source:')}
              {prefill.deadlineSource ?? t('Page metadata')}
              {t('. Check the original page before confirming.')}
            </p>
            <Tick
              label={t('I checked the suggested deadline')}
              checked={confirmedDate}
              onChange={setConfirmedDate}
            />
          </div>
        )}
        {prefill.selectedText && (
          <p className="muted text-xs">{t('Selected text will be saved in Notes.')}</p>
        )}
        {duplicates.length > 0 && (
          <div className="capture-review">
            <strong>{t('Possible existing items')}</strong>
            {duplicates.slice(0, 5).map((item) => (
              <p key={item.id}>
                {item.title}
                {item.archivedAt ? t(' \u00B7 Archived') : ''}
              </p>
            ))}
            <Tick
              label={t('Save as a separate item')}
              checked={confirmedDuplicate}
              onChange={setConfirmedDuplicate}
            />
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="form-actions">
          <Button onClick={onClose} disabled={saving}>
            {t('Cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('Saving\u2026') : t('Save item')} <ArrowRight size={14} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
