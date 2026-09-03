/**
 * UCP Capability Negotiation
 *
 * Parses the `UCP-Agent` request header (RFC 8941-style dictionary) and
 * negotiates the set of capabilities to advertise back to the caller.
 */

import ucpConfig from "../../ucp.config.json";

export interface UCPAgentInfo {
  profile: string;
}

export interface NegotiationResult {
  capabilities: string[];
  version: string;
}

/**
 * Parse UCP-Agent header.
 * Example: `UCP-Agent: profile="https://platform.example.com/.well-known/ucp"`
 */
export function parseUCPAgent(header: string | null): UCPAgentInfo | null {
  if (!header) return null;

  const profileMatch = header.match(/profile="([^"]+)"/);
  if (!profileMatch) return null;

  return { profile: profileMatch[1] };
}

const businessCapabilities = [
  ...ucpConfig.capabilities.core,
  ...ucpConfig.capabilities.extensions,
];

/**
 * Negotiate capabilities between this business and a calling platform.
 * If no platform profile is provided (or it can't be fetched), fall back
 * to advertising all business capabilities.
 */
export async function negotiateCapabilities(
  platformProfileUrl?: string | null
): Promise<NegotiationResult> {
  if (!platformProfileUrl) {
    return {
      capabilities: businessCapabilities,
      version: ucpConfig.ucp_version,
    };
  }

  try {
    const response = await fetch(platformProfileUrl, {
      headers: { Accept: "application/json" },
      // Keep negotiation snappy; a slow/unreachable platform profile
      // should not block checkout.
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return {
        capabilities: businessCapabilities,
        version: ucpConfig.ucp_version,
      };
    }

    const platformProfile = await response.json();
    const platformCapabilities = new Set<string>(
      (platformProfile?.ucp?.capabilities ?? []).map(
        (c: { name: string }) => c.name
      )
    );

    const intersection = businessCapabilities.filter((c) =>
      platformCapabilities.has(c)
    );

    return {
      capabilities: intersection.length > 0 ? intersection : businessCapabilities,
      version: ucpConfig.ucp_version,
    };
  } catch {
    return {
      capabilities: businessCapabilities,
      version: ucpConfig.ucp_version,
    };
  }
}
