import { nanoid } from 'nanoid';
import type { Application, Item, Kind } from './types';
import { today, shiftDay } from './dates';
export const checklistTemplate = (kind: Application['kind']) =>
  (kind === 'job'
    ? ['CV', 'Cover letter', 'Portfolio link']
    : ['Transcript', 'Statement of purpose', 'CV', 'Recommenders', 'Test score', 'Fee paid']
  ).map((label) => ({ id: nanoid(), label, done: false }));
export function newItem(kind: Kind, currency = 'BDT'): Item {
  const common = {
    id: nanoid(),
    title: '',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return kind === 'subscription'
    ? {
        ...common,
        kind,
        vendor: '',
        cost: { amount: 0, currency },
        cycle: 'monthly',
        nextRenewal: shiftDay(today(), 7),
        status: 'active',
        category: 'Software',
        remindDaysBefore: 3,
      }
    : {
        ...common,
        kind,
        organization: '',
        roleOrProgram: '',
        status: 'saved',
        priority: 'medium',
        checklist: checklistTemplate(kind),
        documents: [],
        statusHistory: [{ status: 'saved', at: common.createdAt }],
      };
}
