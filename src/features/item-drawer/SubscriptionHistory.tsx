import { nanoid } from 'nanoid';
import { Button, IconButton } from '../../ui/primitives';
import { Trash2 } from 'lucide-react';
import { today } from '../../shared/dates';
import type { Subscription } from '../../shared/types';
import { t, formatMoney } from '../../ui/i18n';

export function SubscriptionHistory({
  item,
  onChange,
}: {
  item: Subscription;
  onChange: (patch: Partial<Subscription>) => void;
}) {
  return (
    <section className="editor-section">
      {item.renewalReviewAt && (
        <div className="capture-review">
          <p>{t('A past renewal needs review: {0}', item.renewalReviewAt)}</p>
          <Button onClick={() => onChange({ renewalReviewAt: undefined })}>
            {t('Mark renewal reviewed')}
          </Button>
        </div>
      )}
      <div className="between">
        <h3>{t('Payment records')}</h3>
        <Button
          disabled={(item.payments?.length ?? 0) >= 500}
          onClick={() =>
            onChange({
              payments: [
                ...(item.payments ?? []),
                { id: nanoid(), date: today(), cost: { ...item.cost } },
              ],
            })
          }
        >
          {t('Add payment record')}
        </Button>
      </div>
      <p className="muted text-xs">
        {t('These are manual records, not confirmation from your bank. Save changes to keep them.')}
      </p>
      {item.payments?.map((payment, index) => (
        <div className="document-row" key={payment.id}>
          <input
            type="date"
            aria-label={t('Payment date {0}', index + 1)}
            value={payment.date}
            onChange={(e) =>
              onChange({
                payments: item.payments!.map((entry) =>
                  entry.id === payment.id ? { ...entry, date: e.target.value } : entry,
                ),
              })
            }
          />
          <input
            type="number"
            min="0"
            step="0.01"
            aria-label={t('Payment amount {0}', index + 1)}
            value={payment.cost.amount}
            onChange={(e) =>
              onChange({
                payments: item.payments!.map((entry) =>
                  entry.id === payment.id
                    ? { ...entry, cost: { ...entry.cost, amount: Number(e.target.value) } }
                    : entry,
                ),
              })
            }
          />
          <span>{payment.cost.currency}</span>
          <IconButton
            label={t('Remove payment {0}', index + 1)}
            onClick={() =>
              onChange({ payments: item.payments!.filter((entry) => entry.id !== payment.id) })
            }
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      ))}
      <h3>{t('Price history')}</h3>
      {item.priceHistory?.map((entry, index) => (
        <p key={`${entry.at}-${index}`} className="muted text-xs">
          {new Date(entry.at).toLocaleDateString()} · {formatMoney(entry.cost)}
        </p>
      ))}
      {!item.priceHistory?.length && (
        <p className="muted text-xs">
          {t('Price changes will appear here after you save a new cost.')}
        </p>
      )}
    </section>
  );
}
