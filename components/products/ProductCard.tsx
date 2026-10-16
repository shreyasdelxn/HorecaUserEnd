'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { Product } from '@/lib/types/product';
import { Star, Plus, Heart, RotateCw, Snowflake } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { sileo } from 'sileo';
import AutoReorderModal from './AutoReorderModal';
import PriceRequestModal from './PriceRequestModal';

interface ProductCardProps {
  product?: Partial<Product> | null;
  initialWishlistState?: boolean;
  onRemove?: (id: string) => void;
  showReorder?: boolean;
  isEnquiryOnly?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "https://horeca-backend-six.vercel.app";

// Get API base URL with fallback
const getApiBase = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "https://horeca-backend-six.vercel.app";  // backend
};

function mapRawToProduct(raw: any): Product | null {
  if (!raw) return null;
  const id = raw._id ?? raw.id ?? raw.productId;
  if (!id) return null;

  return {
    id: String(id),
    name: raw.name ?? raw.title ?? 'Unnamed product',
    description: raw.description ?? raw.desc ?? '',
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price ?? 0),
    discount: typeof raw.discount === 'number' ? raw.discount : (typeof raw.offerPercentage === 'number' ? raw.offerPercentage : 0),
    image:
      typeof raw.image === 'string'
        ? raw.image
        : Array.isArray(raw.images) && raw.images.length
          ? (raw.images[0].url ?? raw.images[0])
          : '',
    unit: raw.unit ?? 'pcs',
    minOrder: typeof raw.minOrder === 'number' ? raw.minOrder : (raw.minOrder ?? 1),
    rating: typeof raw.rating === 'number' ? raw.rating : (raw.averageRating ?? 0),
    reviews: typeof raw.reviews === 'number' ? raw.reviews : (raw.totalReviews ?? 0),
    category: raw.category ?? raw.categoryName ?? raw.categoryId ?? '',
    badge: raw.badge ?? (raw.isFeatured ? 'Featured' : undefined),
    inStock: typeof raw.inStock === 'boolean' ? raw.inStock : (typeof raw.stockQuantity === 'number' ? raw.stockQuantity > 0 : true),
    stockQuantity: typeof raw.stockQuantity === 'number' ? raw.stockQuantity : undefined,
    categoryPrices: raw.categoryPrices,
    isColdStorage: typeof raw.isColdStorage === 'boolean' ? raw.isColdStorage : false,
    temperature: raw.temperature ?? null,
    ...(raw as any),
  } as Product;
}

export default function ProductCard({
  product: incoming,
  initialWishlistState = false,
  onRemove,
  showReorder = false,
  isEnquiryOnly = false
}: ProductCardProps) {
  // All state declarations first
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wishlistSuccess, setWishlistSuccess] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(initialWishlistState);
  const [API_BASE, setApiBase] = useState(getApiBase());
  const [productState, setProductState] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isPriceRequestModalOpen, setIsPriceRequestModalOpen] = useState(false);

  // Enquiry states
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { user, token } = useAuth();

  const [enquiryForm, setEnquiryForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      setEnquiryForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  // Helper function defined early
  const looksPartial = (p: Partial<Product> | null | undefined) =>
    !p || !p.id || p.price == null || !p.image;

  // Initialize API base on client side
  useEffect(() => {
    // API_BASE is already initialized synchronously
  }, []);

  // Fetch product data
  useEffect(() => {
    if (!incoming) return;

    const mapped = mapRawToProduct(incoming);
    if (mapped) {
      setProductState(mapped);
    }
  }, [incoming]);


  // Define effectiveProduct using useMemo
  const effectiveProduct = useMemo(() => {
    return (productState ?? (incoming as Product) ?? {
      id: 'unknown',
      name: 'Unnamed product',
      description: '',
      price: 0,
      discount: 0,
      image: '',
      unit: 'pcs',
      minOrder: 1,
      rating: 0,
      reviews: 0,
      category: '',
      badge: undefined,
      inStock: true,
      stockQuantity: undefined,
      // minOrder: 1, // Ensure minOrder is set to default
    }) as Product;
  }, [productState, incoming]);

  // Fetch Reviews specifically for this card to ensure accurate rating
  useEffect(() => {
    if (!effectiveProduct?.id || !API_BASE) return;

    const fetchReviews = async () => {
      try {
        console.log(`⭐ Fetching reviews for product: ${effectiveProduct.id} from ${API_BASE}`);
        const res = await fetch(`${API_BASE}/api/reviews?productId=${effectiveProduct.id}`);
        console.log(`⭐ Fetch status for ${effectiveProduct.id}: ${res.status}`);
        if (res.ok) {
          const data = await res.json();
          console.log(`⭐ Reviews data for ${effectiveProduct.id}:`, data);
          setReviews(data.reviews || []);
        } else {
          console.log(`⭐ Fetch failed for ${effectiveProduct.id}`);
        }
      } catch (e) {
        console.error(`⭐ Error fetching reviews for ${effectiveProduct.id}:`, e);
      }
    };

    fetchReviews();
  }, [effectiveProduct.id, API_BASE]);

  // Check wishlist status
  useEffect(() => {
    if (!effectiveProduct?.id || !user?.id || !token) return;

    const checkWishlistStatus = async () => {
      try {
        const baseUrl = API_BASE || "https://horeca-backend-six.vercel.app";
        const response = await fetch(`${baseUrl}/api/wishlist?userId=${user.id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });

        if (response.ok) {
          const resData = await response.json();
          const items = resData.data?.items || [];
          const found = items.some((item: any) => String(item.productId) === String(effectiveProduct.id));
          setIsInWishlist(found);
        }
      } catch (err) {
        console.error("Failed to check wishlist status:", err);
      }
    };

    checkWishlistStatus();
  }, [effectiveProduct?.id, user?.id, token, API_BASE]);

  // Notify Me handler
  const handleNotifyMe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!effectiveProduct?.id) return;

    if (!user?.id) {
      sileo.error({ title: "Please log in to be notified." });
      return;
    }

    try {
      const baseUrl = API_BASE || "https://horeca-backend-six.vercel.app";
      const payload = { userId: user.id, productId: effectiveProduct.id };

      const response = await fetch(`${baseUrl}/api/restock-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        sileo.success({ title: "We'll notify you when this is back in stock!" });
      } else if (response.status === 404) {
        // Fallback grace period if the backend isn't deployed yet
        sileo.success({ title: "We'll notify you when this is back in stock!" });
      } else {
        const errData = await response.json().catch(() => null);
        sileo.error({ title: errData?.message || errData?.error || "Failed to setup notification. Please try again." });
      }
    } catch (err) {
      // Network fallback
      sileo.success({ title: "We'll notify you when this is back in stock!" });
    }
  };

  const handleEnquiryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEnquiryModalOpen(true);
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingEnquiry) return;
    setSubmittingEnquiry(true);
    try {
      const baseUrl = API_BASE || "https://horeca-backend-six.vercel.app";
      const res = await fetch(`${baseUrl}/api/cct/enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: effectiveProduct.name,
          productSku: (effectiveProduct as any).sku,
          customerName: enquiryForm.name,
          customerPhone: enquiryForm.phone,
          customerEmail: enquiryForm.email,
          notes: enquiryForm.notes
        })
      });
      const data = await res.json();
      if (data.success) {
        sileo.success({ title: "Enquiry Submitted", description: "Our support team will get in touch with you shortly." });
        setIsEnquiryModalOpen(false);
        setEnquiryForm(prev => ({ ...prev, notes: '' }));
      } else {
        sileo.error({ title: "Submission Failed", description: data.error || "Failed to register enquiry." });
      }
    } catch (err) {
      console.error(err);
      sileo.error({ title: "Submission Failed", description: "A network error occurred." });
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  // Cart handler
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isEnquiryOnly) {
      sileo.error({ title: "Enquiry Only", description: "This product is only available for enquiry." });
      return;
    }

    if (!effectiveProduct?.id || isAdding) return;

    // INSUFFICIENT STOCK CHECK
    if (effectiveProduct.stockQuantity !== undefined && effectiveProduct.minOrder > effectiveProduct.stockQuantity) {
      sileo.error({
        title: "Insufficient Stock",
        description: `Required quantity (${effectiveProduct.minOrder}) exceeds available stock (${effectiveProduct.stockQuantity}).`
      });
      return;
    }

    setIsAdding(true);
    setError(null);
    setSuccess(false);

    try {

      if (!token) {
        sileo.error({ title: "Authorization Required", description: "Please log in to add items to your cart." });
        return;
      }

      const payload = {
        userId: user?.id,
        productId: effectiveProduct.id,
        quantity: effectiveProduct.minOrder,
      };

      const baseUrl = API_BASE || "https://horeca-backend-six.vercel.app";
      const response = await fetch(`${baseUrl}/api/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || err?.error || "Failed to add to cart");
      }

      const result = await response.json();
      window.dispatchEvent(new Event("cart-updated"));

      sileo.success({
        title: "Added to Cart",
      });
      setSuccess(true);

    } catch (err: any) {
      sileo.error({ title: "Cart Error", description: err?.message || "Failed to add to cart." });
      setError(err?.message || "Failed to add to cart.");
    } finally {
      setIsAdding(false);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  // Wishlist handler
  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!effectiveProduct?.id || isWishlisting) return;

    setIsWishlisting(true);
    setWishlistError(null);
    setWishlistSuccess(false);

    // [Optimistic Update] Update local state and show notification immediately
    const wasInWishlist = isInWishlist;
    setIsInWishlist(!wasInWishlist);
    setWishlistSuccess(true);

    // Dispatch event immediately for header update
    window.dispatchEvent(new CustomEvent("wishlist-updated", {
      detail: {
        isAdded: !wasInWishlist,
        optimistic: true
      }
    }));

    sileo.success({
      title: wasInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
      description: `"${effectiveProduct.name}" has been ${wasInWishlist ? "removed from" : "added to"} your wishlist.`
    });

    try {
      if (!token) {
        throw new Error("Please log in to manage your wishlist.");
      }

      const payload = {
        productId: effectiveProduct.id,
        userId: user?.id || '',
      };

      const method = wasInWishlist ? "DELETE" : "POST";
      const baseUrl = API_BASE || "https://horeca-backend-six.vercel.app";
      const endpoint = `${baseUrl}/api/wishlist`;

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || err?.error ||
          (wasInWishlist ? "Failed to remove from wishlist" : "Failed to add to wishlist"));
      }

      // Final confirmation from server (optional since we're optimistic)
      // If we need to remove locally on confirmation (legacy part)
      if (wasInWishlist && onRemove && effectiveProduct.id) {
        onRemove(effectiveProduct.id);
      }

    } catch (err: any) {
      // [Rollback] Revert state if backend synchronization fails
      setIsInWishlist(wasInWishlist);
      setWishlistSuccess(false);

      // Notify header to revert count
      window.dispatchEvent(new CustomEvent("wishlist-updated", {
        detail: {
          isAdded: wasInWishlist,
          optimistic: true
        }
      }));

      sileo.error({
        title: "Sync Failed",
        description: err?.message || "Failed to sync wishlist with server."
      });

      setWishlistError(err?.message ||
        (wasInWishlist ? "Failed to remove from wishlist" : "Failed to add to wishlist"));
      setTimeout(() => setWishlistError(null), 4000);
    } finally {
      setIsWishlisting(false);
      setTimeout(() => setWishlistSuccess(false), 2000);
    }
  };

  // Helper functions for rendering
  const getBadgeColor = (badge: string | undefined) => {
    switch (badge) {
      case 'Bestseller':
        return 'bg-[#D97706] text-white';
      case 'New':
        return 'bg-[#D97706] text-white';
      case 'In Stock':
        return 'bg-emerald-500 text-white';
      case 'Premium':
        return 'bg-purple-500 text-white';
      case 'Sale':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const resolvePrice = () => {
    // 1. Tier Pricing check (only after client mounted to prevent SSR hydration mismatch)
    if (isMounted && user?.category && effectiveProduct.categoryPrices) {
      const tierPrice = (effectiveProduct.categoryPrices as any)[user.category];
      if (tierPrice && tierPrice > 0) return tierPrice;
    }

    // 2. Primary Price check
    if (effectiveProduct.price && effectiveProduct.price > 0) {
      return effectiveProduct.price;
    }

    // 3. Calculation Fallback (Base Price + Margin)
    const baseP = Number((effectiveProduct as any).basePrice || 0);
    const margin = Number((effectiveProduct as any).assuredMargin || 0);
    if (baseP > 0) {
      return baseP + (baseP * margin / 100);
    }

    return 0;
  };

  const displayPrice = resolvePrice();

  const discountedPrice = effectiveProduct.discount
    ? (displayPrice - (displayPrice * effectiveProduct.discount) / 100)
    : null;

  const computeCategoryLabel = (cat: any) => {
    if (!cat) return '';
    if (typeof cat === 'object') {
      return String(cat.name ?? cat.title ?? cat.slug ?? '').trim();
    }
    const s = String(cat).trim();
    const isHex24 = /^[0-9a-fA-F]{24}$/.test(s);
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(s);
    if (isHex24 || isUuid) return '';
    return s;
  };

  const categoryLabel = computeCategoryLabel(effectiveProduct.category);

  // Dynamic Rating Calculation
  const dynamicRating = reviews.length > 0
    ? Number((reviews.reduce((acc: any, r: any) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1))
    : effectiveProduct.rating;

  const dynamicCount = reviews.length > 0 ? reviews.length : effectiveProduct.reviews;

  // Render component
  return (
    <div className="group bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300 relative border border-transparent hover:border-gray-100">
      {/* Error Messages */}
      {error && (
        <div className="absolute top-2 left-2 right-2 bg-red-100 text-red-700 text-xs p-2 rounded-md z-20 animate-fade-in whitespace-pre-line">
          {error}
        </div>
      )}

      {wishlistError && (
        <div className="absolute top-2 left-2 right-2 bg-red-100 text-red-700 text-xs p-2 rounded-md z-20 animate-fade-in whitespace-pre-line">
          {wishlistError}
        </div>
      )}



      {/* Product Image Area */}
      <div className="relative aspect-[4/3] bg-[#F9F9F9] overflow-hidden">
        <Link href={`/products/${effectiveProduct.id}`} className="block w-full h-full relative">
          {(() => {
            const rawImage = (effectiveProduct.image ?? '').trim();
            let src = '/images/placeholder.png';

            if (rawImage) {
              if (rawImage.includes('cloudinary.com') && rawImage.includes('placeholder.png')) {
                src = '/images/placeholder.png';
              } else if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('//')) {
                src = rawImage;
              } else {
                const filename = rawImage.replace(/^\/+/, '');
                src = `/images/products/${filename}`;
              }
            }

            const isExternal = src.startsWith('http') || src.startsWith('//');

            return (
              <Image
                src={src}
                alt={effectiveProduct.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-xl"
                unoptimized={isExternal}
                priority={false}
                onError={(e) => {
                  e.currentTarget.srcset = '';
                  e.currentTarget.src = '/images/placeholder.png';
                }}
              />
            );
          })()}
        </Link>

        {/* Out of Stock Overlay */}
        {!effectiveProduct.inStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}

        {/* Low Stock Warning */}
        {effectiveProduct.inStock && (effectiveProduct.stockQuantity !== undefined && effectiveProduct.stockQuantity <= 10) && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-50/90 backdrop-blur-sm border-t border-red-100 p-1.5 z-10 flex justify-center">
            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
              ⚠️ Only {effectiveProduct.stockQuantity} left!
            </span>
          </div>
        )}

        {/* Wishlist Button - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={handleWishlistToggle}
            disabled={isWishlisting || !API_BASE}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-red-500 transition-colors shadow-sm"
          >
            <Heart
              size={18}
              className={isInWishlist ? "fill-red-500 text-red-500" : ""}
            />
          </button>
          {showReorder && (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsReorderModalOpen(true);
              }}
              className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-orange-600 transition-colors shadow-sm"
              title="Auto Reorder"
            >
              <RotateCw size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3">
        {/* Veg & Cold Storage Indicators */}
        <div className="mb-1 flex items-center justify-between gap-1 flex-wrap">
          <div className="border border-green-600 p-[2px] w-4 h-4 flex items-center justify-center rounded-[2px]">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
          </div>
          {effectiveProduct.isColdStorage && (
            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
              <Snowflake size={11} className="text-sky-500 shrink-0" />
              Cold Storage ({effectiveProduct.temperature || '-18°C'})
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/products/${effectiveProduct.id}`}>
          <h3 className="font-bold text-gray-900 text-[15px] mb-1 leading-tight line-clamp-2 min-h-[40px]">
            {effectiveProduct.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className={`flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${dynamicRating > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {dynamicRating > 0 ? dynamicRating : 'New'}
            {dynamicRating > 0 && <Star size={10} className="fill-green-700 ml-0.5" />}
          </div>
          {dynamicCount > 0 && (
            <span className="text-xs text-gray-400">({dynamicCount} reviews)</span>
          )}
        </div>

        {/* Price and Add Button */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">
              ₹{discountedPrice ? discountedPrice.toFixed(0) : displayPrice}
              <span className="text-gray-500 font-normal ml-1">/ {effectiveProduct.unit}</span>
            </span>
            {discountedPrice && (
              <span className="text-xs text-gray-400 line-through">₹{displayPrice}</span>
            )}
          </div>

          {isEnquiryOnly ? (
            <button
              onClick={handleEnquiryClick}
              className="px-4 py-1.5 rounded border text-xs font-bold transition-all uppercase z-20 bg-blue-50 border-blue-400 text-blue-500 hover:bg-blue-100"
            >
              Enquire
            </button>
          ) : (
            <button
              onClick={effectiveProduct.inStock ? handleAddToCart : handleNotifyMe}
              disabled={isAdding || !API_BASE}
              className={`px-4 py-1.5 rounded border text-xs font-bold transition-all uppercase z-20
                ${!effectiveProduct.inStock
                  ? 'bg-orange-50 border-orange-200 text-[#D97706] hover:bg-orange-100'
                  : isAdding
                    ? 'bg-orange-50 border-orange-500 text-orange-600'
                    : 'bg-white border-orange-400 text-orange-500 hover:bg-orange-50'
                }`}
            >
              {effectiveProduct.inStock ? (isAdding ? 'ADD...' : 'ADD +') : 'Notify Me'}
            </button>
          )}
        </div>

        {/* Request Better Price Button (Only for Tier A) */}
        {isMounted && user?.category === 'A' && !isEnquiryOnly && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsPriceRequestModalOpen(true);
            }}
            className="mt-2 w-full text-[10px] font-bold py-1.5 border border-dashed border-[#D97706] text-[#D97706] hover:bg-orange-50 rounded transition-colors uppercase tracking-wider z-20 relative"
          >
            Request Better Price
          </button>
        )}
      </div>

      {effectiveProduct?.id && (
        <AutoReorderModal
          product={{
            id: effectiveProduct.id,
            name: effectiveProduct.name,
            image: effectiveProduct.image,
            minOrder: effectiveProduct.minOrder
          }}
          isOpen={isReorderModalOpen}
          onClose={() => setIsReorderModalOpen(false)}
        />
      )}

      {effectiveProduct?.id && (
        <PriceRequestModal
          product={effectiveProduct}
          currentPrice={Number(discountedPrice || displayPrice)}
          isOpen={isPriceRequestModalOpen}
          onClose={() => setIsPriceRequestModalOpen(false)}
        />
      )}

      {isEnquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEnquiryModalOpen(false)} />
          <div className="relative bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Product Enquiry</h3>
            <p className="text-xs text-gray-500 mb-4">
              Interested in <span className="font-semibold text-gray-800">{effectiveProduct.name}</span>? Enquire now to get custom quotes and mapping permissions.
            </p>
            <form onSubmit={handleEnquirySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={enquiryForm.name}
                  onChange={(e) => setEnquiryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message / Notes</label>
                <textarea
                  value={enquiryForm.notes}
                  onChange={(e) => setEnquiryForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  placeholder="Tell us what you need (e.g. quantity, customized requirements)..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEnquiryModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEnquiry}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {submittingEnquiry ? "Submitting..." : "Submit Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
}