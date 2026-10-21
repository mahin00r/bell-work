import { expect, it } from 'vitest';
import { newItem } from '../src/shared/templates';
import { emptyState } from '../src/shared/migrations';
import { stateSchema } from '../src/shared/schema';
import { shiftDay } from '../src/shared/dates';
import { groupItems } from '../src/shared/selectors';
import { notices } from '../src/shared/reminders';
import { projectedEvents } from '../src/shared/events';
import { calendarExport } from '../src/shared/calendar';
import { parseBackup } from '../src/shared/backup';
import type { Item } from '../src/shared/types';

it.each([500, 5000])(
  'validates and projects a %i-item backup without losing events',
  (count) => {
    const base = newItem('job');
    if (base.kind === 'subscription') throw new Error('Invalid fixture');
    const items: Item[] = Array.from({ length: count }, (_, index) => ({
      ...base,
      id: `scale-${index}`,
      title: `Opportunity ${index}`,
      deadline: shiftDay('2026-10-21', index % 75),
      checklist: [],
      events: [
        {
          id: 'meeting',
          kind: 'interview',
          title: 'Interview',
          date: shiftDay('2026-10-21', index % 75),
          time: '18:30',
          timeZone: 'Asia/Dhaka',
        },
      ],
    }));
    const clock = new Date(2026, 9, 21, 12);
    const start = performance.now();
    const state = stateSchema.parse({ ...emptyState(), items });
    const validated = performance.now();
    const groups = groupItems(state.items, clock);
    const reminders = notices(state, clock);
    const events = projectedEvents(state.items, clock, 90);
    const projected = performance.now();
    const calendar = calendarExport(state.items, clock);
    const exported = performance.now();
    const restored = parseBackup(JSON.stringify(state));
    expect(restored.items).toHaveLength(count);
    expect(Object.values(groups).flat()).toHaveLength(count);
    expect(events).toHaveLength(count * 2);
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(count * 2);
    expect(reminders.length).toBeGreaterThan(0);
    console.info(
      JSON.stringify({
        items: count,
        validationMs: Math.round(validated - start),
        projectionsMs: Math.round(projected - validated),
        calendarMs: Math.round(exported - projected),
        backupRoundTripMs: Math.round(performance.now() - exported),
      }),
    );
  },
  30000,
);
