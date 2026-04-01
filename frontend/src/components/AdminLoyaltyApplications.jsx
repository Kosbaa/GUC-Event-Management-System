import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import API from "../utils/axiosInstance";
import DynamicTable from "./DynamicTable";
import {
  Award,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  FileText,
  Tag,
  Percent,
  Activity,
  TrendingUp,
  Users,
  AlertCircle,
  Store,
  Clock,
  Download,
} from "lucide-react";

const REVIEWABLE_STATUSES = new Set(["pending", "submitted"]);

export default function AdminLoyaltyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decisionModal, setDecisionModal] = useState({
    open: false,
    action: null,
    application: null,
    submitting: false,
  });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await API.get("/loyalty/all");
      setApplications(res.data);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  const openDecisionModal = (action, application) => {
    setDecisionModal({ open: true, action, application, submitting: false });
  };

  const closeDecisionModal = () =>
    setDecisionModal({
      open: false,
      action: null,
      application: null,
      submitting: false,
    });

  const submitDecision = async () => {
    if (!decisionModal.application || !decisionModal.action) return;
    const { action, application } = decisionModal;
    try {
      setDecisionModal((prev) => ({ ...prev, submitting: true }));
      if (action === "approve") {
        await API.patch(`/loyalty/approve/${application._id}`);
        toast.success("Application approved!");
      } else {
        await API.patch(`/loyalty/reject/${application._id}`);
        toast.success("Application rejected!");
      }
      closeDecisionModal();
      fetchApplications();
    } catch (error) {
      console.error("Decision error:", error);
      toast.error("Failed to update application.");
      setDecisionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const extractFilename = (headerValue, fallback = "") => {
    if (!headerValue) return fallback;
    const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch && utfMatch[1]) {
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        return utfMatch[1];
      }
    }
    const plainMatch = headerValue.match(/filename="?([^\";]+)"?/i);
    if (plainMatch && plainMatch[1]) {
      return plainMatch[1];
    }
    return fallback;
  };

  const fetchTermsFile = async (app) => {
    if (!app?._id) throw new Error("Missing application reference");
    const res = await API.get(`/loyalty/${app._id}/terms`, {
      responseType: "blob",
    });
    const blob = new Blob([res.data], {
      type: res.headers["content-type"] || "application/pdf",
    });
    const url = window.URL.createObjectURL(blob);
    const fallbackName =
      typeof app.termsFile === "string"
        ? app.termsFile.split(/[\\\/]/).pop()
        : app.termsFile?.originalName || `loyalty-terms-${app._id}.pdf`;
    const headerName =
      extractFilename(
        res.headers["content-disposition"] ||
          res.headers["Content-Disposition"],
        fallbackName
      ) || fallbackName;
    return { url, fileName: headerName };
  };

  const handleViewTerms = async (app) => {
    try {
      const { url } = await fetchTermsFile(app);
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
      console.error("Failed to open terms:", error);
      toast.error("Unable to open terms file.");
    }
  };

  const handleDownloadTerms = async (app) => {
    try {
      const { url, fileName } = await fetchTermsFile(app);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `loyalty-terms-${app?._id || ""}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Failed to download terms:", error);
      toast.error("Unable to download terms file.");
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const pendingApplications = useMemo(() => {
    return applications.filter((app) =>
      REVIEWABLE_STATUSES.has(String(app.status || "").toLowerCase())
    );
  }, [applications]);

  // Calculate statistics
  const stats = {
    total: pendingApplications.length,
    avgDiscount: pendingApplications.length > 0 
      ? Math.round(pendingApplications.reduce((sum, app) => sum + (Number(app.discountRate) || 0), 0) / pendingApplications.length)
      : 0,
    withTerms: pendingApplications.filter(app => app.termsFile).length,
    uniqueVendors: new Set(pendingApplications.map(app => app.vendorId?._id || app.vendorId?.id).filter(Boolean)).size,
  };

  const columns = [
    {
      key: "vendorId.companyName",
      label: "Vendor Name",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Store className="h-4 w-4 text-blue-400" />
          </div>
          <span className="font-semibold text-white">
            {row.vendorId?.companyName || row.vendorId?.name || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "discountRate",
      label: "Discount",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
            <Percent className="h-4 w-4 text-green-400" />
          </div>
          <span className="font-semibold text-green-400">{v}%</span>
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
          <span className="font-mono text-sm text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
            {v || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "termsFile",
      label: "Terms & Conditions",
      render: (v, row) => {
        if (!row.termsFile) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              <XCircle className="h-3 w-3" />
              Not Uploaded
            </span>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleViewTerms(row)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
            >
              <Eye className="h-3.5 w-3.5" />
              View Terms
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTerms(row)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-100 transition-all duration-200"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Applied",
      render: (v) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {v ? new Date(v).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            }) : "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (v, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openDecisionModal("approve", row)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={() => openDecisionModal("reject", row)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading loyalty applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Loyalty Program Applications
                </h2>
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Review and manage vendor applications for the GUC Loyalty Program.
            </p>
          </div>
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Applications Table */}
      {pendingApplications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Award className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Applications</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                There are currently no pending loyalty program applications to review. Check back later for new submissions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
          <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Activity className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Pending Applications
                </h3>
                <p className="text-sm text-gray-400">
                  {pendingApplications.length} application{pendingApplications.length !== 1 ? "s" : ""} awaiting review
                </p>
              </div>
            </div>
          </div>
          <DynamicTable columns={columns} data={pendingApplications} />
        </div>
      )}

      {/* Enhanced Decision Modal */}
      {decisionModal.open && decisionModal.application && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDecisionModal}
          />
          <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  decisionModal.action === "approve" 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  {decisionModal.action === "approve" ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {decisionModal.action === "approve"
                    ? "Approve Application"
                    : "Reject Application"}
                </h3>
              </div>
              <button
                onClick={closeDecisionModal}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-gray-300 mb-4">
                {decisionModal.action === "approve"
                  ? "Are you sure you want to approve this loyalty program application? This will grant the vendor access to the loyalty program benefits."
                  : "Are you sure you want to reject this loyalty program application? This action cannot be undone."}
              </p>

              {/* Application Details */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Store className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Vendor</p>
                    <p className="text-white font-semibold">
                      {decisionModal.application.vendorId?.companyName || 
                       decisionModal.application.vendorId?.name || 
                       "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                    <Percent className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Discount Rate</p>
                    <p className="text-white font-semibold">{decisionModal.application.discountRate}%</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Tag className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Promo Code</p>
                    <p className="text-white font-mono text-sm">{decisionModal.application.promoCode || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Warning for rejection */}
              {decisionModal.action === "reject" && (
                <div className="mt-4 rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-1">Warning</p>
                    <p className="text-sm text-red-200">
                      This will permanently reject the application. The vendor will need to reapply to join the loyalty program.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={closeDecisionModal}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
                disabled={decisionModal.submitting}
              >
                Cancel
              </button>
              <button
                onClick={submitDecision}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ${
                  decisionModal.action === "approve"
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-red-600 hover:bg-red-500"
                } ${
                  decisionModal.submitting
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
                disabled={decisionModal.submitting}
              >
                {decisionModal.submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {decisionModal.action === "approve" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
