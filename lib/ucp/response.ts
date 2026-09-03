/**
 * UCP Response Helpers
 *
 * Standardizes the response envelope and error format for UCP REST routes.
 */

import { NextResponse } from "next/server";
import type { NegotiationResult } from "./negotiation";

/** Wrap a payload with UCP metadata and return a JSON response. */
export function wrapResponse<T extends object>(
  data: T,
  negotiation: NegotiationResult,
  status: number = 200
): NextResponse {
  const response = {
    ...data,
    ucp: {
      version: negotiation.version,
      capabilities: negotiation.capabilities,
    },
  };

  return NextResponse.json(response, { status });
}

/** Build a UCP-style error response. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}
