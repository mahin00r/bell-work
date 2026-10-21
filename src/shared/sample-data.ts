import { newItem } from './templates';
import { shiftDay, today } from './dates';
import type { Item } from './types';
export function sampleData(): Item[] {
  const apps = [
    ['job', 'Product designer', 'Northwind Labs', -2, 'preparing', 'high'],
    ['study', 'Meridian Graduate Scholarship', 'Harbor Institute', 3, 'preparing', 'high'],
    ['job', 'Frontend engineer', 'Juniper Studio', 5, 'saved', 'medium'],
    ['study', 'MSc in Human Computer Interaction', 'Aster University', 18, 'saved', 'medium'],
    ['job', 'Design systems engineer', 'Paperplane Labs', 24, 'interview', 'high'],
    ['job', 'UI engineer', 'Evergreen Studio', 12, 'applied', 'low'],
    ['study', 'Research Fellowship', 'Elm Research Institute', 32, 'offer', 'medium'],
  ] as const;
  const items: Item[] = apps.map(([kind, title, organization, offset, status, priority]) => {
    const item = newItem(kind);
    if (item.kind === 'subscription') throw new Error('Invalid sample kind');
    return {
      ...item,
      title,
      roleOrProgram: title,
      organization,
      country: 'Bangladesh',
      deadline: shiftDay(today(), offset),
      status,
      priority,
      tags: ['sample'],
      checklist: item.checklist.map((c, n) => ({ ...c, done: n === 0 })),
      followUpAt: ['applied', 'interview'].includes(status) ? shiftDay(today(), offset) : undefined,
      events:
        status === 'interview'
          ? [
              {
                id: 'sample-interview',
                kind: 'interview',
                title: 'Meet the design team',
                date: shiftDay(today(), 1),
                time: '10:00',
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            ]
          : status === 'offer'
            ? [
                {
                  id: 'sample-decision',
                  kind: 'offer',
                  title: 'Confirm fellowship offer',
                  date: shiftDay(today(), 5),
                },
              ]
            : kind === 'study' && status === 'preparing'
              ? [
                  {
                    id: 'sample-documents',
                    kind: 'document',
                    title: 'Prepare the transcript',
                    date: shiftDay(today(), 2),
                  },
                ]
              : [],
      statusHistory: [
        ...item.statusHistory,
        ...(status !== 'saved' ? [{ status, at: item.createdAt }] : []),
      ],
    };
  });
  for (const [title, vendor, amount, offset, cycle] of [
    ['CloudNotes Pro', 'CloudNotes', 450, 2, 'monthly'],
    ['Streamly Plus', 'Streamly', 299, 8, 'monthly'],
    ['Pixelpad Studio', 'Pixelpad', 3600, 22, 'yearly'],
  ] as const) {
    const item = newItem('subscription');
    if (item.kind !== 'subscription') throw new Error('Invalid sample kind');
    items.push({
      ...item,
      title,
      vendor,
      cost: { amount, currency: 'BDT' },
      cycle,
      nextRenewal: shiftDay(today(), offset),
      tags: ['sample'],
      unused: title === 'Streamly Plus',
    });
  }
  return items;
}
