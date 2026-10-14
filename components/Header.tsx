"use client";

import {
  Search, Heart, User, Bell, X, MapPin, Loader2,
  ChevronDown, Package, Phone, Mail, Wallet
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import CartButton from '@/components/cart/CartButton';
import { useAuth } from '@/lib/context/AuthContext';
import NotificationDropdown from './notifications/NotificationDropdown';
import { sileo } from 'sileo';

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://horeca-backend-six.vercel.app").replace(/\/$/, "");

const SearchSkeleton = () => (
  <div className="p-3 animate-pulse flex items-center gap-3">
    <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0" />
    <div className="flex-grow space-y-2">
      <div className="h-3 bg-gray-200 rounded w-3/4" />
      <div className="h-2 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
);

export default function Header() {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { user, token, logout, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const unreadCountRef = useRef(0);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;

      // First chime (C6 note)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, now); 
      gain1.gain.setValueAtTime(0.8, now); // Much louder
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second chime (E6 note)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.15); 
      gain2.gain.setValueAtTime(0.8, now + 0.15); // Much louder
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);

    } catch (e) {
      // Ignore if autoplay blocked or not supported
    }
  };
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Browse catalogue dropdown state
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
  const catalogueRef = useRef<HTMLDivElement>(null);

  // Location state
  const [locationName, setLocationName] = useState('Select Location');
  const [isLocating, setIsLocating] = useState(false);

  // Mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close catalogue on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catalogueRef.current && !catalogueRef.current.contains(e.target as Node)) {
        setIsCatalogueOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLocationClick = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Your Location';
          setLocationName(city);
        } catch {
          setLocationName('Your Location');
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false)
    );
  };

  const fetchNotifications = async () => {
    if (!user?.id || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        const newUnreadCount = data.data.filter((n: any) => !n.isRead).length;
        if (newUnreadCount > unreadCountRef.current) {
          playNotificationSound();
        }
        unreadCountRef.current = newUnreadCount;
        setNotificationCount(newUnreadCount);
      }
    } catch { }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!token) return;
    try {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      const newCount = Math.max(0, notificationCount - 1);
      unreadCountRef.current = newCount;
      setNotificationCount(newCount);
      await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isRead: true })
      });
    } catch { }
  };

  const deleteNotification = async (id: string) => {
    if (!token) return;
    try {
      const wasUnread = notifications.find(n => n._id === id)?.isRead === false;
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (wasUnread) {
        const newCount = Math.max(0, notificationCount - 1);
        unreadCountRef.current = newCount;
        setNotificationCount(newCount);
      }
      await fetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    } catch { }
  };

  const clearAllNotifications = async () => {
    if (!user?.id || !token) return;
    try {
      setNotifications([]);
      unreadCountRef.current = 0;
      setNotificationCount(0);
      await fetch(`${API_BASE}/api/notifications?userId=${user.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    } catch { }
  };

  useEffect(() => {
    if (mounted && isAuthenticated && user?.id) {
      fetchNotifications();
      pollIntervalRef.current = setInterval(fetchNotifications, 60000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [mounted, isAuthenticated, user?.id]);

  useEffect(() => {
    if (mounted && isAuthenticated && user?.id) {
      fetchWishlistCount();
      fetchNotifications();
    } else {
      setWishlistCount(0);
      setNotificationCount(0);
    }
  }, [mounted, isAuthenticated, user?.id]);

  useEffect(() => {
    const handleWishlistUpdate = (event: any) => {
      if (event.detail?.optimistic) {
        setWishlistCount(prev => Math.max(0, event.detail.isAdded ? prev + 1 : prev - 1));
      }
      if (user?.id) fetchWishlistCount();
    };
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlist-updated', handleWishlistUpdate);
  }, [user?.id]);

  const performSearch = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/products?q=${encodeURIComponent(query)}&limit=5`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setSearchResults(data.success && Array.isArray(data.data?.items) ? data.data.items : []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
  };

  const fetchWishlistCount = async () => {
    if (!user?.id || !token) return;
    setWishlistLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/wishlist?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = await res.json();
      setWishlistCount(data?.data?.items?.length ?? data?.items?.length ?? 0);
    } catch { } finally {
      setWishlistLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setWishlistCount(0);
    router.push('/');
  };
  const handleLoginClick = () => router.push('/login');

  const catalogueCategories = [
    { name: 'Ingredients', href: '/products?category=Ingredients' },
    { name: 'Baking Tools', href: '/products?category=Baking+Tools' },
    { name: 'Packaging', href: '/products?category=Packaging' },
    { name: 'Flavors & Additives', href: '/products?category=Flavors' },
    { name: 'Decorations', href: '/products?category=Decorations' },
    { name: 'Ready Mixes', href: '/products?category=Ready+Mixes' },
    { name: 'Dairy & Fats', href: '/products?category=Dairy' },
  ];

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/products' },
    { name: 'Categories', path: '/categories' },
    ...(user?.category === 'A' ? [{ name: 'Price Requests', path: '/price-requests' }] : []),
    ...(isAuthenticated ? [{ name: 'Product Docs', path: '/product-documents' }] : []),
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  if (!mounted) {
    return (
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="w-32 h-8 bg-gray-100 rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
            <div className="w-24 h-8 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-3 lg:gap-5">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Image
                src="/images/logo.png"
                alt="Unifoods"
                width={130}
                height={44}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px bg-gray-200 flex-shrink-0" />

            {/* Location Selector */}
            <button
              onClick={handleLocationClick}
              disabled={isLocating}
              className="hidden md:flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#D97706] transition-colors flex-shrink-0 group"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-gray-400 leading-none">Delivery to</span>
                <span className="flex items-center gap-1 font-semibold text-gray-800 group-hover:text-[#D97706] transition-colors">
                  {isLocating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                  <span className="max-w-[90px] truncate">{locationName}</span>
                  <ChevronDown size={12} />
                </span>
              </div>
            </button>

            {/* Nav Links */}
            <nav className="hidden lg:flex items-center gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.path}
                  className="text-sm text-gray-700 hover:text-[#D97706] transition-colors font-medium whitespace-nowrap"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Search Bar — grows to fill space */}
            <div ref={searchContainerRef} className="flex-1 min-w-0 relative max-w-xs lg:max-w-sm xl:max-w-md ml-auto">
              <div className={`flex items-center gap-2 bg-gray-50 border rounded-full px-3 py-1.5 transition-all duration-200 ${isSearchFocused ? 'border-[#D97706] bg-white shadow-sm' : 'border-gray-200'}`}>
                <Search size={15} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      router.push(`/products?q=${encodeURIComponent(searchQuery)}`);
                      setIsSearchFocused(false);
                    }
                  }}
                  placeholder="Search items or categories"
                  className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {isSearchFocused && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {isSearching ? (
                    <div className="divide-y divide-gray-50">
                      <SearchSkeleton /><SearchSkeleton /><SearchSkeleton />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                      {searchResults.map((product) => (
                        <li key={product._id || product.id}>
                          <Link
                            href={`/products?q=${encodeURIComponent(product.name)}`}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                            onClick={() => { setIsSearchFocused(false); setSearchQuery(''); }}
                          >
                            {(product.image || product.images?.[0]) ? (
                              <div className="w-9 h-9 relative rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                <img
                                  src={typeof product.image === 'string' ? product.image : (product.images?.[0]?.url || '/placeholder.png')}
                                  alt={product.name}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            ) : (
                              <div className="w-9 h-9 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                <Search size={14} className="text-gray-400" />
                              </div>
                            )}
                            <div className="flex-grow min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{product.category?.name || 'Product'}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-500 text-sm">No matches for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Wishlist */}
              {isAuthenticated ? (
                <Link href="/wishlist">
                  <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Heart size={19} />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#D97706] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                      </span>
                    )}
                  </button>
                </Link>
              ) : (
                <button onClick={handleLoginClick} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Heart size={19} />
                </button>
              )}

              {/* Cart */}
              <CartButton />

              {/* Notifications */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Bell size={19} />
                    {notificationCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#D97706] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </button>
                  <NotificationDropdown
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                    notifications={notifications}
                    onMarkAsRead={markNotificationAsRead}
                    onDelete={deleteNotification}
                    onClearAll={clearAllNotifications}
                  />
                </div>
              )}

              {/* Login/Signup OR User Avatar */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link 
                    href="/profile"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-full transition-colors"
                    title="View Advance Payment Account"
                  >
                    <Wallet size={14} className="text-[#D97706]" />
                    <span className="text-xs font-bold text-gray-900">₹{Number(user?.advanceBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </Link>

                  <Link href="/profile">
                    <div className="w-8 h-8 bg-[#D97706]/10 rounded-full flex items-center justify-center hover:bg-[#D97706]/20 transition-colors">
                      <User size={15} className="text-[#D97706]" />
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hidden lg:flex items-center text-xs text-gray-500 hover:text-[#D97706] transition-colors"
                    title="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="flex items-center gap-1.5 bg-[#D97706] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#B45309] transition-all shadow-sm whitespace-nowrap"
                >
                  Login/Signup
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                {isMobileMenuOpen ? <X size={20} /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="16" x2="20" y2="16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {/* Location on mobile */}
              <button
                onClick={handleLocationClick}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-orange-50 hover:text-[#D97706] transition-colors"
              >
                {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                <span>Deliver to: <strong>{locationName}</strong></span>
              </button>

              <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-800 hover:bg-orange-50 hover:text-[#D97706] transition-colors">
                Browse Catalogue
              </Link>

              {catalogueCategories.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 pl-8 pr-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-orange-50 hover:text-[#D97706] transition-colors"
                >
                  <Package size={13} className="text-gray-400" />
                  {cat.name}
                </Link>
              ))}

              <div className="border-t border-gray-100 my-2" />

              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-orange-50 hover:text-[#D97706] transition-colors"
                >
                  {link.name}
                </Link>
              ))}

              <div className="border-t border-gray-100 my-2" />

              <div className="flex items-center gap-2 px-3">
                <a href="tel:+919324856780" className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone size={12} /> +91 93248 56780
                </a>
                <span className="text-gray-300">·</span>
                <a href="mailto:sales@unifoods.in" className="flex items-center gap-1 text-xs text-gray-500">
                  <Mail size={12} /> sales@unifoods.in
                </a>
              </div>
            </div>
          </div>
        )}
      </header>
  );
}
