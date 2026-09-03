/**
 * UCP Checkout Session Endpoint
 * POST /api/ucp/checkout — Create a checkout session
 */

import { NextRequest } from "next/server";
import { createCheckout } from "@/lib/ucp/handlers/checkout";
import { CreateCheckoutRequestSchema } from "@/lib/ucp/schemas/checkout";
import { negotiateCapabilities, parseUCPAgent } from "@/lib/ucp/negotiation";
import { wrapResponse, errorResponse } from "@/lib/ucp/response";

export const runtime = "nodejs"; // Edge runtime is not supported by UCP

export async function POST(request: NextRequest) {
  try {
    const ucpAgent = parseUCPAgent(request.headers.get("UCP-Agent"));
    const negotiation = await negotiateCapabilities(ucpAgent?.profile);

    const body = await request.json().catch(() => null);
    if (body === null) {
      return errorResponse(400, "invalid_request", "Request body must be valid JSON");
    }

    const parsed = CreateCheckoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        "invalid_request",
        parsed.error.issues.map((i) => i.message).join(". ")
      );
    }

    const checkout = await createCheckout(parsed.data, {
      capabilities: negotiation.capabilities,
    });

    return wrapResponse(checkout, negotiation, 201);
  } catch (error) {
    console.error("UCP checkout creation failed:", error);
    return errorResponse(
      500,
      "internal_error",
      error instanceof Error ? error.message : "Failed to create checkout session"
    );
  }
}
