import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateOrderToPaid } from "@/lib/actions/order.action";

export async function POST(req: NextRequest) {
    const event = await Stripe.webhooks.constructEvent(
        await req.text(),
        req.headers.get("stripe-signature") as string,
        process.env.STRIPE_WEBHOOK_SECRET as string
    );

    console.log('event', JSON.stringify(event));

    // check for successful payment
    if (event.type === 'charge.succeeded') {
        const { object } = event.data;

        // Update Order status
        await updateOrderToPaid({
            orderId: object.metadata.order_id,
            paymentResult: {
                id: object.id,
                status: 'COMPLETED',
                email_address: object.billing_details.email!,
                pricePaid: (object.amount / 100).toFixed()
            }
        });

        return NextResponse.json({
            message: 'updateOrderToPaid was successful'
        });
    }

    return NextResponse.json({
        message: 'event is not charge.succeeded'
    });
    
}