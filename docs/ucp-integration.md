# UCP Integration

This project implements the [Universal Commerce Protocol](https://github.com/vercel-labs/agentic-commerce-skills/blob/main/ucp/SKILL.md)
`shopping.checkout` capability over both REST and MCP transports, backed by
the existing Prisma/Postgres datastore and Stripe as the payment handler.

**Role:** business (merchant)
**Domain:** `nextjs-learn-ecom.vercel.app`
**Config:** [`ucp.config.json`](../ucp.config.json)

## Discovery

```
GET /.well-known/ucp
```

Returns capabilities, transports, and payment handlers. See `lib/ucp/profile.ts`.

## REST transport

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ucp/checkout` | Create a checkout session |
| GET | `/api/ucp/checkout/{id}` | Retrieve a checkout session |
| PATCH | `/api/ucp/checkout/{id}` | Update line items / buyer / shipping address |
| POST | `/api/ucp/checkout/{id}` (`action: "complete"`) | Complete checkout with payment |
| GET | `/api/ucp/orders/{id}` | Read-only: current lifecycle state of an order (`dev.ucp.shopping.order`) |

Requests/responses use integer minor units (cents) for money, matching
Stripe's convention — see `lib/ucp/money.ts`. This differs from the rest of
the codebase, which stores money as decimal strings (`lib/validators.ts`).

Callers may send a `UCP-Agent: profile="https://.../.well-known/ucp"` header
to negotiate capabilities (`lib/ucp/negotiation.ts`); without it, all
configured business capabilities are advertised.

## MCP transport

```
POST/GET /api/mcp
```

Implemented with `mcp-handler` + `@modelcontextprotocol/sdk`. Tools:

- `ucp_get_profile`
- `ucp_list_products`, `ucp_get_product`
- `ucp_create_checkout`, `ucp_get_checkout`, `ucp_update_checkout`, `ucp_complete_checkout`
- `ucp_get_payment_handlers`
- `ucp_get_order` (only registered when `dev.ucp.shopping.order` is in `ucp.config.json`'s `capabilities.extensions`)

MCP client config:

```json
{
  "mcpServers": {
    "ucp-shopping": { "url": "https://nextjs-learn-ecom.vercel.app/api/mcp" }
  }
}
```

`ucp_get_order` mirrors `GET /api/ucp/orders/{id}` — it is read-only and does not poll; per the UCP order capability's own reference implementations (Shopify's Order MCP, Google's UCP order guide), this is a buyer-initiated/reconciliation lookup, not the primary update channel (that would be order webhooks, not implemented here).

## Checkout status lifecycle

```
incomplete → ready_for_complete → complete_in_progress → completed
                                                        ↘ requires_escalation (payment needs action)
                                                        ↘ ready_for_complete (payment failed, retryable)
```

## Data model

A new `UcpCheckoutSession` Prisma model (`prisma/schema.prisma`) stores
checkout state independently of the existing `Cart`/`Order` flow, so an
agent can drive checkout end-to-end via REST/MCP with no browser cookie.

On successful payment, `completeCheckout()` (`lib/ucp/handlers/checkout.ts`):

1. Creates a real `Order` + `OrderItem` rows from the session's line items.
2. Calls the existing `updateOrderToPaid()` action
   (`lib/actions/order.action.ts`) to reuse stock-decrement, `isPaid`/`paidAt`,
   and purchase-receipt-email logic — no duplicated business logic.
3. Links the session to the resulting `orderId`.

Product pricing/stock is resolved via `lib/ucp/handlers/products.ts`,
reading directly from the same `Product` table used by
`lib/actions/product.actions.ts`.

## Order capability (`dev.ucp.shopping.order`)

`lib/ucp/handlers/order.ts` (`getUcpOrder`) reads an existing `Order` row via
`getOrderById()` (`lib/actions/order.action.ts` — unchanged) and maps it into
the UCP order shape:

- `totals[]` — subtotal / tax (when non-zero) / fulfillment / total, derived
  from the order's decimal-string price fields via `toMinorUnits()`.
- `line_items[]` — one entry per `OrderItem`, with `quantity.total`/`.original`
  from `qty` and `quantity.fulfilled` set to the full quantity once
  `isDelivered` is true (this app has no partial-fulfillment tracking, so
  there's no partial state to report).
- `fulfillment.expectations[]` — the order's `shippingAddress`.
- `fulfillment.events[]` — synthesized from `paidAt` (`"processing"`) and
  `deliveredAt` (`"delivered"`); this app doesn't track shipment tracking
  numbers or carrier events, so nothing more granular is available.
- `adjustments[]` — always empty; this app has no refund/return/order-edit
  tracking to report honestly.

This capability is intentionally **read-only** (no order-webhook push, no
polling loop) — both REST (`GET /api/ucp/orders/{id}`) and MCP
(`ucp_get_order`) just answer "what is this order's current state right now,"
matching how UCP's own reference implementations (Shopify Order MCP, Google's
UCP order guide) describe the capability: webhooks/push are the primary update
channel, and `get_order` is for buyer-initiated views or reconciliation.
Implementing outbound order webhooks was out of scope here since there's
no registered platform/webhook subscriber in this codebase yet.

## Payment (Stripe)

`lib/ucp/handlers/stripe.ts` creates/confirms a Stripe PaymentIntent per
checkout session (metadata: `ucpCheckoutSessionId`), mirroring the pattern
already used for the existing order flow
(`app/(root)/order/[id]/page.tsx`). The Stripe webhook
(`app/api/webhooks/stripe/route.ts`) was extended to also finalize a linked
`UcpCheckoutSession`'s order as a backstop if `completeCheckout()`'s
synchronous confirmation didn't finish (e.g. client disconnected).

## Known limitations / follow-ups

- **Guest identity:** a UCP checkout with no authenticated session and a new
  `buyer.email` creates a lightweight `User` row with a random unusable
  password (`findOrCreateGuestUser` in `checkout.ts`) so the existing
  `Order.userId` foreign key can be satisfied. Consider a dedicated
  guest-order path if this matters for your data model.
- **Idempotency:** `POST /api/ucp/checkout` does not yet dedupe on an
  `Idempotency-Key` header (accepted by CORS config, not yet enforced).
- **Extensions not implemented:** fulfillment options and discounts are not
  wired up (not in `ucp.config.json`'s `capabilities.extensions` beyond
  `dev.ucp.shopping.order`).
- **Migration:** `prisma/migrations/20260904120000_add_ucp_checkout_session/`
  was authored by hand (network access to the Neon database was unavailable
  in the environment this was built in) — review and run
  `npx prisma migrate deploy` (or `migrate dev`) against your database before
  relying on this in an environment with DB access.
