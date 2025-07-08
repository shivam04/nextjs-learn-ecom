import getPrivateKey from "@/utils/awsSecretsManager";
import Client from '@amazonpay/amazon-pay-api-sdk-nodejs';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const { amazonCheckoutSessionId } = await req.json();
    console.log("amazonCheckoutSessionId:", amazonCheckoutSessionId);

    const privateKey = await getPrivateKey();

    const config = {
        publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
        privateKey: privateKey,
        region: 'us',
        sandbox: true,
        algorithm: 'AMZN-PAY-RSASSA-PSS-V2' 
    };

    const testPayClient = new Client.WebStoreClient(config);
    const response = await testPayClient.getCheckoutSession(amazonCheckoutSessionId);
    console.log("Checkout Session Response:", JSON.stringify(response.data));

    return NextResponse.json({
        checkoutSessionObject: response.data
    })
}