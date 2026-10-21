import { z } from 'zod';
import { isValid, parseISO, format } from 'date-fns';
import { eventInstant, validTimeZone } from './events';

export const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => isValid(parseISO(s)) && format(parseISO(s), 'yyyy-MM-dd') === s,
    'Choose a valid date',
  );
const timestamp = z.string().datetime({ offset: true });
const text = z.string().trim().min(1).max(500);
export const eventKinds = ['interview', 'document', 'recommendation', 'offer', 'custom'] as const;
export const applicationEventSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
    kind: z.enum(eventKinds),
    title: text,
    date: daySchema,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    timeZone: z.string().max(100).refine(validTimeZone).optional(),
    location: z.string().max(500).optional(),
    url: z
      .string()
      .url()
      .max(4000)
      .refine((s) => ['http:', 'https:'].includes(new URL(s).protocol))
      .optional(),
    completedAt: timestamp.optional(),
  })
  .refine((event) => !event.time || Boolean(event.timeZone), 'Choose a time zone for a timed event')
  .refine((event) => {
    if (!event.time || !event.timeZone) return true;
    try {
      return eventInstant(event) !== undefined;
    } catch {
      return false;
    }
  }, 'This local time does not exist in the selected time zone. Choose another time.');
export const billingAnchorSchema = z.object({
  day: z.number().int().min(1).max(31),
  month: z.number().int().min(1).max(12),
  endOfMonth: z.boolean().default(false),
});
export const urlSchema = z
  .string()
  .url()
  .max(4000)
  .refine((s) => ['http:', 'https:'].includes(new URL(s).protocol), 'Use an http or https link');
export const statuses = [
  'saved',
  'preparing',
  'applied',
  'interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
] as const;
export const cycles = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
export const moneySchema = z.object({
  amount: z.number().finite().nonnegative().max(1e12),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .refine((s) => {
      try {
        return Intl.supportedValuesOf('currency').includes(s);
      } catch {
        return false;
      }
    }, 'Choose a supported currency'),
});
const base = {
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  title: text,
  url: urlSchema.optional(),
  notes: z.string().max(100000).optional(),
  tags: z.array(text).max(100),
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: timestamp.optional(),
  deletedAt: timestamp.optional(),
  reminderSnoozes: z.record(timestamp).optional(),
};
export const applicationSchema = z.object({
  ...base,
  kind: z.enum(['job', 'study']),
  organization: z.string().max(500),
  roleOrProgram: z.string().max(500),
  country: z.string().max(200).optional(),
  deadline: daySchema.optional(),
  status: z.enum(statuses),
  priority: z.enum(['low', 'medium', 'high']),
  fee: moneySchema.optional(),
  checklist: z.array(z.object({ id: text, label: text, done: z.boolean() })).max(200),
  documents: z.array(z.object({ id: text, label: text, url: urlSchema })).max(100),
  recommenders: z
    .array(
      z.object({
        id: text,
        name: text,
        status: z.enum(['to-ask', 'asked', 'agreed', 'submitted']),
      }),
    )
    .max(100)
    .optional(),
  followUpAt: daySchema.optional(),
  events: z
    .array(applicationEventSchema)
    .max(200)
    .refine(
      (events) => new Set(events.map((event) => event.id)).size === events.length,
      'Duplicate event IDs',
    )
    .optional(),
  statusHistory: z.array(z.object({ status: z.enum(statuses), at: timestamp })).max(10000),
});
export const subscriptionSchema = z.object({
  ...base,
  kind: z.literal('subscription'),
  vendor: z.string().max(500),
  cost: moneySchema,
  cycle: z.enum(cycles),
  nextRenewal: daySchema,
  trialEndsAt: daySchema.optional(),
  status: z.enum(['active', 'trial', 'cancelling', 'cancelled']),
  category: z.string().max(200),
  cancelUrl: urlSchema.optional(),
  remindDaysBefore: z.number().int().min(0).max(365),
  unused: z.boolean().optional(),
  billingAnchor: billingAnchorSchema.optional(),
  cancelAt: daySchema.optional(),
  renewalReviewAt: daySchema.optional(),
  priceHistory: z
    .array(z.object({ at: timestamp, cost: moneySchema }))
    .max(500)
    .optional(),
  payments: z
    .array(z.object({ id: text, date: daySchema, cost: moneySchema }))
    .max(500)
    .optional(),
});
export const itemSchema = z.union([applicationSchema, subscriptionSchema]);
export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  accent: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#5B5BF0'),
  defaultCurrency: moneySchema.shape.currency.default('BDT'),
  reminderLeadDays: z.array(z.number().int().min(0).max(365)).max(20).default([7, 3, 1]),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default('09:00'),
  notificationsEnabled: z.boolean().default(true),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
  onboarded: z.boolean().default(false),
  language: z.enum(['en', 'bn']).default('en'),
});
export const stateSchema = z.object({
  schemaVersion: z.literal(2),
  items: z
    .array(itemSchema)
    .max(10000)
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length, 'Duplicate item IDs'),
  settings: settingsSchema,
  notified: z.record(timestamp),
  focusIds: z
    .array(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/))
    .max(3)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate focus IDs')
    .optional(),
  savedViews: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
        name: text,
        filters: z.object({
          query: z.string().max(500),
          kind: z.enum(['all', 'job', 'study', 'subscription']),
          tag: z.string().max(500),
          status: z.string().max(100),
          priority: z.string().max(100),
          country: z.string().max(200),
          days: z.enum(['all', '7', '30', '90']),
        }),
      }),
    )
    .max(50)
    .optional(),
});
