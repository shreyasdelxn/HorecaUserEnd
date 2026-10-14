'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Package,
    Star,
    Edit2,
    Camera,
    CheckCircle,
    XCircle,
    ChevronRight,
    ShoppingBag,
    Heart,
    MessageSquare,
    LogOut,
    Clock,
    Trash2, AlertCircle, Eye, EyeOff, Wallet, X, UserX, Loader2, ArrowRight, LayoutDashboard, History, HelpCircle, Edit, UploadCloud, FileText, Search, Plus, List, FileCheck, Download, AlertTriangle
} from 'lucide-react';
import PageTransition from "@/components/ui/PageTransition";
import Header from '@/components/Header';
import { useAuth } from '@/lib/context/AuthContext';
import ShippingAddressSelector from '@/components/checkout/ShippingForm';
import PurchaseOrderForm from '@/components/orders/PurchaseOrderForm';
import MyPurchaseOrders from '@/components/orders/MyPurchaseOrders';
import { useRouter } from "next/navigation";
import ReviewFormModal from '@/components/products/ReviewFormModal';
import ReturnOrderModal from '@/components/orders/ReturnOrderModal';
import CancelOrderModal from '@/components/orders/CancelOrderModal';
import OrderSubscriptionModal from '@/components/orders/OrderSubscriptionModal';
import CancelSubscriptionModal from '@/components/orders/CancelSubscriptionModal';
import { RotateCw } from 'lucide-react';
import { sileo } from 'sileo';
import Footer from '@/components/Footer';
import RaiseGrievanceModal from '@/components/RaiseGrievanceModal';
import { clearOrderSession, setAuthSession } from '@/app/actions/session';
import { getCurrentLocation } from '@/lib/utils/location';
import ProductDocumentsSection from '@/components/documents/ProductDocumentsSection';

const formatToIST = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://horeca-backend-six.vercel.app").replace(/\/$/, "");

const ProfilePage = () => {
    const { user: authUser, isAuthenticated, token, logout, refreshUser } = useAuth();

    // const [user, setUser] = useState(null);
    const [user, setUser] = useState<any | null>(authUser);

    // const [orders, setOrders] = useState([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [dispatchRecordsMap, setDispatchRecordsMap] = useState<Record<string, any>>({});
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [expandedModule, setExpandedModule] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [savedItemsCount, setSavedItemsCount] = useState(0);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [addressesLoading, setAddressesLoading] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: "",
        email: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        lat: null as number | null,
        lng: null as number | null,
    });
    const [savingProfile, setSavingProfile] = useState(false);

    // Review State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
    const [reviewProduct, setReviewProduct] = useState<{ id: string, name: string } | null>(null);

    // Grievance State
    const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false);
    const [grievanceOrderId, setGrievanceOrderId] = useState<string | null>(null);
    const [grievanceMap, setGrievanceMap] = useState<Record<string, string>>({});
    const [returnMap, setReturnMap] = useState<Record<string, string>>({});

    // Credit Note State
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [loadingCNs, setLoadingCNs] = useState<boolean>(false);

    // Advance Payment State
    const [topUpAmount, setTopUpAmount] = useState<string>('5000');

    // 📜 Contract Management & Renewal State
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractFormType, setContractFormType] = useState('');
    const [contractFormStart, setContractFormStart] = useState('');
    const [contractFormExpiry, setContractFormExpiry] = useState('');
    const [contractFormDocUrl, setContractFormDocUrl] = useState('');
    const [contractFormNotes, setContractFormNotes] = useState('');
    const [contractFormFile, setContractFormFile] = useState<File | null>(null);
    const [contractUploading, setContractUploading] = useState(false);
    const [savingContract, setSavingContract] = useState(false);
    const contractInputRef = React.useRef<HTMLInputElement>(null);

    // Auto-select tab if provided in URL (e.g. ?tab=product_documents)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab) {
                setActiveTab(tab);
            }
        }
    }, []);

    // Initialize contract form when modal opens or user profile loads
    useEffect(() => {
        if (user?.contract) {
            setContractFormType(user.contract.contractType || '');
            if (user.contract.startDate) {
                const sd = new Date(user.contract.startDate);
                setContractFormStart(sd.toISOString().split('T')[0]);
            }
            if (user.contract.expiryDate) {
                const d = new Date(user.contract.expiryDate);
                setContractFormExpiry(d.toISOString().split('T')[0]);
            }
            setContractFormDocUrl(user.contract.documentUrl || '');
            setContractFormNotes(user.contract.notes || '');
        }
    }, [user?.contract]);

    const handleContractDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setContractFormFile(file);
            setContractUploading(true);
            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch(`${API_BASE}/api/upload`, {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();
                if (data.success && data.url) {
                    setContractFormDocUrl(data.url);
                    sileo.success({ title: "Document Uploaded", description: "New contract document uploaded to Cloudinary!" });
                } else {
                    throw new Error(data.error || "Failed to upload document");
                }
            } catch (err: any) {
                sileo.error({ title: "Upload Failed", description: err.message || "Could not upload document" });
            } finally {
                setContractUploading(false);
            }
        }
    };

    const handleSaveContract = async () => {
        const userId = user?.id || user?._id || authUser?.id || (authUser as any)?._id;
        if (!userId) {
            sileo.error({ title: "Authentication Required", description: "Please log in to update your contract." });
            return;
        }

        setSavingContract(true);
        try {
            const updatedContract = {
                contractType: contractFormType || null,
                documentUrl: contractFormDocUrl || user?.contract?.documentUrl || null,
                startDate: contractFormStart || null,
                expiryDate: contractFormExpiry || null,
                notes: contractFormNotes.trim() || null,
                uploadedAt: new Date()
            };

            const res = await fetch(`${API_BASE}/api/customers/${userId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    isContractBased: true,
                    contract: updatedContract
                })
            });

            const json = await res.json();
            if (json.success) {
                sileo.success({
                    title: "Contract Updated Successfully!",
                    description: "Your supply contract agreement has been updated & saved."
                });
                setIsContractModalOpen(false);
                setUser((prev: any) => ({
                    ...prev,
                    isContractBased: true,
                    contract: updatedContract
                }));
                refreshUser();
            } else {
                throw new Error(json.error || "Failed to update contract details");
            }
        } catch (err: any) {
            sileo.error({ title: "Update Failed", description: err.message || "Failed to save contract details" });
        } finally {
            setSavingContract(false);
        }
    };

    const handleTopUpClick = () => {
        sileo.warning({
            title: "Payment Gateway Integration Pending",
            description: "Payment gateway integration is pending. Self-service advance top-up will be enabled once payment gateway is connected."
        });
    };

    useEffect(() => {
        if (activeTab === "orders" && authUser) {
            const fetchGrievancesAndReturns = async () => {
                const userId = authUser?.id || (authUser as any)?._id;
                if (!userId) return;
                try {
                    const res = await fetch(`${API_BASE}/api/grievances?customerId=${userId}`);
                    const json = await res.json();
                    if (json.data) {
                        const newMap: Record<string, string> = {};
                        json.data.forEach((g: any) => {
                            if (g.orderId) {
                                newMap[String(g.orderId)] = g.status || "Open";
                            }
                        });
                        setGrievanceMap(newMap);
                    }

                    const resReturns = await fetch(`${API_BASE}/api/returns?customerId=${userId}`);
                    const jsonReturns = await resReturns.json();
                    if (jsonReturns.data) {
                        const newReturnMap: Record<string, string> = {};
                        const qtysByOrder: Record<string, Record<string, number>> = {};
                        
                        jsonReturns.data.forEach((r: any) => {
                            const oId = String(r.order?._id || r.order);
                            if (oId) {
                                newReturnMap[oId] = r.status || "Requested";
                                
                                if (r.status !== "Vendor Rejected" && r.status !== "Return Closed") {
                                    if (!qtysByOrder[oId]) qtysByOrder[oId] = {};
                                    r.items?.forEach((ri: any) => {
                                        if (ri.status !== "Rejected") {
                                            const pId = String(ri.product?._id || ri.product);
                                            qtysByOrder[oId][pId] = (qtysByOrder[oId][pId] || 0) + (ri.requestedReturnQty || ri.quantity || 0);
                                        }
                                    });
                                }
                            }
                        });
                        setReturnMap(newReturnMap);
                        setReturnedQtysMap(qtysByOrder);
                    }
                } catch (e) {
                    console.error("Failed to fetch grievances or returns", e);
                }
            };
            fetchGrievancesAndReturns();
        }
    }, [activeTab, authUser?.id || (authUser as any)?._id]);

    useEffect(() => {
        if (activeTab === "credit_notes" && authUser) {
            const fetchCreditNotes = async () => {
                setLoadingCNs(true);
                try {
                    const userId = authUser.id || (authUser as any)._id;
                    const res = await fetch(`${API_BASE}/api/art/credit-notes?customer=${userId}&communicationStatus=Sent`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            setCreditNotes(data.data || []);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch credit notes", e);
                } finally {
                    setLoadingCNs(false);
                }
            };
            fetchCreditNotes();
        }
    }, [activeTab, authUser?.id || (authUser as any)?._id, token]);

    const handleRaiseGrievance = (orderId: string) => {
        setGrievanceOrderId(orderId);
        setIsGrievanceModalOpen(true);
    };

    const handleWriteReview = (orderId: string, product: { id: string, name: string }) => {
        console.log("Opening Review Modal with:", { orderId, product });
        if (!orderId) console.error("❌ Order ID is missing!");
        if (!product?.id) console.error("❌ Product ID is missing!");

        setReviewOrderId(orderId);
        setReviewProduct(product);
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = async (data: { rating: number; comment: string; images: string[] }) => {
        if (!reviewProduct || !reviewOrderId || !token || !authUser) return;

        try {
            const rawUserId = authUser.id || (authUser as any)._id; // Handle both structures

            const payload = {
                userId: rawUserId,
                user: rawUserId,
                productId: reviewProduct.id,
                product: reviewProduct.id,
                orderId: reviewOrderId,
                order: reviewOrderId,
                rating: data.rating,
                comment: data.comment,
                images: data.images
            };

            console.log("Submitting Review Payload:", payload);

            const res = await fetch(`${API_BASE}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                console.error("Review Submission Error Response:", text);
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.message || err.error || "Failed to submit review");
                } catch (e) {
                    throw new Error(text || "Failed to submit review");
                }
            }

            sileo.success({ title: "Review Submitted", description: "Your review has been submitted successfully!" });
            setIsReviewModalOpen(false);

        } catch (error: any) {
            console.error("Review submission failed:", error);
            sileo.error({ title: "Submission Failed", description: error.message || "Failed to submit review" });
        }
    };

    // Return Order State
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnOrderItems, setReturnOrderItems] = useState<any[]>([]);
    const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
    const [returnAddress, setReturnAddress] = useState<any>(null);
    const [returnedQtysMap, setReturnedQtysMap] = useState<Record<string, Record<string, number>>>({});

    // Cancel Order State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

    // Order Filter State
    const [orderFilter, setOrderFilter] = useState("All");

    // Order Subscription State
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [subModalOrderId, setSubModalOrderId] = useState<string>("");
    const [subModalItems, setSubModalItems] = useState<any[]>([]);
    const [subModalFees, setSubModalFees] = useState({ shipping: 0, platform: 0, gst: 0 });

    // Cancel Subscription State
    const [isCancelSubModalOpen, setIsCancelSubModalOpen] = useState(false);
    const [cancelSubId, setCancelSubId] = useState<string | null>(null);

    const handleCancelSubscription = (subId: string) => {
        setCancelSubId(subId);
        setIsCancelSubModalOpen(true);
    };

    const handleCancelSubscriptionSubmit = async (data: { reason: string, comment: string }) => {
        if (!cancelSubId) return;

        try {
            const res = await fetch(`${API_BASE}/api/subscriptions`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subscriptionId: cancelSubId,
                    status: 'Cancelled',
                    cancellationReason: data.reason,
                    cancellationComment: data.comment
                })
            });

            const json = await res.json();
            if (json.success) {
                sileo.success({ title: "Subscription Cancelled", description: "Your subscription has been cancelled successfully." });
                // Refresh subscriptions
                fetchSubscriptions();
            } else {
                throw new Error(json.error || "Failed to cancel subscription");
            }
        } catch (error: any) {
            console.error(error);
            sileo.error({ title: "Cancellation Failed", description: error.message });
        }
    };

    const handleScheduleRepeat = (order: any) => {
        setSubModalOrderId(order.id || order._id);
        setSubModalItems(order.items);
        setSubModalFees({
            shipping: order.shippingCharges || 0,
            platform: order.platformFee || 0,
            gst: order.gstAmount || 0
        });
        setIsSubModalOpen(true);
    };

    const handleReturnOrder = (orderId: string, items: any[], address: any) => {
        setReturnOrderId(orderId);
        setReturnOrderItems(items);
        setReturnAddress(address);
        setIsReturnModalOpen(true);
    };

    const handleReturnSubmit = async (data: { selectedItems: any[]; reason: string; comment: string; images: string[] }) => {
        if (!returnOrderId || !token || !authUser) return;

        try {
            const rawUserId = authUser.id || (authUser as any)._id;

            // Calculate total refund amount from selected items
            const totalRefundAmount = data.selectedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

            // Map selected items to the schema format
            const formattedItems = data.selectedItems.map(item => ({
                product: item.product?._id || item.product?.id || item.productId || item.product,
                productId: item.product?._id || item.product?.id || item.productId || item.product,
                quantity: item.quantity,
                price: item.unitPrice || item.price,
                reason: item.reason || data.reason || "Not specified",
                images: item.images || [],
                expiryDate: item.expiryDate || null,
                deliveryDate: item.deliveryDate || null,
                batchDetails: item.batchDetails || ""
            }));

            const payload = {
                orderId: returnOrderId,
                customerId: rawUserId,
                selectedItems: formattedItems,
                reason: data.reason,
                comment: data.comment,
                images: data.images || []
            };

            console.log("Submitting Return Payload:", payload);

            const res = await fetch(`${API_BASE}/api/returns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            console.log("Return Order Response Text:", text);

            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error(text || "Failed to submit return request");
            }

            if (!res.ok) {
                throw new Error(json.error || json.message || "Failed to submit return request");
            }

            sileo.success({ title: "Return Request Submitted", description: "Your return request has been submitted successfully!" });
            setIsReturnModalOpen(false);

            // Refresh orders to show updated status
            fetchOrders();

        } catch (error: any) {
            console.error("Return submission failed:", error);
            sileo.error({ title: "Submission Failed", description: error.message || "Failed to submit return request" });
            throw error; // Re-throw to show error in modal
        }
    };

    // Cancel Order Handler - OPEN MODAL
    const handleCancelOrder = (orderId: string) => {
        setCancelOrderId(orderId);
        setIsCancelModalOpen(true);
    };

    // Cancel Submit Handler
    const handleCancelSubmit = async (data: { reason: string, comment: string }) => {
        if (!cancelOrderId) return;

        try {
            // Backend expects PATCH request with ID in query params
            const res = await fetch(`${API_BASE}/api/order?id=${cancelOrderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'cancelled',
                    cancellationReason: data.reason,
                    notes: data.comment // Using notes for comment
                })
            });

            const resData = await res.json();

            if (!res.ok || !resData.success) {
                throw new Error(resData.message || resData.error || "Failed to cancel order");
            }

            sileo.success({ title: "Order Cancelled", description: "Your order has been cancelled successfully." });
            fetchOrders();
            setIsCancelModalOpen(false);

        } catch (error: any) {
            console.error("Cancel order failed:", error);
            sileo.error({ title: "Cancellation Failed", description: error.message || "Failed to cancel order" });
            throw error; // Propagate to modal to show error
        }
    };




    const getInitials = (name?: string, phone?: string) => {
        if (!name) {
            if (phone) return phone.replace(/\D/g, "").slice(-2); // Last 2 digits if no name
            return "U";
        }

        const words = name.trim().split(" ").filter(Boolean);

        if (words.length === 1) {
            return words[0][0].toUpperCase();
        }

        return (
            words[0][0].toUpperCase() +
            words[words.length - 1][0].toUpperCase()
        );
    };

    /* ------------------------------------------------------------
       🔥 FETCH PRODUCT IMAGE
    ------------------------------------------------------------- */
    const fetchProductImage = async (productId: string) => {
        console.log("🖼 Fetching image for product:", productId);

        try {
            const API_URL = `${API_BASE}/api/products/${productId}`;
            const res = await fetch(API_URL);

            // console.log("🖼 RAW PRODUCT RESPONSE:", res);

            const text = await res.text();
            // console.log("🖼 RAW PRODUCT TEXT:", text);

            let json = null;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error("❌ Image JSON Parse Failed:", e);
                return "/images/placeholder.png";
            }

            if (json?.success && json.data?.image) {
                const rawImage = json.data.image.trim();
                console.log("🖼 Product Image Found:", rawImage);

                if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('//')) {
                    return rawImage;
                } else {
                    // Match ProductCard logic: assume local path in /images/products/
                    const filename = rawImage.replace(/^\/+/, '');
                    return `/images/products/${filename}`;
                }
            } else {
                console.warn("⚠ No image field in product:", json);
                return "/images/placeholder.png";
            }
        } catch (err) {
            console.error("🔥 Error fetching product image:", err);
            return "/images/placeholder.png";
        }
    };

    /* ------------------------------------------------------------
   🔥 FETCH SAVED ITEMS COUNT (WISHLIST)
------------------------------------------------------------- */
    const fetchSavedItemsCount = async () => {
        const userId = authUser?.id || (authUser as any)?._id;
        if (!userId || !token) return;

        try {
            const res = await fetch(
                `${API_BASE}/api/wishlist?userId=${userId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            const data = await res.json();

            let count = 0;
            if (data?.data?.items) {
                count = data.data.items.length;
            } else if (data?.items) {
                count = data.items.length;
            }

            setSavedItemsCount(count);
        } catch (err) {
            console.error("🔥 Failed to fetch saved items count:", err);
            setSavedItemsCount(0);
        }
    };


    /* ------------------------------------------------------------
    /* ------------------------------------------------------------
       🔥 FETCH PROFILE
    ------------------------------------------------------------- */
    useEffect(() => {
        const loadProfile = async () => {
            if (!isAuthenticated || !authUser) {
                console.log("⏭️ loadProfile skipped: isAuthenticated =", isAuthenticated, "authUser =", authUser);
                if (!isAuthenticated) setUser(null); // Clear local state if unauthenticated
                return;
            }

            const userId = authUser.id || (authUser as any)._id;
            const phone = authUser.phone;
            const tokenValue = token;

            // Sync local user state with authUser if needed
            setUser((prev: any) => ({ ...prev, ...authUser }));
            fetchSavedItemsCount();

            // List of candidate URLs to try if one fails with 404
            const candidateUrls = [
                `${API_BASE}/api/customers/${userId}`,      // 1. Current (Path param)
                `${API_BASE}/api/customer/${userId}`,       // 2. Singular (Path param)
                `${API_BASE}/api/customers?id=${userId}`,   // 3. Plural (Query param 'id')
                `${API_BASE}/api/customer?id=${userId}`,    // 4. Singular (Query param 'id')
                `${API_BASE}/api/customers?userId=${userId}`,// 5. Plural (Query param 'userId')
                `${API_BASE}/api/customer?userId=${userId}`, // 6. Singular (Query param 'userId')
            ];

            if (phone) {
                candidateUrls.push(`${API_BASE}/api/customers?phone=${encodeURIComponent(phone)}`);
            }

            console.log("🌍 [Profile] Starting robust profile fetch for User:", userId, "Phone:", phone);
            
            // Only set full page loading if user state isn't initialized yet
            if (!user) {
                setLoading(true);
            }

            try {
                // Call stats fetching functions (independent of profile fetch)
                console.log("📊 [Profile] Fetching accessory data...");
                fetchReviewsCount();
                fetchSavedItemsCount();
                fetchOrders();
                fetchAddresses();
                if (activeTab === 'subscriptions') fetchSubscriptions();

                let successResponse = null;
                let lastErrorText = "";
                let validatedUserData: any = null;

                // Try each candidate URL until one works
                for (const url of candidateUrls) {
                    console.log(`🔎 [Profile] Trying endpoint: ${url}`);
                    try {
                        const res = await fetch(url, {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${tokenValue}`,
                                Accept: "application/json",
                            },
                        });

                        if (res.ok) {
                            const rawData = await res.json();
                            console.log(`✅ [Profile] Received data from: ${url}`, rawData);

                            // Robust data extraction
                            let userData = rawData?.data || rawData?.user || (rawData?.success ? rawData : rawData);
                            if (Array.isArray(userData)) userData = userData[0];

                            if (userData && typeof userData === 'object') {
                                // 🛡️ SECURITY GUARD: Verify ID
                                const fetchedId = userData._id || userData.id;
                                if (fetchedId && userId && fetchedId !== userId) {
                                    console.warn(`⚠️ [Profile] Skipping incorrect session data from ${url}. Expected: ${userId}, received: ${fetchedId}`);
                                    continue; // Try next endpoint
                                }

                                validatedUserData = userData;
                                successResponse = rawData;
                                break; // FOUND VALID DATA
                            }
                        } else {
                            const errBody = await res.text();
                            console.warn(`⚠️ [Profile] Failed at ${url} Status: ${res.status}. Body:`, errBody);
                            lastErrorText = errBody;
                        }
                    } catch (fetchErr) {
                        console.error(`❌ [Profile] Fetch error for ${url}:`, fetchErr);
                    }
                }

                if (validatedUserData) {
                    console.log("✅ [Profile] Successfully validated user data:", validatedUserData);
                    const mergedUser = {
                        ...authUser,
                        ...validatedUserData,
                        id: userId,
                        phone: authUser.phone,
                        advanceBalance: validatedUserData.advanceBalance ?? authUser?.advanceBalance ?? 0,
                        cnBalance: validatedUserData.cnBalance ?? authUser?.cnBalance ?? 0
                    };
                    setUser(mergedUser);

                    setProfileForm((prev: any) => ({
                        ...prev,
                        ...validatedUserData,
                        name: validatedUserData.name || prev.name || "",
                        email: validatedUserData.email || prev.email || "",
                    }));
                }

                if (!validatedUserData && isAuthenticated) {
                    console.error("🔥 [Profile] ALL endpoints failed. Last error:", lastErrorText);
                }
            } catch (error) {
                console.error("🔥 [Profile] CRITICAL ERROR in loadProfile:", error);
            } finally {
                setLoading(false);
                console.log("🏁 [Profile] Profile load sequence complete.");
            }
        };

        loadProfile();
    }, [isAuthenticated, authUser?.id || (authUser as any)?._id, token]);





    const handleUpdateLocation = async () => {
        const coords = await getCurrentLocation();
        if (coords) {
            setProfileForm(prev => ({
                ...prev,
                lat: coords.lat,
                lng: coords.lng
            }));
            sileo.success({
                title: "Location Captured",
                description: `Latitude: ${coords.lat.toFixed(4)}, Longitude: ${coords.lng.toFixed(4)}`
            });
        } else {
            sileo.error({
                title: "Location Failed",
                description: "Could not capture your current location. Please check your browser permissions."
            });
        }
    };

    const updateCustomerProfile = async () => {
        if (!authUser?.id) return;

        setSavingProfile(true);

        try {
            const res = await fetch(`${API_BASE}/api/customers/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id: authUser.id,
                    ...profileForm,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Update failed");
            }

            // ✅ Update UI instantly
            setUser(data.data);
            setIsEditingProfile(false);

            // 🔥 Sync with global AuthContext
            await refreshUser();

            sileo.success({
                title: "Profile Updated",
                description: "Your profile information has been saved successfully."
            });
        } catch (err: any) {
            sileo.error({
                title: "Update Failed",
                description: err.message || "Failed to update profile"
            });
        } finally {
            setSavingProfile(false);
        }
    };


    const [reviewsCount, setReviewsCount] = useState(0);

    /* ------------------------------------------------------------
       🔥 FETCH REVIEWS COUNT
    ------------------------------------------------------------- */
    const fetchReviewsCount = async () => {
        if (!authUser) return;
        const userId = authUser.id || (authUser as any)._id;
        if (!userId) return;

        try {
            // Assuming endpoint supports filtering by userId to get all reviews by user
            const res = await fetch(`${API_BASE}/api/reviews?userId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // If data.total exists, use it. Otherwise count the array.
                    setReviewsCount(data.total || data.reviews?.length || 0);
                }
            }
        } catch (e) {
            console.error("Failed to fetch reviews count", e);
        }
    };

    /* ------------------------------------------------------------
       🔥 FETCH ORDERS + PRODUCT IMAGES
    ------------------------------------------------------------- */
    const fetchOrders = async () => {
        console.log("📦 fetchOrders() CALLED");

        const userId = authUser?.id || (authUser as any)?._id;
        if (!userId) {
            console.log("❌ Missing userId for fetching orders");
            return;
        }

        const API_URL = `${API_BASE}/api/order?userId=${userId}`;
        console.log("🌍 Fetching Orders:", API_URL);

        setOrdersLoading(true);

        try {
            const res = await fetch(API_URL, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            console.log("📥 RAW ORDER RESPONSE:", res);
            console.log("📊 Order Status:", res.status);

            const text = await res.text();
            console.log("📄 RAW ORDER RESPONSE TEXT:", text);

            let json;
            try {
                json = JSON.parse(text);
            } catch (err) {
                console.error("❌ ORDER JSON PARSE ERROR:", err);
                setOrdersLoading(false);
                return;
            }

            console.log("📦 Parsed ORDER JSON:", json);

            if (json?.success && Array.isArray(json.orders)) {
                console.log("🟢 Orders received:", json.orders.length);

                const ordersWithImages = await Promise.all(
                    json.orders.map(async (ord: any) => {

                        // 🔥 FETCH FULL ORDER (to get shippingAddress)
                        let fullOrder = ord;
                        const orderId = ord.id || ord._id;
                        try {
                            if (orderId) {
                                const orderRes = await fetch(
                                    `${API_BASE}/api/order?id=${orderId}`,
                                    {
                                        headers: {
                                            Authorization: `Bearer ${token}`,
                                            Accept: "application/json",
                                        },
                                    }
                                );

                                const orderJson = await orderRes.json();
                                if (orderJson?.success && orderJson.order) {
                                    fullOrder = orderJson.order;
                                }
                            }
                        } catch (err) {
                            console.error("❌ Failed to fetch full order:", orderId, err);
                        }

                        // ⭐ ATTACH PRODUCT IMAGES
                        const updatedItems = await Promise.all(
                            fullOrder.items.map(async (it: any) => {
                                // 1. Try to get image from the order item directly (if saved)
                                if (it.image) return { ...it, productName: it.product?.name || it.name || it.productName };

                                // 2. Fallback: Fetch from product ID
                                const productId = it.product?._id || it.product?.id || it.productId || it.product;

                                // robust check: if productId is an object (unexpected), try to extract id
                                const validProductId = typeof productId === 'object' ? (productId._id || productId.id) : productId;

                                let image = "/images/placeholder.png";

                                if (validProductId) {
                                    image = await fetchProductImage(validProductId);
                                }

                                return {
                                    ...it,
                                    image,
                                    productName: it.product?.name || it.name || it.productName,
                                    price: it.product?.price || it.unitPrice || 0,
                                };
                            })
                        );

                        return {
                            ...fullOrder,
                            items: updatedItems,
                        };
                    })
                );


                setOrders(ordersWithImages);

                // Fetch dispatch records for these orders
                try {
                    const orderIds = ordersWithImages.map((o: any) => o.orderNumber).filter(Boolean);
                    if (orderIds.length > 0) {
                        const chunkedIds = [];
                        for (let i = 0; i < orderIds.length; i += 50) {
                            chunkedIds.push(orderIds.slice(i, i + 50));
                        }
                        const allDispatch = [];
                        for (const chunk of chunkedIds) {
                            const dispRes = await fetch(`${API_BASE}/api/order-dispatch?orderIds=${chunk.join(',')}`);
                            if (dispRes.ok) {
                                const dispJson = await dispRes.json();
                                if (dispJson.success && dispJson.records) {
                                    allDispatch.push(...dispJson.records);
                                }
                            }
                        }
                        const dispMap: Record<string, any> = {};
                        allDispatch.forEach((r: any) => {
                            dispMap[r.orderId] = r;
                        });
                        setDispatchRecordsMap(dispMap);
                    }
                } catch (e) {
                    console.error('Failed to fetch dispatch records:', e);
                }
            } else {
                console.warn("⚠ Unexpected ORDER format:", json);
                setOrders([]);
            }

        } catch (error) {
            console.error("🔥 Error fetching orders:", error);
            setOrders([]);
        }

        setOrdersLoading(false);
    };

    /* ------------------------------------------------------------
       🔄 FETCH SUBSCRIPTIONS
    ------------------------------------------------------------- */
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [subsLoading, setSubsLoading] = useState(false);

    const fetchSubscriptions = async () => {
        if (!authUser?.id) return;
        setSubsLoading(true);
        try {
            // Need to pass userId. 
            // Validating if authUser.id is the correct field, seems to be standard in this file.
            const userId = authUser.id || (authUser as any)._id;
            const res = await fetch(`${API_BASE}/api/subscriptions?userId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                console.log("Subscriptions Data:", data.data);
                setSubscriptions(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch subscriptions", err);
        } finally {
            setSubsLoading(false);
        }
    };




    const fetchAddresses = async () => {
        const userId = authUser?.id || (authUser as any)?._id;
        if (!userId) return;

        setAddressesLoading(true);

        try {
            const res = await fetch(
                `${API_BASE}/api/order?userId=${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            const data = await res.json();

            if (!data?.success || !Array.isArray(data.orders)) {
                setAddresses([]);
                return;
            }

            // 🔥 Extract shipping addresses
            const rawAddresses = data.orders
                .map((o: any) => o.shippingAddress)
                .filter(Boolean);

            // 🔥 Deduplicate by full address
            const uniqueMap = new Map();
            rawAddresses.forEach((addr: any) => {
                const key = `${addr.fullName}-${addr.phone}-${addr.addressLine1}-${addr.pincode}`;
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, addr);
                }
            });

            setAddresses(Array.from(uniqueMap.values()));
        } catch (err) {
            console.error("❌ Failed to fetch addresses:", err);
            setAddresses([]);
        } finally {
            setAddressesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "addresses") {
            fetchAddresses();
        }
    }, [activeTab]);


    useEffect(() => {
        if (activeTab === "orders") {
            fetchOrders();
        }
    }, [activeTab]);

    const router = useRouter();

    const handleLogout = async () => {
        await logout(); // 🔥 clears auth state

        // optional cleanup
        await clearOrderSession();

        router.push("/"); // or "/" if you prefer home
    };

    /* ------------------------------------------------------------
       UI RENDER: KEEP EVERYTHING SAME
    ------------------------------------------------------------- */

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

    if (!user) {
        console.log("❌ No user returned from backend");
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <p className="text-gray-600 text-lg">Unable to load profile.</p>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />



                {/* UI BELOW UNCHANGED — ONLY ORDERS LIST ITEMS UPDATED TO SHOW IMAGE */}
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                    {/* PROFILE HEADER (same) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8"
                    >
                        <div className="h-32 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500" />
                        <div className="relative px-8 pb-8 -mt-16">
                            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">

                                {/* Avatar */}
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center overflow-hidden">
                                    <span className="text-4xl font-bold text-amber-600 tracking-wide">
                                        {getInitials(user.name, user.phone)}
                                    </span>
                                </div>


                                {/* User Info */}
                                <div className="flex-1 pt-4 sm:pt-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h1 className="text-2xl font-bold text-gray-900">
                                                {user.name || (user.phone ? (user.phone.startsWith("+") ? user.phone : `+${user.phone}`) : "Customer")}
                                            </h1>
                                            <p className="text-gray-900 flex items-center gap-2 mt-1">
                                                <Mail className="w-4 h-4" />
                                                {user.email || "No email provided"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                                            <p className="text-sm text-gray-600">Orders</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {savedItemsCount}
                                            </p>
                                            <p className="text-sm text-gray-600">Saved Items</p>
                                        </div>

                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">{reviewsCount}</p>
                                            <p className="text-sm text-gray-600">Reviews</p>
                                        </div>

                                        <div 
                                            onClick={() => setActiveTab("advance_payment")} 
                                            className="cursor-pointer bg-amber-50 hover:bg-amber-100/80 p-2 rounded-xl transition-all border border-amber-200"
                                        >
                                            <p className="text-2xl font-bold text-amber-600">
                                                ₹{Number(user.advanceBalance || 0).toLocaleString('en-IN')}
                                            </p>
                                            <p className="text-xs font-semibold text-amber-900 flex items-center justify-center gap-1 mt-0.5">
                                                <Wallet className="w-3.5 h-3.5 text-amber-600" /> Advance Balance
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </motion.div>



                    {/* SIDEBAR + CONTENT */}
                    <div className="flex flex-col lg:flex-row gap-8">

                        {/* SIDEBAR (same) */}
                        <aside className="lg:w-80 flex-shrink-0">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-8">
                                <div className="px-6 py-5 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                                </div>
                                <nav className="p-3">
                                    {[
                                        { id: "personal", label: "Personal Info", icon: User },
                                        { id: "contract_details", label: "My Contract & SLA", icon: FileCheck },
                                        { id: "orders", label: "My Orders", icon: Package },
                                        { id: "product_documents", label: "Product Documents", icon: FileText },
                                        { id: "advance_payment", label: "Advance Payment", icon: Wallet },
                                        { id: "subscriptions", label: "My Subscriptions", icon: RotateCw },
                                        { id: "addresses", label: "Addresses", icon: MapPin },
                                        { id: "credit_notes", label: "Credit Notes", icon: Wallet },
                                        ...(user?.poMandatory ? [{
                                            id: "po_module",
                                            label: "Purchase Order",
                                            icon: FileText,
                                            subItems: [
                                                { id: "purchase_order", label: "Create PO", icon: Plus },
                                                { id: "my_purchase_orders", label: "My Purchase Orders", icon: List }
                                            ]
                                        }] : [])
                                    ].map((tab) => {
                                        const Icon = tab.icon;
                                        const hasSubItems = tab.subItems && tab.subItems.length > 0;
                                        
                                        // A module is expanded if it's the actively expanded module, 
                                        // OR if one of its subItems is currently active (so it stays open when navigating)
                                        const isChildActive = hasSubItems && tab.subItems.some((sub: any) => sub.id === activeTab);
                                        const isExpanded = expandedModule === tab.id || (expandedModule === null && isChildActive);
                                        
                                        const isParentActive = activeTab === tab.id || isChildActive;

                                        return (
                                            <div key={tab.id} className="mb-1">
                                                <button
                                                    onClick={() => {
                                                        if (hasSubItems) {
                                                            // Toggle accordion state
                                                            if (expandedModule === tab.id) {
                                                                setExpandedModule(''); // Explicitly collapse
                                                            } else {
                                                                setExpandedModule(tab.id); // Expand
                                                            }
                                                        } else {
                                                            setActiveTab(tab.id);
                                                            setExpandedModule(null); // Reset when navigating to non-accordion tab
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${!hasSubItems && activeTab === tab.id
                                                        ? "bg-amber-600 text-white shadow-sm"
                                                        : isParentActive
                                                            ? "bg-amber-50 text-amber-900"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="font-medium">{tab.label}</span>
                                                    {!hasSubItems && activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                                                    {hasSubItems && (
                                                        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? "rotate-90 text-amber-600" : ""}`} />
                                                    )}
                                                </button>

                                                {hasSubItems && isExpanded && (
                                                    <div className="ml-12 mt-1 flex flex-col gap-1 py-2">
                                                        {tab.subItems.map((sub: any) => {
                                                            const SubIcon = sub.icon;
                                                            return (
                                                                <button
                                                                    key={sub.id}
                                                                    onClick={() => setActiveTab(sub.id)}
                                                                    className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === sub.id
                                                                        ? "bg-amber-600 text-white shadow-sm"
                                                                        : "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                                                                        }`}
                                                                >
                                                                    {SubIcon && <SubIcon className="w-4 h-4" />}
                                                                    {sub.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </nav>
                                <div className="px-6 py-4 border-t border-gray-200">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-3 text-red-600 hover:bg-red-50 py-3 rounded-xl font-medium transition-colors"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        </aside>

                        {/* MAIN CONTENT */}
                        <main className="flex-1 min-w-0">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-7">

                                 {/* 📜 MY CONTRACT & SLA TAB */}
                                  {activeTab === "contract_details" && (
                                      <div className="space-y-8">
                                          {/* HEADER */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                                              <div>
                                                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                                                      <FileCheck className="w-6 h-6 text-amber-600" /> Supply Contract & SLA Management
                                                  </h2>
                                                  <p className="text-sm text-gray-500 mt-1">Manage, inspect & renew your commercial supply agreement and document records</p>
                                              </div>

                                              <button
                                                  type="button"
                                                  onClick={() => setIsContractModalOpen(true)}
                                                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
                                              >
                                                  <Edit className="w-4 h-4" />
                                                  {user?.isContractBased && user?.contract ? "Update / Renew Contract" : "Register Contract Agreement"}
                                              </button>
                                          </div>

                                          {/* STATUS BANNER */}
                                          {(() => {
                                              if (!user?.isContractBased || !user?.contract) {
                                                  return (
                                                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                          <div className="flex items-start gap-3">
                                                              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                                                                  <FileCheck className="w-5 h-5" />
                                                              </div>
                                                              <div>
                                                                  <h3 className="text-base font-bold text-gray-900">Standard Business Customer Account</h3>
                                                                  <p className="text-xs text-gray-600 mt-1">
                                                                      You are currently registered as a standard customer. If your company has a signed SLA or custom supply contract with Unifoods, click below to link your contract details.
                                                                  </p>
                                                              </div>
                                                          </div>
                                                          <button
                                                              type="button"
                                                              onClick={() => setIsContractModalOpen(true)}
                                                              className="px-4 py-2 bg-[#D97706] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-amber-700 shrink-0"
                                                          >
                                                              Upload Contract
                                                          </button>
                                                      </div>
                                                  );
                                              }

                                              const expiry = user.contract.expiryDate ? new Date(user.contract.expiryDate) : null;
                                              const now = new Date();
                                              const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                                              if (daysLeft !== null && daysLeft < 0) {
                                                  return (
                                                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                          <div className="flex items-start gap-3">
                                                              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 animate-pulse">
                                                                  <AlertTriangle className="w-5 h-5" />
                                                              </div>
                                                              <div>
                                                                  <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                                                                      Supply Contract Expired
                                                                      <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-md uppercase font-black">Expired</span>
                                                                  </h3>
                                                                  <p className="text-xs text-rose-800 mt-1">
                                                                      Your contract expired on <span className="font-extrabold">{expiry?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>. Please upload an updated agreement or renew your contract date below.
                                                                  </p>
                                                              </div>
                                                          </div>
                                                          <button
                                                              type="button"
                                                              onClick={() => setIsContractModalOpen(true)}
                                                              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm shrink-0"
                                                          >
                                                              Renew Contract Now
                                                          </button>
                                                      </div>
                                                  );
                                              }

                                              if (daysLeft !== null && daysLeft <= 30) {
                                                  return (
                                                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                          <div className="flex items-start gap-3">
                                                              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 animate-bounce">
                                                                  <AlertCircle className="w-5 h-5" />
                                                              </div>
                                                              <div>
                                                                  <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                                                                      Contract Expiring Soon
                                                                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase font-black">In {daysLeft} Days</span>
                                                                  </h3>
                                                                  <p className="text-xs text-amber-800 mt-1">
                                                                      Your contract will expire on <span className="font-bold">{expiry?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>. Upload your renewed agreement document now to prevent any order interruptions.
                                                                  </p>
                                                              </div>
                                                          </div>
                                                          <button
                                                              type="button"
                                                              onClick={() => setIsContractModalOpen(true)}
                                                              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm shrink-0"
                                                          >
                                                              Update & Renew Contract
                                                          </button>
                                                      </div>
                                                  );
                                              }

                                              return (
                                                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between gap-4">
                                                      <div className="flex items-center gap-3">
                                                          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                              <CheckCircle className="w-5 h-5" />
                                                          </div>
                                                          <div>
                                                              <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                                                                  Contract Active & Verified
                                                                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md uppercase font-black">Active</span>
                                                              </h3>
                                                              <p className="text-xs text-emerald-800 mt-0.5">
                                                                  Valid until <span className="font-bold">{expiry?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'No Expiry Date'}</span> ({daysLeft ? `${daysLeft} days remaining` : 'Ongoing'}).
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>
                                              );
                                          })()}

                                          {/* CONTRACT CARD DISPLAY */}
                                          {user?.isContractBased && user?.contract && (
                                              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-6">
                                                  <div className="grid md:grid-cols-2 gap-6">
                                                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agreement Type</p>
                                                          <p className="text-base font-bold text-gray-900 mt-1">{user.contract.contractType || "Annual Supply Agreement"}</p>
                                                      </div>
                                                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expiry Date</p>
                                                          <p className="text-base font-bold text-gray-900 mt-1 flex items-center gap-2">
                                                              <Calendar className="w-4 h-4 text-amber-600" />
                                                              {user.contract.expiryDate ? new Date(user.contract.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Not Specified"}
                                                          </p>
                                                      </div>
                                                  </div>

                                                  {user.contract.documentUrl && (
                                                      <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                          <div className="flex items-center gap-3">
                                                              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                                                  <FileText className="w-5 h-5" />
                                                              </div>
                                                              <div>
                                                                  <h4 className="text-sm font-bold text-gray-900">Signed Contract Document</h4>
                                                                  <p className="text-xs text-gray-500">Stored securely on Cloudinary ☁️</p>
                                                              </div>
                                                          </div>
                                                          <a
                                                              href={user.contract.documentUrl}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="px-4 py-2.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0"
                                                          >
                                                              <Download className="w-4 h-4 text-amber-600" /> View Document
                                                          </a>
                                                      </div>
                                                  )}

                                                  {user.contract.notes && (
                                                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contract Terms & Notes</p>
                                                          <p className="text-xs text-gray-700 leading-relaxed font-medium">{user.contract.notes}</p>
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  )}

                                  {/* 📄 PRODUCT DOCUMENTS (E-FORM & COA) TAB */}
                                  {activeTab === "product_documents" && (
                                      <ProductDocumentsSection />
                                  )}

                                 {/* ADVANCE PAYMENT TAB */}
                                 {activeTab === "advance_payment" && (
                                     <div className="space-y-8">
                                         {/* HEADER */}
                                         <div className="flex items-center justify-between border-b pb-4">
                                             <div>
                                                 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                     <Wallet className="w-6 h-6 text-amber-600" /> Advance Payment Account
                                                 </h2>
                                                 <p className="text-sm text-gray-500 mt-1">Manage your pre-deposited advance funds & top up your balance</p>
                                             </div>
                                             <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1.5">
                                                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active & Ready
                                             </span>
                                         </div>

                                         {/* BALANCE DISPLAY CARD */}
                                         <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                                             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                 <div>
                                                     <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">Current Available Advance Balance</p>
                                                     <h3 className="text-4xl font-black mt-2">₹ {Number(user.advanceBalance || 0).toLocaleString('en-IN')}</h3>
                                                     <p className="text-xs text-amber-100/90 mt-2 max-w-md">
                                                         Use your pre-deposited advance balance at checkout for instant 1-click order dispatches without needing cash or card payments.
                                                     </p>
                                                 </div>
                                                 <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center flex flex-col items-center justify-center">
                                                     <Wallet className="w-8 h-8 text-white mb-1" />
                                                     <span className="text-xs font-semibold">1-Click Checkout Enabled</span>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* TOP UP / ADD FUNDS FORM WITH PENDING PAYMENT GATEWAY NOTIFICATION */}
                                         <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-5">
                                             <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                 <Plus className="w-5 h-5 text-amber-600" /> Add Advance Funds / Top Up Balance
                                             </h3>
                                             
                                             {/* Quick Preset Buttons */}
                                             <div>
                                                 <label className="text-xs font-semibold text-gray-600 mb-2 block">Quick Select Amount:</label>
                                                 <div className="flex flex-wrap gap-3">
                                                     {[2000, 5000, 10000, 25000, 50000].map((amt) => (
                                                         <button
                                                             key={amt}
                                                             type="button"
                                                             onClick={() => {
                                                                 setTopUpAmount(String(amt));
                                                                 handleTopUpClick();
                                                             }}
                                                             className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                                                                 topUpAmount === String(amt)
                                                                     ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                                                     : 'bg-white text-gray-700 border-gray-300 hover:border-amber-500'
                                                             }`}
                                                         >
                                                             + ₹{amt.toLocaleString('en-IN')}
                                                         </button>
                                                     ))}
                                                 </div>
                                             </div>

                                             {/* Custom Input & Action Button */}
                                             <div className="space-y-4 pt-2">
                                                 <label className="text-xs font-semibold text-gray-600 block">Enter Custom Amount (₹):</label>
                                                 <div className="flex flex-col sm:flex-row items-center gap-4">
                                                     <div className="relative flex-1 w-full">
                                                         <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                                                         <input
                                                             type="number"
                                                             min="100"
                                                             step="500"
                                                             value={topUpAmount}
                                                             onChange={(e) => setTopUpAmount(e.target.value)}
                                                             className="w-full pl-9 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                                             placeholder="e.g. 5000"
                                                         />
                                                     </div>

                                                     <button
                                                         type="button"
                                                         onClick={handleTopUpClick}
                                                         className="w-full sm:w-auto px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                                     >
                                                         <Plus className="w-4 h-4" />
                                                         Add ₹{Number(topUpAmount || 0).toLocaleString('en-IN')} Advance Funds
                                                     </button>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 {/* PERSONAL INFO (same) */}
                                 {activeTab === "personal" && (
                                    <div className="space-y-8">
                                        {/* HEADER */}
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                Personal Information
                                            </h2>

                                            {!isEditingProfile && (
                                                <button
                                                    className="text-amber-600 hover:text-amber-700 text-sm flex items-center gap-2"
                                                    onClick={() => setIsEditingProfile(true)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            )}
                                        </div>

                                        {/* EDIT MODE */}
                                        {isEditingProfile ? (
                                            <div className="grid md:grid-cols-2 gap-6">
                                                {[
                                                    { label: "Name", key: "name" },
                                                    { label: "Email", key: "email" },
                                                    { label: "Address", key: "address" },
                                                    { label: "City", key: "city" },
                                                    { label: "State", key: "state" },
                                                    { label: "Pincode", key: "pincode" },
                                                ].map((field) => (
                                                    <div key={field.key}>
                                                        <label className="text-sm font-medium text-gray-700">
                                                            {field.label}
                                                        </label>
                                                        <input
                                                            value={(profileForm as any)[field.key]}
                                                            onChange={(e) =>
                                                                setProfileForm((prev) => ({
                                                                    ...prev,
                                                                    [field.key]: e.target.value,
                                                                }))
                                                            }
                                                            className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                                                        />
                                                    </div>
                                                ))}

                                                <div className="flex items-end pb-1">
                                                    <button
                                                        type="button"
                                                        onClick={handleUpdateLocation}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                                    >
                                                        <MapPin className="w-4 h-4" />
                                                        {profileForm.lat ? "Refresh Location" : "Capture Location"}
                                                    </button>
                                                </div>

                                                {profileForm.lat && (
                                                    <div className="md:col-span-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-dashed">
                                                        Captured Coordinates: {profileForm.lat?.toFixed(6)}, {profileForm.lng?.toFixed(6)}
                                                    </div>
                                                )}

                                                <div className="md:col-span-2 flex gap-3 mt-4">
                                                    <button
                                                        onClick={updateCustomerProfile}
                                                        disabled={savingProfile}
                                                        className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                                                    >
                                                        {savingProfile ? "Saving..." : "Save Changes"}
                                                    </button>


                                                    <button
                                                        onClick={() => setIsEditingProfile(false)}
                                                        className="px-6 py-2 border rounded-lg"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* READ-ONLY VIEW */
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 bg-amber-50 rounded-lg flex items-center justify-center">
                                                            <User className="w-5 h-5 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500">Full Name</p>
                                                            <p className="font-medium text-gray-900">{user.name || "Not set"}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 bg-amber-50 rounded-lg flex items-center justify-center">
                                                            <Mail className="w-5 h-5 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500">Email</p>
                                                            <p className="font-medium text-gray-900">{user.email || "Not set"}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 bg-amber-50 rounded-lg flex items-center justify-center">
                                                            <Phone className="w-5 h-5 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500">Phone</p>
                                                            <p className="font-medium text-gray-900">{user.phone}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 bg-amber-50 rounded-lg flex items-center justify-center">
                                                            <Calendar className="w-5 h-5 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500">Member Since</p>
                                                            <p className="font-medium text-gray-900">
                                                                {new Date(user.createdAt).toLocaleDateString("en-IN", {
                                                                    month: "long",
                                                                    year: "numeric",
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}


                                {/* ADDRESSES (same) */}
                                {activeTab === "addresses" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-semibold text-gray-900">Saved Addresses</h2>
                                            {/* <button
                                                onClick={() => setShowAddressForm(true)}
                                                className="bg-amber-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-700 transition"
                                            >
                                                + Add New Address
                                            </button> */}

                                        </div>

                                        <div className="grid md:grid-cols-2 gap-5">
                                            {/* ADDRESSES LIST */}
                                            {addressesLoading && (
                                                <p className="text-gray-500">Loading addresses…</p>
                                            )}

                                            {!addressesLoading && addresses.length === 0 && (
                                                <p className="text-gray-500">No saved addresses yet.</p>
                                            )}

                                            <div className="grid md:grid-cols-2 gap-5">
                                                {addresses.map((addr, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
                                                    >
                                                        <div className="flex items-start gap-3 mb-3">
                                                            <MapPin className="w-5 h-5 text-amber-600 mt-1" />
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{addr.fullName}</p>
                                                                <p className="text-sm text-gray-700">{addr.addressLine1}</p>
                                                                {addr.addressLine2 && (
                                                                    <p className="text-sm text-gray-700">{addr.addressLine2}</p>
                                                                )}
                                                                <p className="text-sm text-gray-600">
                                                                    {addr.city}, {addr.state} - {addr.pincode}
                                                                </p>
                                                                <p className="text-sm text-gray-600 mt-1">📞 {addr.phone}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                        </div>
                                        {/* ADD NEW ADDRESS FORM */}
                                        {showAddressForm && (
                                            <div className="mt-6">
                                                <ShippingAddressSelector
                                                    onSubmit={(address: any) => {
                                                        console.log("✅ Address received:", address);

                                                        sileo.success({
                                                            title: "Address Added",
                                                            description: "New shipping address has been saved successfully."
                                                        });

                                                        setShowAddressForm(false);
                                                    }}
                                                />

                                                <button
                                                    onClick={() => setShowAddressForm(false)}
                                                    className="mt-4 text-sm text-gray-600 hover:text-gray-900"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                )}


                                {/* PURCHASE ORDER FORM */}
                                {activeTab === "purchase_order" && (
                                    <div className="space-y-8">
                                        <PurchaseOrderForm />
                                    </div>
                                )}

                                {/* MY PURCHASE ORDERS */}
                                {activeTab === "my_purchase_orders" && (
                                    <div className="space-y-8">
                                        <MyPurchaseOrders />
                                    </div>
                                )}

                                {/* ---------------------------- ORDERS TAB (NOW WITH IMAGES) ---------------------------- */}
                                {activeTab === "orders" && (
                                    <div className="space-y-8">
                                        {/* Header Section */}
                                        <div className="text-center mb-2">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Orders</h2>
                                            <p className="text-gray-600">Track and manage your purchases</p>
                                        </div>

                                        {/* Loading State */}
                                        {ordersLoading && (
                                            <div className="flex flex-col items-center justify-center py-16">
                                                <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full" />
                                                    <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin absolute top-0" />
                                                </div>
                                                <p className="text-gray-600 mt-4 font-medium">Loading your orders...</p>
                                                <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
                                            </div>
                                        )}

                                        {/* Empty State */}
                                        {!ordersLoading && orders.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                                <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center mb-6">
                                                    <Package className="w-12 h-12 text-amber-500" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
                                                <p className="text-gray-600 text-center max-w-md">
                                                    You haven't placed any orders. Start shopping to see your orders here.
                                                </p>
                                                <button className="mt-6 px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors">
                                                    Start Shopping
                                                </button>
                                            </div>
                                        )}

                                        {/* Orders List */}
                                        {!ordersLoading && orders.length > 0 && (
                                            <div className="space-y-6">
                                                {/* Filter UI */}
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {["All", "Pending", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"].map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => setOrderFilter(status)}
                                                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${orderFilter === status ? "bg-amber-600 text-white shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>

                                                {orders.filter(ord => {
                                                    if (orderFilter === "All") return true;
                                                    if (orderFilter === "Returned") {
                                                        const oId = String(ord.id || ord._id || ord.orderId);
                                                        return !!returnMap[oId];
                                                    }
                                                    const ordStatus = (ord.status || "Pending").toLowerCase().replace(/_/g, ' ');
                                                    return ordStatus === orderFilter.toLowerCase().replace(/_/g, ' ');
                                                }).length === 0 ? (
                                                    <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
                                                        No orders found for the selected status.
                                                    </div>
                                                ) : orders.filter(ord => {
                                                    if (orderFilter === "All") return true;
                                                    if (orderFilter === "Returned") {
                                                        const oId = String(ord.id || ord._id || ord.orderId);
                                                        return !!returnMap[oId];
                                                    }
                                                    const ordStatus = (ord.status || "Pending").toLowerCase().replace(/_/g, ' ');
                                                    return ordStatus === orderFilter.toLowerCase().replace(/_/g, ' ');
                                                }).map((ord, index) => (
                                                    <div
                                                        key={ord.id || index}
                                                        className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                                                    >
                                                        {/* Order Header */}
                                                        <div className="bg-gradient-to-r from-amber-50 to-white px-6 py-4 border-b">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                                <div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                                            {/* Order #{ord?.id.slice(-8).toUpperCase()} */}
                                                                            Order #{String(ord?.id ?? ord?._id ?? ord?.orderId ?? "")
                                                                                .slice(-8)
                                                                                .toUpperCase()}
                                                                        </h3>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 mt-1">
                                                                        Placed on {formatToIST(ord.createdAt)}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${ord.status === "Delivered"
                                                                        ? "bg-green-100 text-green-800"
                                                                        : ord.status === "Cancelled"
                                                                            ? "bg-red-100 text-red-800"
                                                                            : ord.status === "return_requested"
                                                                                ? "bg-orange-100 text-orange-800"
                                                                                : "bg-amber-100 text-amber-800"
                                                                        }`}>
                                                                        {ord.status === "return_requested" ? "Return Requested" : (ord.status || "Processing")}
                                                                    </span>
                                                                    <span className="text-lg font-bold text-gray-900">
                                                                        ₹{ord.total.toLocaleString('en-IN')}
                                                                    </span>

                                                                    {['out_for_delivery', 'shipped', 'confirmed', 'processing'].includes(ord.status?.toLowerCase()) && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.location.href = `/orders/${ord.id || ord._id || ord.orderId}`;
                                                                            }}
                                                                            className="ml-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition shadow-sm flex items-center gap-2"
                                                                        >
                                                                            <MapPin size={16} /> Track
                                                                        </button>
                                                                    )}

                                                                    {(() => {
                                                                        const oId = String(ord.id || ord._id || ord.orderId);
                                                                        const grievanceStatus = grievanceMap[oId];
                                                                        const hasGrievance = !!grievanceStatus;
                                                                        
                                                                        let statusColor = "text-gray-500";
                                                                        if (grievanceStatus === "Resolved" || grievanceStatus === "Closed") statusColor = "text-green-600";
                                                                        else if (grievanceStatus === "In Progress") statusColor = "text-amber-600";
                                                                        else if (grievanceStatus === "Escalated") statusColor = "text-red-600";

                                                                        return (
                                                                            <div className="flex flex-col items-end">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (!hasGrievance) handleRaiseGrievance(oId);
                                                                                    }}
                                                                                    disabled={hasGrievance}
                                                                                    className={`ml-2 px-4 py-2 text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition ${
                                                                                        hasGrievance 
                                                                                            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" 
                                                                                            : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                                                                                    }`}
                                                                                >
                                                                                    <AlertCircle size={16} /> {hasGrievance ? "Issue Raised" : "Raise Issue"}
                                                                                </button>
                                                                                {hasGrievance && (
                                                                                    <span className="text-[11px] font-bold mt-1 pr-1">
                                                                                        Issue Status: <span className={statusColor}>{grievanceStatus}</span>
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Dispatch Progress Box */}
                                                        {(() => {
                                                            const oId = String(ord.orderNumber || ord.id || ord._id);
                                                            const dispRecord = dispatchRecordsMap[oId];
                                                            if (!dispRecord) return null;
                                                            
                                                            const isRationalized = dispRecord.pendingQuantity > 0 || dispRecord.status === 'partial';
                                                            
                                                            return (
                                                                <div className="px-6 py-4 bg-orange-50/50 border-b border-orange-100 flex flex-col gap-3">
                                                                    
                                                                    {/* Rationalization Notification Alert */}
                                                                    {isRationalized && (
                                                                        <div className="bg-orange-100 border-l-4 border-orange-500 p-3 rounded-r-lg shadow-sm">
                                                                            <div className="flex items-start gap-2">
                                                                                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                                                <div>
                                                                                    <h4 className="text-sm font-bold text-orange-800">Order Rationalized</h4>
                                                                                    <p className="text-xs text-orange-700 mt-1">
                                                                                        Your order quantities have been adjusted by our Supply Chain Management team.
                                                                                        {dispRecord.reason && <span className="font-semibold block mt-0.5">Reason: {dispRecord.reason}</span>}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                                                                        <div className="flex items-center justify-between text-xs mb-3">
                                                                            <span className="font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5"><span className="w-4 h-4 text-blue-500"/> Dispatch Status</span>
                                                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border tracking-wide ${dispRecord.status === 'partial'
                                                                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                                                : dispRecord.status === 'fully_dispatched' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                                }`}>
                                                                                {dispRecord.status === 'partial' ? 'Partial Dispatch' : dispRecord.status === 'fully_dispatched' ? 'Fully Dispatched' : 'Pending Dispatch'}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        <div className="flex flex-col gap-1.5 mb-3 text-xs">
                                                                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                                                <span className="font-semibold text-gray-600">📦 Currently Dispatching:</span>
                                                                                <span className="font-bold text-gray-800">{dispRecord.dispatchedQuantity} items</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                                                <span className="font-semibold text-gray-500">⏳ Pending Items:</span>
                                                                                <span className="font-bold text-gray-600">{dispRecord.pendingQuantity} items</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                                                <span className="font-semibold text-gray-500">📋 Original Order:</span>
                                                                                <span className="font-bold text-gray-600">{dispRecord.totalQuantity} items</span>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {dispRecord.items && dispRecord.items.length > 0 && (
                                                                            <div className="mt-3 mb-4">
                                                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Rationalized Item Breakdown</h5>
                                                                                <div className="space-y-1.5">
                                                                                    {dispRecord.items.map((item: any, idx: number) => (
                                                                                        <div key={idx} className={`rounded p-2.5 text-xs border flex flex-col gap-1.5 ${item.pendingQty > 0 ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                                                                                            <div className="flex justify-between font-semibold text-gray-700 items-start gap-2">
                                                                                                <span className="truncate">{item.name}</span>
                                                                                                <span className="whitespace-nowrap bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100 text-blue-700">
                                                                                                    {item.dispatchQty} / {item.originalQty}
                                                                                                </span>
                                                                                            </div>
                                                                                            {item.pendingQty > 0 && (
                                                                                                <div className="flex items-center justify-between mt-0.5">
                                                                                                    <span className="text-[10px] text-orange-700 font-bold bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200">
                                                                                                        ⚠️ {item.pendingQty} Pending
                                                                                                    </span>
                                                                                                    {dispRecord.reason && (
                                                                                                        <span className="text-[10px] text-orange-600/80 italic truncate pl-2 max-w-[60%] text-right">
                                                                                                            ({dispRecord.reason})
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {dispRecord.totalQuantity > 0 && (
                                                                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full transition-all duration-500 relative ${dispRecord.status === 'partial' ? 'bg-orange-500' : dispRecord.status === 'fully_dispatched' ? 'bg-green-500' : 'bg-blue-500'}`}
                                                                                    style={{ width: `${(dispRecord.dispatchedQuantity / dispRecord.totalQuantity) * 100}%` }}
                                                                                >
                                                                                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Shipping Address */}
                                                        {ord.shippingAddress && (
                                                            <div className="px-6 py-4 border-b border-gray-100">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-semibold text-gray-700 mb-2">
                                                                            Shipping Address
                                                                        </p>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                            <div>
                                                                                <p className="text-sm text-gray-900 font-medium">
                                                                                    {ord.shippingAddress.fullName}
                                                                                </p>
                                                                                <p className="text-sm text-gray-600">
                                                                                    {ord.shippingAddress.addressLine1}
                                                                                    {ord.shippingAddress.addressLine2 && `, ${ord.shippingAddress.addressLine2}`}
                                                                                </p>
                                                                                <p className="text-sm text-gray-600">
                                                                                    {ord.shippingAddress.city}, {ord.shippingAddress.state} - {ord.shippingAddress.pincode}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center text-sm text-gray-600">
                                                                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                                </svg>
                                                                                {ord.shippingAddress.phone}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Order Items */}
                                                        <div className="px-6 py-4">
                                                            <p className="text-sm font-semibold text-gray-700 mb-4">Order Items ({ord.items?.length || 0})</p>
                                                            <div className="space-y-4">
                                                                {ord.items?.map((item: any, i: number) => (
                                                                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                                                                            <Image
                                                                                src={item?.image || "/images/placeholder.png"}
                                                                                alt={item?.name || "Product image"}
                                                                                width={64}
                                                                                height={64}
                                                                                className="object-cover w-full h-full"
                                                                                unoptimized
                                                                            />
                                                                            <div className="absolute top-0 right-0 bg-amber-600 text-white text-xs px-2 py-1 rounded-bl-lg">
                                                                                {item.quantity}x
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-medium text-gray-900 truncate">
                                                                                {item.productName || item.name}
                                                                            </p>
                                                                            <div className="flex flex-col gap-1 mt-1">
                                                                                <p className="text-sm text-gray-600">
                                                                                    Unit Price: <span className="font-medium">₹{(item.unitPrice || 0).toLocaleString('en-IN')}</span>
                                                                                </p>
                                                                                <p className="text-sm text-gray-600">
                                                                                    Item Total: <span className="font-medium">₹{((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString('en-IN')}</span>
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex gap-2">
                                                                            {/* Write Review Button - Only if Delivered or Return Requested */}
                                                                            {['delivered', 'return_requested'].includes(ord.status?.toLowerCase()) && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        // robustly find product ID
                                                                                        const pId = item.product?._id || item.product?.id || item.productId || (typeof item.product === 'string' ? item.product : null);
                                                                                        handleWriteReview(ord.id || ord._id, { id: pId, name: item.productName || item.name });
                                                                                    }}
                                                                                    className="px-4 py-2 text-sm font-medium text-white bg-[#D97706] rounded-full hover:bg-[#B45309] transition-colors shadow-sm"
                                                                                >
                                                                                    Write Review
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Order Summary Breakdown */}
                                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between text-gray-600">
                                                                    <span>Subtotal</span>
                                                                    <span className="font-medium text-gray-900">₹{(ord.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                                <div className="flex justify-between text-gray-600">
                                                                    <span>Tax (18% GST)</span>
                                                                    <span className="font-medium text-gray-900">₹{(ord.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                                <div className="flex justify-between text-gray-600">
                                                                    <span>Shipping & Platform Fee</span>
                                                                    <span className="font-medium text-gray-900">₹{(ord.shippingCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                                {ord.discounts > 0 && (
                                                                    <div className="flex justify-between text-green-600">
                                                                        <span>Discount</span>
                                                                        <span className="font-medium">-₹{ord.discounts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                )}
                                                                <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center">
                                                                    <span className="font-bold text-gray-900">Total Amount</span>
                                                                    <span className="text-lg font-bold text-amber-600">₹{(ord.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Order Footer - Return Action */}
                                                        {(() => {
                                                            if (ord.status?.toLowerCase() !== 'delivered') return null;

                                                            // Calculate Return Window (7 Days)
                                                            const promptDeliveryDate = ord.deliveredAt || ord.updatedAt || ord.createdAt;
                                                            const deliveryDate = new Date(promptDeliveryDate);
                                                            const currentDate = new Date();

                                                            const diffTime = Math.abs(currentDate.getTime() - deliveryDate.getTime());
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            const daysLeft = 7 - diffDays;

                                                            const isReturnableByTime = daysLeft >= 0;
                                                            const currentReturnStatus = returnMap[String(ord._id || ord.id)];
                                                            const isVendorConfirmed = currentReturnStatus && !['Pending Vendor Approval', 'Vendor Rejected'].includes(currentReturnStatus);
                                                            
                                                            const isFullyReturned = ord.items?.every((item: any) => {
                                                                const pId = String(item.product?._id || item.product?.id || item.productId || item.product);
                                                                const maxAllowed = item.quantity - (returnedQtysMap[String(ord._id || ord.id)]?.[pId] || 0);
                                                                return maxAllowed <= 0;
                                                            });
                                                            
                                                            const isReturnable = isReturnableByTime && !isVendorConfirmed && !isFullyReturned;

                                                            return (
                                                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                                                    {/* Return Window Message */}
                                                                    <div className="text-sm">
                                                                        {isReturnable ? (
                                                                            <span className="text-amber-600 font-medium">
                                                                                Return available for {daysLeft} more day{daysLeft !== 1 ? 's' : ''}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-500 font-medium">
                                                                                Return window closed
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-4 flex flex-wrap gap-3 items-center">
                                                                        {returnMap[String(ord._id || ord.id)] && (
                                                                            <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                                                                                Previous Return {returnMap[String(ord._id || ord.id)]}
                                                                            </span>
                                                                        )}
                                                                        
                                                                        {isReturnable && (
                                                                            <button
                                                                                onClick={() => handleReturnOrder(ord.id || ord._id, ord.items, ord.shippingAddress)}
                                                                                className="px-4 py-2 border border-[#9c2b2b] rounded-lg text-sm font-medium text-[#9c2b2b] hover:bg-[#9c2b2b] hover:text-white transition-colors"
                                                                            >
                                                                                Return Items
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Schedule Repeat Action */}
                                                        {ord.status?.toLowerCase() === 'delivered' && (
                                                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                                                <button
                                                                    onClick={() => handleScheduleRepeat(ord)}
                                                                    className="px-6 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm flex items-center gap-2"
                                                                >
                                                                    <RotateCw size={16} />
                                                                    Schedule Repeat Order
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Cancel Action - Pending/Confirmed */}
                                                        {['pending', 'confirmed'].includes(ord.status?.toLowerCase()) && (
                                                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                                                <button
                                                                    onClick={() => handleCancelOrder(ord.id || ord._id)}
                                                                    className="px-6 py-2.5 text-sm font-medium text-red-600 border border-red-200 bg-white rounded-xl hover:bg-red-50 hover:border-red-300 transition-all shadow-sm flex items-center gap-2"
                                                                >
                                                                    Cancel Order
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SUBSCRIPTIONS TAB */}
                                {activeTab === "subscriptions" && (
                                    <div className="space-y-8">
                                        <div className="mb-6">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-1">My Subscriptions</h2>
                                            <p className="text-gray-600 text-sm">Manage your recurring orders</p>
                                        </div>

                                        {subsLoading && (
                                            <div className="flex flex-col items-center justify-center py-10">
                                                <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
                                                <p className="text-gray-500">Loading subscriptions...</p>
                                            </div>
                                        )}

                                        {!subsLoading && subscriptions.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                                <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center mb-6">
                                                    <RotateCw className="w-12 h-12 text-amber-500" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No active subscriptions</h3>
                                                <p className="text-gray-600 text-center max-w-md">
                                                    Start a recurring order from your Order History to see it here.
                                                </p>
                                            </div>
                                        )}

                                        {!subsLoading && subscriptions.length > 0 && (
                                            <div className="grid gap-4">
                                                {subscriptions.map(sub => (
                                                    <div key={sub._id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center hover:shadow-md transition-shadow relative">
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                                                            {sub.productImage ? (
                                                                <Image src={sub.productImage} alt={sub.productName || "Product"} width={64} height={64} className="object-cover w-full h-full" unoptimized />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 text-center md:text-left">
                                                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                                                <h4 className="font-semibold text-gray-900 text-lg">{sub.productName || "Unknown Product"}</h4>
                                                                {/* Out of Stock Tag */}
                                                                {sub.product?.stockQuantity <= 0 && (
                                                                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                                                                        Out of Stock
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                                                                <span className="flex items-center gap-1">
                                                                    <RotateCw size={14} className="text-amber-600" />
                                                                    {sub.frequency}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock size={14} className="text-amber-600" />
                                                                    Next: {formatToIST(sub.nextOrderDate)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {sub.status === 'Paused' && sub.lockedPrice && Math.abs(sub.product?.price - sub.lockedPrice) >= 1 ? (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                                                        Price Changed
                                                                    </span>
                                                                    <button
                                                                        onClick={async () => {
                                                                            sileo.action({
                                                                                title: "Approve Price Change?",
                                                                                description: `Price changed from ₹${sub.lockedPrice} to ₹${sub.product.price}. Approve new price for subscription?`,
                                                                                fill: "#171717",
                                                                                styles: {
                                                                                    title: "text-white!",
                                                                                    description: "text-white/70!",
                                                                                    button: "bg-amber-600! hover:bg-amber-700! text-white!",
                                                                                },
                                                                                button: {
                                                                                    title: "Approve",
                                                                                    onClick: async () => {
                                                                                        try {
                                                                                            const res = await fetch(`${API_BASE}/api/subscriptions`, {
                                                                                                method: 'PATCH',
                                                                                                headers: {
                                                                                                    'Content-Type': 'application/json',
                                                                                                    'Authorization': `Bearer ${token}`
                                                                                                },
                                                                                                body: JSON.stringify({
                                                                                                    subscriptionId: sub._id,
                                                                                                    status: 'Active',
                                                                                                    lockedPrice: sub.product.price // Update to new price
                                                                                                })
                                                                                            });
                                                                                            const data = await res.json();
                                                                                            if (data.success) {
                                                                                                sileo.success({ title: "Price approved! Subscription active." });
                                                                                                fetchSubscriptions();
                                                                                            } else {
                                                                                                sileo.error({ title: data.error || "Update Failed" });
                                                                                            }
                                                                                        } catch (e) {
                                                                                            console.error(e);
                                                                                            sileo.error({ title: "Failed to update" });
                                                                                        }
                                                                                    }
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition"
                                                                    >
                                                                        Approve ₹{sub.product?.price}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${sub.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    {sub.status}
                                                                </span>
                                                            )}

                                                            {sub.status === 'Active' && (
                                                                <button
                                                                    onClick={() => handleCancelSubscription(sub._id)}
                                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                                    title="Cancel Auto-reorder"
                                                                >
                                                                    <XCircle size={20} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CREDIT NOTES TAB */}
                                {activeTab === "credit_notes" && (
                                    <div className="space-y-8">
                                        <div className="text-center mb-2">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Credit Notes</h2>
                                            <p className="text-gray-600">View and download your refund and adjustment credit notes</p>
                                        </div>

                                        {/* Total Available CN Balance Card */}
                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                                    <Wallet className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Available CN Balance</p>
                                                    <p className="text-3xl font-black text-emerald-950 mt-0.5">
                                                        ₹{Number(user?.cnBalance ?? authUser?.cnBalance ?? creditNotes.reduce((s: number, c: any) => s + Number(c.amount || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-xs text-emerald-700 font-medium mt-0.5">Available for instant use at checkout</p>
                                                </div>
                                            </div>
                                            {/* <Link
                                                href="/checkout"
                                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 self-start sm:self-auto"
                                            >
                                                <ShoppingBag className="w-4 h-4" />
                                                Use at Checkout
                                            </Link> */}
                                        </div>

                                        {loadingCNs && (
                                            <div className="flex flex-col items-center justify-center py-16">
                                                <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-amber-500/20 rounded-full" />
                                                    <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin absolute top-0" />
                                                </div>
                                                <p className="text-gray-600 mt-4 font-medium">Loading credit notes...</p>
                                            </div>
                                        )}

                                        {!loadingCNs && creditNotes.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                                <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center mb-6">
                                                    <Wallet className="w-12 h-12 text-amber-500" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No credit notes found</h3>
                                                <p className="text-gray-600 text-center max-w-md">
                                                    You don't have any credit notes generated for your account.
                                                </p>
                                            </div>
                                        )}

                                        {!loadingCNs && creditNotes.length > 0 && (
                                            <div className="space-y-6">
                                                {creditNotes.map((cn, index) => (
                                                    <div
                                                        key={cn._id || index}
                                                        className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden animate-fadeIn"
                                                    >
                                                        {/* Header */}
                                                        <div className="bg-gradient-to-r from-amber-50/50 to-white px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                                        {cn.cnNumber}
                                                                    </h3>
                                                                </div>
                                                                <p className="text-sm text-gray-500 mt-1">
                                                                    Issued on {new Date(cn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                                                <span className="font-bold text-lg text-emerald-600">
                                                                    ₹{cn.amount?.toFixed(2)}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        import('@/lib/utils/credit-note-generator').then(module => {
                                                                            module.generateCreditNotePDF(cn);
                                                                        }).catch(err => {
                                                                            console.error('Failed to load PDF generator', err);
                                                                        });
                                                                    }}
                                                                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                    Download PDF
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {/* Details */}
                                                        <div className="p-6 space-y-4">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for Credit</h4>
                                                                <p className="text-sm text-gray-700">{cn.reason || "Return adjustment"}</p>
                                                            </div>
                                                            {cn.items && cn.items.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Adjusted Items</h4>
                                                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                                                        <table className="w-full text-left text-xs">
                                                                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                                                                                <tr>
                                                                                    <th className="px-4 py-3">Description</th>
                                                                                    <th className="px-4 py-3 text-center">Qty</th>
                                                                                    <th className="px-4 py-3 text-right">Rate</th>
                                                                                    <th className="px-4 py-3 text-right">Total</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                                                {cn.items.map((item: any, idx: number) => (
                                                                                    <tr key={idx}>
                                                                                        <td className="px-4 py-3 font-medium">{item.description}</td>
                                                                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                                                        <td className="px-4 py-3 text-right">₹{item.rate?.toFixed(2)}</td>
                                                                                        <td className="px-4 py-3 text-right">₹{item.amount?.toFixed(2)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </main>
                    </div>

                </div>
                <Footer />
            </div>

            {/* Review Modal */}
            <ReviewFormModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSubmit={handleReviewSubmit}
                productName={reviewProduct?.name || 'Product'}
            />

            {/* Return Modal */}
            <ReturnOrderModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                onSubmit={handleReturnSubmit}
                orderItems={returnOrderItems}
                orderId={returnOrderId!}
            />

            <OrderSubscriptionModal
                isOpen={isSubModalOpen}
                onClose={() => setIsSubModalOpen(false)}
                onSuccess={() => {
                    fetchSubscriptions();
                    fetchOrders();
                }}
                orderId={subModalOrderId}
                items={subModalItems}
                fees={subModalFees}
            />
            {/* Cancel Order Modal */}
            <CancelOrderModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onSubmit={handleCancelSubmit}
                orderId={cancelOrderId || ''}
            />

            {/* Cancel Subscription Modal */}
            <CancelSubscriptionModal
                isOpen={isCancelSubModalOpen}
                onClose={() => setIsCancelSubModalOpen(false)}
                onSubmit={handleCancelSubscriptionSubmit}
                subscriptionId={cancelSubId || ''}
            />

            {/* 📜 UPDATE / RENEW CONTRACT MODAL */}
            {isContractModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in duration-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Update / Renew Contract</h3>
                                    <p className="text-xs text-gray-500">Upload new agreement details & Cloudinary document</p>
                                </div>
                            </div>
                            <button onClick={() => setIsContractModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Contract Agreement Type</label>
                                <select
                                    value={contractFormType}
                                    onChange={(e) => setContractFormType(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-[#D97706] text-xs font-bold text-gray-800"
                                >
                                    <option value="Annual Supply Agreement">Annual Supply Agreement</option>
                                    <option value="Fixed Rate Contract">Fixed Rate Contract</option>
                                    <option value="Service Level Agreement (SLA)">Service Level Agreement (SLA)</option>
                                    <option value="Volume Discount Agreement">Volume Discount Agreement</option>
                                    <option value="Custom Contract">Custom Contract / SLA</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Contract Start Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="date"
                                            value={contractFormStart}
                                            onChange={(e) => setContractFormStart(e.target.value)}
                                            className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-[#D97706] text-xs font-bold text-gray-800"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Contract Expiry Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="date"
                                            value={contractFormExpiry}
                                            onChange={(e) => setContractFormExpiry(e.target.value)}
                                            className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-[#D97706] text-xs font-bold text-gray-800"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Upload New Contract Document (PDF/DOCX/JPG/PNG)</label>
                                <div 
                                    onClick={() => contractInputRef.current?.click()}
                                    className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${contractFormDocUrl ? 'border-green-500 bg-green-50/80' : contractFormFile ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-gray-50 hover:bg-white hover:border-[#D97706]'}`}
                                >
                                    <input type="file" ref={contractInputRef} onChange={handleContractDocumentUpload} className="hidden" accept=".pdf,.doc,.docx,image/*" />
                                    {contractUploading ? (
                                        <p className="text-xs font-bold text-amber-700 animate-pulse flex items-center gap-1.5">
                                            ☁️ Uploading document to Cloudinary...
                                        </p>
                                    ) : contractFormDocUrl ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="text-green-600 shrink-0" size={20} />
                                            <div className="text-left">
                                                <span className="text-xs font-extrabold text-green-800 block truncate max-w-[240px]">{contractFormFile?.name || "Contract Document"}</span>
                                                <span className="text-[10px] text-green-600 font-bold">Uploaded to Cloudinary ☁️</span>
                                            </div>
                                        </div>
                                    ) : contractFormFile ? (
                                        <div className="flex items-center gap-2">
                                            <FileCheck className="text-amber-600 shrink-0" size={20} />
                                            <span className="text-xs font-bold text-amber-800 truncate max-w-[240px]">{contractFormFile.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <UploadCloud className="text-gray-400" size={18} />
                                            <span className="text-xs font-medium text-gray-600">Click to select new contract file</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Contract Terms / Notes (Optional)</label>
                                <textarea
                                    value={contractFormNotes}
                                    onChange={(e) => setContractFormNotes(e.target.value)}
                                    placeholder="Specify fixed rates, credit period terms, volume targets..."
                                    rows={2}
                                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-[#D97706] text-xs font-medium text-gray-800"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setIsContractModalOpen(false)}
                                className="px-5 py-2.5 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveContract}
                                disabled={savingContract || contractUploading}
                                className="px-6 py-2.5 bg-[#D97706] hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
                            >
                                {savingContract ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" /> Save & Renew Contract
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RaiseGrievanceModal 
                isOpen={isGrievanceModalOpen}
                onClose={() => setIsGrievanceModalOpen(false)}
                customerId={user?.id || (user as any)?._id || "Unknown_Customer"}
                orderId={grievanceOrderId || undefined}
            />

        </PageTransition>
    );
};

export default ProfilePage;