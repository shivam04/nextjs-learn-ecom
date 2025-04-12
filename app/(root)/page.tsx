import IconBoxes from "@/components/icon-boxes";
import ProductCarousel from "@/components/shared/product/product-carousel";
import ProductList from "@/components/shared/product/product-list";
import ViewAllProductsButton from "@/components/view-all-products-button";
import { getFeaturedProducts, getLatestProducts } from "@/lib/actions/product.actions";

const HomePage = async () => {

  console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET}`);

  const latestProducts = await getLatestProducts();
  const featuredProducts = await getFeaturedProducts();

  return (
    <>
      { featuredProducts.length > 0 && <ProductCarousel data={featuredProducts} /> }
      <ProductList data={latestProducts} title="Newest Arrivals"/>
      <ViewAllProductsButton />
      <IconBoxes />
    </>
  )
}

 export default HomePage;  