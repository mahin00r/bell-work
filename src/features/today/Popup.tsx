import { formatDate as format } from '../../ui/i18n';
import { t } from '../../ui/i18n';
import { useEffect, useState } from 'react';

import { ArrowUpRight, Plus, Settings2 } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { Brand, Button, Chip, IconButton, Providers } from '../../ui/primitives';
import { actionable, dueDate } from '../../shared/selectors';
import { today } from '../../shared/dates';
import { initializeStore, useStore, commit } from '../../shared/store';
import { exportRawData } from '../../shared/export';
import { capturePage, openDashboard, type Capture } from '../../shared/capture';
import { useTheme } from '../../ui/theme';
import { QuickAdd } from '../quick-add/QuickAdd';
import { Welcome, SampleBanner } from '../welcome/Welcome';
import { Today } from './Today';
import { CommandPalette } from '../command-palette/CommandPalette';
export function Popup() {
  const { data, ready, error, loadFailed } = useStore();
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
    if (loadFailed) return;
    void capturePage().then(setCapture);
  };
  return (
    <MotionConfig reducedMotion="user">
      <Providers>
        <div className="popup">
          <header className="popup-header">
            <Brand compact />
            <div className="inline">
              <IconButton label={t('Open dashboard')} onClick={() => openDashboard()}>
                <ArrowUpRight size={17} />
              </IconButton>
              <IconButton
                label={t('Settings')}
                onClick={() => openDashboard(undefined, 'settings')}
              >
                <Settings2 size={16} />
              </IconButton>
            </div>
          </header>
          <main className="popup-main">
            <div className="popup-greeting between">
              <div>
                <p className="eyebrow">{format(new Date(), 'EEEE, MMMM d')}</p>
                <h1>
                  {t('Your day, in focus')}
                  <span>.</span>
                </h1>
              </div>
              <div className="inline">
                {overdue > 0 && (
                  <Chip tone="danger">
                    {overdue}
                    {t('overdue')}
                  </Chip>
                )}
                <IconButton label={t('Add item')} onClick={add}>
                  <Plus size={19} />
                </IconButton>
              </div>
            </div>
            {error && (
              <p role="alert" className="error">
                {t(error)}
              </p>
            )}
            {ready && loadFailed ? (
              <div className="form-stack">
                <Button
                  onClick={() => {
                    void exportRawData();
                  }}
                >
                  {t('Export raw stored data')}
                </Button>
                <Button onClick={() => openDashboard(undefined, 'settings')}>
                  {t('Open recovery settings')}
                </Button>
              </div>
            ) : ready ? (
              <>
                <SampleBanner />
                <Welcome onAdd={add} />
                {(data.settings.onboarded || data.items.length > 0) && (
                  <Today onAdd={add} onOpen={(i) => openDashboard(i.id)} />
                )}
              </>
            ) : (
              <div className="loading" aria-label={t('Loading your items')}>
                <span />
                <span />
                <span />
              </div>
            )}
          </main>
          <footer className="popup-footer">
            <span className="inline">
              <span className="local-dot" />
              {t('All yours. All local.')}
            </span>
            <Button variant="ghost" onClick={() => openDashboard()}>
              {t('Open dashboard')}
              <ArrowUpRight size={12} />
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
