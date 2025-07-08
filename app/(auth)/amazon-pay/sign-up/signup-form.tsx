'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpUser } from "@/lib/actions/user.actions";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { CheckoutBuyer } from "@/types";

const AmazonPaySignUpForm = ({ buyerDetails, chargePermissionId }: { buyerDetails: CheckoutBuyer, chargePermissionId: string }) => {

    const [data, action] = useActionState(signUpUser, {
        success: false,
        message: ''
    });

    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    const SignUpButton = () => {
        const { pending } = useFormStatus();
        return (
            <Button disabled={pending} className="w-full" variant='default'>
                { pending ? 'Signing Up...' : 'Sign Up'}
            </Button>
        )
    }

    return (
        <form action={action} >
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div className="space-y-6">
                <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id='name'
                        name='name'
                        type='name'
                        readOnly
                        autoComplete="name"
                        defaultValue={buyerDetails.name}
                    />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id='email'
                        name='email'
                        type='email'
                        readOnly
                        autoComplete="email"
                        defaultValue={buyerDetails.email}
                    />
                </div>
                <div>
                    <Label htmlFor="chargePermissionId">ChargePemrissionId</Label>
                    <Input
                        id='chargePermissionId'
                        name='chargePermissionId'
                        type='chargePermissionId'
                        readOnly
                        autoComplete="chargePermissionId"
                        defaultValue={chargePermissionId}
                    />
                </div>
                <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id='password'
                        name='password'
                        type='password'
                        required
                        autoComplete="password"
                    />
                </div>
                <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id='confirmPassword'
                        name='confirmPassword'
                        type='password'
                        required
                        autoComplete="confirmPassword"
                    />
                </div>
                <div>
                    <SignUpButton />
                </div>
                
                {data && !data.success && (
                    <div className="text-center text-destructive">{data.message}</div>
                )}

                <div className="text-sm text-center text-muted-foreground">
                    Already have an account? {' '}
                    <Link href='/sign-in' target="_self" className="link">
                        Sign In
                    </Link>
                </div>
            </div>
        </form>
    )
}

export default AmazonPaySignUpForm;
