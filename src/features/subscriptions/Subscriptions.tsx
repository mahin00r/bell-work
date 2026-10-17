import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { ArrowUpRight, Plus, Repeat2, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button, Chip, EmptyState, KindIcon, Segments } from '../../ui/primitives';
import { isSubscription, spend } from '../../shared/selectors';
import { money } from '../../shared/money';
import { useStore } from '../../shared/store';
import type { Item } from '../../shared/types';
import { useReducedMotion } from '../../ui/motion';

export function AnimatedMoney({ amount, currency }: { amount: number; currency: string }) {
  const [value, setValue] = useState(amount);
  const previous = useRef(amount);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setValue(amount);
      previous.current = amount;
      return;
    }
    const controls = animate(previous.current, amount, { duration: 0.4, onUpdate: setValue });
    previous.current = amount;
    return () => controls.stop();
  }, [amount, reduced]);
  return <>{money({ amount: value, currency })}</>;
}
export function Subscriptions({ onOpen, onAdd }: { onOpen: (i: Item) => void; onAdd: () => void }) {
  const data = useStore((s) => s.data);
  const [filter, setFilter] = useState('all');
  const items = data.items
    .filter(isSubscription)
    .filter(
      (i) =>
        !i.archivedAt &&
        (filter === 'all'
          ? i.status !== 'cancelled'
          : filter === 'unused'
            ? i.unused && i.status !== 'cancelled'
            : i.status === 'cancelled'),
    )
    .sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
  const totals = Object.entries(spend(data.items));
  if (!totals.length) totals.push([data.settings.defaultCurrency, 0]);
  return (
    <>
      <div className="metrics two">
        <section className="metric">
          <span>
            <Wallet size={15} /> Monthly commitment
          </span>
          {totals.map(([currency, amount]) => (
            <strong key={currency}>
              <AnimatedMoney currency={currency} amount={amount} />
            </strong>
          ))}
          <small>Normalized across all billing cycles</small>
        </section>
        <section className="metric">
          <span>
            <Repeat2 size={15} /> Yearly outlook
          </span>
          {totals.map(([currency, amount]) => (
            <strong key={currency}>
              <AnimatedMoney currency={currency} amount={amount * 12} />
            </strong>
          ))}
          <small>At your current subscription pace</small>
        </section>
      </div>
      <div className="view-toolbar">
        <Segments
          label="Subscription filter"
          value={filter}
          onChange={setFilter}
          values={[
            { value: 'all', label: 'Active subscriptions' },
            { value: 'unused', label: 'Cancel candidates' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <span className="muted text-xs">{items.length} subscriptions</span>
      </div>
      {!items.length ? (
        <EmptyState
          title={
            filter === 'unused'
              ? 'Every subscription earns its place'
              : filter === 'cancelled'
                ? 'No cancelled subscriptions'
                : 'A clearer picture of your spending'
          }
          description={
            filter === 'unused'
              ? 'Flag an unused subscription in its details to review it here.'
              : 'Add a subscription to see upcoming renewals and what they add up to.'
          }
          action={
            <Button onClick={onAdd}>
              <Plus size={14} /> Add subscription
            </Button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subscription</th>
                <th>Cost / cycle</th>
                <th>Next renewal</th>
                <th>Status</th>
                <th>Category</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <button className="subscription-name" onClick={() => onOpen(i)}>
                      <KindIcon kind="subscription" />
                      <span>
                        <b>{i.title}</b>
                        <small>{i.vendor}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <b>{money(i.cost)}</b>
                    <small>{i.cycle}</small>
                  </td>
                  <td>
                    {format(parseISO(i.nextRenewal), 'MMM d, yyyy')}
                    {i.trialEndsAt && i.status === 'trial' && (
                      <small>Trial ends {format(parseISO(i.trialEndsAt), 'MMM d')}</small>
                    )}
                  </td>
                  <td>
                    <Chip
                      tone={
                        i.status === 'trial' ? 'accent' : i.status === 'active' ? 'success' : ''
                      }
                    >
                      {i.status}
                    </Chip>
                  </td>
                  <td className="muted">{i.category}</td>
                  <td>
                    {i.cancelUrl && (
                      <Button
                        variant="ghost"
                        onClick={() => window.open(i.cancelUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Manage <ArrowUpRight size={13} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
