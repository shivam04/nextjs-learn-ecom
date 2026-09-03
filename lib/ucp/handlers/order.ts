/**
 * UCP Order Handler
 *
 * Backs the `dev.ucp.shopping.order` capability. Read-only: reads order
 * information from the existing `Order`/`OrderItem` tables via
 * `getOrderById` (`lib/actions/order.action.ts`) and converts it into the
 * UCP order response shape. No new order-related writes are introduced —
 * this capability only exposes lifecycle *state*, mirroring how UCP's own
 * reference implementations (e.g. Shopify's Order MCP `get_order`) treat
 * order as read-only, with webhooks/polling as the update channel.
 */

import ucpConfig from "../../../ucp.config.json";
import { getOrderById } from "@/lib/actions/order.action";
import { toMinorUnits } from "../money";
import type {
  UCPOrder,
  OrderMoneyRow,
  OrderLineItem,
  OrderLineItemStatus,
} from "../types/order";
import type { ShippingAddress } from "@/types";

/**
 * Retrieve an order by id and map it into the UCP order wire format.
 * Returns null if no order exists with that id.
 */
export async function getUcpOrder(
  orderId: string,
  capabilities: string[]
): Promise<UCPOrder | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const shippingAddress = order.shippingAddress as ShippingAddress;

  const totals: OrderMoneyRow[] = [
    {
      type: "subtotal",
      amount: toMinorUnits(order.itemsPrice),
      display_text: "subtotal",
    },
    ...(Number(order.taxPrice) > 0
      ? [
          {
            type: "tax",
            amount: toMinorUnits(order.taxPrice),
            display_text: "tax",
          },
        ]
      : []),
    {
      type: "fulfillment",
      amount: toMinorUnits(order.shippingPrice),
      display_text: "fulfillment",
    },
    {
      type: "total",
      amount: toMinorUnits(order.totalPrice),
      display_text: "total",
    },
  ];

  const lineItemStatus: OrderLineItemStatus = order.isDelivered
    ? "fulfilled"
    : "processing";

  const lineItems: OrderLineItem[] = order.orderitems.map((item) => {
    const lineTotal = toMinorUnits(item.price) * item.qty;
    return {
      id: `${order.id}:${item.productId}`,
      item: {
        id: item.productId,
        title: item.name,
        price: toMinorUnits(item.price),
        image_url: item.image || null,
      },
      quantity: {
        original: item.qty,
        total: item.qty,
        fulfilled: order.isDelivered ? item.qty : 0,
      },
      totals: [
        { type: "subtotal", amount: lineTotal, display_text: "subtotal" },
        { type: "total", amount: lineTotal, display_text: "total" },
      ],
      status: lineItemStatus,
    };
  });

  const events = [];
  if (order.isPaid && order.paidAt) {
    events.push({ type: "processing", occurred_at: order.paidAt.toISOString() });
  }
  if (order.isDelivered && order.deliveredAt) {
    events.push({ type: "delivered", occurred_at: order.deliveredAt.toISOString() });
  }

  const ucpOrder: UCPOrder = {
    ucp: {
      version: ucpConfig.ucp_version,
      capabilities,
    },
    id: order.id,
    label: `#${order.id.slice(-6).toUpperCase()}`,
    currency: "USD",
    totals,
    line_items: lineItems,
    fulfillment: {
      expectations: shippingAddress
        ? [
            {
              destination: {
                full_name: shippingAddress.fullName,
                street_address: shippingAddress.streetAddress,
                city: shippingAddress.city,
                postal_code: shippingAddress.postalCode,
                country: shippingAddress.country,
              },
            },
          ]
        : [],
      events,
    },
    // No refund/return/order-edit actions are tracked by this app today,
    // so there is nothing honest to report here yet.
    adjustments: [],
  };

  return ucpOrder;
}
