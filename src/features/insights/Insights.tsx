import { format, parseISO, startOfWeek, subWeeks, isSameWeek } from 'date-fns';
import { ArrowUpRight, Send, Sprout, Wallet } from 'lucide-react';
import { Chip, EmptyState } from '../../ui/primitives';
import { funnel, isApplication, upcomingSpend } from '../../shared/selectors';
import { useStore } from '../../shared/store';
import { AnimatedMoney } from '../subscriptions/Subscriptions';
export function Insights() {
  const { items, settings } = useStore((s) => s.data);
  const apps = items.filter(isApplication).filter((i) => !i.archivedAt);
  const counts = funnel(items);
  const spend = Object.entries(upcomingSpend(items));
  const sent = apps.filter(
    (i) =>
      i.statusHistory.some((h) => h.status === 'applied') ||
      ['applied', 'interview', 'offer', 'accepted', 'rejected'].includes(i.status),
  ).length;
  const replies = apps.filter(
    (i) =>
      i.statusHistory.some((h) => ['interview', 'offer', 'rejected'].includes(h.status)) ||
      ['interview', 'offer', 'accepted', 'rejected'].includes(i.status),
  ).length;
  const weeks = Array.from({ length: 8 }, (_, n) =>
    startOfWeek(subWeeks(new Date(), 7 - n), { weekStartsOn: settings.weekStartsOn }),
  );
  const weekly = weeks.map(
    (w) =>
      apps.filter((i) => {
        const applied = i.statusHistory.find((h) => h.status === 'applied');
        return (
          applied && isSameWeek(parseISO(applied.at), w, { weekStartsOn: settings.weekStartsOn })
        );
      }).length,
  );
  const max = Math.max(1, ...weekly);
  return (
    <>
      <div className="metrics insight-metrics">
        <section className="metric">
          <span>
            <Send size={15} /> Applications sent
          </span>
          <strong>{sent}</strong>
          <small>Every submission is a step forward</small>
        </section>
        <section className="metric">
          <span>
            <Sprout size={15} /> Replies received
          </span>
          <strong>
            {replies}
            <em>{sent ? Math.round((replies / sent) * 100) : 0}% response</em>
          </strong>
          <small>Interviews, offers, and decisions</small>
        </section>
        <section className="metric">
          <span>
            <Wallet size={15} /> Next 30 days
          </span>
          {spend.length ? (
            spend.map(([currency, amount]) => (
              <strong key={currency}>
                <AnimatedMoney currency={currency} amount={amount} />
              </strong>
            ))
          ) : (
            <strong>
              <AnimatedMoney currency={settings.defaultCurrency} amount={0} />
            </strong>
          )}
          <small>Expected subscription renewals</small>
        </section>
      </div>
      <div className="insights-charts">
        <section className="chart-panel">
          <div className="between">
            <h2>Your application journey</h2>
            <Chip>All time</Chip>
          </div>
          <p>Each stage counts applications that reached it.</p>
          {apps.length ? (
            <div className="funnel-chart">
              {Object.entries(counts).map(([name, count], n) => (
                <div key={name}>
                  <span>{name}</span>
                  <svg viewBox="0 0 280 22" preserveAspectRatio="none" aria-hidden="true">
                    <rect x="0" y="0" width="280" height="22" rx="4" fill="var(--surface-2)" />
                    <rect
                      x="0"
                      y="0"
                      width={Math.max(3, (count / Math.max(1, ...Object.values(counts))) * 280)}
                      height="22"
                      rx="4"
                      fill="var(--accent)"
                      opacity={1 - n * 0.17}
                    />
                  </svg>
                  <b>{count}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="The first step is yours"
              description="Your journey takes shape as you save and submit applications."
            />
          )}
        </section>
        <section className="chart-panel">
          <div className="between">
            <h2>Showing up, week by week</h2>
            <ArrowUpRight size={15} className="muted" />
          </div>
          <p>Applications submitted in the past eight weeks.</p>
          <svg
            className="weekly-chart"
            viewBox="0 0 420 190"
            role="img"
            aria-label={`Weekly applications: ${weeks.map((w, n) => `${format(w, 'MMM d')}: ${weekly[n]}`).join(', ')}`}
          >
            <line x1="10" y1="154" x2="410" y2="154" stroke="var(--border)" />
            {weeks.map((week, n) => {
              const h = (weekly[n] / max) * 115;
              return (
                <g key={week.toISOString()}>
                  <rect
                    x={n * 50 + 18}
                    y={154 - Math.max(3, h)}
                    width="25"
                    height={Math.max(3, h)}
                    rx="4"
                    fill={n === 7 ? 'var(--accent)' : 'var(--accent-soft)'}
                  />
                  <text
                    x={n * 50 + 30}
                    y={Math.max(22, 145 - h)}
                    textAnchor="middle"
                    fill="var(--muted)"
                    fontSize="10"
                  >
                    {weekly[n]}
                  </text>
                  <text
                    x={n * 50 + 30}
                    y="178"
                    textAnchor="middle"
                    fill="var(--muted)"
                    fontSize="8"
                  >
                    {format(week, 'MMM d')}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>
      </div>
      <div className="insight-note">
        <Sprout size={17} />
        <p>
          Consistency opens doors.<span> Keep your next step small enough to start today.</span>
        </p>
      </div>
    </>
  );
}
