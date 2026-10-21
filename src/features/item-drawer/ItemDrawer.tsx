import { formatDate as format } from '../../ui/i18n';
import { t } from '../../ui/i18n';
import { EventEditor } from './EventEditor';
import { SubscriptionHistory } from './SubscriptionHistory';
import { billingAnchor } from '../../shared/dates';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Archive, ArrowUpRight, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import { Button, Chip, IconButton, KindIcon, Modal, ProgressRing, Tick } from '../../ui/primitives';
import { applyStatus, isApplication, isSubscription } from '../../shared/selectors';
import { itemSchema, statuses, cycles, urlSchema } from '../../shared/schema';
import { checklistTemplate } from '../../shared/templates';
import { archiveItem, updateItem, useStore } from '../../shared/store';
import type { Application, Item, Subscription } from '../../shared/types';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ItemDrawer({ item: original, onClose }: { item: Item; onClose: () => void }) {
  const currency = useStore((s) => s.data.settings.defaultCurrency);
  const [baseline] = useState(original);
  const [draft, setDraft] = useState(original);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<Item>) => setDraft((i) => ({ ...i, ...patch }) as Item);
  const app = isApplication(draft) ? draft : null;
  const sub = isSubscription(draft) ? draft : null;
  const patchApp = (patch: Partial<Application>) => {
    if (app) setDraft({ ...app, ...patch });
  };
  const patchSub = (patch: Partial<Subscription>) => {
    if (sub) setDraft({ ...sub, ...patch });
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = itemSchema.safeParse({
      ...draft,
      ...(sub &&
      (sub.nextRenewal !== (baseline as Subscription).nextRenewal ||
        sub.cycle !== (baseline as Subscription).cycle)
        ? {
            billingAnchor: {
              ...billingAnchor(sub.nextRenewal),
              endOfMonth: sub.billingAnchor?.endOfMonth ?? false,
            },
          }
        : {}),
      title: draft.title.trim(),
      updatedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      setError(
        t('{0}: {1}', parsed.error.issues[0].path.join(' · '), parsed.error.issues[0].message),
      );
      return;
    }
    setSaving(true);
    const changes = Object.fromEntries(
      Object.entries(parsed.data).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(Reflect.get(baseline, key)),
      ),
    );
    let conflicted = false;
    const ok = await updateItem(original.id, (current) => {
      if (
        current.deletedAt ||
        Object.entries(changes).some(
          ([key, value]) =>
            key !== 'updatedAt' &&
            key !== 'statusHistory' &&
            JSON.stringify(Reflect.get(current, key)) !==
              JSON.stringify(Reflect.get(baseline, key)) &&
            JSON.stringify(Reflect.get(current, key)) !== JSON.stringify(value),
        )
      ) {
        conflicted = true;
        return current;
      }
      let result = { ...current, ...changes } as Item;
      if (isApplication(result) && isApplication(current) && result.status !== current.status) {
        result = {
          ...applyStatus(current, result.status),
          ...changes,
          statusHistory: [
            ...current.statusHistory,
            { status: result.status, at: new Date().toISOString() },
          ],
        } as Application;
        if (result.status === 'applied' && !('followUpAt' in changes))
          result.followUpAt = applyStatus(current, 'applied').followUpAt;
      }
      if (
        isSubscription(result) &&
        isSubscription(current) &&
        JSON.stringify(result.cost) !== JSON.stringify(current.cost)
      ) {
        result = {
          ...result,
          priceHistory: [
            ...(current.priceHistory ?? [{ at: current.createdAt, cost: current.cost }]),
            { at: new Date().toISOString(), cost: result.cost },
          ].slice(-500),
        };
      }
      return result;
    });
    setSaving(false);
    if (conflicted)
      setError(
        t(
          'This item changed in another window. Reopen it to review the latest details before saving.',
        ),
      );
    else if (ok) onClose();
    else setError(t('Could not save this item. Please try again.'));
  }
  const optional = (s: string) => s || undefined;
  return (
    <>
      <Modal
        open
        drawer
        onOpenChange={(v) => {
          if (!v && !saving) onClose();
        }}
        title={t('The details')}
        description={t('One step closer to what\u2019s next.')}
      >
        <form
          className="form-stack item-form"
          onSubmit={(e) => {
            void save(e);
          }}
          noValidate
        >
          <div className="between">
            <div className="inline">
              <KindIcon kind={draft.kind} />
              <Chip>
                {draft.kind === 'job'
                  ? t('Job application')
                  : draft.kind === 'study'
                    ? t('Study application')
                    : t('Subscription')}
              </Chip>
            </div>
            {draft.url && (
              <a href={draft.url} target="_blank" rel="noreferrer" className="inline text-xs">
                {t('Open page')}
                <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          <Field label={t('Title')}>
            <input
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              maxLength={500}
            />
          </Field>
          <Field label={t('Page link')}>
            <input
              type="url"
              value={draft.url ?? ''}
              onChange={(e) => set({ url: optional(e.target.value) })}
            />
          </Field>
          {app && (
            <>
              <div className="form-grid">
                <Field label={t('Organization')}>
                  <input
                    value={app.organization}
                    onChange={(e) => patchApp({ organization: e.target.value })}
                  />
                </Field>
                <Field label={t('Role or program')}>
                  <input
                    value={app.roleOrProgram}
                    onChange={(e) => patchApp({ roleOrProgram: e.target.value })}
                  />
                </Field>
                <Field label={t('Status')}>
                  <select
                    value={app.status}
                    onChange={(e) => patchApp({ status: e.target.value as Application['status'] })}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {t(s)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('Priority')}>
                  <select
                    value={app.priority}
                    onChange={(e) =>
                      patchApp({ priority: e.target.value as Application['priority'] })
                    }
                  >
                    {['low', 'medium', 'high'].map((s) => (
                      <option key={s} value={s}>
                        {t(s)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('Deadline')}>
                  <input
                    type="date"
                    value={app.deadline ?? ''}
                    onChange={(e) => patchApp({ deadline: optional(e.target.value) })}
                  />
                </Field>
                <Field label={t('Follow-up date')}>
                  <input
                    type="date"
                    value={app.followUpAt ?? ''}
                    onChange={(e) => patchApp({ followUpAt: optional(e.target.value) })}
                  />
                </Field>
                <Field label={t('Country')}>
                  <input
                    value={app.country ?? ''}
                    onChange={(e) => patchApp({ country: optional(e.target.value) })}
                  />
                </Field>
                <Field label={t('Application fee \u00B7 optional')}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={app.fee?.amount ?? ''}
                    onChange={(e) =>
                      patchApp({
                        fee: e.target.value
                          ? {
                              amount: Number(e.target.value),
                              currency: app.fee?.currency ?? currency,
                            }
                          : undefined,
                      })
                    }
                  />
                </Field>
                {app.fee && (
                  <Field label={t('Fee currency')}>
                    <input
                      value={app.fee.currency}
                      maxLength={3}
                      onChange={(e) =>
                        patchApp({
                          fee: { amount: app.fee!.amount, currency: e.target.value.toUpperCase() },
                        })
                      }
                    />
                  </Field>
                )}
              </div>
              <EventEditor events={app.events ?? []} onChange={(events) => patchApp({ events })} />
              <section className="editor-section">
                <div className="between">
                  <h3>{t('Checklist')}</h3>
                  <ProgressRing
                    done={app.checklist.filter((c) => c.done).length}
                    total={app.checklist.length}
                  />
                </div>
                {app.checklist.map((c) => (
                  <div className="checklist-row" key={c.id}>
                    <Tick
                      checked={c.done}
                      label={t('Complete {0}', c.label)}
                      onChange={(done) =>
                        patchApp({
                          checklist: app.checklist.map((x) => (x.id === c.id ? { ...x, done } : x)),
                        })
                      }
                    />
                    <input
                      className="checklist-input"
                      aria-label={t('Edit task {0}', c.label)}
                      value={c.label}
                      onChange={(e) =>
                        patchApp({
                          checklist: app.checklist.map((x) =>
                            x.id === c.id ? { ...x, label: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <IconButton
                      label={t('Remove {0}', c.label)}
                      onClick={() =>
                        patchApp({ checklist: app.checklist.filter((x) => x.id !== c.id) })
                      }
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </div>
                ))}
                <div className="inline">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      patchApp({
                        checklist: [
                          ...app.checklist,
                          { id: nanoid(), label: 'New task', done: false },
                        ],
                      })
                    }
                  >
                    <Plus size={12} />
                    {t('Add task')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const labels = new Set(app.checklist.map((c) => c.label));
                      patchApp({
                        checklist: [
                          ...app.checklist,
                          ...checklistTemplate(app.kind).filter((c) => !labels.has(c.label)),
                        ],
                      });
                    }}
                  >
                    <RotateCcw size={12} />
                    {t('Apply template')}
                  </Button>
                </div>
              </section>
              <section className="editor-section">
                <div className="between">
                  <h3>{t('Documents')}</h3>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      patchApp({
                        documents: [...app.documents, { id: nanoid(), label: '', url: '' }],
                      })
                    }
                  >
                    <Plus size={12} />
                    {t('Add link')}
                  </Button>
                </div>
                {app.documents.map((d) => (
                  <div className="document-row document-link-row" key={d.id}>
                    <input
                      aria-label={t('Document label')}
                      placeholder={t('Document name')}
                      value={d.label}
                      onChange={(e) =>
                        patchApp({
                          documents: app.documents.map((x) =>
                            x.id === d.id ? { ...x, label: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <input
                      aria-label={t('Document URL')}
                      type="url"
                      placeholder={'https://'}
                      value={d.url}
                      onChange={(e) =>
                        patchApp({
                          documents: app.documents.map((x) =>
                            x.id === d.id ? { ...x, url: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    {urlSchema.safeParse(d.url).success ? (
                      <a
                        className="button ghost icon-button"
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t('Open {0}', d.label || 'document')}
                      >
                        <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      <span />
                    )}
                    <IconButton
                      label={t('Remove document')}
                      onClick={() =>
                        patchApp({ documents: app.documents.filter((x) => x.id !== d.id) })
                      }
                    >
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                ))}
              </section>
              {app.kind === 'study' && (
                <section className="editor-section">
                  <div className="between">
                    <h3>{t('Recommenders')}</h3>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        patchApp({
                          recommenders: [
                            ...(app.recommenders ?? []),
                            { id: nanoid(), name: '', status: 'to-ask' },
                          ],
                        })
                      }
                    >
                      <Plus size={12} />
                      {t('Add person')}
                    </Button>
                  </div>
                  {app.recommenders?.map((r) => (
                    <div className="document-row" key={r.id}>
                      <input
                        aria-label={t('Recommender name')}
                        placeholder={t('Name')}
                        value={r.name}
                        onChange={(e) =>
                          patchApp({
                            recommenders: app.recommenders!.map((x) =>
                              x.id === r.id ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <select
                        aria-label={t('Recommendation status for {0}', r.name)}
                        value={r.status}
                        onChange={(e) =>
                          patchApp({
                            recommenders: app.recommenders!.map((x) =>
                              x.id === r.id
                                ? { ...x, status: e.target.value as typeof r.status }
                                : x,
                            ),
                          })
                        }
                      >
                        {['to-ask', 'asked', 'agreed', 'submitted'].map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                      </select>
                      <IconButton
                        label={t('Remove recommender')}
                        onClick={() =>
                          patchApp({ recommenders: app.recommenders!.filter((x) => x.id !== r.id) })
                        }
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {sub && (
            <>
              <SubscriptionHistory item={sub} onChange={patchSub} />
              <div className="form-grid">
                <Field label={t('Vendor')}>
                  <input
                    value={sub.vendor}
                    onChange={(e) => patchSub({ vendor: e.target.value })}
                  />
                </Field>
                <Field label={t('Category')}>
                  <input
                    value={sub.category}
                    onChange={(e) => patchSub({ category: e.target.value })}
                  />
                </Field>
                <Field label={t('Amount per cycle')}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sub.cost.amount}
                    onChange={(e) =>
                      patchSub({ cost: { ...sub.cost, amount: Number(e.target.value) } })
                    }
                  />
                </Field>
                <Field label={t('Currency')}>
                  <input
                    value={sub.cost.currency}
                    maxLength={3}
                    onChange={(e) =>
                      patchSub({ cost: { ...sub.cost, currency: e.target.value.toUpperCase() } })
                    }
                  />
                </Field>
                <Field label={t('Billing cycle')}>
                  <select
                    value={sub.cycle}
                    onChange={(e) => patchSub({ cycle: e.target.value as Subscription['cycle'] })}
                  >
                    {cycles.map((c) => (
                      <option key={c} value={c}>
                        {t(c)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('Status')}>
                  <select
                    value={sub.status}
                    onChange={(e) => patchSub({ status: e.target.value as Subscription['status'] })}
                  >
                    {['active', 'trial', 'cancelling', 'cancelled'].map((s) => (
                      <option key={s} value={s}>
                        {t(s)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('Next renewal')}>
                  <input
                    type="date"
                    value={sub.nextRenewal}
                    onChange={(e) => patchSub({ nextRenewal: e.target.value })}
                  />
                </Field>
                <Field label={t('Billing date rule')}>
                  <select
                    value={sub.billingAnchor?.endOfMonth ? 'last' : 'day'}
                    onChange={(e) =>
                      patchSub({
                        billingAnchor: {
                          ...(sub.billingAnchor ?? billingAnchor(sub.nextRenewal)),
                          endOfMonth: e.target.value === 'last',
                        },
                      })
                    }
                  >
                    <option value="day">{t('Original day, clamped in shorter months')}</option>
                    <option value="last">{t('Last day of the month')}</option>
                  </select>
                </Field>
                {sub.status === 'cancelling' && (
                  <Field label={t('Planned cancellation date')}>
                    <input
                      type="date"
                      value={sub.cancelAt ?? ''}
                      onChange={(e) => patchSub({ cancelAt: e.target.value || undefined })}
                    />
                    <small>
                      {t(
                        'Forecasts exclude charges on or after this date. Confirm cancellation with the provider yourself.',
                      )}
                    </small>
                  </Field>
                )}
                <Field label={t('Trial ends')}>
                  <input
                    type="date"
                    value={sub.trialEndsAt ?? ''}
                    onChange={(e) => patchSub({ trialEndsAt: optional(e.target.value) })}
                  />
                </Field>
                <Field label={t('Remind days before')}>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={sub.remindDaysBefore}
                    onChange={(e) => patchSub({ remindDaysBefore: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label={t('Cancellation link')}>
                <input
                  type="url"
                  value={sub.cancelUrl ?? ''}
                  onChange={(e) => patchSub({ cancelUrl: optional(e.target.value) })}
                />
              </Field>
              <Tick
                checked={sub.unused ?? false}
                onChange={(unused) => patchSub({ unused })}
                label={t("I don't use this \u00B7 mark as a cancel candidate")}
              />
            </>
          )}
          <Field label={t('Tags \u00B7 separated by commas')}>
            <input
              value={draft.tags.join(', ')}
              onChange={(e) => set({ tags: e.target.value.split(',').map((s) => s.trimStart()) })}
              onBlur={() => set({ tags: draft.tags.map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label={t('Notes')}>
            <textarea
              value={draft.notes ?? ''}
              placeholder={t('A thought, a contact, a next step\u2026')}
              onChange={(e) => set({ notes: e.target.value })}
              rows={4}
            />
          </Field>
          {app && app.statusHistory.length > 0 && (
            <section className="editor-section">
              <h3>{t('Activity')}</h3>
              <ol className="history">
                {app.statusHistory.map((h, n) => (
                  <li key={`${h.at}-${n}`}>
                    <span className="status-dot" />
                    <span>{h.status}</span>
                    <time dateTime={h.at}>{format(parseISO(h.at), 'MMM d, yyyy · HH:mm')}</time>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <small>
            {t('Added')}
            {format(parseISO(draft.createdAt), 'MMM d, yyyy')}
            {t('\u00B7 Updated')} {format(parseISO(draft.updatedAt), 'MMM d, yyyy')}
          </small>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          <div className="form-actions drawer-actions">
            <Button
              variant="ghost"
              onClick={async () => {
                const ok = original.archivedAt
                  ? await updateItem(original.id, (i) => ({ ...i, archivedAt: undefined }))
                  : await archiveItem(original.id);
                if (ok) onClose();
              }}
            >
              <Archive size={13} />
              {original.archivedAt ? t('Restore') : t('Archive')}
            </Button>
            <IconButton label={t('Move item to trash')} onClick={() => setConfirm(true)}>
              <Trash2 size={14} />
            </IconButton>
            <div className="spacer" />
            <Button onClick={onClose}>{t('Cancel')}</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? t('Saving\u2026') : t('Save changes')}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title={t('Move this item to trash?')}
        description={t('You can restore it later from Trash. Reminders stop while it is there.')}
      >
        <div className="form-actions">
          <Button onClick={() => setConfirm(false)}>{t('Keep item')}</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (
                await updateItem(original.id, (item) => ({
                  ...item,
                  deletedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }))
              )
                onClose();
            }}
          >
            {t('Move to trash')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
