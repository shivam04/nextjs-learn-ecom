'use client';

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { CheckoutSessionObject, Order } from "@/types";
import { Badge } from "../ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { AMAZON_PAY_CHECKOUT_PAGE } from "@/lib/constants";

const CheckoutSessionData = ({
    amazonCheckoutSessionId,
    order,
    checkoutType
}: {
    amazonCheckoutSessionId: string;
    order: Omit<Order, 'paymentResult'>;
    checkoutType: AMAZON_PAY_CHECKOUT_PAGE
}) => {

    const [checkoutSessionObject, setCheckoutSessionObject] = useState<CheckoutSessionObject>({
        checkoutSessionId: amazonCheckoutSessionId
    });
    const [isLoading, setIsLoading] = useState(true);

    const [isPending, startTransition] = useTransition();

    const router = useRouter();

    useEffect(() => {
        if (order.isPaid || order.isDelivered) {
            router.push(`/order/${order.id}`);
            return;
        }
        fetch('/api/amazon-pay/get-checkout-session', {
            method: 'POST',
            body: JSON.stringify({amazonCheckoutSessionId: amazonCheckoutSessionId})
        })
        .then((res) => res.json())
        .then((res) => {
            setCheckoutSessionObject(res.checkoutSessionObject);
            const checkoutSession = res.checkoutSessionObject as CheckoutSessionObject;
            console.log(checkoutSession);
            localStorage.setItem(amazonCheckoutSessionId, JSON.stringify(checkoutSession.buyer || {}));
            setIsLoading(false);
        });
    }, [amazonCheckoutSessionId]);

    if (isLoading) {
        return (
            <Image
                alt="loading" 
                src="https://miro.medium.com/v2/resize:fit:720/format:webp/0*3IFEy-hfoIpgFjBl.gif" 
                width={1024}
                height={1024}
            />
        )
    }

    const getAddressCombined = () => {
        const { addressLine1 = '', addressLine2 = '', addressLine3 = '' } = checkoutSessionObject.shippingAddress || {};
        return `${addressLine1 || ''} ${addressLine2 || ''} ${addressLine3 || ''}`;
    }

    const handleClick = () => {
        startTransition(async () => {
            const payload = {
                webCheckoutDetails: {
                    checkoutResultReturnUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/order/${order.id}/checkout-result`
                },
                paymentDetails: {
                    paymentIntent: "Authorize",
                    canHandlePendingAuthorization: false,
                    chargeAmount: {
                        amount: order.totalPrice,
                        currencyCode: "USD"
                    },
                    merchantMetadata: {
                        merchantReferenceId: `${order.id}`,
                        merchantStoreName: `${process.env.NEXT_PUBLIC_APP_NAME}`
                    }
                },
            };
            const res = await fetch('/api/amazon-pay/update-checkout-session', {
                method: 'POST',
                body: JSON.stringify({
                    payload: payload,
                    amazonCheckoutSessionId: amazonCheckoutSessionId
                })
            });
            
            const response = await res.json();

            if (!response.ok) {
                toast({
                    variant: 'destructive',
                    description: response.message
                })
            } else {
                setCheckoutSessionObject(response.checkoutSessionObject);
                const checkoutSession = response.checkoutSessionObject as CheckoutSessionObject;
                console.log(checkoutSession);
                if (checkoutSession.webCheckoutDetails?.amazonPayRedirectUrl) {
                    window.location.href = checkoutSession.webCheckoutDetails.amazonPayRedirectUrl;
                }
            }
        });   
    };

    const handleCompleteClick = () => {
        startTransition(async () => {
            const payload = {
                "chargeAmount": {
                    "amount": order.totalPrice,
                    "currencyCode": "USD"
                }
            }
            
            const res = await fetch('/api/amazon-pay/complete-checkout-session', {
                method: 'POST',
                body: JSON.stringify({
                    payload: payload,
                    amazonCheckoutSessionId: amazonCheckoutSessionId,
                    orderId: order.id,
                    email: JSON.parse(localStorage.getItem(amazonCheckoutSessionId) || "{}")?.email
                })
            });
            
            const response = await res.json();

            if (!response.ok) {
                toast({
                    variant: 'destructive',
                    description: response.message
                })
            } else {
                setCheckoutSessionObject(response.checkoutSessionObject);
                const checkoutSession = response.checkoutSessionObject as CheckoutSessionObject;
                console.log(checkoutSession);
                localStorage.removeItem(amazonCheckoutSessionId);
                router.push(`/order/${order.id}`);
            }
        })
    }

    return (
        <>
            <div className="my-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="w-full max-w-sm mt-4">
                    <CardHeader className="p-0 items-center">
                        <h2>Shipping Address</h2>
                    </CardHeader>
                    <CardContent className="p-4 grid gap-4">
                        { checkoutSessionObject.shippingAddress && (
                            <>
                                <h2 className="text-lg">{checkoutSessionObject.shippingAddress.name}</h2>
                                <p className="text-sm">
                                    {getAddressCombined()}, {checkoutSessionObject.shippingAddress.city} {' '}
                                    {checkoutSessionObject.shippingAddress.postalCode || ''}, {checkoutSessionObject.shippingAddress.countryCode || ''} {' '}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="w-full max-w-sm mt-4">
                    <CardHeader className="p-0 items-center">
                        <h2>Buyer Info</h2>
                    </CardHeader>
                    <CardContent className="p-1 grid gap-1">
                        { checkoutSessionObject.buyer && (
                            <>
                                <h2 className="text-lg">{checkoutSessionObject.buyer.name}</h2>
                                <p className="text-sm">
                                    {`Email: ${checkoutSessionObject.buyer.email || ''}`}
                                </p>
                                <p className="text-sm">
                                    {`PhoneNumber: ${checkoutSessionObject.buyer.phoneNumber || ''}`}{' '}
                                </p>
                                { checkoutSessionObject.buyer.primeMembershipTypes && <Badge variant='default'>Prime Member</Badge>}
                                { !checkoutSessionObject.buyer.primeMembershipTypes && <Badge variant='destructive'>Non-Prime Member</Badge>}
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="w-full max-w-sm mt-4">
                    <CardHeader className="p-0 items-center">
                        <h2>Payment Info</h2>
                    </CardHeader>
                    <CardContent className="p-1 grid gap-1">
                        { checkoutSessionObject.paymentPreferences && 
                            checkoutSessionObject.paymentPreferences.map((paymentPreference, index) => (
                                <div key={index}>
                                    <h2>{paymentPreference && paymentPreference.paymentDescriptor}</h2>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>

                <Card className="w-full max-w-sm mt-4">
                    <CardHeader className="p-0 items-center">
                        <h2>Order Summary</h2>
                    </CardHeader>
                    <CardContent className="p-1 grid gap-1">
                        <div className="flex justify-between">
                            <div>Items</div>
                            <div>{ formatCurrency(order.itemsPrice)}</div>
                        </div>
                        <div className="flex justify-between">
                            <div>Tax</div>
                            <div>{  formatCurrency(order.taxPrice)}</div>
                        </div>
                        <div className="flex justify-between">
                            <div>Shipping</div>
                            <div>{  formatCurrency(order.shippingPrice)}</div>
                        </div>
                        <div className="flex justify-between">
                            <div>Total</div>
                            <div>{  formatCurrency(order.totalPrice)}</div>
                        </div>
                        {/* Review Page Button*/}
                        { checkoutType === AMAZON_PAY_CHECKOUT_PAGE.REVIEW_PAGE && (
                            <Button 
                                variant='default' 
                                onClick={handleClick}
                                disabled={isPending}
                            >
                                { isPending ? 'processing....' : 'Place Order'}
                            </Button>
                        )}

                        { checkoutType === AMAZON_PAY_CHECKOUT_PAGE.RESULT_PAGE && (
                            <Button 
                                variant='default' 
                                onClick={handleCompleteClick}
                                disabled={isPending}
                            >
                                { isPending ? 'processing....' : 'Complete Order'}
                            </Button>
                        )}
                        
                    </CardContent>
                </Card>

            </div>
        </>
    );
}
 
export default CheckoutSessionData;