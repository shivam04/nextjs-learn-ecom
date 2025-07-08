import { getBuyerDetails } from "@/lib/actions/savedwallet.actions";
import { getUserByEmail } from "@/lib/actions/user.actions";
import Link from "next/link";
import AmazonPaySignUpForm from "./signup-form";
import { CheckoutBuyer } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

const AmazonPaySignUpPage = async (props: {
    searchParams: Promise<{
        amazonCheckoutSessionId: string,
        callbackUrl: string
    }>
}) => {

    const { amazonCheckoutSessionId, callbackUrl } = await props.searchParams;

    const session = await auth();
    
    if (session) {
        return redirect(callbackUrl || '/');
    }

    const checkoutSession = await getBuyerDetails(amazonCheckoutSessionId);

    const user = await getUserByEmail(checkoutSession.buyer.email);

    return (
        <div className="w-full max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <Link href="/" className="flex-center">
                        <Image 
                            src='/images/logo.svg' 
                            width={100} 
                            height={100} 
                            alt={`${APP_NAME} logo`} 
                            priority={true} 
                        />
                    </Link>
                    <CardTitle className="text-center">Create Account</CardTitle>
                    <CardDescription className="text-center">
                        Enter your information below to sign up
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    { user?.id ? (
                        <div className="w-full max-w-md mx-auto">
                            <p className="text-center mb-6">You are already signed in as {user.email}</p>
                            <p className="text-center mb-6">Go To Sign In Page and Login with Password</p>
                            <Link href={`/sign-in`}>
                                <Button className="center">Login Please</Button>
                            </Link>
                        </div>
                    ) : (
                        <AmazonPaySignUpForm buyerDetails={checkoutSession.buyer as CheckoutBuyer} chargePermissionId={checkoutSession.chargePermissionId} />
                    )}
                    
                </CardContent>
            </Card>
         </div>
        
    )
}

export default AmazonPaySignUpPage;