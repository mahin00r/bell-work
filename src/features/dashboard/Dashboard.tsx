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
import { format } from 'date-fns';
import { Brand, Button, EmptyState, Help, Kbd, Providers } from '../../ui/primitives';
import { initializeStore, useStore, commit } from '../../shared/store';
import { useTheme } from '../../ui/theme';
import { capturePage, type Capture } from '../../shared/capture';
import { urlSchema } from '../../shared/schema';
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
];
function initialCapture(): Capture | null {
  const q = new URLSearchParams(location.search);
  return q.has('capture')
    ? {
        title: (q.get('title') ?? '').slice(0, 500),
        organization: (q.get('organization') ?? '').slice(0, 500),
        url: urlSchema.safeParse(q.get('url')).success ? q.get('url')! : undefined,
      }
    : null;
}
export function Dashboard() {
  const { data, ready, error } = useStore();
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
    void capturePage().then(setCapture);
  };
  const navigate = (next: View) => {
    setView(next);
    setSelected(null);
    history.replaceState(null, '', `${location.pathname}#view=${next}`);
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
              PERSONAL WORKSPACE <span>v1.0</span>
            </div>
            <nav aria-label="Main navigation">
              {views.map((v) => (
                <button
                  key={v.id}
                  className={view === v.id ? 'active' : ''}
                  aria-current={view === v.id ? 'page' : undefined}
                  onClick={() => {
                    navigate(v.id);
                  }}
                >
                  <v.icon size={17} strokeWidth={1.7} />
                  <span>{v.label}</span>
                  {v.id === 'today' && counts.count > 0 && <b>{counts.count}</b>}
                  {v.id === 'board' && (
                    <small>
                      {data.items.filter(isApplication).filter((i) => !i.archivedAt).length}
                    </small>
                  )}
                </button>
              ))}
            </nav>
            <div className="sidebar-note">
              <span className="note-line" />
              <p>
                Make room for
                <br />
                <em>what comes next.</em>
              </p>
              <small>A little intention goes a long way.</small>
            </div>
            <div className="sidebar-bottom">
              <Help
                trigger={
                  <Button variant="ghost">
                    <CircleHelp size={16} /> A little help <ChevronRight size={12} />
                  </Button>
                }
              >
                <h3>Your daily rhythm</h3>
                <p className="muted text-xs">
                  Capture a page with Alt+Shift+B. Check Today each morning. Move applications
                  forward on the board, and export a backup regularly.
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
                  <b>Personal space</b>
                  <small>Stored on this device</small>
                </span>
                <LockKeyhole size={12} />
              </button>
            </div>
          </aside>
          <div className="dashboard-main">
            <header className="topbar">
              <span>
                Workspace <ChevronRight size={12} /> <b>{active.label}</b>
              </span>
              <div className="inline">
                <span className="topbar-date">{format(new Date(), 'EEE, MMM d, yyyy')}</span>
                <span className="topbar-divider" />
                <Button variant="ghost" onClick={() => setPalette(true)}>
                  <Search size={15} />
                  <span>Find your focus</span>
                  <Kbd>{navigator.platform.includes('Mac') ? '⌘ K' : 'Ctrl K'}</Kbd>
                </Button>
              </div>
            </header>
            <main className="dashboard-content">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {view === 'today' ? format(new Date(), 'EEEE, MMMM d') : 'YOUR NEXT CHAPTER'}
                  </div>
                  <h1>
                    {active.label}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>{active.subtitle}</p>
                </div>
                <Button variant="primary" onClick={add}>
                  <Plus size={15} /> Add item
                </Button>
              </div>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <SampleBanner />
              {ready ? (
                <>
                  <Welcome onAdd={add} />
                  {view === 'today' && (
                    <div className="dashboard-today">
                      <Today onAdd={add} onOpen={onOpen} />
                      <section className="today-aside">
                        <span className="eyebrow">A GENTLE REMINDER</span>
                        <h2>
                          Progress has
                          <br />a daily rhythm.
                        </h2>
                        <p>
                          You don’t have to do everything today. Start with the next small thing.
                        </p>
                        <div className="local-message">
                          <LockKeyhole size={14} /> Your plans stay on your device.
                        </div>
                      </section>
                    </div>
                  )}
                  {view === 'board' && <Board onAdd={add} onOpen={onOpen} />}
                  {view === 'subscriptions' && <Subscriptions onAdd={add} onOpen={onOpen} />}
                  {view === 'timeline' && <Timeline onOpen={onOpen} />}
                  {view === 'insights' && <Insights />}
                  {view === 'settings' && <Settings />}
                  {view === 'archive' && (
                    <div className="archive-list">
                      {data.items
                        .filter((i) => i.archivedAt)
                        .map((i) => (
                          <button className="archive-item" key={i.id} onClick={() => onOpen(i)}>
                            <span>
                              <b>{i.title}</b>
                              <small>{i.kind}</small>
                            </span>
                            <ArrowUpRight size={15} />
                          </button>
                        ))}
                      {!data.items.some((i) => i.archivedAt) && (
                        <EmptyState
                          title="Nothing tucked away"
                          description="Archived items will be here whenever you need them."
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
                  <span className="local-dot" /> Local by design. Private by default.
                </span>
                <span>Bell Work · Never miss a deadline</span>
              </footer>
            </main>
          </div>
          {capture && ready && (
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
          {selectedItem && (
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
