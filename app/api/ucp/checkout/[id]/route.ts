/**
 * UCP Checkout Session Endpoint
 * GET   /api/ucp/checkout/{id}            — Retrieve a checkout session
 * PATCH /api/ucp/checkout/{id}            — Update a checkout session
 * POST  /api/ucp/checkout/{id}            — Complete checkout (action="complete")
 */

import { NextRequest } from "next/server";
import {
  getCheckout,
  updateCheckout,
  completeCheckout,
} from "@/lib/ucp/handlers/checkout";
import {
  UpdateCheckoutRequestSchema,
  CompleteCheckoutRequestSchema,
} from "@/lib/ucp/schemas/checkout";
import { negotiateCapabilities, parseUCPAgent } from "@/lib/ucp/negotiation";
import { wrapResponse, errorResponse } from "@/lib/ucp/response";

export const runtime = "nodejs"; // Edge runtime is not supported by UCP

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const ucpAgent = parseUCPAgent(request.headers.get("UCP-Agent"));
  const negotiation = await negotiateCapabilities(ucpAgent?.profile);

  const checkout = await getCheckout(id);
  if (!checkout) {
    return errorResponse(404, "checkout_not_found", `Checkout session ${id} not found`);
  }

  return wrapResponse(checkout, negotiation, 200);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ucpAgent = parseUCPAgent(request.headers.get("UCP-Agent"));
    const negotiation = await negotiateCapabilities(ucpAgent?.profile);

    const body = await request.json().catch(() => null);
    if (body === null) {
      return errorResponse(400, "invalid_request", "Request body must be valid JSON");
    }

    const parsed = UpdateCheckoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        "invalid_request",
        parsed.error.issues.map((i) => i.message).join(". ")
      );
    }

    const checkout = await updateCheckout(id, parsed.data, negotiation.capabilities);
    if (!checkout) {
      return errorResponse(404, "checkout_not_found", `Checkout session ${id} not found`);
    }

    return wrapResponse(checkout, negotiation, 200);
  } catch (error) {
    console.error("UCP checkout update failed:", error);
    return errorResponse(
      400,
      "checkout_update_failed",
      error instanceof Error ? error.message : "Failed to update checkout session"
    );
  }
}

/**
 * POST is used for the "complete" action, per the UCP REST spec pattern of
 * `POST /checkout/{id}` with `{ action: "complete", payment_data }`.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ucpAgent = parseUCPAgent(request.headers.get("UCP-Agent"));
    const negotiation = await negotiateCapabilities(ucpAgent?.profile);

    const body = await request.json().catch(() => null);
    if (body === null) {
      return errorResponse(400, "invalid_request", "Request body must be valid JSON");
    }

    const parsed = CompleteCheckoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        "invalid_request",
        parsed.error.issues.map((i) => i.message).join(". ")
      );
    }

    const checkout = await completeCheckout(
      id,
      parsed.data.payment_data,
      negotiation.capabilities
    );

    return wrapResponse(checkout, negotiation, 200);
  } catch (error) {
    console.error("UCP checkout completion failed:", error);
    return errorResponse(
      400,
      "checkout_completion_failed",
      error instanceof Error ? error.message : "Failed to complete checkout"
    );
  }
}
