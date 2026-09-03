/**
 * UCP MCP Transport Endpoint
 *
 * Exposes the Universal Commerce Protocol shopping capabilities (product
 * catalog + checkout) as MCP tools, backed by the same handlers used by
 * the REST transport (`lib/ucp/handlers/*`).
 *
 * @see https://github.com/vercel/mcp-handler
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  createCheckout,
  getCheckout,
  updateCheckout,
  completeCheckout,
} from "@/lib/ucp/handlers/checkout";
import { getUcpOrder } from "@/lib/ucp/handlers/order";
import { negotiateCapabilities } from "@/lib/ucp/negotiation";
import { generateProfile } from "@/lib/ucp/profile";
import {
  getAllProducts,
  getProductbySlug,
} from "@/lib/actions/product.actions";
import ucpConfig from "../../../../ucp.config.json";

export const runtime = "nodejs"; // Edge runtime is not supported by UCP

const LineItemInputShape = {
  product_id: z.string().describe("Product id to add to the checkout"),
  quantity: z.number().int().positive().describe("Quantity of the product"),
};

const BuyerShape = {
  email: z.string().email().optional().describe("Buyer email address"),
  phone: z.string().optional().describe("Buyer phone number"),
  name: z.string().optional().describe("Buyer full name"),
};

const ShippingAddressShape = {
  full_name: z.string().describe("Recipient full name"),
  street_address: z.string().describe("Street address"),
  city: z.string().describe("City"),
  postal_code: z.string().describe("Postal / ZIP code"),
  country: z.string().describe("Country"),
};

const handler = createMcpHandler(
  (server) => {
    // -----------------------------------------------------------------
    // UCP Discovery
    // -----------------------------------------------------------------
    server.registerTool(
      "ucp_get_profile",
      {
        title: "Get UCP Profile",
        description:
          "Retrieve the UCP discovery profile for this business: supported capabilities, transports, and payment handlers.",
        inputSchema: {},
      },
      async () => ({
        content: [
          { type: "text", text: JSON.stringify(generateProfile(), null, 2) },
        ],
      })
    );

    // -----------------------------------------------------------------
    // Product catalog (read-only, backs line-item resolution)
    // -----------------------------------------------------------------
    server.registerTool(
      "ucp_list_products",
      {
        title: "List Products",
        description:
          "Search/browse the product catalog. Returns id, slug, name, price (decimal string), and stock for each match.",
        inputSchema: {
          query: z.string().optional().describe('Search term, or "all"'),
          category: z.string().optional().describe('Category filter, or "all"'),
          page: z.number().int().positive().default(1),
        },
      },
      async ({ query, category, page }) => {
        const result = await getAllProducts({
          query: query ?? "all",
          category: category ?? "all",
          page: page ?? 1,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.registerTool(
      "ucp_get_product",
      {
        title: "Get Product",
        description: "Retrieve a single product by its slug.",
        inputSchema: {
          slug: z.string().describe("Product slug"),
        },
      },
      async ({ slug }) => {
        const product = await getProductbySlug(slug);
        if (!product) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: { code: "product_not_found", message: `No product with slug ${slug}` },
                }),
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
        };
      }
    );

    // -----------------------------------------------------------------
    // Checkout session management
    // -----------------------------------------------------------------
    server.registerTool(
      "ucp_create_checkout",
      {
        title: "Create Checkout Session",
        description:
          "Create a new UCP checkout session from product line items. Returns a checkout session with id, status, totals (in cents), and available payment handlers.",
        inputSchema: {
          line_items: z.array(z.object(LineItemInputShape)).min(1),
          currency: z.string().length(3).default("USD"),
          buyer: z.object(BuyerShape).optional(),
          shipping_address: z.object(ShippingAddressShape).optional(),
          platform_profile_url: z
            .string()
            .url()
            .optional()
            .describe("URL to the platform's UCP profile for capability negotiation"),
        },
      },
      async ({ line_items, currency, buyer, shipping_address, platform_profile_url }) => {
        try {
          const negotiation = await negotiateCapabilities(platform_profile_url);
          const checkout = await createCheckout(
            { line_items, currency, buyer, shipping_address },
            { capabilities: negotiation.capabilities }
          );
          return {
            content: [{ type: "text", text: JSON.stringify(checkout, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: {
                    code: "checkout_creation_failed",
                    message: error instanceof Error ? error.message : "Unknown error",
                  },
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.registerTool(
      "ucp_get_checkout",
      {
        title: "Get Checkout Session",
        description: "Retrieve an existing checkout session by id.",
        inputSchema: {
          checkout_id: z.string().describe("The checkout session id"),
        },
      },
      async ({ checkout_id }) => {
        const checkout = await getCheckout(checkout_id);
        if (!checkout) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: {
                    code: "checkout_not_found",
                    message: `Checkout session ${checkout_id} not found`,
                  },
                }),
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(checkout, null, 2) }],
        };
      }
    );

    server.registerTool(
      "ucp_update_checkout",
      {
        title: "Update Checkout Session",
        description:
          "Update an existing checkout session: line items, buyer info, or shipping address.",
        inputSchema: {
          checkout_id: z.string().describe("The checkout session id"),
          line_items: z.array(z.object(LineItemInputShape)).optional(),
          buyer: z.object(BuyerShape).optional(),
          shipping_address: z.object(ShippingAddressShape).optional(),
          platform_profile_url: z.string().url().optional(),
        },
      },
      async ({ checkout_id, line_items, buyer, shipping_address, platform_profile_url }) => {
        try {
          const negotiation = await negotiateCapabilities(platform_profile_url);
          const checkout = await updateCheckout(
            checkout_id,
            { line_items, buyer, shipping_address },
            negotiation.capabilities
          );
          if (!checkout) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: {
                      code: "checkout_not_found",
                      message: `Checkout session ${checkout_id} not found`,
                    },
                  }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(checkout, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: {
                    code: "checkout_update_failed",
                    message: error instanceof Error ? error.message : "Unknown error",
                  },
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.registerTool(
      "ucp_complete_checkout",
      {
        title: "Complete Checkout",
        description:
          "Complete a checkout session with payment via the Stripe handler. Checkout must be in ready_for_complete status. Without payment_method_id, returns a client_secret for the caller's wallet/platform to collect payment details.",
        inputSchema: {
          checkout_id: z.string().describe("The checkout session id"),
          handler_id: z
            .string()
            .default("stripe")
            .describe("Payment handler id (must match one from checkout.payment.handlers)"),
          payment_method_id: z
            .string()
            .optional()
            .describe("Stripe PaymentMethod id to confirm the PaymentIntent with"),
          platform_profile_url: z.string().url().optional(),
        },
      },
      async ({ checkout_id, handler_id, payment_method_id, platform_profile_url }) => {
        try {
          const negotiation = await negotiateCapabilities(platform_profile_url);
          const checkout = await completeCheckout(
            checkout_id,
            { handler_id, payment_method_id },
            negotiation.capabilities
          );
          return {
            content: [{ type: "text", text: JSON.stringify(checkout, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: {
                    code: "checkout_completion_failed",
                    message: error instanceof Error ? error.message : "Unknown error",
                  },
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.registerTool(
      "ucp_get_payment_handlers",
      {
        title: "Get Payment Handlers",
        description: "List the payment handlers configured for this business.",
        inputSchema: {},
      },
      async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({ handlers: ucpConfig.payment_handlers }, null, 2),
          },
        ],
      })
    );

    // -----------------------------------------------------------------
    // Order (dev.ucp.shopping.order) — read-only lifecycle state
    // -----------------------------------------------------------------
    if (ucpConfig.capabilities.extensions.includes("dev.ucp.shopping.order")) {
      server.registerTool(
        "ucp_get_order",
        {
          title: "Get Order",
          description:
            "Fetch the current lifecycle state of an order (totals, line items, fulfillment progress, adjustments). Read-only.",
          inputSchema: {
            order_id: z.string().describe("The order id"),
            platform_profile_url: z.string().url().optional(),
          },
        },
        async ({ order_id, platform_profile_url }) => {
          const negotiation = await negotiateCapabilities(platform_profile_url);
          const order = await getUcpOrder(order_id, negotiation.capabilities);
          if (!order) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: {
                      code: "order_not_found",
                      message: `Order ${order_id} not found`,
                    },
                  }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
          };
        }
      );
    }
  },
  {
    // Server metadata
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

export { handler as GET, handler as POST };
