/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Script from "next/script";

const AmazonPaySignInAndSetupButton = () => {
    const loadApayButton = () => {
        if (typeof window !== "undefined" && (window as any).amazon) {
            const payload = {
                "storeId": process.env.NEXT_PUBLIC_AMAZON_STORE_ID,
                "signInScopes":["name", "email", "postalCode", "shippingAddress", "phoneNumber", "billingAddress"],
                "webCheckoutDetails": {
                    "signInReturnUrl": `${process.env.NEXT_PUBLIC_SERVER_URL}/amazon-pay/sign-up`,
                    "signInCancelUrl": `${process.env.NEXT_PUBLIC_SERVER_URL}/sign-in`
                }
            }

            fetch('/api/genrate-signature', {
                method: 'POST', 
                body: JSON.stringify(payload)
            }).then((res) => res.json())
            .then((signature) => {
                (window as any).amazon.Pay.renderButton('#AmazonPayButton', {
                    merchantId: process.env.NEXT_PUBLIC_AMAZON_MERCHANT_ID,
                    publicKeyId: process.env.NEXT_PUBLIC_AMAZON_PUBLIC_KEY_ID,
                    ledgerCurrency: 'USD',
                    sandbox: true,
                    checkoutLanguage: 'en_US',
                    productType: 'SignInAndSetup',
                    placement: 'Home',
                    buttonColor: 'Gold',
                    createCheckoutSessionConfig: {
                        payloadJSON: JSON.stringify(payload),
                        algorithm : 'AMZN-PAY-RSASSA-PSS-V2',
                        signature: signature.signature,
                    }
                });
            });
        }
    }

    return (
        <>
            <Script
                src="https://static-na.payments-amazon.com/checkout.js"
                strategy="afterInteractive"
                onLoad={loadApayButton}
            />
            <div id="AmazonPayButton"></div>
        </>
    )
}

export default AmazonPaySignInAndSetupButton;