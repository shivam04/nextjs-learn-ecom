'use client';

import { Button } from "@/components/ui/button";
import { CartItem } from "@/types";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { addItemToCart } from '@/lib/actions/cart.actions'
import { useRouter } from "next/navigation";

const AddToCart = ({ item }: { item: CartItem }) => {
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

    return (
        <Button 
            className="w-full" 
            type="button" 
            onClick={handleAddtoCart}>
            <Plus /> Add To Cart
        </Button>
    );
}
 
export default AddToCart;