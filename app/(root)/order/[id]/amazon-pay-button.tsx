/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Order } from "@/types";
import Script from "next/script";
import { useEffect } from "react";

const AmazonPayButton = ({ order }:{ order: Order }) => {
    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).amazon) {
            const payLoad = {
              "webCheckoutDetails": {
                        "checkoutReviewReturnUrl": `${process.env.NEXT_PUBLIC_SERVER_URL}/order/${order.id}/checkout-review`,
                        "checkoutResultReturnUrl": `${process.env.NEXT_PUBLIC_SERVER_URL}/order/${order.id}/checkout-result`,
                        "checkoutMode": "ProcessOrder",
                    },
                    "storeId": process.env.NEXT_PUBLIC_AMAZON_STORE_ID,
                    "scopes": ["name", "email", "phoneNumber", "billingAddress"],
                    "paymentDetails": {
                        "paymentIntent": "Authorize",
                        "canHandlePendingAuthorization": "false",
                        "chargeAmount": {
                            "amount": order.totalPrice,
                            "currencyCode": "USD"
                        },
                    },
                    "addressDetails": {
                        "name": order.shippingAddress.fullName,
                        "addressLine1": order.shippingAddress.streetAddress,
                        "city": order.shippingAddress.city,
                        "postalCode": order.shippingAddress.postalCode,
                        "countryCode": "US",
                        "phoneNumber": "234-345-2345",
                        "state": "CA"
                    },
                    "chargePermissionType": "OneTime"  
            };

            fetch('/api/genrate-signature', {
                method: 'POST', body: JSON.stringify(payLoad)})
            .then((res) => res.json())
            .then((signature) => {
                (window as any).amazon.Pay.renderButton('#AmazonPayButton', {
                    merchantId: process.env.NEXT_PUBLIC_AMAZON_MERCHANT_ID,
                    publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
                    ledgerCurrency: 'USD',
                    sandbox: true,
                    checkoutLanguage: 'en_US',
                    productType: 'PayAndShip',
                    placement: 'Cart',
                    buttonColor: 'Gold',
                    checkoutSessionConfig: {
                        payLoad: payLoad,
                        algorithm : 'AMZN-PAY-RSASSA-PSS-V2',
                        signature: signature,
                    }
                });
                console.log("Amazon Pay Button Rendered");
            });
        }
    });
    return (
        <>
            <Script src="https://static-na.payments-amazon.com/checkout.js" strategy='beforeInteractive'/>
            <div id="AmazonPayButton"></div>
        </>
        
    );
}
 
export default AmazonPayButton;