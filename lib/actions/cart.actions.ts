'use server';

import { cookies } from "next/headers";
import { CartItem } from "@/types";
import { convertToPlainObject, formatError, round2 } from "../utils";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { cartItemSchema, insertCartSchema } from "../validators";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// calculate cart prices
const calcPrice = (items: CartItem[]) => {
    const itemsPrice = round2(
        items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ), 
    shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

    return {
        itemsPrice: itemsPrice.toFixed(2),
        shippingPrice: shippingPrice.toFixed(2),
        taxPrice: taxPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2)
    }
}

export async function addItemToCart(data: CartItem) {
    try {
        // Check for cart cookie
        const sessionCartId = (await cookies()).get('sessionCartId')?.value;

        if (!sessionCartId) throw new Error('Cart session not found');

        // Get sessionId and userId
        const session = await auth();
        const userId = session?.user?.id ? (session.user.id as string) : undefined;

        // Get Cart
        const cart = await getMyCart();

        // Parse and validate schema
        const item = cartItemSchema.parse(data);

        // Find product in database
        const product = await prisma.product.findFirst({
            where: {id: item.productId}
        });

        if (!product) throw new Error('Product not found');

        if (!cart) {
            // const create new cart object
            const newCart = insertCartSchema.parse({
                userId: userId,
                items: [item],
                sessionCartId: sessionCartId,
                ...calcPrice([item])
            });

            // Add to database
            await prisma.cart.create({
                data: newCart
            });

            // Revalidate product page
            revalidatePath(`/product/${product.slug}`);
            return {
                success: true,
                message: `${product.name} added to cart`
            }
        } else {
            // check if item is already in the cart
            const existItem = (cart.items as CartItem[]).find((x) => x.productId === item.productId);
            // Check if item exist
            if (existItem) {
                // Check Stock
                if (product.stock < existItem.qty + 1) {
                    throw new Error('Not enough stock');
                }

                // Increase the quantity
                (cart.items as CartItem[]).find((x) => x.productId === item.productId)!.qty = existItem.qty + 1;
            } else {
                // If item doesn't exist in the cart
                // Chekc stock
                if (product.stock < 1) throw new Error('Not enough stock');

                // Add item in to cart items
                cart.items.push(item);
            }

            // save to db
            await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    items: cart.items as Prisma.CartUpdateitemsInput[],
                    ...calcPrice(cart.items as CartItem[])
                }
            });

            revalidatePath(`/product/${product.slug}`);
            return {
                success: true,
                message: `${product.name} ${existItem ? 'updated in' : 'added to'} cart`
            }
        }
    } catch (error) {
        return {
            success: false,
            message: formatError(error)
        }
    }
}

export async function getMyCart() {
    // Check for cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;

    if (!sessionCartId) throw new Error('Cart session not found');

    // Get sessionId and userId
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // Get user cart from database
    const cart = await prisma.cart.findFirst({
        where: userId ? { userId: userId } : { sessionCartId: sessionCartId }
    });

    if (!cart) {
        return undefined;
    }

    // Convert decimals and return
    return convertToPlainObject({
        ...cart,
        items: cart.items as CartItem[],
        itemsPrice: cart.itemsPrice.toString(),
        totalPrice: cart.totalPrice.toString(),
        shippingPrice: cart.shippingPrice.toString(),
        taxPrice: cart.taxPrice.toString()
    });
}

export async function removeItemFromCart(productId: string) {
    try {
        // Check for cart cookie
        const sessionCartId = (await cookies()).get('sessionCartId')?.value;
        if (!sessionCartId) throw new Error('Cart session not found');

        // Find product in database
        const product = await prisma.product.findFirst({
            where: {id: productId}
        });
        if (!product) throw new Error('Product not found');

        // Get User Cart
        const cart = await getMyCart();
        if (!cart) throw new Error('Cart not found');

        const existItem = (cart.items as CartItem[]).find((x) => x.productId === productId);
        if (!existItem) throw new Error('Item not found');

        // check if quantity is 1
        if (existItem.qty === 1) {
            // Remove from the cart
            cart.items = (cart.items as CartItem[]).filter((x) => x.productId !== existItem.productId);
        } else {
            // Decrease quantity
            (cart.items as CartItem[]).find((x) => x.productId === productId)!.qty = existItem.qty - 1;
        }

        // update items in the db
        await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: cart.items as Prisma.CartUpdateitemsInput[],
                ...calcPrice(cart.items as CartItem[])
            }
        });

        revalidatePath(`/product/${product.slug}`);
        return {
            success: true,
            message: `${product.name} was removed from the cart`
        }

    } catch(error) {
        return {
            success: false,
            message: formatError(error)
        }
    }
}