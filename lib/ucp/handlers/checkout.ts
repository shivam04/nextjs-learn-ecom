/**
 * UCP Checkout Handler
 *
 * Core business logic for the UCP shopping.checkout capability, backed by
 * the `UcpCheckoutSession` Prisma model. Reuses the existing data layer
 * wherever possible:
 *  - product lookups: `lib/ucp/handlers/products.ts` -> Prisma `Product`
 *  - order finalization: `lib/actions/order.action.ts` `updateOrderToPaid`
 *    (stock decrement + isPaid/paidAt + purchase receipt email)
 *  - payment: `lib/ucp/handlers/stripe.ts` (Stripe PaymentIntents)
 *
 * A UcpCheckoutSession is intentionally decoupled from the existing
 * cart/user-session flow: it can be created and completed entirely by a
 * headless agent (REST or MCP) with no browser cookie, using an explicit
 * `buyer.email` for guest identity instead of the `sessionCartId` cookie
 * the browser UI relies on.
 */

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { hashSync } from "bcrypt-ts-edge";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import ucpConfig from "../../../ucp.config.json";
import { SERVER_URL } from "@/lib/constants";
import { updateOrderToPaid } from "@/lib/actions/order.action";
import type {
  CheckoutSession,
  CheckoutStatus,
  CheckoutMessage,
  LineItem,
} from "../types/checkout";
import type {
  CreateCheckoutRequest,
  UpdateCheckoutRequest,
} from "../schemas/checkout";
import { resolveLineItems } from "./products";
import { calcTotals } from "./pricing";
import { fromMinorUnits, toMinorUnits } from "../money";
import { createPaymentSPT } from "./stripe";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// The `prisma` client is extended in `db/prisma.ts` to stringify Decimal
// money fields, so we derive the row type from the extended client itself
// rather than the raw `@prisma/client` model type (which would still type
// those fields as `Decimal`).
type UcpCheckoutSessionRow = NonNullable<
  Awaited<ReturnType<typeof prisma.ucpCheckoutSession.findFirst>>
>;

interface CreateCheckoutOptions {
  capabilities: string[];
}

interface CompletePaymentData {
  handler_id: string;
  payment_method_id?: string;
}

/** Serialize a DB row into the UCP wire format. */
function serialize(row: UcpCheckoutSessionRow): CheckoutSession {
  const lineItems = row.lineItems as unknown as LineItem[];
  const messages = row.messages as unknown as CheckoutMessage[];
  const capabilities = row.capabilities as unknown as string[];

  const session: CheckoutSession = {
    ucp: {
      version: ucpConfig.ucp_version,
      capabilities,
    },
    id: row.id,
    status: row.status as CheckoutStatus,
    currency: row.currency,
    line_items: lineItems,
    totals: {
      subtotal: toMinorUnits(row.itemsPrice),
      tax: toMinorUnits(row.taxPrice),
      shipping: toMinorUnits(row.shippingPrice),
      discount: 0,
      grand_total: toMinorUnits(row.totalPrice),
      currency: row.currency,
    },
    payment: {
      status: row.paymentStatus as CheckoutSession["payment"]["status"],
      handlers: ucpConfig.payment_handlers.map((id) => ({
        id,
        type: "tokenization",
      })),
      amount_due: toMinorUnits(row.totalPrice),
      currency: row.currency,
    },
    links: {
      self: `${SERVER_URL}/api/ucp/checkout/${row.id}`,
      privacy_policy: ucpConfig.policy_urls.privacy,
      terms_of_service: ucpConfig.policy_urls.terms,
      ...(ucpConfig.policy_urls.refunds && {
        refund_policy: ucpConfig.policy_urls.refunds,
      }),
      ...(ucpConfig.policy_urls.shipping && {
        shipping_policy: ucpConfig.policy_urls.shipping,
      }),
    },
    messages,
    expires_at: row.expiresAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };

  if (row.buyerEmail || row.buyerName || row.buyerPhone) {
    session.buyer = {
      ...(row.buyerEmail && { email: row.buyerEmail }),
      ...(row.buyerName && { name: row.buyerName }),
      ...(row.buyerPhone && { phone: row.buyerPhone }),
    };
  }

  if (row.shippingAddress) {
    session.shipping_address =
      row.shippingAddress as unknown as CheckoutSession["shipping_address"];
  }

  if (row.orderId) {
    session.order_id = row.orderId;
  }

  // Note: `payment.client_secret` is intentionally not persisted on the
  // row — it's only ever attached to the object returned directly from
  // `completeCheckout()`, fetched fresh from Stripe for that response.

  return session;
}

function determineStatus(
  lineItems: LineItem[],
  buyerEmail: string | null,
  shippingAddress: unknown,
  messages: CheckoutMessage[]
): CheckoutStatus {
  if (lineItems.length === 0) return "incomplete";
  if (!buyerEmail || !shippingAddress) return "incomplete";
  if (messages.some((m) => m.severity === "requires_buyer_input")) {
    return "requires_escalation";
  }
  return "ready_for_complete";
}

function generateMessages(
  buyerEmail: string | null,
  shippingAddress: unknown
): CheckoutMessage[] {
  const messages: CheckoutMessage[] = [];

  if (!buyerEmail) {
    messages.push({
      code: "missing_buyer_email",
      severity: "recoverable",
      message: "Buyer email is required to complete checkout",
      field: "buyer.email",
    });
  }

  if (!shippingAddress) {
    messages.push({
      code: "missing_shipping_address",
      severity: "recoverable",
      message: "Shipping address is required to complete checkout",
      field: "shipping_address",
    });
  }

  return messages;
}

function lineItemsToDecimalTotals(lineItems: LineItem[]) {
  const totals = calcTotals(lineItems);
  return {
    itemsPrice: fromMinorUnits(totals.subtotal),
    taxPrice: fromMinorUnits(totals.tax),
    shippingPrice: fromMinorUnits(totals.shipping),
    totalPrice: fromMinorUnits(totals.grand_total),
  };
}

export async function createCheckout(
  request: CreateCheckoutRequest,
  options: CreateCheckoutOptions
): Promise<CheckoutSession> {
  const lineItems = await resolveLineItems(request.line_items);
  const decimals = lineItemsToDecimalTotals(lineItems);

  const buyerEmail = request.buyer?.email ?? null;
  const messages = generateMessages(buyerEmail, request.shipping_address);
  const status = determineStatus(
    lineItems,
    buyerEmail,
    request.shipping_address,
    messages
  );

  const row = await prisma.ucpCheckoutSession.create({
    data: {
      status,
      currency: request.currency,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      ...decimals,
      buyerEmail: request.buyer?.email,
      buyerName: request.buyer?.name,
      buyerPhone: request.buyer?.phone,
      shippingAddress: request.shipping_address
        ? (request.shipping_address as unknown as Prisma.InputJsonValue)
        : undefined,
      messages: messages as unknown as Prisma.InputJsonValue,
      capabilities: options.capabilities as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return serialize(row);
}

export async function getCheckout(id: string): Promise<CheckoutSession | null> {
  const row = await prisma.ucpCheckoutSession.findFirst({ where: { id } });
  if (!row) return null;
  return serialize(row);
}

export async function updateCheckout(
  id: string,
  request: UpdateCheckoutRequest,
  capabilities: string[]
): Promise<CheckoutSession | null> {
  const existing = await prisma.ucpCheckoutSession.findFirst({ where: { id } });
  if (!existing) return null;

  if (["completed", "canceled"].includes(existing.status)) {
    throw new Error("Checkout cannot be modified in its current state");
  }

  let lineItems = existing.lineItems as unknown as LineItem[];
  if (request.line_items) {
    lineItems = await resolveLineItems(request.line_items);
  }
  const decimals = lineItemsToDecimalTotals(lineItems);

  const buyerEmail = request.buyer?.email ?? existing.buyerEmail;
  const buyerName = request.buyer?.name ?? existing.buyerName;
  const buyerPhone = request.buyer?.phone ?? existing.buyerPhone;
  const shippingAddress = request.shipping_address ?? existing.shippingAddress;

  const messages = generateMessages(buyerEmail, shippingAddress);
  const status = determineStatus(lineItems, buyerEmail, shippingAddress, messages);

  const row = await prisma.ucpCheckoutSession.update({
    where: { id },
    data: {
      status,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      ...decimals,
      buyerEmail,
      buyerName,
      buyerPhone,
      shippingAddress: shippingAddress
        ? (shippingAddress as unknown as Prisma.InputJsonValue)
        : undefined,
      messages: messages as unknown as Prisma.InputJsonValue,
      capabilities: capabilities as unknown as Prisma.InputJsonValue,
    },
  });

  return serialize(row);
}

/**
 * Find an existing user by email, or create a lightweight guest user
 * record so the (non-nullable) Order.userId foreign key can be satisfied
 * for agent-driven checkouts that never went through sign-up/sign-in.
 * A random password hash is set since `User.password` doesn't accept
 * null-but-required combos cleanly elsewhere in the app; this account is
 * unusable for credential sign-in unless the buyer later resets it.
 */
async function findOrCreateGuestUser(email: string, name?: string) {
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      password: hashSync(randomUUID(), 10),
    },
  });
}

export async function completeCheckout(
  id: string,
  paymentData: CompletePaymentData,
  capabilities: string[]
): Promise<CheckoutSession> {
  const existing = await prisma.ucpCheckoutSession.findFirst({ where: { id } });
  if (!existing) {
    throw new Error("Checkout session not found");
  }

  if (existing.status !== "ready_for_complete") {
    throw new Error(
      `Checkout is not ready for completion (status: ${existing.status})`
    );
  }

  if (!ucpConfig.payment_handlers.includes(paymentData.handler_id)) {
    throw new Error(`Unknown payment handler: ${paymentData.handler_id}`);
  }

  const lineItems = existing.lineItems as unknown as LineItem[];
  const totals = calcTotals(lineItems, existing.currency);

  if (!paymentData.payment_method_id) {
    // No shared payment token (SPT) supplied yet — nothing to confirm
    // against, since createPaymentSPT creates and confirms in one step.
    const row = await prisma.ucpCheckoutSession.update({
      where: { id },
      data: {
        status: "requires_escalation",
        paymentHandlerId: paymentData.handler_id,
        messages: [
          {
            code: "payment_method_required",
            severity: "requires_buyer_input",
            message:
              "A payment_method_id (shared payment token) is required to complete this checkout",
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    return serialize(row);
  }

  await prisma.ucpCheckoutSession.update({
    where: { id },
    data: { status: "complete_in_progress", capabilities: capabilities as unknown as Prisma.InputJsonValue },
  });

  try {
    const stripeIntent = await createPaymentSPT(
      paymentData.payment_method_id,
      totals.grand_total,
      totals.currency,
      { ucpCheckoutSessionId: existing.id }
    );

    if (stripeIntent.status === "succeeded") {
      const orderId = await finalizeOrder(existing, lineItems);

      // Reuse the existing order-finalization action instead of
      // duplicating stock-decrement / isPaid / receipt-email logic.
      await updateOrderToPaid({
        orderId,
        paymentResult: {
          id: stripeIntent.id,
          status: "COMPLETED",
          email_address: existing.buyerEmail ?? "",
          pricePaid: fromMinorUnits(totals.grand_total),
        },
      });

      const row = await prisma.ucpCheckoutSession.update({
        where: { id },
        data: {
          status: "completed",
          paymentStatus: "captured",
          paymentIntentId: stripeIntent.id,
          paymentHandlerId: paymentData.handler_id,
          orderId,
        },
      });
      return serialize(row);
    }

    if (
      stripeIntent.status === "requires_action" ||
      stripeIntent.status === "requires_confirmation"
    ) {
      const row = await prisma.ucpCheckoutSession.update({
        where: { id },
        data: {
          status: "requires_escalation",
          paymentStatus: "pending",
          paymentIntentId: stripeIntent.id,
          paymentHandlerId: paymentData.handler_id,
          messages: [
            {
              code: "payment_requires_action",
              severity: "requires_buyer_input",
              message:
                "Additional authentication is required to complete this payment",
            },
          ] as unknown as Prisma.InputJsonValue,
        },
      });
      const session = serialize(row);
      session.payment.client_secret = stripeIntent.client_secret ?? undefined;
      return session;
    }

    // Payment failed outright.
    const row = await prisma.ucpCheckoutSession.update({
      where: { id },
      data: {
        status: "ready_for_complete",
        paymentStatus: "failed",
        paymentIntentId: stripeIntent.id,
        messages: [
          {
            code: "payment_failed",
            severity: "recoverable",
            message: `Payment could not be completed (status: ${stripeIntent.status})`,
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    return serialize(row);
  } catch (error) {
    await prisma.ucpCheckoutSession.update({
      where: { id },
      data: {
        status: "ready_for_complete",
        paymentStatus: "failed",
        messages: [
          {
            code: "payment_processing_error",
            severity: "recoverable",
            message: error instanceof Error ? error.message : "Payment processing failed",
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    throw error;
  }
}

/**
 * Create the real Order + OrderItems from a completed UcpCheckoutSession,
 * then reuse the existing `updateOrderToPaid` action (stock decrement,
 * isPaid/paidAt, purchase receipt email) instead of duplicating that logic.
 */
async function finalizeOrder(
  session: UcpCheckoutSessionRow,
  lineItems: LineItem[]
): Promise<string> {
  const authSession = await auth();
  let userId = authSession?.user?.id;

  if (!userId) {
    if (!session.buyerEmail) {
      throw new Error("buyer.email is required to finalize a guest order");
    }
    const user = await findOrCreateGuestUser(
      session.buyerEmail,
      session.buyerName ?? undefined
    );
    userId = user.id;
  }

  const shippingAddress = session.shippingAddress;
  if (!shippingAddress) {
    throw new Error("shipping_address is required to finalize an order");
  }

  const orderId = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: userId!,
        shippingAddress: shippingAddress as Prisma.InputJsonValue,
        paymentMethod: "Stripe",
        itemsPrice: session.itemsPrice,
        taxPrice: session.taxPrice,
        shippingPrice: session.shippingPrice,
        totalPrice: session.totalPrice,
      },
    });

    for (const item of lineItems) {
      const product = await tx.product.findFirst({
        where: { id: item.product_id },
      });
      if (!product) {
        throw new Error(`Product not found while finalizing order: ${item.product_id}`);
      }

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.product_id,
          qty: item.quantity,
          price: fromMinorUnits(item.unit_price),
          name: item.name,
          slug: product.slug,
          image: product.images[0] ?? "",
        },
      });
    }

    return order.id;
  });

  return orderId;
}
