import ProductForm from "@/components/admin/product-form";
import { getProductByProductId } from "@/lib/actions/product.actions";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: "Update Product"
}

const AdminProductUpdatePage = async (props: {
    params: Promise<{
        id: string;
    }>
}) => {

    const { id } = await props.params;

    const product = await getProductByProductId(id);

    if (!product) return notFound();

    return ( 
        <div className="space-y-8 max-w5xl max-auto">
            <div className="h2-bold">
                <ProductForm type='Update' product={product} productId = {product.id}/>
            </div>
        </div>
     );
}
 
export default AdminProductUpdatePage;