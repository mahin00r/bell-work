import { useRef, useState } from 'react';
import { Download, LockKeyhole, Upload, Trash2 } from 'lucide-react';
import { Button, Modal, Segments, Tick } from '../../ui/primitives';
import { commit, useStore } from '../../shared/store';
import { emptyState } from '../../shared/migrations';
import { importPreview, mergeBackup, parseBackup } from '../../shared/backup';
import { settingsSchema } from '../../shared/schema';
import { exportData } from '../../shared/export';
import type { Settings as SettingsType, State } from '../../shared/types';
export function Settings() {
  const data = useStore((s) => s.data);
  const [draft, setDraft] = useState(data.settings);
  const [leads, setLeads] = useState(draft.reminderLeadDays.join(', '));
  const [incoming, setIncoming] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<SettingsType>) => {
    setDraft((s) => ({ ...s, ...patch }));
    setSaved(false);
  };
  const counts = incoming ? importPreview(data, incoming) : null;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse({
      ...draft,
      reminderLeadDays: leads.split(',').map((n) => Number(n.trim())),
    });
    if (!parsed.success) {
      setError(
        `Check ${parsed.error.issues[0].path.join(' · ')}: ${parsed.error.issues[0].message}`,
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
    setError(ok ? '' : 'Could not save settings. Please try again.');
  }
  async function readFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Too large');
      setIncoming(parseBackup(await file.text()));
      setError('');
    } catch {
      setError(
        'This file is not a valid Bell Work backup, or it needs a newer version. Choose a JSON backup smaller than 25 MB.',
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
            <h2>Make it feel like yours</h2>
            <p>A quiet workspace, tuned to your day.</p>
          </div>
          <div className="setting-row">
            <div>
              <h3>Appearance</h3>
              <p>Follow your device, or set the mood.</p>
            </div>
            <Segments
              label="Theme"
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
              <h3>Accent color</h3>
              <p>A small touch of personality.</p>
            </div>
            <div className="accent-options" role="group" aria-label="Accent color">
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
              <h3>Default currency</h3>
              <p>Totals stay separate for each currency.</p>
            </div>
            <select
              aria-label="Default currency"
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
              <h3>Start the week on</h3>
              <p>Used in weekly application insights.</p>
            </div>
            <select
              aria-label="Start of week"
              value={draft.weekStartsOn}
              onChange={(e) => set({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-title">
            <h2>A nudge at the right time</h2>
            <p>Chrome needs to be running to deliver reminders.</p>
          </div>
          <div className="setting-row">
            <div>
              <h3>Desktop notifications</h3>
              <p>Deadline, follow-up, renewal, and trial reminders.</p>
            </div>
            <Tick
              label="Enabled"
              checked={draft.notificationsEnabled}
              onChange={(notificationsEnabled) => set({ notificationsEnabled })}
            />
          </div>
          <div className="setting-row">
            <div>
              <h3>Daily check-in</h3>
              <p>Your local time. A fresh view of what’s next.</p>
            </div>
            <input
              aria-label="Daily reminder time"
              type="time"
              value={draft.reminderTime}
              onChange={(e) => set({ reminderTime: e.target.value })}
            />
          </div>
          <div className="setting-row">
            <div>
              <h3>Reminder lead days</h3>
              <p>Days before a deadline, separated by commas.</p>
            </div>
            <input
              aria-label="Reminder lead days"
              value={leads}
              placeholder="7, 3, 1"
              onChange={(e) => {
                setLeads(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </section>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="settings-save">
          <span role="status">{saved ? 'Preferences saved. Make yourself at home.' : ''}</span>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </form>
      <aside>
        <section className="settings-card backup-card">
          <LockKeyhole size={21} />
          <h2>Your data, your keeping.</h2>
          <p>
            Everything stays on this device. Export a backup regularly so your plans stay safe if
            you remove the extension or change computers.
          </p>
          <Button
            onClick={() => {
              void exportData();
            }}
          >
            <Download size={14} /> Export JSON backup
          </Button>
          <Button onClick={() => fileInput.current?.click()}>
            <Upload size={14} /> Import backup
          </Button>
          <input
            ref={fileInput}
            className="sr-only"
            aria-label="Import JSON backup"
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
            }}
          />
          <small>Import previews changes before applying.</small>
        </section>
        <section className="settings-card danger-card">
          <h3>A fresh start</h3>
          <p>Remove all items, preferences, and reminder history.</p>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            <Trash2 size={13} /> Delete all data
          </Button>
        </section>
      </aside>
      <Modal
        open={!!incoming}
        onOpenChange={(v) => {
          if (!v) setIncoming(null);
        }}
        title="Bring your plans back"
        description="Review your backup before applying it."
      >
        <div className="import-preview">
          <strong>
            {counts?.added} new, {counts?.updated} updated
          </strong>
          <p className="muted">
            Items with matching IDs will be replaced. Other items stay. Preferences and reminder
            history will be restored from the backup.
          </p>
        </div>
        <div className="form-actions">
          <Button onClick={() => setIncoming(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (incoming && (await commit((s) => mergeBackup(s, incoming)))) {
                setDraft(incoming.settings);
                setLeads(incoming.settings.reminderLeadDays.join(', '));
                setIncoming(null);
              }
            }}
          >
            Import backup
          </Button>
        </div>
      </Modal>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete everything?"
        description="All items and preferences on this device will be permanently removed. Export a backup first if you want to keep them."
      >
        <div className="form-actions">
          <Button onClick={() => setConfirm(false)}>Keep my data</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (await commit(() => emptyState())) {
                setDraft(emptyState().settings);
                setLeads('7, 3, 1');
                setConfirm(false);
              }
            }}
          >
            Delete all data
          </Button>
        </div>
      </Modal>
    </div>
  );
}
