import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import { useAuth } from "../context/AuthContext";
import API from "../utils/axiosInstance";
import {
  UploadCloud,
  ChevronDown,
  Award,
  TrendingUp,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Percent,
  Tag,
  Calendar,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
} from "lucide-react";

const ACTIVE_STATUSES = new Set([
  "pending",
  "submitted",
  "approved",
  "accepted",
]);

export default function VendorLoyaltyApplications() {
  const { user } = useAuth();
  const vendorId = user?._id || user?.id;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPastApplications, setShowPastApplications] = useState(false);

  const [formData, setFormData] = useState({
    discountRate: "",
    promoCode: "",
    termsFile: null,
  });

  const [message, setMessage] = useState({ type: "", text: "" });
  const [cancelModal, setCancelModal] = useState({
    open: false,
    application: null,
    submitting: false,
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    application: null,
    submitting: false,
  });

  // Fetch loyalty applications
  const fetchApplications = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const response = await API.get(`/loyalty/vendor/${vendorId}`);
      setApplications(response.data);
    } catch (error) {
      console.error("Error fetching loyalty applications:", error);
      toast.error("Failed to load loyalty applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [vendorId]);

  const handleViewTerms = async (application) => {
    if (!application?._id) return;
    try {
      const res = await API.get(`/loyalty/${application._id}/terms`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const win = window.open();
      if (win) {
        win.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Error opening terms file:", error);
      toast.error("Unable to open terms document.");
    }
  };

  const openDeleteModal = (application) => {
    if (!application?._id) return;
    setDeleteModal({ open: true, application, submitting: false });
  };

  const closeDeleteModal = () =>
    setDeleteModal({ open: false, application: null, submitting: false });

  const confirmDeleteApplication = async () => {
    const target = deleteModal.application;
    if (!target?._id) return;
    try {
      setDeleteModal((prev) => ({ ...prev, submitting: true }));
      await API.delete(`/loyalty/${target._id}`);
      toast.success("Application removed successfully");
      closeDeleteModal();
      fetchApplications();
    } catch (error) {
      console.error("Error deleting application:", error);
      toast.error("Failed to remove application. Please try again.");
      setDeleteModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const sortedApplications = useMemo(
    () =>
      [...applications].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      ),
    [applications]
  );

  const activeApplication = useMemo(() => {
    return sortedApplications.find((app) =>
      ACTIVE_STATUSES.has(String(app.status || "").toLowerCase())
    );
  }, [sortedApplications]);

  const pastApplications = useMemo(() => {
    return sortedApplications.filter((app) => {
      const status = String(app.status || "").toLowerCase();
      if (activeApplication && app._id === activeApplication._id) {
        return false;
      }
      return !ACTIVE_STATUSES.has(status);
    });
  }, [sortedApplications, activeApplication]);

  const hasActiveApplication = Boolean(activeApplication);
  const activeStatusLabel = hasActiveApplication
    ? String(activeApplication.status || "Pending").toUpperCase()
    : "NONE";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (hasActiveApplication) {
      toast.error(
        "You cannot submit a new application while you have an active one."
      );
      return;
    }

    if (!formData.termsFile) {
      toast.error("Please upload your Terms & Conditions document.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("vendorId", vendorId);
      fd.append("discountRate", Number(formData.discountRate));
      fd.append("promoCode", formData.promoCode || "");
      fd.append("termsFile", formData.termsFile);

      await API.post(`/loyalty/apply`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Application submitted successfully!");
      setFormData({ discountRate: "", promoCode: "", termsFile: null });
      fetchApplications();
    } catch (error) {
      console.error("Error submitting loyalty application:", error);
      const msg =
        error.response?.data?.message || "Failed to submit application.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openCancelModal = (application) => {
    if (!application?._id) return;
    setCancelModal({ open: true, application, submitting: false });
  };

  const closeCancelModal = () =>
    setCancelModal({ open: false, application: null, submitting: false });

  const confirmCancelApplication = async () => {
    const target = cancelModal.application;
    if (!target?._id) return;
    try {
      setCancelModal((prev) => ({ ...prev, submitting: true }));
      await API.patch(`/loyalty/cancel/${target._id}`);
      toast.success("Application cancelled successfully");
      closeCancelModal();
      fetchApplications();
    } catch (error) {
      console.error("Error canceling application:", error);
      toast.error("Failed to cancel application. Please try again.");
      setCancelModal((prev) => ({ ...prev, submitting: false }));
    }
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
      pending: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-400",
        icon: Clock,
      },
      submitted: {
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
      canceled: {
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

  const baseColumns = [
    {
      key: "discountRate",
      label: "Discount Rate",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Percent className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-white font-semibold">{v || "N/A"}%</span>
        </div>
      ),
    },
    {
      key: "promoCode",
      label: "Promo Code",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Tag className="h-4 w-4 text-purple-400" />
          </div>
          <span className="text-white font-medium">{v || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => renderStatusBadge(v),
    },
    {
      key: "createdAt",
      label: "Applied On",
      render: (v) => (
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            {v
              ? new Date(v).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "terms",
      label: "Terms",
      render: (_, row) => {
        if (!row.termsFile) {
          return <span className="text-gray-400 italic text-sm">N/A</span>;
        }
        return (
          <button
            type="button"
            onClick={() => handleViewTerms(row)}
            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        );
      },
    },
  ];

  const archivedColumns = [
    ...baseColumns,
    {
      key: "delete",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => openDeleteModal(row)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      ),
    },
  ];

  // Statistics
  const stats = {
    total: applications.length,
    approved: applications.filter((a) => {
      const s = String(a.status || "").toLowerCase();
      return s === "approved" || s === "accepted";
    }).length,
    pending: applications.filter(
      (a) => String(a.status || "").toLowerCase() === "pending"
    ).length,
    rejected: applications.filter((a) =>
      ["rejected", "canceled"].includes(String(a.status || "").toLowerCase())
    ).length,
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"></div>
            <p className="text-gray-400 font-medium">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 text-white">
        {/* Enhanced Header Section */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/20">
                  <Award className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                    Loyalty Program
                  </h2>
                  <p className="text-xs font-medium text-gray-400 ml-1">
                    Vendor Rewards Portal
                  </p>
                </div>
              </div>
              <p className="text-base text-gray-400 ml-15 max-w-3xl">
                Share exclusive discounts with students and staff. Approved vendors
                receive a loyalty badge that boosts visibility and trust.
              </p>
            </div>
            <button
              onClick={fetchApplications}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-7 w-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Total Applications
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
                <p className="text-sm text-gray-400">All submissions</p>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-7 w-7 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Approved
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.approved}</p>
                <p className="text-sm text-gray-400">Active programs</p>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-7 w-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Pending
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.pending}</p>
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
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Rejected
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.rejected}</p>
                <p className="text-sm text-gray-400">Not approved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Application Card */}
        {hasActiveApplication && activeApplication && (
          <div className="mb-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
            <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <TrendingUp className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Active Application</h3>
                    <p className="text-sm text-gray-400">Current loyalty program status</p>
                  </div>
                </div>
                {renderStatusBadge(activeApplication.status)}
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Percent className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Discount Rate
                      </p>
                      <p className="text-lg font-bold text-emerald-400">
                        {activeApplication.discountRate || "N/A"}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Tag className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Promo Code
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {activeApplication.promoCode || "None"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Calendar className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Applied On
                      </p>
                      <p className="text-sm text-gray-200">
                        {activeApplication.createdAt
                          ? new Date(activeApplication.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {activeApplication.termsFile && (
                  <button
                    type="button"
                    onClick={() => handleViewTerms(activeApplication)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:border-blue-400 hover:text-white transition-all duration-200"
                  >
                    <Eye className="h-4 w-4" />
                    View Terms & Conditions
                  </button>
                )}
              </div>

              {["pending", "submitted", "approved", "accepted"].includes(
                String(activeApplication.status || "").toLowerCase()
              ) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => openCancelModal(activeApplication)}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Application
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Application Form */}
        {!hasActiveApplication ? (
          <div className="mb-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
            <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Apply for Loyalty Program
                  </h3>
                  <p className="text-sm text-gray-400">
                    Submit your offer details for review
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Discount Rate (%) <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Percent className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="number"
                    value={formData.discountRate}
                    onChange={(e) =>
                      setFormData({ ...formData, discountRate: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="Enter discount percentage"
                    required
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Promo Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Tag className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.promoCode}
                    onChange={(e) =>
                      setFormData({ ...formData, promoCode: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="Enter promo code (optional)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Terms & Conditions <span className="text-blue-400">*</span>
                </label>
                <div className="rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 p-6">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <UploadCloud className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <label
                        htmlFor="termsUpload"
                        className="cursor-pointer text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Choose document
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF or DOCX (max 5 MB)
                      </p>
                    </div>
                    {formData.termsFile && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-green-900/20 border border-green-700/30">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-green-300">
                          {formData.termsFile.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    id="termsUpload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        termsFile: e.target.files?.[0] || null,
                      })
                    }
                    className="hidden"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all duration-200 ${
                  submitting
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]"
                }`}
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="mb-6 rounded-xl bg-yellow-900/20 border border-yellow-800/30 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-300 mb-1">
                Active Application Exists
              </p>
              <p className="text-sm text-yellow-200">
                You currently have an active loyalty program application. You can submit
                a new one only after your existing application is{" "}
                <span className="font-semibold">rejected</span> or{" "}
                <span className="font-semibold">canceled</span>.
              </p>
            </div>
          </div>
        )}

        {/* Past Applications */}
        {pastApplications.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setShowPastApplications((prev) => !prev)}
              className="flex w-full items-center justify-between px-6 py-4 text-left border-b border-gray-700 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-700/50 border border-gray-600">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    Past Applications ({pastApplications.length})
                  </p>
                  <p className="text-sm text-gray-400">
                    Review previous submissions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-400">
                  {showPastApplications ? "Hide" : "Show"}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    showPastApplications ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
            {showPastApplications && (
              <div className="p-6">
                <DynamicTable columns={archivedColumns} data={pastApplications} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Cancel Modal */}
      {cancelModal.open && cancelModal.application && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeCancelModal}
          />
          <div className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Cancel Application</h3>
                    <p className="text-sm text-gray-400">
                      This action can be undone by reapplying
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeCancelModal}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <div className="rounded-xl bg-yellow-900/20 border border-yellow-800/30 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300 mb-1">
                    Are you sure?
                  </p>
                  <p className="text-sm text-yellow-200">
                    This will stop the current loyalty application. You can reapply at any
                    time with new terms.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={closeCancelModal}
                disabled={cancelModal.submitting}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Keep Application
              </button>
              <button
                onClick={confirmCancelApplication}
                disabled={cancelModal.submitting}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 ${
                  cancelModal.submitting
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105"
                }`}
              >
                {cancelModal.submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Cancel Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Modal */}
      {deleteModal.open && deleteModal.application && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />
          <div className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                    <Trash2 className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Remove Application</h3>
                    <p className="text-sm text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={closeDeleteModal}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <div className="rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">Warning</p>
                  <p className="text-sm text-red-200">
                    This will permanently remove the selected application from your
                    history. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={closeDeleteModal}
                disabled={deleteModal.submitting}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Keep Application
              </button>
              <button
                onClick={confirmDeleteApplication}
                disabled={deleteModal.submitting}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 ${
                  deleteModal.submitting
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105"
                }`}
              >
                {deleteModal.submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
