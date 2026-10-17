import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, Plus, Settings2 } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { Brand, Button, Chip, IconButton, Providers } from '../../ui/primitives';
import { actionable, dueDate } from '../../shared/selectors';
import { today } from '../../shared/dates';
import { initializeStore, useStore, commit } from '../../shared/store';
import { capturePage, openDashboard, type Capture } from '../../shared/capture';
import { useTheme } from '../../ui/theme';
import { QuickAdd } from '../quick-add/QuickAdd';
import { Welcome, SampleBanner } from '../welcome/Welcome';
import { Today } from './Today';
import { CommandPalette } from '../command-palette/CommandPalette';
export function Popup() {
  const { data, ready, error } = useStore();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [palette, setPalette] = useState(false);
  const overdue = data.items.filter(
    (i) => actionable(i) && dueDate(i) && dueDate(i)! < today(),
  ).length;
  useTheme(data.settings);
  useEffect(() => {
    void initializeStore();
  }, []);
  const add = () => {
    void capturePage().then(setCapture);
  };
  return (
    <MotionConfig reducedMotion="user">
      <Providers>
        <div className="popup">
          <header className="popup-header">
            <Brand compact />
            <div className="inline">
              <IconButton label="Open dashboard" onClick={() => openDashboard()}>
                <ArrowUpRight size={17} />
              </IconButton>
              <IconButton label="Settings" onClick={() => openDashboard(undefined, 'settings')}>
                <Settings2 size={16} />
              </IconButton>
            </div>
          </header>
          <main className="popup-main">
            <div className="popup-greeting between">
              <div>
                <p className="eyebrow">{format(new Date(), 'EEEE, MMMM d')}</p>
                <h1>
                  Your day, in focus<span>.</span>
                </h1>
              </div>
              <div className="inline">
                {overdue > 0 && <Chip tone="danger">{overdue} overdue</Chip>}
                <IconButton label="Add item" onClick={add}>
                  <Plus size={19} />
                </IconButton>
              </div>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {ready ? (
              <>
                <SampleBanner />
                <Welcome onAdd={add} />
                {(data.settings.onboarded || data.items.length > 0) && (
                  <Today onAdd={add} onOpen={(i) => openDashboard(i.id)} />
                )}
              </>
            ) : (
              <div className="loading" aria-label="Loading your items">
                <span />
                <span />
                <span />
              </div>
            )}
          </main>
          <footer className="popup-footer">
            <span className="inline">
              <span className="local-dot" /> All yours. All local.
            </span>
            <Button variant="ghost" onClick={() => openDashboard()}>
              Open dashboard <ArrowUpRight size={12} />
            </Button>
          </footer>
          {capture && (
            <QuickAdd
              prefill={capture}
              currency={data.settings.defaultCurrency}
              onClose={() => setCapture(null)}
              onSave={(i) =>
                commit((s) => ({
                  ...s,
                  items: [...s.items, i],
                  settings: { ...s.settings, onboarded: true },
                }))
              }
            />
          )}
          <CommandPalette
            open={palette}
            onOpenChange={setPalette}
            onAdd={add}
            onOpen={(i) => openDashboard(i.id)}
            onView={(v) => openDashboard(undefined, v)}
          />
        </div>
      </Providers>
    </MotionConfig>
  );
}
