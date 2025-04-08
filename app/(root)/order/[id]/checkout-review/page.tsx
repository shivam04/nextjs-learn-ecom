import CheckoutSessionData from "@/components/amazon-pay/checkout-session-data";
import { getOrderById } from "@/lib/actions/order.action";
import { ShippingAddress } from "@/types";
import { notFound } from "next/navigation";

const CheckoutReviewPage = async (props: {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        amazonCheckoutSessionId: string
    }>
}) => {

    const { amazonCheckoutSessionId } = await props.searchParams;
    const { id } = await props.params;

    const order = await getOrderById(id);

    if (!order) {
        return notFound();
    }

    return (
        <>
        <CheckoutSessionData 
                amazonCheckoutSessionId={amazonCheckoutSessionId}
                order={{
                    ...order,
                    shippingAddress: order.shippingAddress as ShippingAddress
                }}
            />
        </>
    );
}
 
export default CheckoutReviewPage;