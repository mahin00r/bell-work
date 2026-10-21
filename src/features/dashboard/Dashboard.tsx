import { formatDate as format } from '../../ui/i18n';
import { t } from '../../ui/i18n';
import { Review } from '../review/Review';
import { Library } from '../library/Library';
import { updateItem } from '../../shared/store';
import { exportRawData } from '../../shared/export';
import { ClipboardCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  LayoutGrid,
  LockKeyhole,
  Plus,
  Repeat2,
  Search,
  Settings2,
  Sun,
} from 'lucide-react';

import { Brand, Button, EmptyState, Help, Kbd, Providers } from '../../ui/primitives';
import { initializeStore, useStore, commit } from '../../shared/store';
import { useTheme } from '../../ui/theme';
import { capturePage, type Capture } from '../../shared/capture';
import { daySchema, urlSchema } from '../../shared/schema';
import { badge, isApplication } from '../../shared/selectors';
import type { Item } from '../../shared/types';
import { QuickAdd } from '../quick-add/QuickAdd';
import { Welcome, SampleBanner } from '../welcome/Welcome';
import { Today } from '../today/Today';
import { Board } from '../board/Board';
import { Subscriptions } from '../subscriptions/Subscriptions';
import { ItemDrawer } from '../item-drawer/ItemDrawer';
import { Timeline } from '../timeline/Timeline';
import { Insights } from '../insights/Insights';
import { Settings } from '../settings/Settings';
import { CommandPalette, type View } from '../command-palette/CommandPalette';
const views = [
  {
    id: 'today' as const,
    label: 'Today',
    icon: CalendarDays,
    subtitle: 'A clear head starts with a clear plan.',
  },
  {
    id: 'board' as const,
    label: 'Applications',
    icon: LayoutGrid,
    subtitle: 'Small steps. Bigger possibilities.',
  },
  {
    id: 'subscriptions' as const,
    label: 'Subscriptions',
    icon: Repeat2,
    subtitle: 'Know what’s coming. Keep what matters.',
  },
  {
    id: 'timeline' as const,
    label: 'Timeline',
    icon: CalendarRange,
    subtitle: 'A little perspective on the next 60 days.',
  },
  {
    id: 'insights' as const,
    label: 'Insights',
    icon: ChartNoAxesCombined,
    subtitle: 'See how the small steps add up.',
  },
  {
    id: 'settings' as const,
    label: 'Settings',
    icon: Settings2,
    subtitle: 'A workspace that works on your terms.',
  },
  {
    id: 'archive' as const,
    label: 'Archive',
    icon: Archive,
    subtitle: 'Out of the way, always within reach.',
  },
  {
    id: 'library' as const,
    label: 'All items',
    icon: LayoutGrid,
    subtitle: 'Find, filter, and organize your plans.',
  },
  {
    id: 'review' as const,
    label: 'Weekly review',
    icon: ClipboardCheck,
    subtitle: 'Review your next steps, one decision at a time.',
  },
  {
    id: 'trash' as const,
    label: 'Trash',
    icon: Trash2,
    subtitle: 'Restore an item whenever you need it.',
  },
];
function initialCapture(): Capture | null {
  const q = new URLSearchParams(location.search);
  return q.has('capture')
    ? {
        title: (q.get('title') ?? '').slice(0, 500),
        organization: (q.get('organization') ?? '').slice(0, 500),
        url: urlSchema.safeParse(q.get('url')).success ? q.get('url')! : undefined,
        deadline: daySchema.safeParse(q.get('deadline')).success ? q.get('deadline')! : undefined,
        deadlineSource: q.get('deadlineSource')?.slice(0, 500),
        selectedText: q.get('selectedText')?.slice(0, 6000),
        country: q.get('country')?.slice(0, 200),
      }
    : null;
}
export function Dashboard() {
  const { data, ready, error, loadFailed } = useStore();
  const [view, setView] = useState<View>(() => {
    const requested = new URLSearchParams(location.hash.slice(1)).get('view');
    return views.find((v) => v.id === requested)?.id ?? 'board';
  });
  const [palette, setPalette] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(initialCapture);
  const [selected, setSelected] = useState<string | null>(
    new URLSearchParams(location.hash.slice(1)).get('item'),
  );
  useTheme(data.settings);
  useEffect(() => {
    void initializeStore();
  }, []);
  const add = () => {
    if (loadFailed) return;
    void capturePage().then(setCapture);
  };
  const navigate = (next: View) => {
    setView(next);
    setSelected(null);
    history.replaceState(null, '', `${location.pathname}#view=${next}`);
    window.scrollTo(0, 0);
  };
  const onOpen = (i: Item) => {
    setSelected(i.id);
    history.replaceState(null, '', `${location.pathname}#item=${encodeURIComponent(i.id)}`);
  };
  const closeDrawer = () => {
    setSelected(null);
    history.replaceState(null, '', location.pathname);
  };
  const active = views.find((v) => v.id === view)!;
  const selectedItem = data.items.find((i) => i.id === selected);
  const counts = badge(data.items);
  return (
    <MotionConfig reducedMotion="user">
      <Providers>
        <div className="dashboard">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <Brand />
            </div>
            <div className="workspace-label">
              {t('PERSONAL WORKSPACE')}
              <span>{t('v2 beta')}</span>
            </div>
            <nav aria-label={t('Main navigation')}>
              {views.map((v) => (
                <button
                  key={v.id}
                  aria-label={t(v.label)}
                  className={view === v.id ? 'active' : ''}
                  aria-current={view === v.id ? 'page' : undefined}
                  onClick={() => {
                    navigate(v.id);
                  }}
                >
                  <v.icon size={17} strokeWidth={1.7} />
                  <span>{t(v.label)}</span>
                  {v.id === 'today' && counts.count > 0 && <b>{counts.count}</b>}
                  {v.id === 'board' && (
                    <small>
                      {
                        data.items
                          .filter(isApplication)
                          .filter((i) => !i.archivedAt && !i.deletedAt).length
                      }
                    </small>
                  )}
                </button>
              ))}
            </nav>
            <div className="sidebar-note">
              <span className="note-line" />
              <p>
                {t('Make room for')}
                <br />
                <em>{t('what comes next.')}</em>
              </p>
              <small>{t('A little intention goes a long way.')}</small>
            </div>
            <div className="sidebar-bottom">
              <Help
                trigger={
                  <Button variant="ghost">
                    <CircleHelp size={16} />
                    {t('A little help')}
                    <ChevronRight size={12} />
                  </Button>
                }
              >
                <h3>{t('Your daily rhythm')}</h3>
                <p className="muted text-xs">
                  {t(
                    'Capture a page with Alt+Shift+B. Check Today each morning. Move applications forward on the board, and export a backup regularly.',
                  )}
                </p>
              </Help>
              <button
                className="workspace-user"
                onClick={() => {
                  void commit((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      theme: s.settings.theme === 'dark' ? 'light' : 'dark',
                    },
                  }));
                }}
              >
                <span className="workspace-avatar">
                  <Sun size={16} />
                </span>
                <span>
                  <b>{t('Personal space')}</b>
                  <small>{t('Stored on this device')}</small>
                </span>
                <LockKeyhole size={12} />
              </button>
            </div>
          </aside>
          <div className="dashboard-main">
            <header className="topbar">
              <span>
                {t('Workspace')}
                <ChevronRight size={12} /> <b>{t(active.label)}</b>
              </span>
              <div className="inline">
                <span className="topbar-date">{format(new Date(), 'EEE, MMM d, yyyy')}</span>
                <span className="topbar-divider" />
                <Button
                  variant="ghost"
                  aria-label={t('Find your focus')}
                  onClick={() => setPalette(true)}
                >
                  <Search size={15} />
                  <span>{t('Find your focus')}</span>
                  <Kbd>{navigator.platform.includes('Mac') ? t('\u2318 K') : t('Ctrl K')}</Kbd>
                </Button>
              </div>
            </header>
            <main className="dashboard-content">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {view === 'today' ? format(new Date(), 'EEEE, MMMM d') : t('YOUR NEXT CHAPTER')}
                  </div>
                  <h1>
                    {t(active.label)}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>{t(active.subtitle)}</p>
                </div>
                <Button variant="primary" onClick={add}>
                  <Plus size={15} />
                  {t('Add item')}
                </Button>
              </div>
              {error && (
                <p className="error" role="alert">
                  {t(error)}
                  <Button
                    onClick={() => {
                      void exportRawData();
                    }}
                  >
                    {t('Export raw stored data')}
                  </Button>
                </p>
              )}
              <SampleBanner />
              {ready && loadFailed ? (
                <Settings />
              ) : ready ? (
                <>
                  <Welcome onAdd={add} />
                  {view === 'today' && (
                    <div className="dashboard-today">
                      <Today onAdd={add} onOpen={onOpen} />
                      <section className="today-aside">
                        <span className="eyebrow">{t('A GENTLE REMINDER')}</span>
                        <h2>
                          {t('Progress has')}
                          <br />
                          {t('a daily rhythm.')}
                        </h2>
                        <p>
                          {t(
                            'You don\u2019t have to do everything today. Start with the next small thing.',
                          )}
                        </p>
                        <div className="local-message">
                          <LockKeyhole size={14} />
                          {t('Your plans stay on your device.')}
                        </div>
                      </section>
                    </div>
                  )}
                  {view === 'board' && <Board onAdd={add} onOpen={onOpen} />}
                  {view === 'subscriptions' && <Subscriptions onAdd={add} onOpen={onOpen} />}
                  {view === 'timeline' && <Timeline onOpen={onOpen} />}
                  {view === 'insights' && <Insights />}
                  {view === 'settings' && <Settings />}
                  {view === 'review' && <Review onOpen={onOpen} />}
                  {view === 'library' && <Library onOpen={onOpen} />}
                  {view === 'trash' && (
                    <div className="archive-list">
                      {data.items
                        .filter((item) => item.deletedAt)
                        .map((item) => (
                          <div className="archive-item" key={item.id}>
                            <span>
                              <b>{item.title}</b>
                              <small>
                                {t('Moved to trash')}
                                {new Date(item.deletedAt!).toLocaleDateString()}
                              </small>
                            </span>
                            <Button
                              onClick={() => {
                                void updateItem(item.id, (current) => ({
                                  ...current,
                                  deletedAt: undefined,
                                  updatedAt: new Date().toISOString(),
                                }));
                              }}
                            >
                              {t('Restore item')}
                            </Button>
                          </div>
                        ))}
                      {!data.items.some((item) => item.deletedAt) && (
                        <EmptyState
                          title={t('Trash is empty')}
                          description={t(
                            'Deleted items can be restored here. They stay until you reset all data.',
                          )}
                        />
                      )}
                    </div>
                  )}
                  {view === 'archive' && (
                    <div className="archive-list">
                      {data.items
                        .filter((i) => i.archivedAt && !i.deletedAt)
                        .map((i) => (
                          <button className="archive-item" key={i.id} onClick={() => onOpen(i)}>
                            <span>
                              <b>{i.title}</b>
                              <small>{i.kind}</small>
                            </span>
                            <ArrowUpRight size={15} />
                          </button>
                        ))}
                      {!data.items.some((i) => i.archivedAt && !i.deletedAt) && (
                        <EmptyState
                          title={t('Nothing tucked away')}
                          description={t('Archived items will be here whenever you need them.')}
                        />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="loading">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <footer className="dashboard-footer">
                <span className="inline">
                  <span className="local-dot" />
                  {t('Local by design. Private by default.')}
                </span>
                <span>{t('Bell Work \u00B7 Never miss a deadline')}</span>
              </footer>
            </main>
          </div>
          {capture && ready && !loadFailed && (
            <QuickAdd
              prefill={capture}
              currency={data.settings.defaultCurrency}
              onClose={() => {
                setCapture(null);
                history.replaceState(null, '', location.pathname);
              }}
              onSave={(i) =>
                commit((s) => ({
                  ...s,
                  items: [...s.items, i],
                  settings: { ...s.settings, onboarded: true },
                }))
              }
            />
          )}
          {selectedItem && !loadFailed && (
            <ItemDrawer key={selectedItem.id} item={selectedItem} onClose={closeDrawer} />
          )}
          <CommandPalette
            open={palette}
            onOpenChange={setPalette}
            onAdd={add}
            onOpen={onOpen}
            onView={navigate}
          />
        </div>
      </Providers>
    </MotionConfig>
  );
}
