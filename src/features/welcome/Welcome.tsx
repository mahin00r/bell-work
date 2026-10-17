import { ArrowRight, Sparkles, X } from 'lucide-react';
import { Button, IconButton, Kbd } from '../../ui/primitives';
import { commit, useStore } from '../../shared/store';
import { sampleData } from '../../shared/sample-data';
export function Welcome({ onAdd }: { onAdd: () => void }) {
  const onboarded = useStore((s) => s.data.settings.onboarded);
  if (onboarded) return null;
  const dismiss = () => commit((s) => ({ ...s, settings: { ...s.settings, onboarded: true } }));
  return (
    <section className="welcome-card">
      <div className="welcome-dismiss">
        <IconButton
          label="Dismiss welcome"
          onClick={() => {
            void dismiss();
          }}
        >
          <X size={14} />
        </IconButton>
      </div>
      <span className="welcome-symbol">
        <Sparkles size={24} strokeWidth={1.4} />
      </span>
      <h2>Room for your next chapter.</h2>
      <p>
        Jobs, study plans, and subscriptions.
        <br />
        One calm place to keep them moving.
      </p>
      <div className="welcome-buttons">
        <Button
          variant="primary"
          onClick={() => {
            void dismiss();
            onAdd();
          }}
        >
          Add my first item <ArrowRight size={13} />
        </Button>
        <Button
          onClick={() => {
            void commit((s) => ({
              ...s,
              items: [...s.items, ...sampleData()],
              settings: { ...s.settings, onboarded: true },
            }));
          }}
        >
          Explore with sample data
        </Button>
      </div>
      <small>
        Save any page with <Kbd>Alt</Kbd> + <Kbd>Shift</Kbd> + <Kbd>B</Kbd>
      </small>
    </section>
  );
}
export function SampleBanner() {
  const hasSamples = useStore((s) => s.data.items.some((i) => i.tags.includes('sample')));
  return hasSamples ? (
    <div className="sample-banner">
      <span>You're viewing sample data</span>
      <button
        onClick={() => {
          void commit((s) => ({ ...s, items: s.items.filter((i) => !i.tags.includes('sample')) }));
        }}
      >
        Remove sample data
      </button>
    </div>
  ) : null;
}
