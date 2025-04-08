import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import Client from '@amazonpay/amazon-pay-api-sdk-nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const keyPath = path.join(process.cwd(), 'tst', 'private.pem');
    const privateKey = fs.readFileSync(keyPath, 'utf8');

    const payload = await req.json()

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