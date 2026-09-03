/**
 * UCP Discovery Profile Endpoint
 * GET /.well-known/ucp
 */

import { NextResponse } from "next/server";
import { generateProfile } from "@/lib/ucp/profile";

export const runtime = "nodejs"; // Edge runtime is not supported by UCP

export async function GET() {
  const profile = generateProfile();

  return NextResponse.json(profile, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
