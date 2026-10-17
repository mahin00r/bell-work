import { useState } from 'react';
import { ArrowRight, Link2 } from 'lucide-react';
import { Button, Modal, Segments } from '../../ui/primitives';
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
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const draft = newItem(kind, currency);
    const common = { ...draft, title: title.trim(), url: url.trim() || undefined };
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
          };
    const parsed = itemSchema.safeParse(item);
    if (!parsed.success) {
      setError(
        !title.trim()
          ? 'Give your item a title.'
          : kind === 'subscription' && !date
            ? 'Choose the next renewal date.'
            : parsed.error.issues[0].message,
      );
      return;
    }
    setSaving(true);
    setError('');
    if (await onSave(parsed.data)) onClose();
    else setError('Could not save. Please try again.');
    setSaving(false);
  }
  return (
    <Modal
      open
      onOpenChange={(v) => {
        if (!v && !saving) onClose();
      }}
      title="A new possibility"
      description="Capture it now. Make your next move later."
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          void save(e);
        }}
        noValidate
      >
        <Segments
          label="Item type"
          value={kind}
          onChange={(v) => setKind(v as Kind)}
          values={[
            { value: 'job', label: 'Job' },
            { value: 'study', label: 'Study' },
            { value: 'subscription', label: 'Subscription' },
          ]}
        />
        <label className="field">
          <span>
            {kind === 'subscription'
              ? 'Subscription name'
              : kind === 'study'
                ? 'Program or scholarship'
                : 'Job title'}
          </span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === 'job'
                ? 'e.g. Product designer'
                : kind === 'study'
                  ? 'e.g. Graduate scholarship'
                  : 'e.g. CloudNotes Pro'
            }
            maxLength={500}
          />
        </label>
        <label className="field">
          <span>{kind === 'subscription' ? 'Vendor' : 'Organization'}</span>
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Who is it with?"
          />
        </label>
        <label className="field">
          <span className="inline">
            <Link2 size={12} /> Page link <small>optional</small>
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
        </label>
        {kind === 'subscription' && (
          <label className="field">
            <span>Monthly cost · {currency}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </label>
        )}
        <label className="field">
          <span>{kind === 'subscription' ? 'Next renewal' : 'Deadline · optional'}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="date-shortcuts">
          <Button onClick={() => setDate(shiftDay(today(), 3))}>+3 days</Button>
          <Button onClick={() => setDate(shiftDay(today(), 7))}>+1 week</Button>
          <Button onClick={() => setDate(monthEnd())}>End of month</Button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save item'} <ArrowRight size={14} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
