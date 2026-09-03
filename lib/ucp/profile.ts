/**
 * UCP Discovery Profile Generator
 *
 * Produces the JSON document served at GET /.well-known/ucp, describing
 * this business's UCP capabilities, transports, and payment handlers.
 */

import ucpConfig from "../../ucp.config.json";
import { SERVER_URL } from "../constants";

interface ServiceDefinition {
  version: string;
  spec: string;
  rest?: { schema: string; endpoint: string };
  mcp?: { schema: string; endpoint: string };
}

interface CapabilityDefinition {
  name: string;
  version: string;
  spec: string;
  schema: string;
  extends?: string;
}

interface PaymentHandlerDefinition {
  id: string;
  type: string;
  spec: string;
  config_schema: string;
}

export interface UCPProfile {
  ucp: {
    version: string;
    services: Record<string, ServiceDefinition>;
    capabilities: CapabilityDefinition[];
  };
  payment?: {
    handlers: PaymentHandlerDefinition[];
  };
}

const EXTENSION_MAP: Record<
  string,
  { spec: string; schema: string; extends?: string }
> = {
  "dev.ucp.shopping.order": {
    spec: "https://ucp.dev/spec/capabilities/order",
    schema: "https://ucp.dev/spec/schemas/shopping/order.json",
  },
  "dev.ucp.shopping.fulfillment": {
    spec: "https://ucp.dev/spec/capabilities/fulfillment",
    schema: "https://ucp.dev/spec/schemas/shopping/fulfillment.json",
    extends: "dev.ucp.shopping.checkout",
  },
  "dev.ucp.shopping.discount": {
    spec: "https://ucp.dev/spec/capabilities/discount",
    schema: "https://ucp.dev/spec/schemas/shopping/discount.json",
    extends: "dev.ucp.shopping.checkout",
  },
};

const HANDLER_MAP: Record<string, Omit<PaymentHandlerDefinition, "id">> = {
  stripe: {
    type: "tokenization",
    spec: "https://ucp.dev/spec/handlers/stripe",
    config_schema: "https://ucp.dev/spec/handlers/stripe/config.json",
  },
};

function buildCapabilities(): CapabilityDefinition[] {
  const capabilities: CapabilityDefinition[] = [
    {
      name: "dev.ucp.shopping.checkout",
      version: ucpConfig.ucp_version,
      spec: "https://ucp.dev/spec/capabilities/checkout",
      schema: "https://ucp.dev/spec/schemas/shopping/checkout.json",
    },
  ];

  for (const ext of ucpConfig.capabilities.extensions) {
    const def = EXTENSION_MAP[ext];
    capabilities.push({
      name: ext,
      version: ucpConfig.ucp_version,
      spec: def?.spec ?? "",
      schema: def?.schema ?? "",
      ...(def?.extends && { extends: def.extends }),
    });
  }

  return capabilities;
}

export function generateProfile(): UCPProfile {
  const baseUrl = SERVER_URL.startsWith("http")
    ? SERVER_URL
    : `https://${ucpConfig.domain}`;

  const profile: UCPProfile = {
    ucp: {
      version: ucpConfig.ucp_version,
      services: {
        "dev.ucp.shopping": {
          version: ucpConfig.ucp_version,
          spec: "https://ucp.dev/spec/services/shopping",
          ...(ucpConfig.transports.includes("rest") && {
            rest: {
              schema:
                "https://ucp.dev/spec/services/shopping/rest.openapi.json",
              endpoint: `${baseUrl}/api/ucp`,
            },
          }),
          ...(ucpConfig.transports.includes("mcp") && {
            mcp: {
              schema:
                "https://ucp.dev/spec/services/shopping/mcp.openrpc.json",
              endpoint: `${baseUrl}/api/mcp`,
            },
          }),
        },
      },
      capabilities: buildCapabilities(),
    },
  };

  if (ucpConfig.payment_handlers.length > 0) {
    profile.payment = {
      handlers: ucpConfig.payment_handlers.map((id) => ({
        id,
        ...(HANDLER_MAP[id] ?? { type: "custom", spec: "", config_schema: "" }),
      })),
    };
  }

  return profile;
}
