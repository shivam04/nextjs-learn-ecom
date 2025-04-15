/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Order } from "@/types";
import Script from "next/script";

const AmazonPayButton = ({ order }:{ order: Omit<Order, 'paymentResult'> }) => {
    const showJSButton = process.env.NEXT_PUBLIC_AMAZON_CHECKOUT_BUTTON === "js";
    console.log(showJSButton);
    const loadApayButton = () => {
        if (typeof window !== "undefined" && (window as any).amazon) {
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
                    createCheckoutSessionConfig: {
                        payloadJSON: JSON.stringify(payLoad),
                        algorithm : 'AMZN-PAY-RSASSA-PSS-V2',
                        signature: signature.signature,
                    }
                });
                console.log("Amazon Pay Button Rendered");
            });
        }
    };


    const loadApayJSButton = () => {
        if (typeof window !== "undefined" && (window as any).amazon) {
            (window as any).amazon.Pay.renderJSButton('#AmazonPayButton', {
                merchantId: process.env.NEXT_PUBLIC_AMAZON_MERCHANT_ID,
                ledgerCurrency: 'USD',
                checkoutLanguage: 'en_US',
                productType: 'PayAndShip',
                placement: 'Cart',
                buttonColor: 'Gold',
                sandbox: true,
                checkoutSessionConfig: {
                    "storeId": process.env.NEXT_PUBLIC_AMAZON_STORE_ID,
                    "paymentDetails": {
                        "paymentIntent": "AuthorizeWithCapture"
                    },
                },
                onInitCheckout: function (event: any) {
                    console.log("oninitcheckout")
                    console.log(event);
                    return {
                        "totalShippingAmount": {
                            "amount": "0.00",
                            "currencyCode": "USD"
                        },
                        "totalBaseAmount": {
                            "amount": "500.44",
                            "currencyCode": "USD"
                        },
                        "totalTaxAmount": {
                            "amount": "0.00",
                            "currencyCode": "USD"
                        },
                        "totalDiscountAmount": {
                            "amount": "400.44",
                            "currencyCode": "USD"
                        },
                        "totalChargeAmount": {
                            "amount": "100.00",
                            "currencyCode": "USD"
                        },
                        "deliveryOptions": [{
                            "id": "ups_shipping-02-25.11",
                            "price": {
                                "amount": "500",
                                "currencyCode": "USD"
                            },
                            "shippingMethod": {
                                "shippingMethodName": "shipping-method-name-onInitCheckout",
                                "shippingMethodCode": "shipping-method-code-onInitCheckout"
                            },
                            "shippingEstimate": [{
                                "timeUnit": "HOUR",
                                "value": 2
                            }],
                            "isDefault": true
                        }]
                    };
                },
                onShippingAddressSelection: function (event: any) {
                    console.log(event);
                    return {
                        "totalShippingAmount": {
                            "amount": "0.00",
                            "currencyCode": "USD"
                        },
                        "totalBaseAmount": {
                            "amount": "5.44",
                            "currencyCode": "USD"
                        },
                        "totalTaxAmount": {
                            "amount": "0.00",
                            "currencyCode": "USD"
                        },
                        "totalDiscountAmount": {
                            "amount": "4.44",
                            "currencyCode": "USD"
                        },
                        "totalChargeAmount": {
                            "amount": "1.00",
                            "currencyCode": "USD"
                        }
                    };
                },
                onCompleteCheckout: function (event: any) {
                    console.log(event);
                },
                onDeliveryOptionSelection: function (event: any) {
                    console.log(event);
                    return {
                        "totalShippingAmount": {
                            "amount": "0.00",
                            "currencyCode": "USD"
                        },
                        "totalBaseAmount": {
                            "amount": "5.44",
                            "currencyCode": "USD"
                        },
                        "totalTaxAmount": {
                            "amount": "0.00",
                            "currencyCode": "USD"
                        },
                        "totalDiscountAmount": {
                            "amount": "4.44",
                            "currencyCode": "USD"
                        },
                        "totalChargeAmount": {
                            "amount": "1.00",
                            "currencyCode": "USD"
                        }
                    };
                },
                onCancel: function (event: any) {
                    console.log(event);
                },
                onError: function (event: any) {
                    console.log(event);
                }
            })
        }
    }

    return (
        <>
            <Script
              src="https://static-na.payments-amazon.com/checkout.js"
              strategy="afterInteractive" // Load after the page becomes interactive
              onLoad={showJSButton ? loadApayJSButton : loadApayButton}
            />
            <div id="AmazonPayButton"></div>
        </>
        
    );
}
 
export default AmazonPayButton;