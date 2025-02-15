import { getAllProducts } from "@/lib/actions/product.actions";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: 'Admin Products'
}

const AdminProductsPage = async (props: {
    searchParams: Promise<{
        page: string;
        query: string;
        category: string;
    }>
}) => {
    const searchParams = await props.searchParams;

    const page = Number(searchParams.page) || 1;
    const searchText = searchParams.query || '';
    const category = searchParams.category || '';

    const products = await getAllProducts({
        query: searchText,
        page: page,
        category: category
    });

    console.log(products);

    return (
        <>Products</>
    );
}
 
export default AdminProductsPage;