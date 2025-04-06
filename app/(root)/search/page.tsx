import ProductCard from "@/components/shared/product/product-card";
import { getAllProducts } from "@/lib/actions/product.actions";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: 'Search Page'
}

const SearchPage = async (props: {
    searchParams: Promise<{
        q?: string;
        category?: string;
        price?: string;
        rating?: string;
        sort?: string;
        page?: string;
    }>
}) => {
    const {
        q = 'all',
        category = 'all',
        price = 'all',
        rating = 'all',
        sort = 'newest',
        page = '1'
    } = await props.searchParams;

    const getFilterUrl = ({
        c,
        s,
        p,
        r,
        pg
    }: {
        c?: string;
        s?: string;
        p?: string;
        r?: string;
        pg?: string;
    }) => {
        const params = { q, category, price, rating, sort, page }

        if (c) params.category = c;
        if (s) params.sort = s;
        if (p) params.price = p;
        if (r) params.rating = r;
        if (pg) params.page = pg;
        return `/search?${new URLSearchParams(params).toString()}`
    }

    const products = await getAllProducts({
        query: q,
        category: category,
        price: price,
        rating: rating,
        sort: sort,
        page: Number(page)
    })

    return (
        <div className="grid md:grid-cols-5 md:gap-5">
            <div className="filter-links">
                {/* Filter Links */}
                URL: { getFilterUrl({
                    c: 'Mens Sweat Shirts',
                })}
            </div>
            <div className="md:col-span-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    { products.data.length === 0 && <div> No Products found</div> }
                    { products.data.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
}
 
export default SearchPage;