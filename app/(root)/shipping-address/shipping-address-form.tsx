'use client';

import { shippingAddressDefaultValues } from "@/lib/constants";
import { shippingAddressSchema } from "@/lib/validators";
import { ShippingAddress } from "@/types";
import { useRouter } from "next/navigation";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader } from "lucide-react";

/**
 * react-hook-forms: Helps manage forms in react, takes care of managing state, submissions, validating and error messages.
 * It integrates well with ShadCN form components and zod.
 * 
 * @hookform/resolvers: Provides integration between react-hook-form and validation libraries like zod.
 * We can leverage the Zod schemas to work with our forms.
 */

const ShippingAddressForm = ({ address }: { address: ShippingAddress}) => {
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof shippingAddressSchema>>({
        resolver: zodResolver(shippingAddressSchema),
        defaultValues: address || shippingAddressDefaultValues
    });

    const onSubmit = (values) => {
        console.log(values);
        return;
    }

    const [isPending, stateTransition] = useTransition();

    return ( 
        <>
            <div className="max-w-md mx-auto space-y-4">
                <h1 className="h2-bold mt-4">Shipping Address</h1>
                <p className="text-sm text-muted-foreground">
                    Please enter and address to ship to
                </p>
                <Form {...form}>
                    <form method='post' className="space-y-4" onSubmit={
                        form.handleSubmit(onSubmit)
                    }>
                        <div className="flex flex-col md:flex-row gap-5">
                            <FormField 
                                control={form.control} 
                                name='fullName' 
                                render={({ 
                                    field 
                                }: { 
                                    field: ControllerRenderProps<
                                        z.infer<typeof shippingAddressSchema>,
                                        'fullName'
                                    >;
                                }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter your full name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        </div>
                        <div className="flex flex-col md:flex-row gap-5">
                            <FormField 
                                control={form.control} 
                                name='streetAddress' 
                                render={({ 
                                    field 
                                }: { 
                                    field: ControllerRenderProps<
                                        z.infer<typeof shippingAddressSchema>,
                                        'streetAddress'
                                    >;
                                }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>Street Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter address" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        </div>
                        <div className="flex flex-col md:flex-row gap-5">
                            <FormField 
                                control={form.control} 
                                name='city' 
                                render={({ 
                                    field 
                                }: { 
                                    field: ControllerRenderProps<
                                        z.infer<typeof shippingAddressSchema>,
                                        'city'
                                    >;
                                }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>City</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter city" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        </div>
                        <div className="flex flex-col md:flex-row gap-5">
                            <FormField 
                                control={form.control} 
                                name='postalCode' 
                                render={({ 
                                    field 
                                }: { 
                                    field: ControllerRenderProps<
                                        z.infer<typeof shippingAddressSchema>,
                                        'postalCode'
                                    >;
                                }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>Postal Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter PostalCode" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        </div>
                        <div className="flex flex-col md:flex-row gap-5">
                            <FormField 
                                control={form.control} 
                                name='country' 
                                render={({ 
                                    field 
                                }: { 
                                    field: ControllerRenderProps<
                                        z.infer<typeof shippingAddressSchema>,
                                        'country'
                                    >;
                                }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>Country</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Country" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type='submit' disabled={isPending}>
                                { isPending ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ): (
                                    <ArrowRight className="w-4 h-4" />
                                )} Continue
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </>
    );
}
 
export default ShippingAddressForm;