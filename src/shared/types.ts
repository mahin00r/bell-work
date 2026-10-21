import type { z } from 'zod';
import type {
  applicationSchema,
  subscriptionSchema,
  itemSchema,
  settingsSchema,
  stateSchema,
  moneySchema,
  applicationEventSchema,
  billingAnchorSchema,
} from './schema';
export type Application = z.infer<typeof applicationSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Kind = Item['kind'];
export type Money = z.infer<typeof moneySchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type State = z.infer<typeof stateSchema>;
export type Status = Application['status'];
export type ApplicationEvent = z.infer<typeof applicationEventSchema>;
export type BillingAnchor = z.infer<typeof billingAnchorSchema>;
