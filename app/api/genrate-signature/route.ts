import { NextRequest, NextResponse } from "next/server";
import Client from '@amazonpay/amazon-pay-api-sdk-nodejs';
import getPrivateKey from "@/utils/awsSecretsManager";

export async function POST(req: NextRequest): Promise<NextResponse> {

    const payload = await req.json();
    const privateKey = await getPrivateKey();
    console.log("Payload: ", payload);

    const config = {
        publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
        privateKey: privateKey,
        region: 'us',
        sandbox: true,
        algorithm: 'AMZN-PAY-RSASSA-PSS-V2'
    };

    const testPayClient = new Client.AmazonPayClient(config);

    const signature = testPayClient.generateButtonSignature(payload);

    console.log("Signature: ", signature);

    return NextResponse.json({
        signature: signature
    });
}
