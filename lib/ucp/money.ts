/**
 * UCP Money Helpers
 *
 * UCP wire format represents money as integers in minor units (cents),
 * matching Stripe's convention. The rest of this codebase stores/returns
 * money as decimal strings (see `lib/validators.ts` `currency` schema and
 * `db/prisma.ts` result extensions that stringify Decimal fields).
 *
 * These helpers convert between the two representations consistently.
 */

/** Convert a decimal string (e.g. "19.99") to integer minor units (1999). */
export function toMinorUnits(value: string | number): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) {
    throw new Error(`Invalid monetary value: ${value}`);
  }
  return Math.round(num * 100);
}

/** Convert integer minor units (1999) back to a decimal string ("19.99"). */
export function fromMinorUnits(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}
