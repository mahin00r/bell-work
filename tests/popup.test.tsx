import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { QuickAdd } from '../src/features/quick-add/QuickAdd';
import { Today } from '../src/features/today/Today';
import { Providers } from '../src/ui/primitives';
import { newItem } from '../src/shared/templates';
import { emptyState } from '../src/shared/migrations';
import { repository } from '../src/shared/storage';
import { useStore } from '../src/shared/store';
import { shiftDay, today } from '../src/shared/dates';

beforeEach(async () => {
  const data = await repository.set(() => emptyState(), true);
  useStore.setState({ data, ready: true, error: null });
});
it('quick-add prefills a page, validates, and saves a typed item', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();
  render(
    <Providers>
      <QuickAdd
        prefill={{
          title: 'Design fellow',
          organization: 'Harbor Institute',
          url: 'https://example.org/fellow',
        }}
        currency="BDT"
        onSave={onSave}
        onClose={onClose}
      />
    </Providers>,
  );
  expect(screen.getByLabelText('Job title')).toHaveValue('Design fellow');
  await user.clear(screen.getByLabelText('Job title'));
  await user.click(screen.getByRole('button', { name: /Save item/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('Give your item a title');
  expect(onSave).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Job title'), 'Design fellow');
  await user.click(screen.getByRole('button', { name: '+1 week' }));
  await user.click(screen.getByRole('button', { name: /Save item/ }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'job',
      title: 'Design fellow',
      organization: 'Harbor Institute',
      deadline: shiftDay(today(), 7),
    }),
  );
  expect(onClose).toHaveBeenCalled();
});
it('subscription capture requires a renewal date and cost', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(true);
  render(
    <Providers>
      <QuickAdd
        prefill={{ title: 'CloudNotes', organization: '' }}
        currency="BDT"
        onSave={onSave}
        onClose={vi.fn()}
      />
    </Providers>,
  );
  await user.click(screen.getByRole('tab', { name: 'Subscription' }));
  await user.click(screen.getByRole('button', { name: /Save item/ }));
  expect(onSave).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Monthly cost · BDT'), '450');
  await user.click(screen.getByRole('button', { name: '+3 days' }));
  await user.click(screen.getByRole('button', { name: /Save item/ }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'subscription', cost: { amount: 450, currency: 'BDT' } }),
  );
});
it('Today groups items, filters by kind, and marks an application applied', async () => {
  const user = userEvent.setup();
  const base = newItem('job');
  const job = { ...base, title: 'Product designer', deadline: shiftDay(today(), -2) };
  const study = {
    ...newItem('study'),
    title: 'Research fellowship',
    deadline: shiftDay(today(), 4),
  };
  const data = await repository.set((s) => ({ ...s, items: [job, study] }), true);
  useStore.setState({ data });
  render(
    <Providers>
      <Today onAdd={vi.fn()} onOpen={vi.fn()} />
    </Providers>,
  );
  expect(screen.getByText('Overdue')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: 'Jobs' }));
  expect(screen.queryByText('Research fellowship')).not.toBeInTheDocument();
  await user.hover(
    screen.getByRole('button', { name: /Product designer.*Northwind|Product designer.*saved/ }),
  );
  await user.click(screen.getByRole('button', { name: 'Mark Product designer applied' }));
  await waitFor(() =>
    expect(useStore.getState().data.items.find((i) => i.id === job.id)?.status).toBe('applied'),
  );
  expect(useStore.getState().data.items.find((i) => i.id === job.id)).toHaveProperty(
    'followUpAt',
    shiftDay(today(), 10),
  );
});
