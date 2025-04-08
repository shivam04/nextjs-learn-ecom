import CheckoutSessionData from "@/components/amazon-pay/checkout-session-data";
import { getOrderById } from "@/lib/actions/order.action";

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

    return (
        <>
            <CheckoutSessionData 
                order={order} 
                amazonCheckoutSessionId={amazonCheckoutSessionId}
            />
        </>
    );
}
 
export default CheckoutReviewPage;