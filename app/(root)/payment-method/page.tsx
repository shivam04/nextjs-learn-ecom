import { auth } from "@/auth";
import { getUserById } from "@/lib/actions/user.actions";
import { Metadata } from "next";
import PaymentMethodForm from "./payment-method-form";
import CheckoutSteps from "@/components/shared/checkout-steps";

export const metadata: Metadata = {
    title: 'Select Payment Method'
}

// This page depends on the signed-in user's session and DB record and must
// never be statically prerendered. Unlike shipping-address/place-order,
// which call getMyCart() (and therefore cookies()) before touching auth(),
// this page calls auth() first with nothing else forcing a dynamic bailout.
// At build time that meant `session` resolved with no user, `userId` was
// falsy, and `throw new Error('No user ID')` fired during static
// generation, crashing `next build` with "Error occurred prerendering page
// '/payment-method'". Forcing dynamic rendering ensures this page always
// renders per-request instead of being prerendered at build time.
export const dynamic = 'force-dynamic';

const PaymentMethodPage = async () => {
    const session = await auth();

    const userId = session?.user?.id;

    if (!userId) throw new Error('No user ID');

    const user = await getUserById(userId);

    return (
        <>
            <CheckoutSteps current={2} />
            <PaymentMethodForm prefferedPaymentMethod={user.paymentMethod} />
        </>
    );
}

export default PaymentMethodPage;