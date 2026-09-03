/**
 * UCP Order Endpoint
 * GET /api/ucp/orders/{id} — Retrieve the current state of an order
 *
 * Backs the `dev.ucp.shopping.order` capability. Read-only: reads from
 * the existing Order/OrderItem tables via `getOrderById` and maps the
 * result into the UCP order response shape (see lib/ucp/handlers/order.ts).
 */

import { NextRequest } from "next/server";
import { getUcpOrder } from "@/lib/ucp/handlers/order";
import { negotiateCapabilities, parseUCPAgent } from "@/lib/ucp/negotiation";
import { wrapResponse, errorResponse } from "@/lib/ucp/response";

export const runtime = "nodejs"; // Edge runtime is not supported by UCP

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const ucpAgent = parseUCPAgent(request.headers.get("UCP-Agent"));
  const negotiation = await negotiateCapabilities(ucpAgent?.profile);

  const order = await getUcpOrder(id, negotiation.capabilities);
  if (!order) {
    return errorResponse(404, "order_not_found", `Order ${id} not found`);
  }

  return wrapResponse(order, negotiation, 200);
}
