/**
 * UCP Pricing Helpers
 *
 * Mirrors the business rules in `lib/actions/cart.actions.ts`'s internal
 * `calcPrice` (flat $10 shipping under $100, 15% tax) but operates
 * directly in integer minor units to avoid unnecessary decimal
 * round-tripping in the UCP layer.
 */

import type { LineItem, Totals } from "../types/checkout";

const FREE_SHIPPING_THRESHOLD_MINOR = 10000; // $100.00
const FLAT_SHIPPING_MINOR = 1000; // $10.00
const TAX_RATE = 0.15;

export function calcTotals(lineItems: LineItem[], currency = "USD"): Totals {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0);
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD_MINOR ? 0 : FLAT_SHIPPING_MINOR;
  const tax = Math.round(subtotal * TAX_RATE);
  const discount = 0;
  const grandTotal = subtotal + shipping + tax - discount;

  return {
    subtotal,
    tax,
    shipping,
    discount,
    grand_total: grandTotal,
    currency,
  };
}
