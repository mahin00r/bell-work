import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Archive, ArrowUpRight, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button, Chip, IconButton, KindIcon, Modal, ProgressRing, Tick } from '../../ui/primitives';
import { applyStatus, isApplication, isSubscription } from '../../shared/selectors';
import { itemSchema, statuses, cycles, urlSchema } from '../../shared/schema';
import { checklistTemplate } from '../../shared/templates';
import { archiveItem, commit, updateItem, useStore } from '../../shared/store';
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
      title: draft.title.trim(),
      updatedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      setError(`${parsed.error.issues[0].path.join(' · ')}: ${parsed.error.issues[0].message}`);
      return;
    }
    setSaving(true);
    const changes = Object.fromEntries(
      Object.entries(parsed.data).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(Reflect.get(original, key)),
      ),
    );
    const ok = await updateItem(original.id, (current) => {
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
      return result;
    });
    setSaving(false);
    if (ok) onClose();
    else setError('Could not save this item. Please try again.');
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
        title="The details"
        description="One step closer to what’s next."
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
                  ? 'Job application'
                  : draft.kind === 'study'
                    ? 'Study application'
                    : 'Subscription'}
              </Chip>
            </div>
            {draft.url && (
              <a href={draft.url} target="_blank" rel="noreferrer" className="inline text-xs">
                Open page <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          <Field label="Title">
            <input
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              maxLength={500}
            />
          </Field>
          <Field label="Page link">
            <input
              type="url"
              value={draft.url ?? ''}
              onChange={(e) => set({ url: optional(e.target.value) })}
            />
          </Field>
          {app && (
            <>
              <div className="form-grid">
                <Field label="Organization">
                  <input
                    value={app.organization}
                    onChange={(e) => patchApp({ organization: e.target.value })}
                  />
                </Field>
                <Field label="Role or program">
                  <input
                    value={app.roleOrProgram}
                    onChange={(e) => patchApp({ roleOrProgram: e.target.value })}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={app.status}
                    onChange={(e) => patchApp({ status: e.target.value as Application['status'] })}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <select
                    value={app.priority}
                    onChange={(e) =>
                      patchApp({ priority: e.target.value as Application['priority'] })
                    }
                  >
                    {['low', 'medium', 'high'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Deadline">
                  <input
                    type="date"
                    value={app.deadline ?? ''}
                    onChange={(e) => patchApp({ deadline: optional(e.target.value) })}
                  />
                </Field>
                <Field label="Follow-up date">
                  <input
                    type="date"
                    value={app.followUpAt ?? ''}
                    onChange={(e) => patchApp({ followUpAt: optional(e.target.value) })}
                  />
                </Field>
                <Field label="Country">
                  <input
                    value={app.country ?? ''}
                    onChange={(e) => patchApp({ country: optional(e.target.value) })}
                  />
                </Field>
                <Field label="Application fee · optional">
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
                  <Field label="Fee currency">
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
              <section className="editor-section">
                <div className="between">
                  <h3>Checklist</h3>
                  <ProgressRing
                    done={app.checklist.filter((c) => c.done).length}
                    total={app.checklist.length}
                  />
                </div>
                {app.checklist.map((c) => (
                  <div className="checklist-row" key={c.id}>
                    <Tick
                      checked={c.done}
                      label={`Complete ${c.label}`}
                      onChange={(done) =>
                        patchApp({
                          checklist: app.checklist.map((x) => (x.id === c.id ? { ...x, done } : x)),
                        })
                      }
                    />
                    <input
                      className="checklist-input"
                      aria-label={`Edit task ${c.label}`}
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
                      label={`Remove ${c.label}`}
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
                    <Plus size={12} /> Add task
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
                    <RotateCcw size={12} /> Apply template
                  </Button>
                </div>
              </section>
              <section className="editor-section">
                <div className="between">
                  <h3>Documents</h3>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      patchApp({
                        documents: [...app.documents, { id: nanoid(), label: '', url: '' }],
                      })
                    }
                  >
                    <Plus size={12} /> Add link
                  </Button>
                </div>
                {app.documents.map((d) => (
                  <div className="document-row document-link-row" key={d.id}>
                    <input
                      aria-label="Document label"
                      placeholder="Document name"
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
                      aria-label="Document URL"
                      type="url"
                      placeholder="https://"
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
                        aria-label={`Open ${d.label || 'document'}`}
                      >
                        <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      <span />
                    )}
                    <IconButton
                      label="Remove document"
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
                    <h3>Recommenders</h3>
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
                      <Plus size={12} /> Add person
                    </Button>
                  </div>
                  {app.recommenders?.map((r) => (
                    <div className="document-row" key={r.id}>
                      <input
                        aria-label="Recommender name"
                        placeholder="Name"
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
                        aria-label={`Recommendation status for ${r.name}`}
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
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <IconButton
                        label="Remove recommender"
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
              <div className="form-grid">
                <Field label="Vendor">
                  <input
                    value={sub.vendor}
                    onChange={(e) => patchSub({ vendor: e.target.value })}
                  />
                </Field>
                <Field label="Category">
                  <input
                    value={sub.category}
                    onChange={(e) => patchSub({ category: e.target.value })}
                  />
                </Field>
                <Field label="Amount per cycle">
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
                <Field label="Currency">
                  <input
                    value={sub.cost.currency}
                    maxLength={3}
                    onChange={(e) =>
                      patchSub({ cost: { ...sub.cost, currency: e.target.value.toUpperCase() } })
                    }
                  />
                </Field>
                <Field label="Billing cycle">
                  <select
                    value={sub.cycle}
                    onChange={(e) => patchSub({ cycle: e.target.value as Subscription['cycle'] })}
                  >
                    {cycles.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={sub.status}
                    onChange={(e) => patchSub({ status: e.target.value as Subscription['status'] })}
                  >
                    {['active', 'trial', 'cancelling', 'cancelled'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Next renewal">
                  <input
                    type="date"
                    value={sub.nextRenewal}
                    onChange={(e) => patchSub({ nextRenewal: e.target.value })}
                  />
                </Field>
                <Field label="Trial ends">
                  <input
                    type="date"
                    value={sub.trialEndsAt ?? ''}
                    onChange={(e) => patchSub({ trialEndsAt: optional(e.target.value) })}
                  />
                </Field>
                <Field label="Remind days before">
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={sub.remindDaysBefore}
                    onChange={(e) => patchSub({ remindDaysBefore: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Cancellation link">
                <input
                  type="url"
                  value={sub.cancelUrl ?? ''}
                  onChange={(e) => patchSub({ cancelUrl: optional(e.target.value) })}
                />
              </Field>
              <Tick
                checked={sub.unused ?? false}
                onChange={(unused) => patchSub({ unused })}
                label="I don't use this · mark as a cancel candidate"
              />
            </>
          )}
          <Field label="Tags · separated by commas">
            <input
              value={draft.tags.join(', ')}
              onChange={(e) => set({ tags: e.target.value.split(',').map((s) => s.trimStart()) })}
              onBlur={() => set({ tags: draft.tags.map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={draft.notes ?? ''}
              placeholder="A thought, a contact, a next step…"
              onChange={(e) => set({ notes: e.target.value })}
              rows={4}
            />
          </Field>
          {app && app.statusHistory.length > 0 && (
            <section className="editor-section">
              <h3>Activity</h3>
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
            Added {format(parseISO(draft.createdAt), 'MMM d, yyyy')} · Updated{' '}
            {format(parseISO(draft.updatedAt), 'MMM d, yyyy')}
          </small>
          {error && (
            <p className="error" role="alert">
              {error}
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
              {original.archivedAt ? 'Restore' : 'Archive'}
            </Button>
            <IconButton label="Delete item permanently" onClick={() => setConfirm(true)}>
              <Trash2 size={14} />
            </IconButton>
            <div className="spacer" />
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this item?"
        description="This permanently removes the item and all its details."
      >
        <div className="form-actions">
          <Button onClick={() => setConfirm(false)}>Keep item</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (
                await commit((s) => ({ ...s, items: s.items.filter((i) => i.id !== original.id) }))
              )
                onClose();
            }}
          >
            Delete item
          </Button>
        </div>
      </Modal>
    </>
  );
}
