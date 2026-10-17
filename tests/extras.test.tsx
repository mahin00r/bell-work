import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Settings } from '../src/features/settings/Settings';
import { CommandPalette } from '../src/features/command-palette/CommandPalette';
import { timelineEvents } from '../src/features/timeline/Timeline';
import { Providers } from '../src/ui/primitives';
import { newItem } from '../src/shared/templates';
import { emptyState } from '../src/shared/migrations';
import { parseBackup } from '../src/shared/backup';
import { repository } from '../src/shared/storage';
import { useStore } from '../src/shared/store';
it('validates an import and previews changes before applying', async () => {
  const data = await repository.set(() => emptyState(), true);
  useStore.setState({ data });
  const incoming = { ...emptyState(), items: [{ ...newItem('job'), title: 'Design fellow' }] };
  const file = Object.assign(
    new File([JSON.stringify(incoming)], 'backup.json', { type: 'application/json' }),
    { text: async () => JSON.stringify(incoming) },
  );
  const user = userEvent.setup();
  render(
    <Providers>
      <Settings />
    </Providers>,
  );
  await user.upload(screen.getByLabelText('Import JSON backup'), file);
  expect(await screen.findByText('1 new, 0 updated')).toBeInTheDocument();
  expect((await repository.get()).items).toHaveLength(0);
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Import backup' }),
  );
  await waitFor(() => expect(useStore.getState().data.items).toHaveLength(1));
});
it('runs a command with the keyboard', async () => {
  const onAdd = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <Providers>
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        onAdd={onAdd}
        onOpen={vi.fn()}
        onView={vi.fn()}
      />
    </Providers>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByRole('combobox'), 'Add a new');
  await user.keyboard('{Enter}');
  expect(onAdd).toHaveBeenCalled();
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
it('projects every renewal within the 60-day horizon', () => {
  const base = newItem('subscription');
  if (base.kind !== 'subscription') throw new Error('Wrong kind');
  const events = timelineEvents(
    [{ ...base, title: 'Notes', cycle: 'weekly', nextRenewal: '2026-10-17' }],
    new Date(2026, 9, 17),
  );
  expect(events).toHaveLength(9);
  expect(events.at(-1)?.date).toBe('2026-12-12');
  expect(() => parseBackup('null')).toThrow();
});
