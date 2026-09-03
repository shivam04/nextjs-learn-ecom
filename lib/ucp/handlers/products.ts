/**
 * UCP Product Lookup Helpers
 *
 * Thin wrappers around the existing product data-access layer
 * (`lib/actions/product.actions.ts`) used by UCP line-item resolution,
 * so pricing/stock always comes from a single source of truth.
 */

import { prisma } from "@/db/prisma";
import type { LineItem } from "../types/checkout";
import { toMinorUnits } from "../money";
import type { CreateLineItemInputSchema } from "../schemas/checkout";
import { z } from "zod";

export type LineItemInput = z.infer<typeof CreateLineItemInputSchema>;

/**
 * Resolve raw line item inputs (product_id + quantity) into fully priced
 * UCP LineItems by looking up current product price/stock/name/etc.
 * Throws if a product is not found or is out of stock.
 */
export async function resolveLineItems(
  inputs: LineItemInput[]
): Promise<LineItem[]> {
  const items: LineItem[] = [];

  for (const input of inputs) {
    const product = await prisma.product.findFirst({
      where: { id: input.product_id },
    });

    if (!product) {
      throw new Error(`Product not found: ${input.product_id}`);
    }

    if (product.stock < input.quantity) {
      throw new Error(`Not enough stock for product: ${product.name}`);
    }

    const unitPrice = toMinorUnits(product.price);

    items.push({
      id: product.id,
      product_id: product.id,
      name: product.name,
      quantity: input.quantity,
      unit_price: unitPrice,
      total_price: unitPrice * input.quantity,
      currency: "USD",
    });
  }

  return items;
}
