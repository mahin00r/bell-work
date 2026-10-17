import { useEffect, useState } from 'react';
import { ArrowUpRight, Download, LayoutGrid, Plus, Search, Sun } from 'lucide-react';
import { EmptyState, Kbd, Modal } from '../../ui/primitives';
import { useStore, commit } from '../../shared/store';
import { exportData } from '../../shared/export';
import type { Item } from '../../shared/types';
export type View =
  'today' | 'board' | 'subscriptions' | 'timeline' | 'insights' | 'settings' | 'archive';
export function CommandPalette({
  open,
  onOpenChange,
  onAdd,
  onOpen,
  onView,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: () => void;
  onOpen: (i: Item) => void;
  onView: (v: View) => void;
}) {
  const items = useStore((s) => s.data.items);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onOpenChange, open]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);
  const actions = [
    {
      id: 'add',
      title: 'Add a new item',
      detail: 'Capture your next possibility',
      icon: Plus,
      run: onAdd,
    },
    ...(
      ['today', 'board', 'subscriptions', 'timeline', 'insights', 'settings', 'archive'] as View[]
    ).map((view) => ({
      id: view,
      title: `Go to ${view === 'board' ? 'applications' : view}`,
      detail: 'Navigate',
      icon: LayoutGrid,
      run: () => onView(view),
    })),
    {
      id: 'theme',
      title: 'Toggle light / dark theme',
      detail: 'Change the mood',
      icon: Sun,
      run: () => {
        void commit((s) => ({
          ...s,
          settings: {
            ...s.settings,
            theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
          },
        }));
      },
    },
    {
      id: 'export',
      title: 'Export JSON backup',
      detail: 'Keep a copy of your plans',
      icon: Download,
      run: () => {
        void exportData();
      },
    },
    ...items
      .filter((i) => !i.archivedAt)
      .map((item) => ({
        id: item.id,
        title: item.title,
        detail: `Jump to ${item.kind}`,
        icon: ArrowUpRight,
        run: () => onOpen(item),
      })),
  ]
    .filter((a) => `${a.title} ${a.detail}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30);
  const select = (n: number) => {
    const a = actions[n];
    if (a) {
      onOpenChange(false);
      a.run();
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Find your next move"
      description="Search your items or run a command."
    >
      <div className="palette-search">
        <Search size={18} />
        <input
          autoFocus
          role="combobox"
          aria-label="Search commands and items"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="palette-options"
          aria-activedescendant={actions[index] ? `palette-${index}` : undefined}
          placeholder="Type a command or an item name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
              e.preventDefault();
              setIndex(
                (n) =>
                  (n + (e.key === 'ArrowDown' ? 1 : -1) + actions.length) %
                  Math.max(1, actions.length),
              );
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              select(index);
            }
          }}
        />
      </div>
      <div role="listbox" id="palette-options" aria-label="Commands" className="palette-list">
        {actions.map((a, n) => (
          <button
            key={a.id}
            id={`palette-${n}`}
            type="button"
            role="option"
            aria-selected={n === index}
            onMouseEnter={() => setIndex(n)}
            onClick={() => select(n)}
          >
            <a.icon size={16} />
            <span>
              <b>{a.title}</b>
              <small>{a.detail}</small>
            </span>
            {n === index && <Kbd>↵</Kbd>}
          </button>
        ))}
      </div>
      {!actions.length && (
        <EmptyState
          title="No matching moves"
          description="Try another word or a shorter item name."
        />
      )}
      <div className="palette-footer">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate
        </span>
        <span>
          <Kbd>esc</Kbd> to close
        </span>
      </div>
    </Modal>
  );
}
