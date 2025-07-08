/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Order, SavedWalletObject } from "@/types";
import Script from "next/script";
import { Button } from "../ui/button";
import { useEffect, useState, useTransition } from "react";
import { createCharge, getChargePermission } from "@/lib/actions/savedwallet.actions";
import { toast } from "@/hooks/use-toast";

const AmazonPayButtonSavedWallet = ({ order, savedWallet }:{ order: Omit<Order, 'paymentResult'>, savedWallet: SavedWalletObject | null }) => {

    const [isPending, startTransition] = useTransition();

    const [chargePermissionStatus, setChargePermissionStatus] = useState<string | null>(null);
    const [paymentDescriptor, setPaymentDescriptor] = useState<string | null>(null);
    const [hideSavedWalletButton, setHideSavedWalletButton] = useState<boolean>(true);

    useEffect(() => {
        const fetchChargePermission = async () => {
            if (savedWallet?.chargePermissionId) {
                const chargePermission = await getChargePermission(savedWallet.chargePermissionId);
                setChargePermissionStatus(chargePermission.statusDetails.state);
                setPaymentDescriptor(chargePermission.paymentPreferences[0]?.paymentDescriptor || null);
            }
            setHideSavedWalletButton(false);
        };
        fetchChargePermission();
    }, [])

    const loadApayButton = () => {
        if (typeof window !== "undefined" && (window as any).amazon) {
            const payLoad = {
                "webCheckoutDetails": {
                    "checkoutResultReturnUrl": `${process.env.NEXT_PUBLIC_SERVER_URL}/order/${order.id}/checkout-result`,
                    "checkoutReviewReturnUrl": `${process.env.NEXT_PUBLIC_SERVER_URL}/order/${order.id}/checkout-review`,
                },
                "storeId": process.env.NEXT_PUBLIC_AMAZON_STORE_ID,
                "scopes": ["name", "email", "phoneNumber", "billingAddress"],
                "chargePermissionType": "PaymentMethodOnFile",   
                "paymentMethodOnFileMetadata": {
                    "setupOnly": false,
                }, 
                "paymentDetails": {
                    "paymentIntent": "Authorize",
                    "chargeAmount": {
                        "amount": order.totalPrice,
                        "currencyCode": "USD"
                    }
                }
            }
            fetch('/api/genrate-signature', {
                method: 'POST', 
                body: JSON.stringify(payLoad)
            }).then((res) => res.json())
            .then((signature) => {
                (window as any).amazon.Pay.renderButton('#AmazonPayButton', {
                    merchantId: process.env.NEXT_PUBLIC_AMAZON_MERCHANT_ID,
                    publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
                    ledgerCurrency: 'USD',
                    sandbox: true,
                    checkoutLanguage: 'en_US',
                    productType: 'PayAndShip',
                    placement: 'Other',
                    buttonColor: 'Gold',
                    createCheckoutSessionConfig: {
                        payloadJSON: JSON.stringify(payLoad),
                        algorithm : 'AMZN-PAY-RSASSA-PSS-V2',
                        signature: signature.signature,
                    }
                });

            });
        }
    }

    const handlePlaceOrder = () => {
        startTransition(async () => {
            const res = await createCharge(order, savedWallet?.chargePermissionId);
            
            if (!res.success) {
                toast({
                    variant: 'destructive',
                    description: res.message
                });
                return;
            }
        });
    }

    if (hideSavedWalletButton) {
        return <></>;
    }

    return (
        <>
            { (savedWallet?.chargePermissionId && chargePermissionStatus=="Chargeable") ? (
                <>
                    <span className="text-sm text-foreground">
                        {paymentDescriptor ? `Pay with ${paymentDescriptor}` : "Pay with Amazon Pay"}
                    </span>
                    <Button 
                        disabled={isPending} 
                        onClick={handlePlaceOrder}
                    >
                        Place Order
                    </Button>
                </>
            ) : (
            <>
                <Script
                src="https://static-na.payments-amazon.com/checkout.js"
                strategy="afterInteractive"
                onLoad={loadApayButton}
                />
                <div id="AmazonPayButton"></div>
            </>
            )}
        </>
    );

}

export default AmazonPayButtonSavedWallet;