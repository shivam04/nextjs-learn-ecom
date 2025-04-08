import { updateOrderToPaid } from "@/lib/actions/order.action";
import { formatError } from "@/lib/utils";
import getPrivateKey from "@/utils/awsSecretsManager";
import Client from '@amazonpay/amazon-pay-api-sdk-nodejs';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const { payload, amazonCheckoutSessionId, orderId, email } = await req.json();
    console.log("PayLoad:", payload);
    console.log("amazonCheckoutSessionId:", amazonCheckoutSessionId);
    console.log("orderId:", orderId);
    console.log("email:", email);

    const privateKey = await getPrivateKey();
    
        const config = {
            publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
            privateKey: privateKey,
            region: 'us',
            sandbox: true,
            algorithm: 'AMZN-PAY-RSASSA-PSS-V2' 
        };
    
        const testPayClient = new Client.WebStoreClient(config);

        try {
            const response = await testPayClient.completeCheckoutSession(amazonCheckoutSessionId, payload);

            const checkoutSessionObject = response.data;

            // Update Order status
            await updateOrderToPaid({
                orderId: orderId,
                paymentResult: {
                    id: checkoutSessionObject.chargeId || checkoutSessionObject.chargePermissionId || checkoutSessionObject.checkoutSessionId || '',
                    status: 'COMPLETED',
                    email_address: email || 'test@test.com',
                    pricePaid: payload["chargeAmount"]
                }
            });

            return NextResponse.json({
                ok: true,
                checkoutSessionObject: response.data
            })
        } catch(error) {
            console.log("Error while calling update checkout session: ", formatError(error));
            return NextResponse.json({
                ok: false,
                message: `Error Occured while calling update checkout Session: ${formatError(error)}`
            })
        }
}