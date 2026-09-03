import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateOrderToPaid } from "@/lib/actions/order.action";
import { prisma } from "@/db/prisma";

export async function POST(req: NextRequest) {
    let event: Stripe.Event;
    try {
        event = await Stripe.webhooks.constructEvent(
            await req.text(),
            req.headers.get("stripe-signature") as string,
            process.env.STRIPE_WEBHOOK_SECRET as string
        );
    } catch (error) {
        console.error("Stripe webhook signature verification failed:", error);
        return NextResponse.json(
            { message: "Invalid Stripe signature" },
            { status: 400 }
        );
    }

    // check for successful payment
    if (event.type === 'charge.succeeded') {
        const { object } = event.data;

        try {
            if (object.metadata.orderId) {
                // Legacy flow: PaymentIntent created directly against an
                // existing Order (see app/(root)/order/[id]/page.tsx).
                await updateOrderToPaid({
                    orderId: object.metadata.orderId,
                    paymentResult: {
                        id: object.id,
                        status: 'COMPLETED',
                        email_address: object.billing_details.email!,
                        pricePaid: (object.amount / 100).toFixed()
                    }
                });
            } else if (object.metadata.ucpCheckoutSessionId) {
                // UCP flow: the Order (if any) is normally created and
                // marked paid synchronously inside completeCheckout(). This
                // webhook is a backstop in case that request didn't finish
                // (e.g. client disconnected after Stripe confirmed).
                const session = await prisma.ucpCheckoutSession.findFirst({
                    where: { id: object.metadata.ucpCheckoutSessionId },
                });

                if (session?.orderId) {
                    const order = await prisma.order.findFirst({
                        where: { id: session.orderId },
                    });

                    if (order && !order.isPaid) {
                        await updateOrderToPaid({
                            orderId: session.orderId,
                            paymentResult: {
                                id: object.id,
                                status: 'COMPLETED',
                                email_address: object.billing_details.email!,
                                pricePaid: (object.amount / 100).toFixed()
                            }
                        });
                    }
                }
            } else {
                console.warn(
                    "Stripe charge.succeeded webhook received with no orderId or ucpCheckoutSessionId metadata"
                );
            }
        } catch (error) {
            // Order already paid, or another benign race — log and
            // acknowledge so Stripe doesn't retry indefinitely.
            console.error("Stripe webhook order finalization error:", error);
        }

        return NextResponse.json({
            message: 'charge.succeeded processed'
        });
    }

    return NextResponse.json({
        message: 'event is not charge.succeeded'
    });

}