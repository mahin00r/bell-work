import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { Library } from '../src/features/library/Library';
import { Settings } from '../src/features/settings/Settings';
import { ItemDrawer } from '../src/features/item-drawer/ItemDrawer';
import { QuickAdd } from '../src/features/quick-add/QuickAdd';
import { Providers } from '../src/ui/primitives';
import { repository } from '../src/shared/storage';
import { useStore } from '../src/shared/store';
import { emptyState } from '../src/shared/migrations';
import { newItem } from '../src/shared/templates';
import { itemEvents } from '../src/shared/events';
import type { Item } from '../src/shared/types';

async function seed(items: Item[] = []) {
  const data = await repository.set(() => ({ ...emptyState(), items }), true);
  useStore.setState({ data, ready: true, error: null, loadFailed: false });
}
beforeEach(async () => {
  await seed();
});
it('restores a backup through recovery mode and checkpoints the previous stored records', async () => {
  const original = { ...newItem('job'), title: 'Original records' };
  await seed([original]);
  useStore.setState({ data: emptyState(), loadFailed: true, error: 'Unreadable records' });
  const incoming = {
    ...emptyState(),
    items: [{ ...newItem('study'), title: 'Recovered scholarship' }],
  };
  const file = Object.assign(
    new File([JSON.stringify(incoming)], 'recovery.json', { type: 'application/json' }),
    { text: async () => JSON.stringify(incoming) },
  );
  const user = userEvent.setup();
  render(
    <Providers>
      <Settings />
    </Providers>,
  );
  expect(screen.getByRole('button', { name: 'Save preferences' })).toBeDisabled();
  await user.upload(screen.getByLabelText('Import JSON backup'), file);
  await user.click(await screen.findByRole('button', { name: 'Replace workspace from backup' }));
  await waitFor(() => expect(useStore.getState().loadFailed).toBe(false));
  expect((await repository.get()).items[0].title).toBe('Recovered scholarship');
  const copy = (await repository.recovery())[0];
  expect(copy.reason).toBe('Before recovery import');
  expect(copy.data).toMatchObject({ items: [{ title: 'Original records' }] });
});
it('preserves unrelated edits when the drawer receives a newer item from another window', async () => {
  const item = { ...newItem('job'), title: 'Original', notes: 'Old note' };
  await seed([item]);
  const user = userEvent.setup();
  const close = vi.fn();
  const view = render(
    <Providers>
      <ItemDrawer item={item} onClose={close} />
    </Providers>,
  );
  await user.clear(screen.getByLabelText('Title'));
  await user.type(screen.getByLabelText('Title'), 'My title');
  const data = await repository.set(
    (state) => ({
      ...state,
      items: state.items.map((entry) => ({ ...entry, notes: 'Other window note' })),
    }),
    true,
  );
  view.rerender(
    <Providers>
      <ItemDrawer item={data.items[0]} onClose={close} />
    </Providers>,
  );
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect((await repository.get()).items[0]).toMatchObject({
    title: 'My title',
    notes: 'Other window note',
  });
});
it('asks the user to review a conflicting concurrent edit instead of overwriting it', async () => {
  const item = { ...newItem('job'), title: 'Original' };
  await seed([item]);
  const user = userEvent.setup();
  const close = vi.fn();
  render(
    <Providers>
      <ItemDrawer item={item} onClose={close} />
    </Providers>,
  );
  await user.clear(screen.getByLabelText('Title'));
  await user.type(screen.getByLabelText('Title'), 'My title');
  await repository.set(
    (state) => ({
      ...state,
      items: state.items.map((entry) => ({ ...entry, title: 'Other window title' })),
    }),
    true,
  );
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(
    await screen.findByText(
      'This item changed in another window. Reopen it to review the latest details before saving.',
    ),
  ).toBeInTheDocument();
  expect(close).not.toHaveBeenCalled();
  expect((await repository.get()).items[0].title).toBe('Other window title');
});

it('creates an application event through the editor and persists completion', async () => {
  const item = { ...newItem('study'), title: 'Scholarship' };
  await seed([item]);
  const user = userEvent.setup();
  const close = vi.fn();
  const view = render(
    <Providers>
      <ItemDrawer item={item} onClose={close} />
    </Providers>,
  );
  await user.click(screen.getByRole('button', { name: 'Add event' }));
  await user.clear(screen.getByLabelText('Event title'));
  await user.type(screen.getByLabelText('Event title'), 'Submit transcript');
  await user.selectOptions(screen.getByLabelText('Event type'), 'document');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  const saved = (await repository.get()).items[0];
  expect(itemEvents(saved)[0]).toMatchObject({ title: 'Submit transcript', kind: 'document' });
  view.unmount();
  render(
    <Providers>
      <ItemDrawer item={saved} onClose={vi.fn()} />
    </Providers>,
  );
  await user.click(screen.getByLabelText('Complete event 1'));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(async () => expect(itemEvents((await repository.get()).items[0])).toEqual([]));
});

it('saves a combined view and archives selected items with undo', async () => {
  const one = { ...newItem('job'), title: 'Design fellow', tags: ['Career'] };
  const two = { ...newItem('study'), title: 'Graduate fellowship' };
  await seed([one, two]);
  const user = userEvent.setup();
  render(
    <Providers>
      <Library onOpen={vi.fn()} />
    </Providers>,
  );
  await user.selectOptions(screen.getByLabelText('Type'), 'job');
  await user.type(screen.getByLabelText('New view name'), 'Career opportunities');
  await user.click(screen.getByRole('button', { name: 'Save view' }));
  await waitFor(async () =>
    expect((await repository.get()).savedViews?.[0].filters.kind).toBe('job'),
  );
  expect(screen.queryByText('Graduate fellowship')).not.toBeInTheDocument();
  await user.click(screen.getByLabelText('Select all matching items'));
  await user.click(screen.getByRole('button', { name: 'Archive selected' }));
  await waitFor(() => expect(screen.queryByText('Design fellow')).not.toBeInTheDocument());
  expect(
    (await repository.get()).items.find((item) => item.id === one.id)?.archivedAt,
  ).toBeDefined();
  await user.click(screen.getByRole('button', { name: 'Undo last bulk change' }));
  expect(await screen.findByText('Design fellow')).toBeInTheDocument();
  expect(
    (await repository.get()).items.find((item) => item.id === one.id)?.archivedAt,
  ).toBeUndefined();
});

it('requires reviewing a suggested deadline and a matching existing item', async () => {
  const existing = {
    ...newItem('job'),
    title: 'Design fellow',
    organization: 'Northwind',
    url: 'https://example.org/job?id=1',
  };
  await seed([existing]);
  const save = vi.fn().mockResolvedValue(true);
  const user = userEvent.setup();
  render(
    <Providers>
      <QuickAdd
        currency="BDT"
        prefill={{
          title: existing.title,
          organization: 'Northwind',
          url: existing.url,
          deadline: '2026-11-10',
          deadlineSource: 'JobPosting.validThrough',
        }}
        onSave={save}
        onClose={vi.fn()}
      />
    </Providers>,
  );
  await user.click(screen.getByRole('button', { name: 'Save item' }));
  expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByLabelText('I checked the suggested deadline'));
  await user.click(screen.getByLabelText('Save as a separate item'));
  await user.click(screen.getByRole('button', { name: 'Save item' }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ deadline: '2026-11-10' }));
});

it('changes the interface language and preserves stored enum values', async () => {
  const user = userEvent.setup();
  render(
    <Providers>
      <Settings />
    </Providers>,
  );
  await user.selectOptions(screen.getByLabelText('Language'), 'bn');
  await user.click(screen.getByRole('button', { name: 'Save preferences' }));
  expect(await screen.findByText('নিজের মতো সাজান')).toBeInTheDocument();
  expect((await repository.get()).settings.language).toBe('bn');
  expect(screen.getByRole('button', { name: 'পছন্দ সংরক্ষণ' })).toBeInTheDocument();
});

it('moves an item to recoverable trash rather than removing its details', async () => {
  const item = { ...newItem('job'), title: 'Keep my documents' };
  await seed([item]);
  const user = userEvent.setup();
  render(
    <Providers>
      <ItemDrawer item={item} onClose={vi.fn()} />
    </Providers>,
  );
  await user.click(screen.getByLabelText('Move item to trash'));
  const confirmation = screen.getByRole('dialog', { name: 'Move this item to trash?' });
  await user.click(within(confirmation).getByRole('button', { name: 'Move to trash' }));
  await waitFor(async () => expect((await repository.get()).items[0].deletedAt).toBeDefined());
  expect((await repository.get()).items[0].title).toBe(item.title);
});

it('records a price change and a manual payment through the subscription editor', async () => {
  const base = newItem('subscription');
  if (base.kind !== 'subscription') throw new Error('Wrong fixture');
  const item = { ...base, title: 'Notes', cost: { amount: 100, currency: 'BDT' } };
  await seed([item]);
  const user = userEvent.setup();
  const close = vi.fn();
  render(
    <Providers>
      <ItemDrawer item={item} onClose={close} />
    </Providers>,
  );
  await user.click(screen.getByRole('button', { name: 'Add payment record' }));
  await user.clear(screen.getByLabelText('Amount per cycle'));
  await user.type(screen.getByLabelText('Amount per cycle'), '150');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  const saved = (await repository.get()).items[0];
  if (saved.kind !== 'subscription') throw new Error('Wrong saved kind');
  expect(saved.priceHistory?.map((entry) => entry.cost.amount)).toEqual([100, 150]);
  expect(saved.payments?.[0].cost.amount).toBe(100);
});
