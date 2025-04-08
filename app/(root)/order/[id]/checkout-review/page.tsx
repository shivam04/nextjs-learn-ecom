import CheckoutSessionData from "@/components/amazon-pay/checkout-session-data";
import { getOrderById } from "@/lib/actions/order.action";
import { AMAZON_PAY_CHECKOUT_PAGE } from "@/lib/constants";
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
                checkoutType={AMAZON_PAY_CHECKOUT_PAGE.REVIEW_PAGE}
            />
        </>
    );
}
 
export default CheckoutReviewPage;