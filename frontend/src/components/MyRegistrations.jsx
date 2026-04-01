import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import ChatModal from "./ChatModal";
import {
  Calendar,
  CalendarRange,
  MapPin,
  Users,
  CreditCard,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  Ticket,
  TrendingUp,
  Percent,
  X,
  MessageCircle,
} from "lucide-react";

const PAYMENT_SESSION_KEY = "registrationPayment:pendingSession";
const CANCELLATION_WINDOW_DAYS = 14;

const toTitleCase = (value = "") =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const formatCurrency = (value) => {
  if (value == null) return "Free";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Free";
  return numeric.toLocaleString("en-EG", {
    style: "currency",
    currency: "EGP",
  });
};

const formatPaymentStatus = (status = "pending") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "paid")
    return {
      label: "Paid",
      icon: CheckCircle,
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      textColor: "text-green-400",
    };
  if (normalized === "cancelled_refunded")
    return {
      label: "Refunded",
      icon: XCircle,
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/20",
      textColor: "text-gray-400",
    };
  return {
    label: "Pending Payment",
    icon: Clock,
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    textColor: "text-yellow-400",
  };
};

const canCancelRegistration = (registration) => {
  if (!registration?.startDate) return false;
  if (registration?.payment?.status !== "paid") return false;
  const eventDate = new Date(registration.startDate);
  return (
    eventDate - Date.now() >= CANCELLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
};

const canPayForRegistration = (registration) => {
  const status = registration?.payment?.status;
  const amountDue =
    registration?.payment?.amountDue ?? registration.amountDue ?? 0;
  return status !== "paid" && amountDue > 0;
};

export default function MyRegistrations() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [loadingCardSession, setLoadingCardSession] = useState(false);
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const [confirmingStripeSession, setConfirmingStripeSession] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantsEvent, setParticipantsEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState("");
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatUserId, setChatUserId] = useState(null);
  const [chatUserName, setChatUserName] = useState("");
  const currentUserId = useMemo(
    () => String(user?._id || user?.id || user?.userId || ""),
    [user]
  );
  const [ownedCoupons, setOwnedCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [payableAmount, setPayableAmount] = useState(null);

  const fetchMyRegistrations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/my-registrations");

      const mapped = (res.data.registrations || []).map((registration) => {
        const payment = registration.payment || {};
        const amountDue =
          payment.amountDue ??
          (registration.eventType === "Trip"
            ? registration.price
            : registration.priceToAttend);
        return {
          ...registration,
          amountDue: Number(amountDue) || 0,
          payment,
        };
      });

      setRegistrations(mapped);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load your registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      localStorage.removeItem(`uniId:${user.id}`);
      fetchMyRegistrations();
    }
  }, [user?.id]);

  useEffect(() => {
    const pendingSession = localStorage.getItem(PAYMENT_SESSION_KEY);
    if (!pendingSession || !user?.id) return;

    setConfirmingStripeSession(true);
    api
      .post("/payments/registrations/confirm", { sessionId: pendingSession })
      .then(() => {
        toast.success("Payment confirmed successfully.");
        localStorage.removeItem(PAYMENT_SESSION_KEY);
        fetchMyRegistrations();
      })
      .catch((error) => {
        const message =
          error?.response?.data?.message ||
          "Unable to confirm Stripe payment. Please contact support.";
        toast.error(message);
      })
      .finally(() => {
        setConfirmingStripeSession(false);
      });
  }, [user?.id]);

  const openPayModal = (registration) => {
    setSelectedRegistration(registration);
    setOwnedCoupons([]);
    setCouponCode("");
    setCouponError("");
    setAppliedCoupon(null);
    setPayableAmount(registration?.amountDue ?? 0);
    loadOwnedCoupons(registration?.eventType);
    setShowPayModal(true);
  };

  const closePayModal = () => {
    setSelectedRegistration(null);
    setShowPayModal(false);
    setLoadingCardSession(false);
    setPayingWithWallet(false);
    setCouponCode("");
    setCouponError("");
    setAppliedCoupon(null);
    setPayableAmount(null);
  };

  const loadOwnedCoupons = async (eventType) => {
    if (!eventType) return;
    try {
      const normalized = String(eventType || "").toLowerCase();
      const res = await api.get("/coupons/my");
      const filtered = (res.data || [])
        .filter((c) => c && c.code && !c.deleted)
        .filter(
          (c) =>
            !c.used &&
            (!c.applicableEventType ||
              c.applicableEventType.toLowerCase() === normalized)
        );
      setOwnedCoupons(filtered);
    } catch (err) {
      // coupons are optional; ignore errors
    }
  };

  const computeDiscount = (coupon, amount) => {
    const numericAmount = Number(amount) || 0;
    if (coupon.discountType === "percentage") {
      const pct = Math.max(
        0,
        Math.min(100, Number(coupon.value) || Number(coupon.discountValue) || 0)
      );
      return (numericAmount * pct) / 100;
    }
    return Math.max(
      0,
      Number(coupon.value) || Number(coupon.discountValue) || 0
    );
  };

  const isCouponValidForAmount = (coupon, amount) => {
    const now = new Date();
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) return false;
    if (coupon.minAmount && amount < coupon.minAmount) return false;
    if (coupon.isActive === false) return false;
    return true;
  };

  const handleApplyCoupon = () => {
    if (!selectedRegistration) return;
    setApplyingCoupon(true);
    setCouponError("");
    const code = String(couponCode || "")
      .trim()
      .toUpperCase();
    const baseAmount = selectedRegistration.amountDue || 0;
    const match = ownedCoupons.find(
      (c) => String(c.code).toUpperCase() === code
    );
    if (!code || !match) {
      setCouponError("Coupon not found or inactive.");
      setApplyingCoupon(false);
      return;
    }
    if (!isCouponValidForAmount(match, baseAmount)) {
      setCouponError("Coupon is not valid for this amount or date.");
      setApplyingCoupon(false);
      return;
    }

    const discount = computeDiscount(match, baseAmount);
    const finalAmount = Math.max(0, baseAmount - discount);
    setAppliedCoupon({
      code: match.code,
      couponId: match.couponId || match._id,
      discount,
      discountType: match.discountType,
    });
    setPayableAmount(finalAmount);
    setApplyingCoupon(false);
    toast.success(`Coupon ${match.code} applied.`);
  };

  const handleClearCoupon = () => {
    if (!selectedRegistration) return;
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    setPayableAmount(selectedRegistration.amountDue || 0);
  };

  const startCardPayment = async () => {
    if (!selectedRegistration) return;
    try {
      setLoadingCardSession(true);
      const eventType = selectedRegistration.eventType.toLowerCase();
      const response = await api.post(
        `/payments/registrations/${eventType}/${selectedRegistration._id}/session`,
        appliedCoupon
          ? { couponId: appliedCoupon.couponId || appliedCoupon._id }
          : {}
      );
      const { id: sessionId, url } = response.data || {};
      if (!sessionId || !url) {
        toast.error("Stripe did not return a checkout URL.");
        return;
      }
      localStorage.setItem(PAYMENT_SESSION_KEY, sessionId);
      window.location.assign(url);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Failed to start Stripe checkout session.";
      toast.error(message);
    } finally {
      setLoadingCardSession(false);
    }
  };

  const payUsingWallet = async () => {
    if (!selectedRegistration) return;
    try {
      setPayingWithWallet(true);
      const eventType = selectedRegistration.eventType.toLowerCase();
      await api.post(
        `/payments/registrations/${eventType}/${selectedRegistration._id}/pay-with-wallet`,
        appliedCoupon
          ? { couponId: appliedCoupon.couponId || appliedCoupon._id }
          : {}
      );
      toast.success("Registration paid using wallet.");
      closePayModal();
      fetchMyRegistrations();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Failed to deduct from wallet. Please try again.";
      toast.error(message);
    } finally {
      setPayingWithWallet(false);
    }
  };

  const openCancelModal = (registration) => {
    setCancelTarget(registration);
    setCancelError("");
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelTarget(null);
    setCancelError("");
  };

  const handleCancelRegistration = async () => {
    if (!cancelTarget) return;
    try {
      setCancelLoading(true);
      const eventType = cancelTarget.eventType.toLowerCase();
      await api.post(`/events/${eventType}/${cancelTarget._id}/cancel`);
      toast.success("Registration cancelled and refunded to your wallet.");
      closeCancelModal();
      fetchMyRegistrations();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Failed to cancel registration. Please try again.";
      setCancelError(message);
    } finally {
      setCancelLoading(false);
    }
  };

  const openParticipantsModal = async (registration) => {
    if (!registration?._id) return;
    setParticipantsEvent(registration);
    setParticipants([]);
    setParticipantsError("");
    setShowParticipantsModal(true);
    setParticipantsLoading(true);
    try {
      const eventType = registration.eventType.toLowerCase();
      const res = await api.get(
        `/events/${eventType}s/${registration._id}/participants`
      );
      setParticipants(res.data?.participants || []);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        `Could not load ${registration.eventType.toLowerCase()} participants. Please try again.`;
      setParticipantsError(message);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const closeParticipantsModal = () => {
    setShowParticipantsModal(false);
    setParticipantsEvent(null);
    setParticipants([]);
    setParticipantsError("");
    setParticipantsLoading(false);
  };

  const groupedRegistrations = useMemo(() => {
    return registrations.reduce((acc, reg) => {
      const key = reg.eventType || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(reg);
      return acc;
    }, {});
  }, [registrations]);

  const stats = useMemo(() => {
    const totalUpcoming = registrations.filter(
      (registration) =>
        registration.startDate && new Date(registration.startDate) > new Date()
    ).length;
    const totalPaid = registrations.filter(
      (registration) => registration.payment?.status === "paid"
    ).length;
    const totalPending = registrations.filter(
      (registration) =>
        registration.payment?.status !== "paid" && registration.amountDue > 0
    ).length;

    return {
      total: registrations.length,
      upcoming: totalUpcoming,
      paid: totalPaid,
      pending: totalPending,
      workshops: groupedRegistrations.Workshop?.length || 0,
      trips: groupedRegistrations.Trip?.length || 0,
    };
  }, [registrations, groupedRegistrations]);

  const renderRegistrationCard = (registration) => {
    const statusMeta = formatPaymentStatus(registration.payment?.status);
    const StatusIcon = statusMeta.icon;
    const amountDue = registration.amountDue;
    const amountPaid = registration.payment?.amountPaid ?? 0;
    const canPay = canPayForRegistration(registration);
    const canCancel = canCancelRegistration(registration);
    const hasActions =
      canPay ||
      canCancel ||
      registration.eventType === "Trip" ||
      registration.eventType === "Workshop";

    return (
      <article
        key={`${registration.eventType}-${registration._id}`}
        className="group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
      >
        {/* Card Header */}
        <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                  <Ticket className="h-3 w-3" />
                  {registration.eventType}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.bgColor} ${statusMeta.textColor} border ${statusMeta.borderColor}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusMeta.label}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">
                {registration.name}
              </h3>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Registered on{" "}
                {registration.registeredAt
                  ? new Date(registration.registeredAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                  : "—"}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Amount {canPay ? "Due" : "Paid"}
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {canPay
                  ? formatCurrency(amountDue)
                  : formatCurrency(amountPaid)}
              </p>
              {!canPay && amountPaid > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Paid on{" "}
                  {registration.payment?.paidAt
                    ? new Date(registration.payment.paidAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )
                    : "-"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Schedule
                </p>
                <p className="text-sm text-gray-300 font-medium">
                  {registration.startDate
                    ? new Date(registration.startDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )
                    : "TBD"}
                </p>
                {registration.startTime && (
                  <p className="text-xs text-gray-400">
                    {registration.startTime}
                  </p>
                )}
                {registration.endDate && (
                  <p className="text-xs text-gray-400">
                    Ends{" "}
                    {new Date(registration.endDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 flex-shrink-0">
                <MapPin className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Location
                </p>
                <p className="text-sm text-gray-300 font-medium">
                  {registration.location || "TBD"}
                </p>
                {registration.eventType === "Workshop" &&
                  registration.professors && (
                    <p className="text-xs text-gray-400 mt-1">
                      {registration.professors.join(", ")}
                    </p>
                  )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 flex-shrink-0">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Capacity
                </p>
                <p className="text-sm text-gray-300 font-medium">
                  {registration.capacity
                    ? `${registration.capacity} spots`
                    : "Not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {hasActions && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700/50">
              {(registration.eventType === "Trip" ||
                registration.eventType === "Workshop") && (
                <button
                  onClick={() => openParticipantsModal(registration)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/70 px-5 py-2.5 font-semibold text-white hover:border-yellow-400 hover:text-yellow-200 transition-all duration-200"
                >
                  <Users className="h-4 w-4" />
                  View Participants
                </button>
              )}
              {canPay && (
                <button
                  onClick={() => openPayModal(registration)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => openCancelModal(registration)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 font-semibold text-white transition-all duration-200"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel & Refund
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Ticket className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                My Registrations
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              {confirmingStripeSession
                ? "Checking recent Stripe payment..."
                : "View and manage all your event registrations and payments."}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">
              Loading your registrations...
            </p>
          </div>
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Ticket className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Registrations Yet
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                You haven't registered for any events yet. Browse available
                events and secure your spot!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Registration Cards by Type */}
          {Object.entries(groupedRegistrations).map(([type, items]) => (
            <div key={type} className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                <h3 className="text-2xl font-bold text-yellow-400 capitalize">
                  {toTitleCase(type)}s
                </h3>
                <span className="text-sm font-normal text-gray-400">
                  ({items.length}{" "}
                  {items.length === 1 ? "registration" : "registrations"})
                </span>
              </div>
              <div className="grid gap-6">
                {items.map((registration) =>
                  renderRegistrationCard(registration)
                )}
              </div>
            </div>
          ))}

          {/* Summary Section */}
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
              <h4 className="text-xl font-bold text-yellow-400">
                Registration Summary
              </h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                  Total
                </p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                  Workshops
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.workshops}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                  Trips
                </p>
                <p className="text-2xl font-bold text-white">{stats.trips}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                  Upcoming
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.upcoming}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {showParticipantsModal && participantsEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="border-b border-gray-700 px-6 py-4 flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Users className="h-6 w-6 text-purple-300" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-purple-300 mb-1">
                  {participantsEvent.eventType} Participants
                </p>
                <h3 className="text-xl font-bold text-white leading-snug">
                  {participantsEvent.name}
                </h3>
                <p className="text-sm text-gray-400">
                  Registered students{" "}
                  {participantsEvent.eventType === "Trip"
                    ? "travelling with you"
                    : "attending with you"}
                  .
                </p>
              </div>
              <button
                onClick={closeParticipantsModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 max-h-[420px] overflow-y-auto space-y-4">
              {participantsLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-gray-700 border-t-purple-400 animate-spin"></div>
                    <p className="text-sm text-gray-400">
                      Loading participants...
                    </p>
                  </div>
                </div>
              )}

              {!participantsLoading && participantsError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {participantsError}
                </div>
              )}

              {!participantsLoading &&
                !participantsError &&
                participants.length === 0 && (
                  <div className="rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-5 text-center text-sm text-gray-300">
                    No other participants are registered yet.
                  </div>
                )}

              {!participantsLoading &&
                !participantsError &&
                participants.length > 0 && (
                  <div className="space-y-3">
                    {participants.map((person) => {
                      const participantId = String(
                        person.id || person._id || person.userId || ""
                      );
                      const isCurrentUser =
                        currentUserId && participantId === currentUserId;
                      const canChatWithParticipant =
                        Boolean(participantId) && !isCurrentUser;

                      return (
                        <div
                          key={
                            person.id ||
                            person._id ||
                            person.userId ||
                            person.email ||
                            person.name
                          }
                          className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30 text-sm font-semibold text-purple-100">
                              {(person.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {person.name || "Participant"}
                              </p>
                              <p className="text-xs text-gray-400">
                                {person.role || "Student"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {canChatWithParticipant && (
                              <button
                                onClick={() => {
                                  setChatUserId(participantId);
                                  setChatUserName(person.name || "Participant");
                                  setShowChatModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-200"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Chat
                              </button>
                            )}
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {person.registeredAt
                                ? new Date(
                                    person.registeredAt
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Joined"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>

            <div className="border-t border-gray-700 px-6 py-4 bg-gray-900/70 flex justify-end">
              <button
                onClick={closeParticipantsModal}
                className="rounded-lg border border-gray-600 px-5 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Payment Modal */}
      {showPayModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Payment Options
                </h3>
              </div>
              <button
                onClick={closePayModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-blue-300" />
                  <p className="text-sm text-gray-300 font-semibold">
                    {selectedRegistration.name}
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {formatCurrency(
                      payableAmount ?? selectedRegistration.amountDue
                    )}
                  </span>
                  {appliedCoupon && (
                    <span className="text-sm text-emerald-300">
                      (saved {formatCurrency(appliedCoupon.discount)})
                    </span>
                  )}
                </div>
                {appliedCoupon ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <Percent className="h-3 w-3" /> Coupon {appliedCoupon.code}{" "}
                    applied.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Base fee: {formatCurrency(selectedRegistration.amountDue)}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-gray-800/40 border border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-200 font-semibold flex items-center gap-2">
                    <Percent className="h-4 w-4 text-amber-300" />
                    Coupons & discounts
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={
                      appliedCoupon ? handleClearCoupon : handleApplyCoupon
                    }
                    disabled={applyingCoupon || (!couponCode && !appliedCoupon)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      appliedCoupon
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    } disabled:opacity-50`}
                  >
                    {appliedCoupon
                      ? "Clear"
                      : applyingCoupon
                      ? "Applying..."
                      : "Apply"}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-400">{couponError}</p>
                )}
                {ownedCoupons?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">My coupons</p>
                    <div className="flex flex-wrap gap-2">
                      {ownedCoupons.slice(0, 3).map((c) => (
                        <button
                          key={c.code}
                          onClick={() => {
                            setCouponCode(c.code);
                            setCouponError("");
                          }}
                          className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:border-blue-500 hover:text-white transition"
                        >
                          {c.code} ·{" "}
                          {c.discountType === "percentage"
                            ? `${c.value}%`
                            : `${c.value} EGP`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-400">
                Choose your preferred payment method to complete your
                registration.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={startCardPayment}
                  disabled={loadingCardSession}
                  className="group relative rounded-xl border-2 border-blue-600 bg-blue-600/10 p-5 text-left hover:bg-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
                      <CreditCard className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-300">
                        Credit Card
                      </p>
                      <p className="text-xs text-gray-400">Via Stripe</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {loadingCardSession
                      ? "Opening Stripe checkout..."
                      : "Secure payment processing"}
                  </p>
                </button>

                <button
                  onClick={payUsingWallet}
                  disabled={payingWithWallet}
                  className="group relative rounded-xl border-2 border-yellow-500 bg-yellow-500/10 p-5 text-left hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                      <Wallet className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-300">
                        Wallet
                      </p>
                      <p className="text-xs text-gray-400">Instant payment</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {payingWithWallet
                      ? "Processing payment..."
                      : "Pay from your balance"}
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="border-b border-gray-700 px-6 py-4 flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-red-300 mb-1">
                  Cancel Registration
                </p>
                <h3 className="text-xl font-bold text-white leading-snug">
                  {cancelTarget.name || cancelTarget.eventName || "Event"}
                </h3>
                <p className="text-sm text-gray-400">
                  {cancelTarget.eventType || "Registration"}
                </p>
              </div>
              <button
                onClick={closeCancelModal}
                disabled={cancelLoading}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300">
                You're about to cancel your spot. Once confirmed, the paid
                amount will be refunded to your wallet automatically.
              </p>

              {cancelTarget.startDate && (
                <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-4 flex items-center gap-3">
                  <CalendarRange className="h-5 w-5 text-yellow-300 flex-shrink-0" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                      Event schedule
                    </p>
                    <p className="text-sm text-gray-200 font-medium">
                      {(() => {
                        const date = new Date(cancelTarget.startDate);
                        const dateStr = date.toLocaleDateString("en-EG", {
                          timeZone: "Africa/Cairo",
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        const timeStr = date.toLocaleTimeString("en-US", {
                          timeZone: "Africa/Cairo",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        });
                        return `${dateStr}, ${timeStr}`;
                      })()}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-gray-800/50 border border-gray-700 px-4 py-3 text-sm text-gray-300 flex items-center gap-3">
                <Wallet className="h-5 w-5 text-emerald-300" />
                Refunds are returned to your wallet balance immediately after
                cancellation.
              </div>

              {cancelError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {cancelError}
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 px-6 py-4 flex justify-end gap-3 bg-gray-900/70">
              <button
                onClick={closeCancelModal}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-600 px-5 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition disabled:opacity-50"
              >
                Keep Registration
              </button>
              <button
                onClick={handleCancelRegistration}
                disabled={cancelLoading}
                className="rounded-lg bg-red-600 hover:bg-red-500 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {cancelLoading ? "Processing..." : "Cancel & Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setChatUserId(null);
          setChatUserName("");
        }}
        otherUserId={chatUserId}
        otherUserName={chatUserName}
      />
    </div>
  );
}
