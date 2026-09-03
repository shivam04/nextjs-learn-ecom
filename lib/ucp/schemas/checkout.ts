/**
 * UCP Checkout Zod Schemas
 *
 * Validates request bodies for the REST and MCP transports.
 */

import { z } from "zod";

export const CreateLineItemInputSchema = z.object({
  product_id: z.string().min(1, "product_id is required"),
  quantity: z.number().int().positive("quantity must be a positive integer"),
});

export const BuyerInputSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
});

export const ShippingAddressInputSchema = z.object({
  full_name: z.string().min(3, "full_name must be at least 3 characters"),
  street_address: z
    .string()
    .min(3, "street_address must be at least 3 characters"),
  city: z.string().min(3, "city must be at least 3 characters"),
  postal_code: z.string().min(3, "postal_code must be at least 3 characters"),
  country: z.string().min(2, "country must be at least 2 characters"),
});

export const CreateCheckoutRequestSchema = z.object({
  line_items: z.array(CreateLineItemInputSchema).min(1),
  currency: z.string().length(3).default("USD"),
  buyer: BuyerInputSchema.optional(),
  shipping_address: ShippingAddressInputSchema.optional(),
});

export const UpdateCheckoutRequestSchema = z.object({
  line_items: z.array(CreateLineItemInputSchema).optional(),
  buyer: BuyerInputSchema.optional(),
  shipping_address: ShippingAddressInputSchema.optional(),
});

export const CompleteCheckoutRequestSchema = z.object({
  action: z.literal("complete"),
  payment_data: z.object({
    handler_id: z.string(),
    payment_method_id: z.string().optional(),
  }),
});

export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutRequestSchema>;
export type UpdateCheckoutRequest = z.infer<typeof UpdateCheckoutRequestSchema>;
export type CompleteCheckoutRequest = z.infer<
  typeof CompleteCheckoutRequestSchema
>;
