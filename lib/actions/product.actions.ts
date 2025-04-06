'use server';
import { prisma } from "@/db/prisma";
import { convertToPlainObject, formatError } from "../utils";
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from "../constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertProductSchema, updateProductSchema } from "../validators";
import { Prisma } from "@prisma/client";

//Get latest products
export async function getLatestProducts() {
    const data = await prisma.product.findMany({
        take: LATEST_PRODUCTS_LIMIT,
        orderBy: { createdAt: 'desc' }
    });

    return convertToPlainObject(data);
}


// Get single product by it's slug
export async function getProductbySlug(slug: string) {
    return await prisma.product.findFirst({
        where: { slug: slug }
    });
}

// Get single product by it's id
export async function getProductByProductId(productId: string) {
    const data = await prisma.product.findFirst({
        where: { id: productId }
    });

    return convertToPlainObject(data);
}

// Get all products
export async function getAllProducts({
    query,
    limit = PAGE_SIZE,
    page,
    category
}: {
    query: string;
    limit?: number;
    page: number;
    category?: string;
}) {

    // QUery Filter
    const queryFilter: Prisma.ProductWhereInput = 
        query && query !== 'all'
            ? {
                name: {
                    contains: query,
                    mode: 'insensitive'
                } as Prisma.StringFilter
              }
            : {};

    const data = await prisma.product.findMany({
        where: {
            ...queryFilter
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
    });

    const dataCount = await prisma.product.count();

    return {
        data,
        totalPage: Math.ceil(dataCount/limit)
    } 
}

// Delete an Product
export async function deleteProduct(id: string) {
    try {

        const productExists = await prisma.product.findFirst({
            where: { id }
        });

        if (!productExists) throw new Error("Product not found");

        await prisma.product.delete({ where: {id} });
        revalidatePath('/admin/products');
        return {
            success: true,
            message: 'Product deleted successfully'
        }

    } catch (error) {
        return { success: false, message: formatError(error) }
    }
}

// Create a product
export async function createProduct(data: z.infer<typeof insertProductSchema>) {
    try {
        const product = insertProductSchema.parse(data);
        await prisma.product.create({ data: product });
        revalidatePath('/admin/products');
        return {
            success: true,
            messsage: 'Product created successfully'
        }
    } catch (error) {
        return { success: false, message: formatError(error) }
    }
}

// Update a product
export async function updateProduct(data: z.infer<typeof updateProductSchema>) {
    try {
        const product = updateProductSchema.parse(data);

        const productExists = await prisma.product.findFirst({
            where: { id: product.id }
        });

        if (!productExists) throw new Error("Product not found");

        await prisma.product.update({ 
            where: { id: product.id },
            data: product 
        });
        revalidatePath('/admin/products');
        return {
            success: true,
            messsage: 'Product updated successfully'
        }
    } catch (error) {
        return { success: false, message: formatError(error) }
    }
}

// Get All Categories
export async function getAllCategories() {
    const data = await prisma.product.groupBy({
        by: ['category'],
        _count: true
    });

    return data;
}

// Get Featured Products
export async function getFeaturedProducts() {
    const data = await prisma.product.findMany({
        where: { isFeatured: true },
        take: LATEST_PRODUCTS_LIMIT,
        orderBy: { createdAt: 'desc' }
    });

    return convertToPlainObject(data);
}