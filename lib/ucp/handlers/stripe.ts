/**
 * UCP Stripe Payment Handler
 *
 * Wraps the Stripe integration for the UCP checkout flow. Mirrors the
 * PaymentIntent pattern already used in
 * `app/(root)/order/[id]/page.tsx`, but keyed off a UcpCheckoutSession id
 * instead of an Order id (the UCP session becomes an Order only once
 * checkout completes).
 */

import Stripe from "stripe";
import type { CheckoutSession } from "../types/checkout";

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey);
}

/**
 * Create (or reuse) a Stripe PaymentIntent for the given checkout session's
 * current grand total. Returns the PaymentIntent id and client secret.
 */
export async function createOrUpdatePaymentIntent(
  session: Pick<CheckoutSession, "id" | "totals">,
  existingPaymentIntentId?: string | null
): Promise<{ id: string; client_secret: string | null }> {
  const stripe = getStripeClient();
  const amount = session.totals.grand_total;

  if (existingPaymentIntentId) {
    const updated = await stripe.paymentIntents.update(existingPaymentIntentId, {
      amount,
      currency: session.totals.currency.toLowerCase(),
      metadata: { ucpCheckoutSessionId: session.id },
    });
    return { id: updated.id, client_secret: updated.client_secret };
  }

  const created = await stripe.paymentIntents.create({
    amount,
    currency: session.totals.currency.toLowerCase(),
    metadata: { ucpCheckoutSessionId: session.id },
  });

  return { id: created.id, client_secret: created.client_secret };
}

/**
 * Confirm a PaymentIntent using a payment method id supplied by the buyer's
 * agent/platform (the `payment_data.payment_method_id` field of
 * ucp_complete_checkout / POST .../checkout/{id} action=complete).
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  return stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethodId,
  });
}

/** Retrieve a PaymentIntent's current status. */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}
