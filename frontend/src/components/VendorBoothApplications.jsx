import React, { useState, useEffect, useMemo } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  ClipboardList,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  MapPin,
  Calendar,
  Users,
  Store,
  Package,
  CreditCard,
  Trash2,
  Eye,
  RefreshCw,
  TrendingUp,
  Activity,
  FileText,
} from "lucide-react";

export default function VendorBoothApplications() {
  const { user } = useAuth();
  const vendorId = user?._id || user?.id;

  const [bookings, setBookings] = useState([]);
  const [loadingBooths, setLoadingBooths] = useState(true);

  const [bazaarsAccepted, setBazaarsAccepted] = useState([]);
  const [bazaarsPendingRejected, setBazaarsPendingRejected] = useState([]);
  const [loadingBazaars, setLoadingBazaars] = useState(true);

  const [selectedTab, setSelectedTab] = useState("all");
  const [payingRowId, setPayingRowId] = useState(null);
  const [cancellingRowId, setCancellingRowId] = useState(null);
  const [confirmingStripeSession, setConfirmingStripeSession] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [removingRowId, setRemovingRowId] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchBookings = async () => {
    if (!vendorId) return;
    try {
      setLoadingBooths(true);
      const response = await api.get(`/events/booth-bookings/vendor/${vendorId}`);
      const list = Array.isArray(response.data.bookings)
        ? response.data.bookings
        : Array.isArray(response.data)
        ? response.data
        : response.data || [];
      setBookings(list);
    } catch (error) {
      console.error("Error fetching booth bookings:", error);
      toast.error("Failed to load booth applications");
      setBookings([]);
    } finally {
      setLoadingBooths(false);
    }
  };

  const fetchBazaars = async () => {
    if (!vendorId) return;
    try {
      setLoadingBazaars(true);

      const acceptedReq = api
        .get(`/bazaars/vendor/${vendorId}/accepted`)
        .catch((e) => {
          console.warn("accepted bazaars fetch failed", e);
          return { data: [] };
        });
      const pendingRejectedReq = api
        .get(`/bazaars/vendor/${vendorId}/pending-rejected`)
        .catch((e) => {
          console.warn("pending/rejected bazaars fetch failed", e);
          return { data: [] };
        });

      const [accRes, prRes] = await Promise.all([acceptedReq, pendingRejectedReq]);

      const normalizeRespArray = (arr) => {
        const list = Array.isArray(arr)
          ? arr
          : Array.isArray(arr?.bazaars)
          ? arr.bazaars
          : [];
        return list.map((item) => {
          if (item && item.bazaar) {
            return item;
          }

          const baz = item || {};
          const vendorReq =
            Array.isArray(baz.vendorRequests) &&
            baz.vendorRequests.find((r) => String(r.vendor) === String(vendorId));

          if (vendorReq) {
            return {
              bazaar: baz,
              attendees: vendorReq.attendees || [],
              status: vendorReq.status || "pending",
              createdAt: vendorReq.appliedAt || vendorReq.createdAt || baz.createdAt,
              boothName: vendorReq.boothName || vendorReq.boothName || "",
              fullData: vendorReq,
            };
          }

          const attendeesFallback = baz.attendees || baz.registrants || [];
          return {
            bazaar: baz,
            attendees: attendeesFallback,
            status: baz.status || "pending",
            createdAt: baz.createdAt,
            boothName: baz.boothName || "",
            fullData: baz,
          };
        });
      };

      const accList = normalizeRespArray(accRes.data);
      const prList = normalizeRespArray(prRes.data);

      setBazaarsAccepted(accList);
      setBazaarsPendingRejected(prList);
    } catch (err) {
      console.error("Failed to fetch bazaars", err);
      toast.error("Failed to load bazaar applications");
      setBazaarsAccepted([]);
      setBazaarsPendingRejected([]);
    } finally {
      setLoadingBazaars(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchBazaars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vendorPayment = params.get("vendorPayment");
    const sessionIdFromQuery = params.get("session_id");

    const cleanupParams = () => {
      params.delete("vendorPayment");
      params.delete("session_id");
      const nextQuery = params.toString();
      const newUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", newUrl);
    };

    const confirmSession = (sessionId, cleanup) => {
      if (!sessionId) return;
      setConfirmingStripeSession(true);
      api
        .post("/payments/vendor-bazaar/confirm", { sessionId })
        .then(() => {
          toast.success("Payment confirmed. Your status will update shortly.");
          fetchBazaars();
          fetchBookings();
        })
        .catch((error) => {
          const message =
            error?.response?.data?.message ||
            "Failed to confirm Stripe payment. Please contact support.";
          toast.error(message);
        })
        .finally(() => {
          setConfirmingStripeSession(false);
          cleanup?.();
          if (localStorage.getItem("vendorPayment:pendingSession") === sessionId) {
            localStorage.removeItem("vendorPayment:pendingSession");
          }
        });
    };

    if (vendorPayment === "cancelled") {
      toast.error("Stripe payment cancelled.");
      cleanupParams();
      localStorage.removeItem("vendorPayment:pendingSession");
      return;
    }

    if (vendorPayment && sessionIdFromQuery) {
      confirmSession(sessionIdFromQuery, cleanupParams);
      return;
    }

    const pendingSession = localStorage.getItem("vendorPayment:pendingSession");
    if (pendingSession) {
      confirmSession(pendingSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (value) => {
    if (value == null || value === "") return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return numeric.toLocaleString("en-EG", {
      style: "currency",
      currency: "EGP",
    });
  };

  const formatDeadline = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const describeTimeRemaining = (value) => {
    if (!value) return "No deadline";
    const target = new Date(value).getTime();
    if (Number.isNaN(target)) return "No deadline";
    const diff = target - now;
    if (diff <= 0) return "Expired";
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const handleStartVendorPayment = async (row) => {
    const context = row?.paymentContext;
    if (!context) {
      toast.error("Unable to determine payment details.");
      return;
    }
    setPayingRowId(row._id);
    try {
      let response;
      if (context.type === "bazaar") {
        response = await api.post(
          `/payments/vendor-bazaar/${context.bazaarId}/${context.vendorId}/session`
        );
      } else if (context.type === "booth") {
        response = await api.post(`/payments/vendor-booth/${context.bookingId}/session`);
      } else {
        throw new Error("Unsupported payment type.");
      }

      const { id: sessionId, url } = response.data || {};
      if (sessionId) {
        localStorage.setItem("vendorPayment:pendingSession", sessionId);
      }
      if (url) {
        window.location.assign(url);
        return;
      }
      if (sessionId) {
        localStorage.removeItem("vendorPayment:pendingSession");
      }
      toast.error("Stripe did not return a checkout URL.");
    } catch (error) {
      localStorage.removeItem("vendorPayment:pendingSession");
      const message =
        error?.response?.data?.message || "Failed to start Stripe checkout session.";
      toast.error(message);
    } finally {
      setPayingRowId(null);
    }
  };

  const handleCancelApplication = async (row) => {
    const context = row?.paymentContext;
    if (!context) {
      toast.error("Unable to determine application context.");
      return;
    }
    setCancellingRowId(row._id);
    try {
      if (context.type === "bazaar") {
        await api.post(`/bazaars/vendors/${vendorId}/bazaars/${context.bazaarId}/cancel`);
        toast.success("Bazaar application cancelled.");
        fetchBazaars();
      } else if (context.type === "booth") {
        await api.post(`/events/booth-booking/${context.bookingId}/cancel`);
        toast.success("Booth application cancelled.");
        fetchBookings();
      } else {
        throw new Error("Unsupported cancellation type.");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to cancel application. Please try again.";
      toast.error(message);
    } finally {
      setCancellingRowId(null);
    }
  };

  const handleRemoveApplication = async (row) => {
    const context = row?.paymentContext;
    if (!context) {
      toast.error("Unable to determine application context.");
      return;
    }
    setRemovingRowId(row._id);
    try {
      if (context.type === "bazaar") {
        await api.delete(`/bazaars/vendors/${vendorId}/bazaars/${context.bazaarId}`);
        toast.success("Bazaar application removed.");
        fetchBazaars();
      } else if (context.type === "booth") {
        await api.delete(`/events/booth-booking/${context.bookingId}`);
        toast.success("Booth application removed.");
        fetchBookings();
      } else {
        throw new Error("Unsupported remove type.");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to remove application. Please try again.";
      toast.error(message);
    } finally {
      setRemovingRowId(null);
    }
  };

  const normalizeBazaarToRow = (item, source = "accepted") => {
    const baz = item?.bazaar || item || {};
    const vendorRequest =
      item?.vendorRequest ||
      (Array.isArray(baz.vendorRequests)
        ? baz.vendorRequests.find((r) => String(r.vendor) === String(vendorId))
        : null);

    const attendees =
      item?.attendees ??
      vendorRequest?.attendees ??
      baz.attendees ??
      baz.registrants ??
      [];

    const status =
      item?.status ||
      vendorRequest?.status ||
      baz.status ||
      (source === "accepted" ? "accepted" : "pending");

    const createdAt =
      item?.createdAt ||
      item?.appliedAt ||
      vendorRequest?.appliedAt ||
      vendorRequest?.createdAt ||
      baz.createdAt ||
      null;

    const boothSize =
      item?.boothSize || vendorRequest?.boothSize || item?.request?.boothSize || "";

    const boothPrice =
      item?.boothPrice ?? vendorRequest?.boothPrice ?? item?.payment?.amount ?? null;

    const paymentDeadline =
      item?.paymentDeadline ||
      vendorRequest?.paymentDeadline ||
      item?.payment?.deadline ||
      null;

    const bazaarId = baz._id || baz.id || item?.bazaarId || item?._id || null;
    const rowId = `${source === "accepted" ? "baz-" : "pr-"}${
      baz._id || baz.id || Math.random().toString(36).slice(2)
    }`;

    return {
      _id: rowId,
      companyName: baz.name || baz.title || "Bazaar",
      booth: {
        location: baz.venue || baz.location || "",
        boothName: item?.boothName || vendorRequest?.boothName || "",
      },
      duration: baz.duration || item?.duration || "",
      startDate: baz.startDate || baz.start || baz.date || item?.startDate || null,
      endDate: baz.endDate || baz.end || item?.endDate || null,
      attendees,
      status,
      createdAt,
      boothSize,
      boothPrice,
      paymentDeadline,
      bazaarId,
      fullData: item,
      _source: source === "accepted" ? "bazaar" : "bazaar-pending-rejected",
      _type: "bazaar",
      paymentContext: {
        type: "bazaar",
        bazaarId,
        vendorId: item?.vendorId || vendorId,
      },
    };
  };

  const bazaarRows = useMemo(() => {
    const allBaz = [
      ...bazaarsAccepted.map((b) => normalizeBazaarToRow(b, "accepted")),
      ...bazaarsPendingRejected.map((b) => normalizeBazaarToRow(b, "pendingRejected")),
    ];

    const isApprovedStatus = (status) => {
      const s = String(status || "").toLowerCase();
      return s === "approved" || s === "accepted";
    };

    if (selectedTab === "approved") {
      return allBaz.filter((r) => isApprovedStatus(r.status));
    }
    if (selectedTab === "pending") {
      return allBaz.filter((r) => String(r.status).toLowerCase() === "pending");
    }
    if (selectedTab === "awaiting") {
      return allBaz.filter((r) => String(r.status).toLowerCase() === "awaiting_payment");
    }
    if (selectedTab === "rejected") {
      return allBaz.filter((r) =>
        ["rejected", "cancelled"].includes(String(r.status || "").toLowerCase())
      );
    }
    return allBaz;
  }, [bazaarsAccepted, bazaarsPendingRejected, selectedTab, vendorId]);

  const filteredBooths = useMemo(() => {
    const normalized = bookings.map((booking) => {
      const boothPrice =
        booking.boothPrice ||
        booking.price ||
        booking.totalCost ||
        booking.payment?.amountDue ||
        null;
      const paymentDeadline =
        booking.paymentDeadline || booking.deadline || booking.payment?.deadline || null;

      return {
        ...booking,
        boothSize:
          booking.boothSize ||
          booking.size ||
          booking.booth?.size ||
          booking.requestedSize ||
          "",
        boothPrice,
        paymentDeadline,
        _source: "booth",
        _type: "booth",
        paymentContext: {
          type: "booth",
          bookingId: booking._id,
        },
      };
    });

    return normalized.filter((booking) => {
      switch (selectedTab) {
        case "approved":
          return (
            String(booking.status).toLowerCase() === "approved" ||
            String(booking.status).toLowerCase() === "accepted"
          );
        case "pending":
          return String(booking.status).toLowerCase() === "pending";
        case "awaiting":
          return String(booking.status).toLowerCase() === "awaiting_payment";
        case "rejected":
          return ["rejected", "cancelled"].includes(
            String(booking.status || "").toLowerCase()
          );
        default:
          return true;
      }
    });
  }, [bookings, selectedTab]);

  const formatDateOnly = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "N/A"
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  const getLocationLabel = (value) => {
    if (!value) return "N/A";
    if (typeof value === "string") return value;
    const parts = [value.location, value.boothName].filter(Boolean);
    return parts.join(" | ") || "N/A";
  };

  const renderStatusBadge = (value = "") => {
    const st = String(value || "unknown").toLowerCase();
    const config = {
      approved: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-400",
        icon: CheckCircle,
      },
      accepted: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-400",
        icon: CheckCircle,
      },
      awaiting_payment: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        text: "text-yellow-400",
        icon: Clock,
      },
      pending: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-400",
        icon: Clock,
      },
      rejected: {
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        text: "text-red-400",
        icon: XCircle,
      },
      cancelled: {
        bg: "bg-gray-500/10",
        border: "border-gray-500/20",
        text: "text-gray-400",
        icon: XCircle,
      },
    };

    const statusConfig = config[st] || {
      bg: "bg-gray-500/10",
      border: "border-gray-500/20",
      text: "text-gray-400",
      icon: AlertCircle,
    };

    const Icon = statusConfig.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}
      >
        <Icon className="h-3 w-3" />
        {String(value || "Unknown")}
      </span>
    );
  };

  const renderDetailsModal = () => {
    if (!detailsRow) return null;
    const row = detailsRow;

    const status = String(row.status || "").toLowerCase();
    const awaiting = status === "awaiting_payment";
    const canCancel = ["pending", "awaiting_payment"].includes(status);
    const canRemove = ["cancelled", "rejected"].includes(status);

    const isPaying = awaiting && payingRowId === row._id;
    const isCancelling = canCancel && cancellingRowId === row._id;
    const isRemoving = canRemove && removingRowId === row._id;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setDetailsRow(null)}
        />
        <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
          {/* Modal Header */}
          <div className="border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  {row._type === "bazaar" ? (
                    <Store className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Package className="h-5 w-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {row._type === "bazaar" ? "Bazaar Application" : "Booth Application"}
                  </p>
                  <h3 className="text-xl font-bold text-white">{row.companyName}</h3>
                </div>
              </div>
              <button
                onClick={() => setDetailsRow(null)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-200 capitalize">
                  {getLocationLabel(row.booth)}
                </span>
              </div>
              {renderStatusBadge(row.status)}
            </div>

            {/* Application Details Card */}
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Package className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                      Booth Size
                    </p>
                    <p className="text-sm text-gray-200">{row.boothSize || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Price</p>
                    <p className="text-sm font-semibold text-emerald-400">
                      {formatCurrency(row.boothPrice) || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Calendar className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                      Start Date
                    </p>
                    <p className="text-sm text-gray-200">{formatDateOnly(row.startDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                      End Date
                    </p>
                    <p className="text-sm text-gray-200">{formatDateOnly(row.endDate)}</p>
                  </div>
                </div>

                {row.paymentDeadline && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Payment Deadline
                      </p>
                      <p className="text-sm text-gray-200">
                        {formatDeadline(row.paymentDeadline)}
                      </p>
                      <p className="text-xs text-amber-400 mt-1">
                        {describeTimeRemaining(row.paymentDeadline)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attendees Section */}
            {Array.isArray(row.attendees) && row.attendees.length > 0 && (
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Users className="h-4 w-4 text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-white">
                    Attendees ({row.attendees.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {row.attendees.map((att, idx) => (
                    <div
                      key={`${att.email}-${idx}`}
                      className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">{att.name || "—"}</p>
                        <p className="text-xs text-gray-400">{att.email || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Status Message */}
            {awaiting && (
              <div className="rounded-xl bg-yellow-900/20 border border-yellow-800/30 px-4 py-3 flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300 mb-1">
                    Payment Required
                  </p>
                  <p className="text-sm text-yellow-200">
                    Complete payment before{" "}
                    <span className="font-semibold">
                      {formatDeadline(row.paymentDeadline)}
                    </span>{" "}
                    to secure your booth space.
                  </p>
                </div>
              </div>
            )}

            {canCancel && !awaiting && (
              <div className="rounded-xl bg-blue-900/20 border border-blue-800/30 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-1">
                    Awaiting Review
                  </p>
                  <p className="text-sm text-blue-200">
                    Your application is being reviewed by the event office. You can cancel
                    this application anytime before approval.
                  </p>
                </div>
              </div>
            )}

            {canRemove && (
              <div className="rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">
                    Application {status === "cancelled" ? "Cancelled" : "Rejected"}
                  </p>
                  <p className="text-sm text-red-200">
                    This application is no longer active. You can remove it from your list.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          {(awaiting || canCancel || canRemove) && (
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => setDetailsRow(null)}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Close
              </button>
              {awaiting && (
                <button
                  onClick={() => handleStartVendorPayment(row)}
                  disabled={isPaying}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isPaying
                      ? "bg-gray-600"
                      : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  {isPaying ? "Redirecting..." : "Pay Now"}
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => handleCancelApplication(row)}
                  disabled={isCancelling}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCancelling
                      ? "bg-gray-600"
                      : "bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105"
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  {isCancelling ? "Cancelling..." : "Cancel Application"}
                </button>
              )}
              {canRemove && (
                <button
                  onClick={() => handleRemoveApplication(row)}
                  disabled={isRemoving}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRemoving
                      ? "bg-gray-600"
                      : "bg-gradient-to-r from-gray-700 to-gray-600 shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 hover:scale-105"
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  {isRemoving ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderApplicationCards = (rows, title, emptyMessage, kind) => (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
      <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            {kind === "bazaar" ? (
              <Store className="h-5 w-5 text-blue-400" />
            ) : (
              <Package className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400">
              {rows.length} application{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 mx-auto mb-4">
              {kind === "bazaar" ? (
                <Store className="h-7 w-7 text-gray-600" />
              ) : (
                <Package className="h-7 w-7 text-gray-600" />
              )}
            </div>
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row._id}
                className="group rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 p-5 transition-all duration-200"
              >
                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                        {row._type === "bazaar" ? (
                          <Store className="h-5 w-5 text-blue-400" />
                        ) : (
                          <Package className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                          {row._type === "bazaar"
                            ? "Bazaar Application"
                            : "Booth Application"}
                        </p>
                        <h4 className="text-lg font-semibold text-white mb-1 truncate">
                          {row.companyName}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span className="capitalize">{getLocationLabel(row.booth)}</span>
                        </div>
                      </div>
                    </div>
                    {renderStatusBadge(row.status)}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Size</p>
                      <p className="text-sm text-white font-medium">
                        {row.boothSize || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Price</p>
                      <p className="text-sm text-emerald-400 font-semibold">
                        {formatCurrency(row.boothPrice) || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Start</p>
                      <p className="text-sm text-white">{formatDateOnly(row.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Attendees</p>
                      <p className="text-sm text-white">{row.attendees?.length || 0}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-800">
                    {String(row.status || "").toLowerCase() === "awaiting_payment" && (
                      <button
                        onClick={() => handleStartVendorPayment(row)}
                        disabled={payingRowId === row._id}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                          payingRowId === row._id
                            ? "bg-gray-600 cursor-not-allowed text-gray-300"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        {payingRowId === row._id ? "Redirecting..." : "Pay Now"}
                      </button>
                    )}

                    {["pending", "awaiting_payment"].includes(
                      String(row.status || "").toLowerCase()
                    ) && (
                      <button
                        onClick={() => handleCancelApplication(row)}
                        disabled={cancellingRowId === row._id}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                          cancellingRowId === row._id
                            ? "bg-gray-700 cursor-not-allowed text-gray-300"
                            : "bg-red-600 hover:bg-red-500 text-white"
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        {cancellingRowId === row._id ? "Cancelling..." : "Cancel"}
                      </button>
                    )}

                    <button
                      onClick={() => setDetailsRow(row)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:border-blue-400 hover:text-white transition-all duration-200"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const counts = useMemo(() => {
    const normStatus = (value) => String(value || "").toLowerCase();

    const boothCounts = {
      all: bookings.length,
      approved: bookings.filter((b) => {
        const s = normStatus(b.status);
        return s === "approved" || s === "accepted";
      }).length,
      pending: bookings.filter((b) => normStatus(b.status) === "pending").length,
      awaiting: bookings.filter((b) => normStatus(b.status) === "awaiting_payment").length,
      rejected: bookings.filter((b) =>
        ["rejected", "cancelled"].includes(normStatus(b.status))
      ).length,
    };

    const bazAll = [...bazaarsAccepted, ...bazaarsPendingRejected];
    const bazCounts = {
      all: bazAll.length,
      approved: bazAll.filter((b) => {
        const s = normStatus(b.status);
        return s === "approved" || s === "accepted";
      }).length,
      pending: bazAll.filter((b) => normStatus(b.status) === "pending").length,
      awaiting: bazAll.filter((b) => normStatus(b.status) === "awaiting_payment").length,
      rejected: bazAll.filter((b) =>
        ["rejected", "cancelled"].includes(normStatus(b.status))
      ).length,
    };

    return {
      all: boothCounts.all + bazCounts.all,
      approved: boothCounts.approved + bazCounts.approved,
      awaiting: boothCounts.awaiting + bazCounts.awaiting,
      pending: boothCounts.pending + bazCounts.pending,
      rejected: boothCounts.rejected + bazCounts.rejected,
    };
  }, [bookings, bazaarsAccepted, bazaarsPendingRejected]);

  const filterButtons = ["all", "approved", "awaiting", "pending", "rejected"];
  const filterLabels = {
    all: "All",
    approved: "Approved",
    awaiting: "Awaiting Payment",
    pending: "Pending",
    rejected: "Rejected",
  };

  const anyLoading = loadingBooths || loadingBazaars;

  const refreshAll = () => {
    fetchBookings();
    fetchBazaars();
  };

  return (
    <>
      <div className="p-6 text-white">
        {/* Enhanced Header Section */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <ClipboardList className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    My Applications
                  </h2>
                  <p className="text-xs font-medium text-gray-400 ml-1">Vendor Portal</p>
                </div>
              </div>
              <p className="text-base text-gray-400 ml-15">
                Track booth and bazaar applications, manage payments, and view all submissions.
              </p>
            </div>
            <button
              onClick={refreshAll}
              disabled={anyLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${anyLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-7 w-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total</p>
                <p className="text-3xl font-bold text-white mb-1">{counts.all}</p>
                <p className="text-sm text-gray-400">Applications</p>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-7 w-7 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Approved</p>
                <p className="text-3xl font-bold text-white mb-1">{counts.approved}</p>
                <p className="text-sm text-gray-400">Active bookings</p>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-7 w-7 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Awaiting Payment
                </p>
                <p className="text-3xl font-bold text-white mb-1">{counts.awaiting}</p>
                <p className="text-sm text-gray-400">Payment required</p>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-7 w-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Pending</p>
                <p className="text-3xl font-bold text-white mb-1">{counts.pending}</p>
                <p className="text-sm text-gray-400">Under review</p>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 group-hover:scale-110 transition-transform duration-300">
                <XCircle className="h-7 w-7 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Rejected</p>
                <p className="text-3xl font-bold text-white mb-1">{counts.rejected}</p>
                <p className="text-sm text-gray-400">Not approved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Section */}
        <div className="mb-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filter Applications</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filterButtons.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedTab(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    selectedTab === key
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {filterLabels[key]} ({counts[key] ?? 0})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Confirmation Message */}
        {confirmingStripeSession && (
          <div className="mb-6 rounded-xl bg-yellow-900/20 border border-yellow-800/30 px-4 py-3 flex items-start gap-3">
            <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="text-sm font-semibold text-yellow-300">Validating Payment</p>
              <p className="text-sm text-yellow-200">
                Please wait while we confirm your recent Stripe payment...
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {anyLoading ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"></div>
              <p className="text-gray-400 font-medium">Loading applications...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {renderApplicationCards(
              bazaarRows,
              "Bazaar Applications",
              "No bazaar applications for the selected filter.",
              "bazaar"
            )}
            {renderApplicationCards(
              filteredBooths,
              "Booth Applications",
              "No booth applications for the selected filter.",
              "booth"
            )}
          </div>
        )}
      </div>

      {renderDetailsModal()}
    </>
  );
}
