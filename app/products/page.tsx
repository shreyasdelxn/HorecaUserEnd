// app/products/page.tsx
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductGrid from '@/components/products/ProductGrid';
import FrequentlyBought from '@/components/products/FrequentlyBought';
import CuratedPitches from '@/components/products/CuratedPitches';

// Optional: Force dynamic rendering if your products change often
export const dynamic = 'force-dynamic'; // removes automatic static optimization
// Or use: export const revalidate = 60; // revalidate every 60 seconds

async function getInitialProducts() {

  const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://horeca-backend-six.vercel.app').trim();
  const url = `${API_BASE.replace(/\/+$/, '')}/api/products`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Remove cache if you want fresh data on every visit
      cache: 'no-store',
      // Or use: next: { revalidate: 60 } for ISR
    });

    if (!res.ok) {
      console.error(`[ProductsPage] API returned ${res.status}`);
      return { products: [], error: 'Failed to load products' };
    }

    const json = await res.json();

    // Support multiple common API response shapes
    const items = json?.data?.items
      ?? json?.data
      ?? json?.products
      ?? json
      ?? [];

    if (!Array.isArray(items)) {
      console.warn('[ProductsPage] Unexpected API response shape:', json);
      return { products: [], error: 'Invalid data format' };
    }

    return { products: items, error: null };
  } catch (err) {
    console.error('[ProductsPage] Failed to fetch products:', err);
    return { products: [], error: 'Network error – please try again later' };
  }
}

import PageTransition from "@/components/ui/PageTransition";

import { Suspense } from 'react';
import Loading from './loading';

export default async function ProductsPage() {
  const { products, error } = await getInitialProducts();

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-grow bg-gray-50">
          <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-6">
            <CuratedPitches />
            <FrequentlyBought />
          </div>

          {/* Pass data directly — ProductGrid will show skeletons only if needed */}
          <Suspense fallback={<Loading />}>
            <ProductGrid initialProducts={products} />
          </Suspense>

          {/* Optional: Show server-side error (rare) */}
          {error && products.length === 0 && (
            <div className="max-w-7xl mx-auto px-4 py-16 text-center">
              <p className="text-red-600 bg-red-50 inline-block px-6 py-4 rounded-lg">
                {error}
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}