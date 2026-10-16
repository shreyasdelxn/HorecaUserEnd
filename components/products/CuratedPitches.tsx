'use client';

import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import { Product } from '@/lib/types/product';
import { useAuth } from '@/lib/context/AuthContext';
import { Sparkles, Target, UserCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_HORECA_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://horeca-backend-six.vercel.app';

export default function CuratedPitches() {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [repName, setRepName] = useState<string>('Your Account Manager');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    const fetchCuratedPitches = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/api/customer/curated-pitches?userId=${user.id}`, {
          headers,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const pitchStatus = json.data.status;
            // Only show pitched products when pitch is actively ongoing: 'approached', 'interested', or 'follow_up'
            // Never show if converted (won/over), rejected, ended, or not_approached
            const isActivePitch = ['approached', 'interested', 'follow_up'].includes(pitchStatus);

            if (isActivePitch && Array.isArray(json.data.products) && json.data.products.length > 0) {
              setProducts(json.data.products);
              if (json.data.repName) {
                setRepName(json.data.repName);
              }
            } else {
              setProducts([]);
            }
          }
        }
      } catch (err: any) {
        console.log('Failed to fetch curated pitches:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCuratedPitches();
  }, [user?.id, isAuthenticated]);

  if (!isAuthenticated) return null;
  if (!loading && products.length === 0) return null;

  return (
    <div className="mb-8 sm:mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent p-3.5 sm:p-5 rounded-2xl border border-amber-200/80 mb-4 sm:mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-500 text-white flex items-center justify-center shadow-xs flex-shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
                  Picked For Your Menu
                </h2>
                <span className="text-[10px] sm:text-[11px] font-semibold bg-yellow-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                  Account Manager's Picks
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 leading-snug">
                Discover products selected to complement your menu and kitchen needs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] sm:text-xs font-semibold text-yellow-800 bg-yellow-100/80 px-2.5 py-1 rounded-lg border border-yellow-300/60 flex-shrink-0">
            <UserCheck className="w-3.5 h-3.5 text-yellow-600" />
            <span>Pitched for your kitchen</span>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel of Pitched Products */}
      {loading ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[170px] xs:min-w-[190px] sm:min-w-[220px] w-[170px] xs:w-[190px] sm:w-[220px] snap-start flex-shrink-0">
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? null : (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {products.map((product, i) => (
            <div
              key={`curated-${product._id || product.id || i}`}
              className="min-w-[170px] xs:min-w-[190px] sm:min-w-[220px] w-[170px] xs:w-[190px] sm:w-[220px] snap-start flex-shrink-0 relative group"
            >
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <span className="bg-amber-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md shadow-xs">
                  Recommended
                </span>
              </div>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
