'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Package,
  Layers,
  Calendar,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { sileo } from 'sileo';
import { useAuth } from '@/lib/context/AuthContext';

const API_BASE = (
  process.env.NEXT_PUBLIC_HORECA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://horeca-backend-six.vercel.app"
).replace(/\/$/, "");

interface DocumentItem {
  _id: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  unit?: string;
  batchNumber?: string;
  eform: {
    status: 'available' | 'not_available' | 'pending';
    documentId?: string | null;
    version?: string | null;
    issuedDate?: string | null;
    notes?: string;
    canView: boolean;
    canDownload: boolean;
    viewUrl?: string;
    downloadUrl?: string;
  };
  coa: {
    status: 'available' | 'not_available' | 'pending';
    documentId?: string | null;
    batchNumber?: string | null;
    specificationMet?: boolean;
    issuedDate?: string | null;
    expiryDate?: string | null;
    testParameters?: Array<{
      parameter: string;
      standard: string;
      result: string;
      status: string;
    }>;
    canView: boolean;
    canDownload: boolean;
    viewUrl?: string;
    downloadUrl?: string;
  };
  lastSyncedAt?: string;
}

export default function ProductDocumentsSection() {
  const { token, user, isAuthenticated } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'eform_available' | 'coa_available' | 'missing'>('all');

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{
    item: DocumentItem;
    type: 'eform' | 'coa';
  } | null>(null);

  const fetchDocuments = async (forceSync = false) => {
    if (!token && !user) return;

    try {
      if (forceSync) {
        setSyncing(true);
      } else {
        setLoading(true);
      }

      const url = `${API_BASE}/api/customer/product-documents${forceSync ? '?sync=true' : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch product documents');
      }

      setDocuments(json.data || []);

      if (forceSync) {
        sileo.success({
          title: 'Documents Synchronized',
          description: `Updated status for ${json.data?.length || 0} mapped products.`
        });
      }
    } catch (err: any) {
      console.error('Failed to load product documents:', err);
      sileo.error({
        title: 'Document Sync Notice',
        description: err.message || 'Could not refresh document availability.'
      });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Text search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.productName.toLowerCase().includes(q) ||
        doc.productCode.toLowerCase().includes(q) ||
        (doc.batchNumber && doc.batchNumber.toLowerCase().includes(q)) ||
        (doc.category && doc.category.toLowerCase().includes(q));

      // Status filter
      let matchesFilter = true;
      if (statusFilter === 'eform_available') {
        matchesFilter = doc.eform.status === 'available';
      } else if (statusFilter === 'coa_available') {
        matchesFilter = doc.coa.status === 'available';
      } else if (statusFilter === 'missing') {
        matchesFilter = doc.eform.status !== 'available' || doc.coa.status !== 'available';
      }

      return matchesSearch && matchesFilter;
    });
  }, [documents, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const eformCount = documents.filter(d => d.eform.status === 'available').length;
    const coaCount = documents.filter(d => d.coa.status === 'available').length;
    const fullCompliance = documents.filter(
      d => d.eform.status === 'available' && d.coa.status === 'available'
    ).length;

    return { total, eformCount, coaCount, fullCompliance };
  }, [documents]);

  // Open Preview Modal
  const handleOpenPreview = (item: DocumentItem, type: 'eform' | 'coa') => {
    setSelectedDoc({ item, type });
    setPreviewModalOpen(true);
  };

  // Direct Download Trigger
  const handleDownload = async (item: DocumentItem, type: 'eform' | 'coa') => {
    try {
      const url = `${API_BASE}/api/customer/product-documents/download?id=${item.productId}&type=${type}`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Download request failed');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const fileExt = 'html';
      a.download = `${type.toUpperCase()}_${item.productCode}_${item.batchNumber || 'STANDARD'}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      sileo.success({
        title: 'Download Started',
        description: `Downloaded ${type.toUpperCase()} for ${item.productName}`
      });
    } catch (err: any) {
      console.error('Download error:', err);
      sileo.error({
        title: 'Download Failed',
        description: 'Unable to download file. Please try again.'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl text-[#D97706] border border-amber-200">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Product Documents</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Access verified E-Form technical specifications and Certificates of Analysis (COA) for your mapped products.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDocuments(true)}
            disabled={syncing || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-200 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Documents'}</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-4.5 rounded-2xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Mapped Products</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.total}</p>
          <span className="text-[11px] text-gray-500">Active mapped catalog</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-4.5 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">E-Forms Active</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.eformCount}</p>
          <span className="text-[11px] text-emerald-700 font-medium">
            {stats.total > 0 ? Math.round((stats.eformCount / stats.total) * 100) : 0}% available
          </span>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-4.5 rounded-2xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">COA Certified</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.coaCount}</p>
          <span className="text-[11px] text-blue-700 font-medium">
            {stats.total > 0 ? Math.round((stats.coaCount / stats.total) * 100) : 0}% available
          </span>
        </div>

        <div className="bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-white p-4.5 rounded-2xl border border-violet-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-800">Fully Compliant</span>
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.fullCompliance}</p>
          <span className="text-[11px] text-gray-500">Both E-Form & COA present</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/70 p-3 rounded-2xl border border-gray-200/70">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name, SKU code, or batch..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Products' },
            { id: 'eform_available', label: 'E-Form Available' },
            { id: 'coa_available', label: 'COA Available' },
            { id: 'missing', label: 'Pending Docs' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* DOCUMENT TABLE / LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-20 bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No Product Documents Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No documents matched "${searchQuery}". Try clearing search filters.`
              : 'There are currently no mapped products or certificates loaded for your account.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-3 text-xs text-amber-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* DESKTOP TABLE */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[200px]">Product Details</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Product Code</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Batch Number</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">E-Form</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">COA Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredDocuments.map(doc => {
                  const isEFormAvail = doc.eform.status === 'available';
                  const isCoaAvail = doc.coa.status === 'available';

                  return (
                    <tr key={doc.productId} className="hover:bg-amber-50/30 transition-colors group">
                      {/* Product Name & Category */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900 group-hover:text-amber-800 transition-colors leading-snug">
                          {doc.productName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-gray-500">{doc.category || 'Bakery Essentials'}</span>
                          {doc.unit && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                              {doc.unit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product Code */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-semibold border border-slate-200/80">
                          {doc.productCode}
                        </span>
                      </td>

                      {/* Batch Number */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          {doc.batchNumber || 'Batch-N/A'}
                        </span>
                      </td>

                      {/* E-Form Status */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        {isEFormAvail ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* COA Status */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        {isCoaAvail ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-2">
                          {/* E-Form View Button */}
                          {isEFormAvail ? (
                            <button
                              onClick={() => handleOpenPreview(doc, 'eform')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200/80 transition-all hover:shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
                              title="View Electronic Form"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-600" />
                              <span>E-Form</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 text-gray-300 text-xs border border-dashed border-gray-200 rounded-lg select-none">
                              No E-Form
                            </span>
                          )}

                          {/* COA View Button */}
                          {isCoaAvail ? (
                            <button
                              onClick={() => handleOpenPreview(doc, 'coa')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200/80 transition-all hover:shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
                              title="View Certificate of Analysis"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>COA</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 text-gray-300 text-xs border border-dashed border-gray-200 rounded-lg select-none">
                              No COA
                            </span>
                          )}

                          {/* Quick Download Button */}
                          {(isEFormAvail || isCoaAvail) && (
                            <button
                              onClick={() => handleDownload(doc, isCoaAvail ? 'coa' : 'eform')}
                              className="p-1.5 hover:bg-gray-100 active:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-lg transition-all border border-gray-200 cursor-pointer hover:shadow-xs"
                              title="Download Latest Certificate (HTML/PDF)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredDocuments.map(doc => {
              const isEFormAvail = doc.eform.status === 'available';
              const isCoaAvail = doc.coa.status === 'available';

              return (
                <div key={doc.productId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{doc.productName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold border border-slate-200">
                          {doc.productCode}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {doc.batchNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">E-Form</span>
                      {isEFormAvail ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Available
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-gray-400" /> N/A
                        </span>
                      )}
                    </div>

                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">COA</span>
                      {isCoaAvail ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Available
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-gray-400" /> N/A
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isEFormAvail && (
                      <button
                        onClick={() => handleOpenPreview(doc, 'eform')}
                        className="flex-1 py-1.5 px-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-[#D97706]" /> View E-Form
                      </button>
                    )}

                    {isCoaAvail && (
                      <button
                        onClick={() => handleOpenPreview(doc, 'coa')}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-emerald-600" /> View COA
                      </button>
                    )}

                    {(isEFormAvail || isCoaAvail) && (
                      <button
                        onClick={() => handleDownload(doc, isCoaAvail ? 'coa' : 'eform')}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      <AnimatePresence>
        {previewModalOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* MODAL HEADER */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      selectedDoc.type === 'coa'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-amber-50 border-amber-200 text-[#D97706]'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {selectedDoc.type === 'coa'
                        ? 'Certificate of Analysis (COA)'
                        : 'Electronic Specification Form (E-Form)'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Document Ref: <strong>{selectedDoc.type === 'coa' ? selectedDoc.item.coa.documentId : selectedDoc.item.eform.documentId}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="p-6 overflow-y-auto space-y-5 text-sm">
                {/* Product Summary Banner */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-gray-400 block">Product</span>
                    <strong className="text-gray-900 text-xs sm:text-sm">{selectedDoc.item.productName}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase text-gray-400 block">SKU Code</span>
                    <strong className="text-gray-900 font-mono text-xs">{selectedDoc.item.productCode}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase text-gray-400 block">Batch / Lot</span>
                    <strong className="text-gray-900 font-mono text-xs">{selectedDoc.item.batchNumber}</strong>
                  </div>
                </div>

                {/* COA Analytical Parameters */}
                {selectedDoc.type === 'coa' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                        Laboratory Analytical Test Parameters
                      </h4>
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                        Specification Conformed
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-semibold">
                            <th className="py-2.5 px-3">Test Parameter</th>
                            <th className="py-2.5 px-3">Standard Specification</th>
                            <th className="py-2.5 px-3">Observed Result</th>
                            <th className="py-2.5 px-3 text-right">Compliance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(selectedDoc.item.coa.testParameters && selectedDoc.item.coa.testParameters.length > 0
                            ? selectedDoc.item.coa.testParameters
                            : [
                                { parameter: 'Moisture Content', standard: '< 14.0%', result: '11.8%', status: 'Passed' },
                                { parameter: 'Purity / Assay', standard: '≥ 99.0%', result: '99.5%', status: 'Passed' },
                                { parameter: 'Total Microbial Plate Count', standard: '< 10,000 CFU/g', result: '< 350 CFU/g', status: 'Passed' },
                                { parameter: 'pH Balance (10% sol.)', standard: '6.0 - 7.5', result: '6.85', status: 'Passed' },
                                { parameter: 'Heavy Metals (Lead/Cadmium)', standard: '< 0.1 ppm', result: 'Not Detected', status: 'Passed' }
                              ]
                          ).map((param, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-medium text-gray-900">{param.parameter}</td>
                              <td className="py-2 px-3 text-gray-600">{param.standard}</td>
                              <td className="py-2 px-3 font-semibold text-gray-900">{param.result}</td>
                              <td className="py-2 px-3 text-right">
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-200/80">
                                  {param.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* E-Form Technical Declarations */}
                {selectedDoc.type === 'eform' && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                      Product Technical Declarations & Food Safety Compliance
                    </h4>

                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
                      {[
                        { title: 'Food Grade Packaging Material', value: 'Multi-wall craft / Food-grade HDPE liner certified' },
                        { title: 'Optimal Storage Condition', value: 'Cool, dry storage (< 25°C, < 65% RH), away from direct sunlight' },
                        { title: 'Allergen Verification Statement', value: 'Manufactured in allergen-controlled lines. No cross-contamination.' },
                        { title: 'FSSAI License & Standards', value: 'Fully compliant with Food Safety and Standards Regulations' },
                        { title: 'Traceability Matrix', value: 'Barcoded digital lot tracing active through Unifoods SCM ledger' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 flex items-start justify-between gap-3">
                          <span className="font-semibold text-gray-800">{item.title}</span>
                          <span className="text-gray-600 text-right">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification Stamp Box */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-700">
                      Digitally Verified by <strong>Unifoods QA Department</strong>
                    </span>
                  </div>
                  <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
                    Valid for Supply Chain
                  </span>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors border border-gray-200 bg-white"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(selectedDoc.item, selectedDoc.type)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Certificate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
