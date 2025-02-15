'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { convertToPlainObject, formatError } from "../utils";
import { auth } from "@/auth";
import { getMyCart } from "./cart.actions";
import { getUserById } from "./user.actions";
import { insertOrderSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { CartItem, PaymentResult } from "@/types";
import { paypal } from "../paypal";
import { revalidatePath } from "next/cache";
import { PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";

export async function createOrder() {
    try {
        const session = await auth();
        if (!session) throw new Error("User is not authenitcated");

        const cart = await getMyCart();

        const userId = session?.user?.id;
        if (!userId) throw new Error("User not found");

        const user = await getUserById(userId);
        if(!cart || cart.items.length === 0) {
            return {
                success: false,
                message: 'Your cart is empty',
                redirectTo: '/cart'
            };
        }

        if(!user.address) {
            return {
                success: false,
                message: 'No Shipping Address',
                redirectTo: '/shipping-address'
            };
        }

        if(!user.paymentMethod) {
            return {
                success: false,
                message: 'No Payment Method',
                redirectTo: '/payment-method'
            };
        }

        // Create order object
        const order = insertOrderSchema.parse({
            userId: user.id,
            shippingAddress: user.address,
            paymentMethod: user.paymentMethod,
            itemsPrice: cart.itemsPrice,
            taxPrice: cart.taxPrice,
            shippingPrice: cart.shippingPrice,
            totalPrice: cart.totalPrice,
        });

        // create a transaction to create order and order items in database
        const insertedOrderId = await prisma.$transaction(async (tx) => {
            // Create Order
            const insertedOrder = await tx.order.create({ data: order });
            // create order items from the cart items
            for (const item of cart.items as CartItem[]) {
                await tx.orderItem.create({
                    data: {
                        ...item,
                        price: item.price,
                        orderId: insertedOrder.id,

                    }
                });
            }

            // Clear cart
            await tx.cart.update({
                where: { id: cart.id },
                data: {
                    items: [],
                    totalPrice: 0,
                    taxPrice: 0,
                    shippingPrice: 0,
                    itemsPrice: 0
                }
            });

            return insertedOrder.id;
        });

        if (!insertedOrderId) throw new Error("order not created");
        return {
            success: true,
            message: 'Order created',
            redirectTo: `/order/${insertedOrderId}`
        }
    } catch(error) {
        if (isRedirectError(error)) {
            throw error;
        }
        return {
            success: false,
            message: formatError(error)
        };
    }
}


//Get order by id
export async function getOrderById(orderId: string) {
    const data = await prisma.order.findFirst({
        where: { id: orderId },
        include: {
            orderitems: true,
            user: { select: { name: true, email: true } }
        }
    });

    return convertToPlainObject(data);
}

// create new paypal order
export async function createPayPalOrder(orderId: string) {
     try {
        const order = await prisma.order.findFirst({
            where: { id: orderId }
        });

        if (order) {
            // Create paypal order
            const payPalOrder = await paypal.createOrder(Number(order.totalPrice));

            // Update order with paypal order id
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentResult: {
                        id: payPalOrder.id,
                        email_address: '',
                        status: '',
                        pricePaid: 0
                    }
                }
            });

            return {
                success: true,
                message: "Item order created successfully",
                data: payPalOrder.id
            }
        } else {
            throw new Error('Order not found');
        }
     } catch(error) {
        return {
            success: false,
            message: formatError(error)
        };
     }
}

// Approve paypal order and update order to paid
export async function approvePayPalOrder(
    orderId: string, 
    data: { orderID: string }
) {
     try {
        const order = await prisma.order.findFirst({
            where: { id: orderId }
        });
        if (!order) throw new Error('Order not found');

        const captureData = await paypal.capturePayment(data.orderID);

        if (!captureData || captureData.id != (order.paymentResult as PaymentResult)?.id || 
        captureData.status !== 'COMPLETED') {
            throw new Error('Error in PayPal payment');
        }

        // update order to paid
        await updateOrderToPaid({
            orderId,
            paymentResult: {
                id: captureData.id,
                status: captureData.status,
                email_address: captureData.payer.email_address,
                pricePaid: captureData.purchase_units[0]?.payments?.captures[0]?.amount?.value,
            },
        });

        revalidatePath(`/order/${orderId}`);
        return {
            success: true,
            message: "Your Order has been paid",
        }
     } catch(error) {
        return {
            success: false,
            message: formatError(error)
        };
     }
}

//Update order to paid
export async function updateOrderToPaid({
    orderId,
    paymentResult,
  }: {
    orderId: string;
    paymentResult?: PaymentResult;
  }) {
    const order = await prisma.order.findFirst({
        where: {
          id: orderId,
        },
        include: {
          orderitems: true,
        },
    });

    if (!order) throw new Error('Order not found');

    if (order.isPaid) throw new Error('Order is already paid');

    // Transaction to update order and account for product stock
    await prisma.$transaction(async (tx) => {
        // Iterate over products and update stock
        for (const item of order.orderitems) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: -item.qty } },
            });
        }

        await tx.order.update({
            where: { id: orderId },
            data: {
                isPaid: true,
                paidAt: new Date(),
                paymentResult
            }
        });
    });

    // Get updated order after transaction
    const updatedOrder = await prisma.order.findFirst({
        where: { id: orderId },
        include: {
            orderitems: true,
            user: { select: { name: true, email: true } },
        },
    });

    if (!updatedOrder) throw new Error('Order not found');
}

// Get user's orders
export async function getMyOrders({
    limit = PAGE_SIZE,
    page
}: {
    limit?: number;
    page: number;
}) {
    const session = await auth();
    if (!session) throw new Error('User is not authorized');

    const data = await prisma.order.findMany({
        where: { userId: session?.user?.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit
    });

    const dataCount = await prisma.order.count({
        where: { userId: session?.user?.id }
    });

    return {
        data,
        totalPage: Math.ceil(dataCount / limit)
    }
}

type SalesDataType = {
    month: string;
    totalSales: number;
}[];

// Get sales data and order summary
export async function getOrderSummary() {
    // Get counts for each resource
    const ordersCount = await prisma.order.count();
    const productsCount = await prisma.product.count();
    const usersCount = await prisma.user.count();
  
    // Calculate the total sales
    const totalSales = await prisma.order.aggregate({
        _sum: { totalPrice: true },
    });
  
    // Get monthly sales
    const salesDataRaw = await prisma.$queryRaw<
        Array<{ month: string; totalSales: Prisma.Decimal }>
        >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY')`;
  
    const salesData: SalesDataType = salesDataRaw.map((entry) => ({
        month: entry.month,
        totalSales: Number(entry.totalSales),
    }));
  
    // Get latest sales
    const latestSales = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
      take: 6,
    });
  
    return {
      ordersCount,
      productsCount,
      usersCount,
      totalSales,
      latestSales,
      salesData,
    };
}

// Get all orders
export async function getAllOrders({
    limit = PAGE_SIZE,
    page
}: {
    limit?: number;
    page: number;
}) {
    const data = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: { user: { select: { name: true } } }
    });

    const dataCount = await prisma.order.count();

    return {
        data,
        totalPage: Math.ceil(dataCount/limit)
    }
}