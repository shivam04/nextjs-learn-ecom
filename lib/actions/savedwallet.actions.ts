/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { auth } from "@/auth";
import { savedWalletSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { formatError } from "../utils";
import { Order } from "@/types";
import { revalidatePath } from "next/cache";
import getPrivateKey from "@/utils/awsSecretsManager";
import Client from '@amazonpay/amazon-pay-api-sdk-nodejs';
import { updateOrderToPaid } from "./order.action";

export async function updateUserSavedWalletDetails(orderId: string) {
    const session = await auth();
    const userId = session?.user?.id;
    try {
        const savedWallet = savedWalletSchema.parse({
            chargePermissionId: orderId,
            userId: userId
        });

        const insertSavedWallet = await prisma.savedWallet.upsert({
                where: { userId: savedWallet.userId },
                update: { chargePermissionId: savedWallet.chargePermissionId },
                create: {
                    chargePermissionId: savedWallet.chargePermissionId,
                    userId: savedWallet.userId
                }
            });

        if (!insertSavedWallet) {
            throw new Error('Failed to update saved wallet details');
        }

        console.log("Saved Wallet ID:", insertSavedWallet);

        return {
            success: true,
            message: 'User updated successfully',
        };
    } catch (error) {
        console.error("Error updating user saved wallet details:", formatError(error));
        throw error;
    }
}

export async function getSavedWalletDetails(userId: string) {
    try {
        const savedWallet = await prisma.savedWallet.findUnique({
            where: { userId }
        });

        if (!savedWallet) {
            return null;
        }

        return savedWallet;
    } catch (error) {
        console.error("Error fetching saved wallet details:", formatError(error));
        throw error;
    }
}

export async function createCharge(order: Omit<Order, 'paymentResult'>, chargePermissionId?: string) {
    try {

        if (!chargePermissionId) {
            throw new Error("Charge permission ID is required to create a charge");
        }

        const privateKey = await getPrivateKey();

        const config = {
            publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
            privateKey: privateKey,
            region: 'us',
            sandbox: true,
            algorithm: 'AMZN-PAY-RSASSA-PSS-V2' 
        };

        //revalidatePath(`/order/${order.id}`);

        const testPayClient = new Client.WebStoreClient(config);
        const chargePayload = {
            chargePermissionId: chargePermissionId,
            chargeAmount: {
                amount: Number(order.totalPrice).toFixed(2),
                currencyCode: 'USD',
            },
            canHandlePendingAuthorization: false,
            chargeInitiator: 'CITU',
            channel: 'Web',
            captureNow: false
        };

        try {
            const response = await testPayClient.createCharge(chargePayload, {
                "x-amz-pay-idempotency-key": crypto.randomUUID().replace(/-/g, ''),
            });

            console.log("Charge Response:", response.data);

            const chargeObject = response.data;

            if (chargeObject.statusDetails.state === 'Authorized') {
                await updateOrderToPaid({
                    orderId: order.id,
                    paymentResult: {
                        id: chargeObject.chargeId || chargeObject.chargePermissionId || '',
                        status: 'COMPLETED',
                        email_address: order.user.email || 'test@test.com',
                        pricePaid: order.totalPrice
                    }
                });

                revalidatePath(`/order/${order.id}`);

                return {
                    success: true,
                    message: 'Charge created successfully',
                    chargePermissionId: chargeObject.chargeId || chargeObject.chargePermissionId || '',
                }
            }

            return {
                success: false,
                message: `Charge Declined due to ${chargeObject.statusDetails.reasonCode} - ${chargeObject.statusDetails.reasonDescription}`,
                chargePermissionId: chargeObject.chargeId || chargeObject.chargePermissionId || '',
            }

        } catch (error: any) {
            if (error.response) {
                console.error("Amazon Pay API error status:", error.response.status);
                console.error("Amazon Pay API error data:", JSON.stringify(error.response.data, null, 2));
            } else {
                console.error("Error:", error.message);
            }
            throw error;
        }

        return {
            success: true,
            message: 'Charge created successfully',
            chargePermissionId: chargePermissionId
        }
        
    } catch (error) {
        console.log(JSON.stringify(error));
        console.error("Error creating charge:", formatError(error));
        return {
            success: false,
            message: formatError(error)
        };
    }
}

export async function getBuyerDetails(amazonCheckoutSessionId: string) {
    try {
        const privateKey = await getPrivateKey();

        const config = {
            publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
            privateKey: privateKey,
            region: 'us',
            sandbox: true,
            algorithm: 'AMZN-PAY-RSASSA-PSS-V2' 
        };

        const testPayClient = new Client.WebStoreClient(config);
        
        const getCSResponse = await testPayClient.getCheckoutSession(amazonCheckoutSessionId);

        if (getCSResponse.data.statusDetails.state === 'Completed') {
            return getCSResponse.data;
        } else if (getCSResponse.data.statusDetails.state !== 'Open' && getCSResponse.data.statusDetails.state !== 'Completed') {
            throw new Error(`Checkout session is not open. Current state: ${getCSResponse.data.statusDetails.state}`);
        }

        const response = await testPayClient.completeCheckoutSession(amazonCheckoutSessionId, {});

        const checkoutSessionObject = response.data;


        return checkoutSessionObject;
    } catch (error: any) {
        if (error.response) {
            console.error("Amazon Pay API error status:", error.response.status);
            console.error("Amazon Pay API error data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
        console.error("Error fetching buyer details:", formatError(error));
        throw error;
    }
}

export async function getChargePermission(chargePermissionId: string) {
    try {
        const privateKey = await getPrivateKey();

        const config = {
            publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
            privateKey: privateKey,
            region: 'us',
            sandbox: true,
            algorithm: 'AMZN-PAY-RSASSA-PSS-V2' 
        };

        const testPayClient = new Client.WebStoreClient(config);
        
        const response = await testPayClient.getChargePermission(chargePermissionId);

        return response.data;
    } catch (error: any) {
        if (error.response) {
            console.error("Amazon Pay API error status:", error.response.status);
            console.error("Amazon Pay API error data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
        console.error("Error fetching charge permission:", formatError(error));
        throw error;
    }
}