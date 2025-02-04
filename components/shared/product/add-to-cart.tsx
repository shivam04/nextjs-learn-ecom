'use client';

import { Button } from "@/components/ui/button";
import { Cart, CartItem } from "@/types";
import { Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { addItemToCart, removeItemFromCart } from '@/lib/actions/cart.actions'
import { useRouter } from "next/navigation";

const AddToCart = ({ cart, item }: { cart?: Cart, item: CartItem }) => {
    const router = useRouter();
    const { toast } = useToast();

    const handleAddtoCart = async ()  => {
        const res = await addItemToCart(item);

        if (!res.success) {
            toast({
                variant: 'destructive',
                description: res.message
            });
            return;
        }
        // Handle success add to cart
        toast({
            description: res.message,
            action: (
                <ToastAction 
                    className="bg-primary text-white hover:bg-gray-800" 
                    altText="Go To Cart" 
                    onClick={() => router.push('/cart')}>
                        Go To Cart
                </ToastAction>
            )
        });
    };

    const handleRemoveFromCart = async () => {
        const res = await removeItemFromCart(item.productId);

        toast({
            variant: res.success ? 'default' : 'destructive',
            description: res.message
        }); 
    }

    const existingItem = cart && cart.items && cart.items.find((x) => x.productId === item.productId);

    return (
        <>
            {existingItem ? (
                <>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleRemoveFromCart}
                    >
                        <Minus className="h-4 w-4"/>
                    </Button>
                    <span className="px-2">{existingItem.qty}</span>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleAddtoCart}
                    >
                        <Plus className="h-4 w-4"/>
                    </Button>
                </>
            ): (
                <Button 
                    className="w-full" 
                    type="button" 
                    onClick={handleAddtoCart}>
                    <Plus /> Add To Cart
                </Button>
            )}
        </>
    );
}
 
export default AddToCart;