import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Board } from '../src/features/board/Board';
import { ItemDrawer } from '../src/features/item-drawer/ItemDrawer';
import { Providers } from '../src/ui/primitives';
import { newItem } from '../src/shared/templates';
import { emptyState } from '../src/shared/migrations';
import { repository } from '../src/shared/storage';
import { useStore } from '../src/shared/store';
import { shiftDay, today } from '../src/shared/dates';
it('moves a board card with its keyboard status control and persists follow-up', async () => {
  const item = { ...newItem('job'), title: 'Design fellow' };
  const data = await repository.set(() => ({ ...emptyState(), items: [item] }), true);
  useStore.setState({ data });
  render(
    <Providers>
      <Board onOpen={vi.fn()} onAdd={vi.fn()} />
    </Providers>,
  );
  await userEvent
    .setup()
    .selectOptions(screen.getByLabelText('Move Design fellow to status'), 'applied');
  await waitFor(() => expect(useStore.getState().data.items[0].status).toBe('applied'));
  expect((await repository.get()).items[0]).toHaveProperty('followUpAt', shiftDay(today(), 10));
});
it('edits an application, records status history, and creates a follow-up', async () => {
  const item = { ...newItem('study'), title: 'Graduate fellowship' };
  const data = await repository.set(() => ({ ...emptyState(), items: [item] }), true);
  useStore.setState({ data });
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(
    <Providers>
      <ItemDrawer item={item} onClose={onClose} />
    </Providers>,
  );
  await user.selectOptions(screen.getByLabelText('Status'), 'applied');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  const saved = (await repository.get()).items[0];
  expect(saved.status).toBe('applied');
  expect(saved).toHaveProperty('followUpAt', shiftDay(today(), 10));
  if (saved.kind !== 'subscription') expect(saved.statusHistory.at(-1)?.status).toBe('applied');
});
