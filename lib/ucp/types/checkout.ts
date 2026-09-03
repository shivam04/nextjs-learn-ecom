/**
 * UCP Checkout Types
 *
 * Wire-format types for the Universal Commerce Protocol (UCP) shopping
 * checkout capability. Money fields are integers in minor units (cents),
 * matching Stripe convention — distinct from the decimal-string money
 * representation used internally in `types/index.ts`.
 */

export type CheckoutStatus =
  | "incomplete"
  | "requires_escalation"
  | "ready_for_complete"
  | "complete_in_progress"
  | "completed"
  | "canceled";

export type MessageSeverity =
  | "recoverable"
  | "requires_buyer_input"
  | "requires_buyer_review";

export interface UCPMetadata {
  version: string;
  capabilities: string[];
}

export interface LineItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
}

export interface Totals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  grand_total: number;
  currency: string;
}

export type PaymentStatus = "pending" | "authorized" | "captured" | "failed";

export interface PaymentHandler {
  id: string;
  type: string;
  config?: Record<string, unknown>;
}

export interface PaymentInfo {
  status: PaymentStatus;
  handlers: PaymentHandler[];
  amount_due: number;
  currency: string;
  client_secret?: string;
}

export interface CheckoutMessage {
  code: string;
  severity: MessageSeverity;
  message: string;
  field?: string;
}

export interface CheckoutLinks {
  self: string;
  continue_url?: string;
  privacy_policy: string;
  terms_of_service: string;
  refund_policy?: string;
  shipping_policy?: string;
}

export interface BuyerInfo {
  email?: string;
  phone?: string;
  name?: string;
}

export interface ShippingAddressInput {
  full_name: string;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface CheckoutSession {
  ucp: UCPMetadata;
  id: string;
  status: CheckoutStatus;
  currency: string;
  line_items: LineItem[];
  totals: Totals;
  payment: PaymentInfo;
  links: CheckoutLinks;
  messages: CheckoutMessage[];
  expires_at: string;
  created_at: string;
  updated_at: string;
  buyer?: BuyerInfo;
  shipping_address?: ShippingAddressInput;
  order_id?: string;
}
