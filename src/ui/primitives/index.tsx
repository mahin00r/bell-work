import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Tabs from '@radix-ui/react-tabs';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import { motion } from 'motion/react';
import { Bell, BriefcaseBusiness, Check, GraduationCap, Repeat2, X } from 'lucide-react';
import type { Kind } from '../../shared/types';
import { useEntrance } from '../motion';
import { ErrorBoundary } from './ErrorBoundary';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' | 'danger' }
>(function Button({ children, className = '', variant = 'default', ...props }, ref) {
  return (
    <button ref={ref} type="button" {...props} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
});
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(function IconButton({ label, children, ...props }, ref) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button
          ref={ref}
          {...props}
          variant="ghost"
          className={`icon-button ${props.className ?? ''}`}
          aria-label={label}
        >
          {children}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={6}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
});
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img src="/icons/icon-32.png" width="32" height="32" alt="" />
      <span>Bell Work{!compact && <small>Never miss a deadline</small>}</span>
    </div>
  );
}
export function KindIcon({ kind }: { kind: Kind }) {
  const Icon = kind === 'job' ? BriefcaseBusiness : kind === 'study' ? GraduationCap : Repeat2;
  return (
    <span className={`kind-icon ${kind}`}>
      <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}
export function Chip({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}
export function ProgressRing({ done, total }: { done: number; total: number }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      role="img"
      aria-label={`${done} of ${total} checklist tasks complete`}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--border)" strokeWidth="2" />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeDasharray={`${total ? (done / total) * 56.55 : 0} 56.55`}
        transform="rotate(-90 12 12)"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  drawer = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  drawer?: boolean;
}) {
  const entrance = useEntrance();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content asChild>
          <motion.section {...entrance} className={`modal ${drawer ? 'drawer' : ''}`}>
            <div className="modal-heading">
              <div>
                <Dialog.Title>{title}</Dialog.Title>
                <Dialog.Description>
                  {description ?? 'Keep the details in one place.'}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="button ghost icon-button" aria-label="Close">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            {children}
          </motion.section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Segments({
  value,
  onChange,
  values,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  values: readonly { value: string; label: string }[];
  label: string;
}) {
  return (
    <Tabs.Root value={value} onValueChange={onChange}>
      <Tabs.List className="segments" aria-label={label}>
        {values.map((v) => (
          <Tabs.Trigger key={v.value} value={v.value}>
            {v.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
export function Tick({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="tick-label">
      <Checkbox.Root
        className="checkbox"
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      >
        <Checkbox.Indicator>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <Check size={13} />
          </motion.span>
        </Checkbox.Indicator>
      </Checkbox.Root>
      <span>{label}</span>
    </label>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-art">
        <Bell size={32} strokeWidth={1.3} />
        <span className="empty-check">
          <Check size={12} />
        </span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}
export function Menu({
  trigger,
  actions,
}: {
  trigger: ReactNode;
  actions: { label: string; action: () => void }[];
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu" sideOffset={4}>
          {actions.map((a) => (
            <Dropdown.Item key={a.label} onSelect={a.action}>
              {a.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function Help({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="menu help" sideOffset={8}>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Tooltip.Provider delayDuration={350}>{children}</Tooltip.Provider>
    </ErrorBoundary>
  );
}
