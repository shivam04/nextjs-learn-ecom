/**
 * UCP Order Types
 *
 * Wire-format types for the `dev.ucp.shopping.order` capability — a
 * read-only view of an order's current lifecycle state (totals, line
 * items, fulfillment progress, post-purchase adjustments). Money fields
 * are integers in minor units (cents), matching the checkout capability.
 */

import type { UCPMetadata } from "./checkout";

/** A typed money row. `type` is an open reverse-DNS-free string per spec (e.g. "subtotal", "tax", "fulfillment", "total"). */
export interface OrderMoneyRow {
  type: string;
  amount: number;
  display_text: string;
}

export interface OrderLineItemQuantity {
  original: number;
  total: number;
  fulfilled: number;
}

export type OrderLineItemStatus = "processing" | "partial" | "fulfilled" | "removed";

export interface OrderLineItem {
  id: string;
  item: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
  };
  quantity: OrderLineItemQuantity;
  totals: OrderMoneyRow[];
  status: OrderLineItemStatus;
}

export interface OrderFulfillmentDestination {
  full_name?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export interface OrderFulfillmentExpectation {
  destination?: OrderFulfillmentDestination;
}

export interface OrderFulfillmentEvent {
  type: string;
  occurred_at: string;
}

export interface OrderFulfillment {
  expectations: OrderFulfillmentExpectation[];
  events: OrderFulfillmentEvent[];
}

export interface OrderAdjustment {
  id: string;
  type: string;
  occurred_at: string;
  status: "completed" | "pending" | "failed";
  totals: OrderMoneyRow[];
  description: string | null;
  line_items: { id: string; quantity: number }[];
}

export interface UCPOrder {
  ucp: UCPMetadata;
  id: string;
  label: string;
  checkout_id?: string;
  currency: string;
  totals: OrderMoneyRow[];
  line_items: OrderLineItem[];
  fulfillment: OrderFulfillment;
  adjustments: OrderAdjustment[];
}
