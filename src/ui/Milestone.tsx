import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Item } from '../shared/types';
import { useReducedMotion } from './motion';
export function useMilestones(items: Item[]) {
  const previous = useRef(new Map(items.map((i) => [i.id, i.status])));
  const seen = useRef(new Set<string>());
  const [celebrating, setCelebrating] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const ids = items
      .filter(
        (i) =>
          i.kind !== 'subscription' &&
          ['offer', 'accepted'].includes(i.status) &&
          i.statusHistory.filter((h) => ['offer', 'accepted'].includes(h.status)).length <= 1 &&
          previous.current.has(i.id) &&
          previous.current.get(i.id) !== i.status &&
          !seen.current.has(i.id),
      )
      .map((i) => i.id);
    previous.current = new Map(items.map((i) => [i.id, i.status]));
    if (!ids.length) return;
    ids.forEach((id) => seen.current.add(id));
    setCelebrating(new Set(ids));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCelebrating(new Set()), 600);
  }, [items]);
  return celebrating;
}
export function Milestone() {
  const reduced = useReducedMotion();
  return (
    <div className="milestone-burst" aria-label="A new milestone reached" role="status">
      {Array.from({ length: 6 }, (_, n) => (
        <motion.span
          key={n}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
          animate={{
            opacity: 0,
            x: reduced ? 0 : Math.cos((n * Math.PI) / 3) * 32,
            y: reduced ? 0 : Math.sin((n * Math.PI) / 3) * 32,
            scale: 1,
          }}
          transition={{ duration: reduced ? 0.08 : 0.6 }}
          style={{ background: n % 2 ? 'var(--accent)' : 'var(--success)' }}
        />
      ))}
    </div>
  );
}
