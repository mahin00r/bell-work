import { t } from '../../ui/i18n';
import { repository, type RecoveryCopy } from '../../shared/storage';
import { reload } from '../../shared/store';
import { useRef, useState } from 'react';
import { Download, LockKeyhole, Upload, Trash2 } from 'lucide-react';
import { Button, Modal, Segments, Tick } from '../../ui/primitives';
import { commit, useStore } from '../../shared/store';
import { emptyState } from '../../shared/migrations';
import {
  backupConflicts,
  importPreview,
  mergeBackup,
  parseBackup,
  type ConflictPolicy,
} from '../../shared/backup';
import { settingsSchema } from '../../shared/schema';
import { exportCalendar, exportData, exportRawData } from '../../shared/export';
import type { Settings as SettingsType, State } from '../../shared/types';
export function Settings() {
  const data = useStore((s) => s.data);
  const loadFailed = useStore((s) => s.loadFailed);
  const [draft, setDraft] = useState(data.settings);
  const [leads, setLeads] = useState(draft.reminderLeadDays.join(', '));
  const [incoming, setIncoming] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<ConflictPolicy>('newer');
  const [restoreSettings, setRestoreSettings] = useState(false);
  const [copies, setCopies] = useState<RecoveryCopy[]>([]);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<SettingsType>) => {
    setDraft((s) => ({ ...s, ...patch }));
    setSaved(false);
  };
  const counts = incoming ? importPreview(data, incoming) : null;
  async function applyImport() {
    if (!incoming) return;
    let ok = false;
    if (loadFailed) {
      try {
        await repository.replace(incoming, 'Before recovery import');
        await reload();
        ok = true;
      } catch {
        setError(t('The backup could not be restored. Your stored data has not been replaced.'));
      }
    } else
      ok = await commit(
        (state) => mergeBackup(state, incoming, policy, restoreSettings),
        'Before backup import',
      );
    if (ok) {
      const settings = useStore.getState().data.settings;
      setDraft(settings);
      setLeads(settings.reminderLeadDays.join(', '));
      setIncoming(null);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse({
      ...draft,
      reminderLeadDays: leads.split(',').map((n) => Number(n.trim())),
    });
    if (!parsed.success) {
      setError(
        t(
          'Check {0}: {1}',
          parsed.error.issues[0].path.join(' · '),
          parsed.error.issues[0].message,
        ),
      );
      return;
    }
    setSaving(true);
    const ok = await commit((s) => ({
      ...s,
      settings: { ...parsed.data, onboarded: s.settings.onboarded },
    }));
    setSaving(false);
    setSaved(ok);
    setError(ok ? '' : t('Could not save settings. Please try again.'));
  }
  async function readFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Too large');
      setIncoming(parseBackup(await file.text()));
      setError('');
    } catch {
      setError(
        t(
          'This file is not a valid Bell Work backup, or it needs a newer version. Choose a JSON backup smaller than 25 MB.',
        ),
      );
    }
    if (fileInput.current) fileInput.current.value = '';
  }
  return (
    <div className="settings-layout">
      <form
        onSubmit={(e) => {
          void save(e);
        }}
        noValidate
      >
        <section className="settings-card">
          <div className="settings-title">
            <h2>{t('Make it feel like yours')}</h2>
            <p>{t('A quiet workspace, tuned to your day.')}</p>
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('Appearance')}</h3>
              <p>{t('Follow your device, or set the mood.')}</p>
            </div>
            <Segments
              label={t('Theme')}
              value={draft.theme}
              onChange={(v) => set({ theme: v as SettingsType['theme'] })}
              values={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('Accent color')}</h3>
              <p>{t('A small touch of personality.')}</p>
            </div>
            <div className="accent-options" role="group" aria-label={t('Accent color')}>
              {[
                { color: '#5B5BF0', name: 'Indigo' },
                { color: '#8054CB', name: 'Violet' },
                { color: '#087E74', name: 'Teal' },
                { color: '#B64D24', name: 'Terracotta' },
              ].map((a) => (
                <button
                  type="button"
                  aria-label={a.name}
                  aria-pressed={draft.accent === a.color}
                  style={{ background: a.color }}
                  key={a.color}
                  onClick={() => set({ accent: a.color })}
                >
                  {draft.accent === a.color ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('Default currency')}</h3>
              <p>{t('Totals stay separate for each currency.')}</p>
            </div>
            <select
              aria-label={t('Default currency')}
              value={draft.defaultCurrency}
              onChange={(e) => set({ defaultCurrency: e.target.value })}
            >
              {Intl.supportedValuesOf('currency').map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('Start the week on')}</h3>
              <p>{t('Used in weekly application insights.')}</p>
            </div>
            <select
              aria-label={t('Start of week')}
              value={draft.weekStartsOn}
              onChange={(e) => set({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
            >
              <option value={1}>{t('Monday')}</option>
              <option value={0}>{t('Sunday')}</option>
            </select>
          </div>
        </section>
        <section className="settings-card">
          <div className="setting-row">
            <div>
              <h3>{t('Language')}</h3>
              <p>{t('Choose English or Bangla.')}</p>
            </div>
            <select
              aria-label={t('Language')}
              value={draft.language}
              onChange={(e) => set({ language: e.target.value as SettingsType['language'] })}
            >
              <option value="en">{t('English')}</option>
              <option value="bn">বাংলা</option>
            </select>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-title">
            <h2>{t('A nudge at the right time')}</h2>
            <p>{t('Keep your browser running to receive reminders.')}</p>
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('Desktop notifications')}</h3>
              <p>{t('Deadline, follow-up, renewal, and trial reminders.')}</p>
            </div>
            <Tick
              label={t('Enabled')}
              checked={draft.notificationsEnabled}
              onChange={(notificationsEnabled) => set({ notificationsEnabled })}
            />
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('Daily check-in')}</h3>
              <p>{t('Your local time. A fresh view of what\u2019s next.')}</p>
            </div>
            <input
              aria-label={t('Daily reminder time')}
              type="time"
              value={draft.reminderTime}
              onChange={(e) => set({ reminderTime: e.target.value })}
            />
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('Reminder lead days')}</h3>
              <p>{t('Days before a deadline, separated by commas.')}</p>
            </div>
            <input
              aria-label={t('Reminder lead days')}
              value={leads}
              placeholder={'7, 3, 1'}
              onChange={(e) => {
                setLeads(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </section>
        {error && (
          <p role="alert" className="error">
            {t(error)}
          </p>
        )}
        <div className="settings-save">
          <span role="status">{saved ? t('Preferences saved. Make yourself at home.') : ''}</span>
          <Button type="submit" variant="primary" disabled={saving || loadFailed}>
            {saving ? t('Saving\u2026') : t('Save preferences')}
          </Button>
        </div>
      </form>
      <aside>
        <section className="settings-card backup-card">
          <LockKeyhole size={21} />
          <h2>{t('Your data, your keeping.')}</h2>
          <p>
            {t(
              'Everything stays on this device. Export a backup regularly so your plans stay safe if you remove the extension or change computers.',
            )}
          </p>
          <Button
            onClick={() => {
              void exportData();
            }}
          >
            <Download size={14} />
            {t('Export JSON backup')}
          </Button>
          <Button onClick={() => fileInput.current?.click()}>
            <Upload size={14} />
            {t('Import backup')}
          </Button>
          <input
            ref={fileInput}
            className="sr-only"
            aria-label={t('Import JSON backup')}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
            }}
          />
          <small>{t('Import previews changes before applying.')}</small>
          <Button onClick={() => exportCalendar(data.items)}>
            {t('Export next 90 days to calendar')}
          </Button>
          <small>
            {t(
              'Download an .ics snapshot to import into your calendar. It does not update automatically.',
            )}
          </small>
          <Button
            onClick={async () => {
              try {
                setCopies(await repository.recovery());
                setError('');
              } catch {
                setError(t('Recovery copies could not be loaded.'));
              }
            }}
          >
            {t('Show recovery copies')}
          </Button>
          {copies.map((copy) => (
            <div key={copy.id} className="recovery-copy">
              <small>
                {copy.reason} · {new Date(copy.at).toLocaleString()}
              </small>
              <Button onClick={() => setRestoreId(copy.id)}>{t('Restore this copy')}</Button>
            </div>
          ))}
          <small>
            {t(
              'Up to three local recovery copies are kept before migration, import, or restore. Removing the extension also removes these copies.',
            )}
          </small>
          <Button
            onClick={() => {
              void exportRawData();
            }}
          >
            {t('Export raw stored data')}
          </Button>
        </section>
        <section className="settings-card danger-card">
          <h3>{t('A fresh start')}</h3>
          <p>{t('Remove all items, preferences, and reminder history.')}</p>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            <Trash2 size={13} />
            {t('Delete all data')}
          </Button>
        </section>
      </aside>
      <Modal
        open={!!incoming}
        onOpenChange={(v) => {
          if (!v) setIncoming(null);
        }}
        title={t('Bring your plans back')}
        description={t('Review your backup before applying it.')}
      >
        <div className="import-preview">
          {loadFailed && (
            <p role="alert">
              {t(
                'Your stored data is unreadable. Importing this backup replaces the workspace and preserves a raw recovery copy first.',
              )}
            </p>
          )}
          <strong>{t('{0} new, {1} updated', counts?.added, counts?.updated)}</strong>
          <p className="muted">
            {t(
              'Review matching items below. By default, newer local changes are preserved. Ties keep your current item.',
            )}
          </p>
          <label className="field">
            <span>{t('Matching item policy')}</span>
            <select value={policy} onChange={(e) => setPolicy(e.target.value as ConflictPolicy)}>
              <option value="newer">{t('Keep the newer version')}</option>
              <option value="current">{t('Keep current items')}</option>
              <option value="incoming">{t('Use backup items')}</option>
            </select>
          </label>
          <Tick
            checked={restoreSettings}
            onChange={setRestoreSettings}
            label={t('Restore preferences from backup')}
          />
          {incoming &&
            backupConflicts(data, incoming).map((conflict) => (
              <p key={conflict.id} className="muted text-xs">
                {conflict.title}
                {t(': current')}
                {new Date(conflict.localAt).toLocaleString()}
                {t('\u00B7 backup')}
                {new Date(conflict.incomingAt).toLocaleString()}
              </p>
            ))}
        </div>
        <div className="form-actions">
          <Button onClick={() => setIncoming(null)}>{t('Cancel')}</Button>
          <Button
            variant="primary"
            onClick={() => {
              void applyImport();
            }}
          >
            {t(loadFailed ? 'Replace workspace from backup' : 'Import backup')}
          </Button>
        </div>
      </Modal>
      <Modal
        open={Boolean(restoreId)}
        onOpenChange={(open) => {
          if (!open) setRestoreId(null);
        }}
        title={t('Restore this recovery copy?')}
        description={t(
          'This replaces your current workspace. A recovery copy of your current data will be saved first.',
        )}
      >
        <div className="form-actions">
          <Button onClick={() => setRestoreId(null)}>{t('Cancel')}</Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (!restoreId) return;
              try {
                const restored = await repository.restore(restoreId);
                await reload();
                setDraft(restored.settings);
                setLeads(restored.settings.reminderLeadDays.join(', '));
                setRestoreId(null);
                setCopies(await repository.recovery());
              } catch {
                setError(
                  t('Recovery could not be restored. Your current data has not been replaced.'),
                );
              }
            }}
          >
            {t('Restore workspace')}
          </Button>
        </div>
      </Modal>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title={t('Delete everything?')}
        description={t(
          'All items and preferences on this device will be permanently removed. Export a backup first if you want to keep them.',
        )}
      >
        <div className="form-actions">
          <Button onClick={() => setConfirm(false)}>{t('Keep my data')}</Button>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await repository.erase();
                await reload();
                setDraft(emptyState().settings);
                setLeads('7, 3, 1');
                setConfirm(false);
              } catch {
                setError(t('Your data could not be deleted. Please try again.'));
              }
            }}
          >
            {t('Delete all data')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
