/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Order } from "@/types";
import Script from "next/script";
import { useRef, useState, useTransition } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "../ui/drawer";
import DealCountDown from "../deal-countdown";
import { Button } from "../ui/button";

const AmazonPayDecoupleButton = ({ order }:{ order: Omit<Order, 'paymentResult'> }) => {

    const [showModal, setShowModal] = useState(false);
    const [isPending, startTransition] = useTransition();

    let amazonPayButtonRef = useRef<any>(null);

    const loadApayButton = () => {
        if (typeof window !== "undefined" && (window as any).amazon) {
            amazonPayButtonRef.current = (window as any).amazon.Pay.renderButton('#AmazonPayButton', {
                merchantId: process.env.NEXT_PUBLIC_AMAZON_MERCHANT_ID,
                publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
                ledgerCurrency: 'USD',
                sandbox: true,
                checkoutLanguage: 'en_US',
                productType: 'PayAndShip',
                placement: 'Cart',
                buttonColor: 'Gold'
            });

            amazonPayButtonRef.current.onClick(function(){
                console.log("Amazon Pay Button Clicked");
                setShowModal(true);
            });
        }
        console.log("Amazon Pay Button Rendered", amazonPayButtonRef.current);
    }

    const placeOrder = () => {
        const amazonPayButton = amazonPayButtonRef.current;
        if (!amazonPayButton) {
            console.error("Amazon Pay Button is not initialized");
            return;
        }
        startTransition(async () => {
            const payLoad = {
                "webCheckoutDetails": {
                    "checkoutReviewReturnUrl": `${process.env.NEXT_PUBLIC_SERVER_URL}/order/${order.id}/checkout-review`,
                },
                "storeId": process.env.NEXT_PUBLIC_AMAZON_STORE_ID,
                "scopes": ["name", "email", "phoneNumber", "billingAddress"],
                "paymentDetails": {
                    "paymentIntent": "Confirm",
                    "canHandlePendingAuthorization": "false",
                },
                "chargePermissionType": "OneTime"  
            };
            const response = await fetch('/api/genrate-signature', {
                method: 'POST', body: JSON.stringify(payLoad)});
            const signature = await response.json();
            amazonPayButton.initCheckout({
                createCheckoutSessionConfig: {
                    payloadJSON: JSON.stringify(payLoad),
                    algorithm : 'AMZN-PAY-RSASSA-PSS-V2',
                    signature: signature.signature,
                    publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
                }
            });
        })
        
    };

    return (
        <>
            <Drawer open={showModal} onOpenChange={setShowModal}>
                <DrawerContent>
                    <DealCountDown />
                    <Button 
                        disabled={isPending}
                        className="px-3 py-1 text-sm rounded" onClick={placeOrder}
                    >
                        Place Order
                    </Button>
                </DrawerContent>
            </Drawer>
            <Script
              src="https://static-na.payments-amazon.com/checkout.js"
              strategy="afterInteractive" // Load after the page becomes interactive
              onLoad={loadApayButton}
            />
            <div id="AmazonPayButton"></div>
        </>
        
    );
}

export default AmazonPayDecoupleButton;