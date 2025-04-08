import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import Client from '@amazonpay/amazon-pay-api-sdk-nodejs';
import { formatError } from "@/lib/utils";
import AWS from 'aws-sdk';

// Ensure AWS SDK loads credentials properly
AWS.config.update({
    accessKeyId: process.env.AMPLIFY_AWS_ACCESS_KEY_ID, 
    secretAccessKey: process.env.AMPLIFY_AWS_SECRET_ACCESS_KEY,
    region: process.env.AMPLIFY_AWS_REGION || "ap-south-1",
});


const secretsManager = new AWS.SecretsManager();

export async function POST(req: NextRequest): Promise<NextResponse> {

    const payload = await req.json();
    let privateKey = null;

    console.log("Payload: ", payload);


    try {
        const data = await secretsManager.getSecretValue({ SecretId: "apay-private-key" }).promise();
        if (data.SecretString) {
            privateKey = data.SecretString;  // The private key in PEM format
        } else {
            privateKey = getPrivateKeyFromFile();
        }
    } catch (error) {
        console.warn("Error reading private key file: ", formatError(error));
        privateKey = getPrivateKeyFromFile();
    }

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

function getPrivateKeyFromFile() {
    console.log("Falling back to local private key file.");
    const keyPath = path.join(process.cwd(), 'tst', 'private.pem');
    return fs.readFileSync(keyPath, 'utf8');
}
