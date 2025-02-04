import { getOrderById } from "@/lib/actions/order.action";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: 'Order Details'
}

const OrderDetailsPage = async (props: {
    params: Promise<{ id: string }>;
}) => {
    const { id } = await props.params;

    const order = await getOrderById(id);

    if (!order) notFound();

    return (
        <>Order Details {order?.user.name}</>
    );
}
 
export default OrderDetailsPage;