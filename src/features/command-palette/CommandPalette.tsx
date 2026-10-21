import { t } from '../../ui/i18n';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Download, LayoutGrid, Plus, Search, Sun } from 'lucide-react';
import { EmptyState, Kbd, Modal } from '../../ui/primitives';
import { useStore, commit } from '../../shared/store';
import { exportData } from '../../shared/export';
import type { Item } from '../../shared/types';
export type View =
  | 'today'
  | 'board'
  | 'subscriptions'
  | 'timeline'
  | 'insights'
  | 'settings'
  | 'archive'
  | 'trash'
  | 'review'
  | 'library';
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
      [
        'today',
        'board',
        'subscriptions',
        'timeline',
        'insights',
        'settings',
        'archive',
        'review',
        'trash',
        'library',
      ] as View[]
    ).map((view) => ({
      id: view,
      title: t(
        'Go to {0}',
        t(
          view === 'board'
            ? 'Applications'
            : view === 'review'
              ? 'Weekly review'
              : view === 'library'
                ? 'All items'
                : view.charAt(0).toUpperCase() + view.slice(1),
        ),
      ),
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
      .filter((i) => !i.archivedAt && !i.deletedAt)
      .map((item) => ({
        id: `item:${item.id}`,
        title: item.title,
        detail: t('Jump to {0}', t(item.kind)),
        icon: ArrowUpRight,
        run: () => onOpen(item),
      })),
  ]
    .filter((a) =>
      `${a.title} ${a.detail} ${t(a.title)} ${t(a.detail)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
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
      title={t('Find your next move')}
      description={t('Search your items or run a command.')}
    >
      <div className="palette-search">
        <Search size={18} />
        <input
          autoFocus
          role="combobox"
          aria-label={t('Search commands and items')}
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="palette-options"
          aria-activedescendant={actions[index] ? `palette-${index}` : undefined}
          placeholder={t('Type a command or an item name\u2026')}
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
      <div role="listbox" id="palette-options" aria-label={t('Commands')} className="palette-list">
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
              <b>{a.id.startsWith('item:') ? a.title : t(a.title)}</b>
              <small>{t(a.detail)}</small>
            </span>
            {n === index && <Kbd>↵</Kbd>}
          </button>
        ))}
      </div>
      {!actions.length && (
        <EmptyState
          title={t('No matching moves')}
          description={t('Try another word or a shorter item name.')}
        />
      )}
      <div className="palette-footer">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd>
          {t('to navigate')}
        </span>
        <span>
          <Kbd>{t('esc')}</Kbd>
          {t('to close')}
        </span>
      </div>
    </Modal>
  );
}
