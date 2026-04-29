/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Order } from "@/types";
import { useRouter } from "next/navigation";
import Script from "next/script";

const AmazonPayButtonBuyNow = ({ order }:{ order: Omit<Order, 'paymentResult'> }) => {
    const router = useRouter();
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
                        "paymentIntent": "Authorize"
                    },
                },
                onInitCheckout: function (event: any) {
                    return onInitResponse(event);
                },
                onShippingAddressSelection: function (event: any) {
                    return onShippingAddressResponse(event);
                },
                onCompleteCheckout: async function (event: any) {
                    console.log("onCompleteCheckout");
                    console.log(event);
                    // const res = await updateOrderToPaid({
                    //     orderId: order.id,
                    //     paymentResult: {
                    //         id: event.payload.chargeId || event.payload.chargePermissionId || event.payload.checkoutSessionId || '',
                    //         status: 'COMPLETED',
                    //         email_address: eventData?.buyer?.email || 'test@test.com',
                    //         pricePaid: order.totalPrice
                    //     }
                    // });
                    // console.log(res);
                    router.push(`/order/${order.id}`);
                },
                onDeliveryOptionSelection: function (event: any) {
                    return onDeliveryOptionResponse(event);
                },
                onCancel: function (event: any) {
                    console.log("onCancel");
                    console.log(event);
                },
                onError: function (event: any) {
                    console.log("onError");
                    console.log(event);
                }
            })
        }
    }
    console.log("AmazonPayButtonBuyNow rendered");
    return (
        <>
            <Script
              src="https://static-na.payments-amazon.com/checkout.js"
              strategy="afterInteractive" // Load after the page becomes interactive
              onLoad={loadApayJSButton}
            />
            <div id="AmazonPayButton"></div>
        </>
    );
}
 
export default AmazonPayButtonBuyNow;

function onInitResponse(event: any) {
    console.log("oninitcheckout")
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
        },
        "lineItems": [{
            "id": "id-of-the-item",
            "title": "item-title-1",
            "variantTitle": "variant-title",
            "quantity": "2",
            "listPrice": {
                "amount": "10",
                "currencyCode": "USD"
            },
            "totalListPrice": {
                "amount": "20",
                "currencyCode": "USD"
            }
        }],
        "deliveryOptions": [{
            "id": "ups_shipping-02-25.11",
            "price": {
                "amount": "5",
                "currencyCode": "USD"
            },
            "shippingMethod": {
                "shippingMethodName": "shipping-method-name-onInitCheckout",
                "shippingMethodCode": "shipping-method-code-onInitCheckout"
            },
            "shippingEstimate": [{
                "timeUnit": "HOUR",
                "value": 2
            }, {
                "timeUnit": "HOUR",
                "value": 5
            }],
            "isDefault": true
        }, {
            "id": "ups_shipping-02-25.12",
            "price": {
                "amount": "5",
                "currencyCode": "USD"
            },
            "shippingMethod": {
                "shippingMethodName": "shipping-method-name-onInitCheckout-v2",
                "shippingMethodCode": "shipping-method-code-onInitCheckout-v2"
            },
            "shippingEstimate": [{
                "timeUnit": "HOUR",
                "value": 2
            }, {
                "timeUnit": "HOUR",
                "value": 5
            }],
            "isDefault": false
        }],
        "checkboxes": [{
                "type": "MERCHANT_DISCLOSURE", // required (atleast 1, atmost 4)
                "attributes": {
                    "termsAndConditionsUrl": "https://www.domain.com/mytandcs", // required
                    "privacyPolicyUrl": "https://www.domain.com/privacyIsKey" // required
                }
            },
            {
                "type": "NEWSLETTER_SIGN_UP",
                "attributes": {
                    "learnMoreUrl": "https://www.domain.com/mytandcs" // optional
                }
            },
            {
                "type": "MEMBERSHIP_SIGN_UP",
                "attributes": {
                    "programName": "name", // required                       
                    "learnMoreUrl": "https://www.domain.com/mytandcs" // optional
                }
            },
            {
                "type": "SMS_DELIVERY_NOTIFICATION",
                "attributes": {
                    "learnMoreUrl": "https://www.domain.com/mytandcs" // optional
                }
            }
        ],
        "freeForm": { // optional (if not present then exclude this feature)
            "placeholderText": "Please add delivery instructions", // required
            "limit": 3000 // optional
        }
    };
}

function onShippingAddressResponse(event: any) {
    console.log("onShippingAddressSelection");
    console.log(event);
    return {
        "totalShippingAmount": {
            "amount": "0.00",
            "currencyCode": "USD"
        },
        "totalBaseAmount": {
            "amount": "5.00",
            "currencyCode": "USD"
        },
        "totalTaxAmount": {
            "amount": "0.00",
            "currencyCode": "USD"
        },
        "totalDiscountAmount": {
            "amount": "4.00",
            "currencyCode": "USD"
        },
        "totalChargeAmount": {
            "amount": "1.00",
            "currencyCode": "USD"
        }
    };
}

function onDeliveryOptionResponse(event: any) {
    console.log("onDeliveryOptionSelection");
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
}
