import { z } from "zod";
import { 
    insertProductSchema, 
    insertCartSchema, 
    cartItemSchema, 
    shippingAddressSchema, 
    insertOrderSchema, 
    insertOrderItemSchema, 
    paymentResultSchema, 
    insertReviewSchema } from "@/lib/validators";

export type Product = z.infer<typeof insertProductSchema> & {
    id: string;
    rating: string;
    createdAt: Date;
    numReviews: number;
}

export type Cart = z.infer<typeof insertCartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type OrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = z.infer<typeof insertOrderSchema> & {
    id: string;
    createdAt: Date;
    isPaid: boolean;
    paidAt: Date | null;
    isDelivered: boolean;
    deliveredAt: Date | null;
    orderitems: OrderItem[];
    user: { name: string; email: string};
};
export type PaymentResult = z.infer<typeof paymentResultSchema>;

export type Review = z.infer<typeof insertReviewSchema> & {
    id: string;
    createdAt: Date;
    user?: { name: string; };
};

export type CheckoutShippingAddress = {
    addressLine1?: string
    addressLine2?: string
    addressLine3?: string
    city?: string
    countryCode?: string
    name?: string       
    phoneNumber?: string
    postalCode?: string
    stateOrRegion?: string
};

export type CheckoutBuyer = {
    buyerId?: string
    email?: string
    name?: string
    phoneNumber?: string
    primeMembershipTypes?: boolean
};

export type CheckoutPaymentPreferences = {
    paymentDescriptor?: string
};

export type CheckoutSessionObject = {
    checkoutSessionId: string;
    shippingAddress?: CheckoutShippingAddress;
    buyer?: CheckoutBuyer;
    paymentPreferences?: CheckoutPaymentPreferences[]
}