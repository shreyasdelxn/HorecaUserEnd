'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home, FileText, ArrowLeft, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageTransition from '@/components/ui/PageTransition';
import ProductDocumentsSection from '@/components/documents/ProductDocumentsSection';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProductDocumentsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* BREADCRUMB */}
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <Link href="/" className="hover:text-amber-600 transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <Link href="/profile" className="hover:text-amber-600 transition-colors">
              Account
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="font-semibold text-gray-800">Product Documents</span>
          </nav>

          {/* PAGE BANNER */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Supply Chain Documents
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Product Documents & Compliance Portal
              </h1>
              <p className="text-amber-100 text-xs sm:text-sm mt-2 leading-relaxed">
                Directly view, verify, and download manufacturer electronic specification forms (E-Forms) and batch-specific Certificates of Analysis (COA) for all products mapped to your account.
              </p>
            </div>
          </div>

          {/* MAIN SECTION CARD */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <ProductDocumentsSection />
          </div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
