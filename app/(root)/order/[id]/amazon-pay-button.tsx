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
                ledgerCurrency: 'JPY',
                checkoutLanguage: 'ja_JP',
                productType: 'PayAndShip',
                placement: 'Cart',
                buttonColor: 'Gold',
                sandbox: true,
                checkoutSessionConfig: {
                    "storeId": process.env.NEXT_PUBLIC_AMAZON_STORE_ID,
                    "paymentDetails": {
                        "paymentIntent": "Confirm"
                    },
                    "processorSpecifications" : {
                        'name': 'gmopg',

                    }
                },
                onInitCheckout: function (event: any) {
                    console.log("oninitcheckout")
                    return onInitResponse(event);
                },
                onShippingAddressSelection: function (event: any) {
                    console.log(event);
                    (window as any).shippingAddress = event['shippingAddress']
                    return {
                        "totalShippingAmount": {
                            "amount": "0",
                            "currencyCode": "JPY"
                        },
                        "totalBaseAmount": {
                            "amount": "5",
                            "currencyCode": "JPY"
                        },
                        "totalTaxAmount": {
                            "amount": "0",
                            "currencyCode": "JPY"
                        },
                        "totalDiscountAmount": {
                            "amount": "4",
                            "currencyCode": "JPY"
                        },
                        "totalChargeAmount": {
                            "amount": "1",
                            "currencyCode": "JPY"
                        }
                    };
                },
                onCompleteCheckout: function (event: any) {
                    console.log(event);
                    (window as any).onCompleteCallbackCount = (window as any).onCompleteCallbackCount || 0;
                    if ((window as any).onCompleteCallbackCount === 0) {
                        const amazonPayMFAReturnUrl = event['amazonPayMFAReturnUrl'];
                        (window as any).onCompleteCallbackCount += 1;
                        return {"status": "redirectRequired", "redirectUrl": `http://localhost:8010?returnUrl=${amazonPayMFAReturnUrl}`};
                    } else {
                        return {"status": "success"}
                    }
                },
                onDeliveryOptionSelection: function (event: any) {
                    console.log(event);
                    return {
                        "totalShippingAmount": {
                            "amount": "0.00",
                            "currencyCode": "JPY"
                        },
                        "totalBaseAmount": {
                            "amount": "5.44",
                            "currencyCode": "JPY"
                        },
                        "totalTaxAmount": {
                            "amount": "0.00",
                            "currencyCode": "JPY"
                        },
                        "totalDiscountAmount": {
                            "amount": "4.44",
                            "currencyCode": "JPY"
                        },
                        "totalChargeAmount": {
                            "amount": "1.00",
                            "currencyCode": "JPY"
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
              src="https://duoiqv61nq97o.cloudfront.net/checkout.js"
              strategy="afterInteractive" // Load after the page becomes interactive
              onLoad={showJSButton ? loadApayJSButton : loadApayButton}
            />
            <div id="AmazonPayButton"></div>
        </>
        
    );
}
 
export default AmazonPayButton;
function onInitResponse(event: any) {
    console.log(event);
    (window as any).shippingAddress = event['shippingAddress']
    return {
        "totalShippingAmount": {
            "amount": "0",
            "currencyCode": "JPY"
        },
        "totalBaseAmount": {
            "amount": "5",
            "currencyCode": "JPY"
        },
        "totalTaxAmount": {
            "amount": "0",
            "currencyCode": "JPY"
        },
        "totalDiscountAmount": {
            "amount": "4",
            "currencyCode": "JPY"
        },
        "totalChargeAmount": {
            "amount": "1",
            "currencyCode": "JPY"
        },
        "deliveryOptions": [{
            "id": "ups_shipping-02-25.11",
            "price": {
                "amount": "5",
                "currencyCode": "JPY"
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
        }, {
            "id": "ups_shipping-02-25.11-v2",
            "price": {
                "amount": "5",
                "currencyCode": "JPY"
            },
            "shippingMethod": {
                "shippingMethodName": "shipping-method-name-onInitCheckout-v2",
                "shippingMethodCode": "shipping-method-code-onInitCheckout-v2"
            },
            "shippingEstimate": [{
                "timeUnit": "HOUR",
                "value": 2
            }],
            "isDefault": false
        }]
    };
}
