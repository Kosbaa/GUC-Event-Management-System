import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { 
  FileText, 
  Image as ImageIcon, 
  AlertTriangle,
  Store,
  CheckCircle,
  XCircle,
  Mail,
  Clock,
  Eye,
  Download,
  RefreshCw,
  Search,
  Activity,
  TrendingUp,
  Users,
  Calendar
} from "lucide-react";
import DynamicTable from "./DynamicTable";

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VendorManagement() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState({ 
    open: false, 
    action: null, 
    vendorId: null, 
    vendorName: "" 
  });

  const canModerate =
    user?.role === "Admin" || user?.role === "Event Office";

  const detailLinks = (vendor) => {
    const id = vendor?._id || vendor?.id;
    if (!id) {
      return { logo: "#", taxCard: "#" };
    }
    const base = api.defaults?.baseURL || "";
    const normalizedBase = base.endsWith("/")
      ? base.slice(0, base.length - 1)
      : base;
    return {
      logo: `${normalizedBase}/auth/vendor/${id}/logo`,
      taxCard: `${normalizedBase}/auth/vendor/${id}/taxcard`,
    };
  };

  async function fetchVendors() {
    setLoading(true);
    try {
      const res = await api.get("/auth/users/status");
      const payload = res?.data;
      const list =
        Array.isArray(payload?.vendors)
          ? payload.vendors
          : Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.users)
          ? payload.users
          : [];

      const pendingOnly = list
        .filter((u) => {
          const role = String(u.role || "").toLowerCase();
          const status = String(u.status || "").toLowerCase();
          return role === "vendor" && status === "pending";
        })
        .map((v) => ({
          _id: v._id || v.id,
          companyName: v.companyName || v.name || "N/A",
          email: v.email || "N/A",
          updatedAt: v.updatedAt || v.createdAt,
          hasLogo: !!v.hasLogo,
          hasTaxCard: !!v.hasTaxCard,
        }));

      setVendors(pendingOnly);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter((v) =>
      [v.companyName, v.email].some((x) =>
        String(x || "").toLowerCase().includes(term)
      )
    );
  }, [vendors, q]);

  const openConfirmationModal = (vendorId, vendorName, action) => {
    setConfirmationModal({ open: true, action, vendorId, vendorName });
  };
  
  const closeConfirmationModal = () => {
    setConfirmationModal({ open: false, action: null, vendorId: null, vendorName: "" });
  };

  async function handleApproval(vendorId, action) {
    if (!canModerate || !vendorId) return;
    try {
      await api.post(`/auth/vendor/${vendorId}/approve-account`, { action });
      toast.success(action === "accept" ? "Vendor approved" : "Vendor rejected");
      setSelectedVendor(null);
      closeConfirmationModal();
      await fetchVendors();
    } catch (err) {
      console.error("handleApproval error:", err);
      toast.error(
        err?.response?.data?.message || "Failed to update vendor status"
      );
    }
  }

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("File downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  // Calculate statistics
  const stats = {
    total: vendors.length,
    withLogo: vendors.filter(v => v.hasLogo).length,
    withTaxCard: vendors.filter(v => v.hasTaxCard).length,
    complete: vendors.filter(v => v.hasLogo && v.hasTaxCard).length,
  };

  const DocumentActions = ({ vendor }) => {
    const links = detailLinks(vendor);
    const items = [
      {
        label: "LOGO",
        hasFile: vendor.hasLogo,
        url: links.logo,
        icon: ImageIcon,
        filename: `${vendor.companyName}_logo.png`,
      },
      {
        label: "TAX CARD",
        hasFile: vendor.hasTaxCard,
        url: links.taxCard,
        icon: FileText,
        filename: `${vendor.companyName}_taxcard.pdf`,
      },
    ];

    return (
      <div className="space-y-3">
        {items.map(({ label, hasFile, url, icon: Icon, filename }) => (
          <div
            key={label}
            className="group flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 px-4 py-3 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                hasFile ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <Icon className={`h-5 w-5 ${hasFile ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {label}
                </p>
                {hasFile ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-sm text-green-400">Uploaded</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-sm text-red-400">Missing</span>
                  </div>
                )}
              </div>
            </div>
            {hasFile ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(url, "_blank", "noopener")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
                <button
                  onClick={() => handleDownload(url, filename)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-gray-900 transition-all duration-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                <XCircle className="h-3 w-3" />
                Not Uploaded
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const ConfirmationModal = () => {
    if (!confirmationModal.open) return null;
    const isReject = confirmationModal.action === "reject";
    
    const vendor = vendors.find(v => (v._id || v.id) === confirmationModal.vendorId);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={closeConfirmationModal}
        />
        <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isReject ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'
              }`}>
                {isReject ? (
                  <XCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white">
                {isReject ? 'Confirm Rejection' : 'Confirm Acceptance'}
              </h3>
            </div>
            <button
              onClick={closeConfirmationModal}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-sm text-gray-300 mb-4">
              {isReject 
                ? `Are you sure you want to reject the following vendor? This action cannot be undone.`
                : `Are you sure you want to accept the following vendor? They will be granted access to the system.`
              }
            </p>

            {/* Vendor Info Card */}
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 mb-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Store className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Company Name</p>
                  <p className="text-white font-semibold text-lg">{confirmationModal.vendorName}</p>
                </div>
              </div>
              {vendor && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Mail className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm text-gray-200">{vendor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Updated</p>
                      <p className="text-sm text-gray-200">{formatDate(vendor.updatedAt)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Warning Message */}
            {isReject && (
              <div className="flex items-start gap-3 rounded-xl bg-red-900/20 border border-red-800/30 p-4">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">Warning</p>
                  <p className="text-sm text-red-200">
                    This action will permanently reject this vendor's application. They will need to reapply if they wish to join the platform.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
            <button
              onClick={closeConfirmationModal}
              className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => handleApproval(confirmationModal.vendorId, confirmationModal.action)}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ${
                isReject 
                  ? 'bg-red-600 hover:bg-red-500' 
                  : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {isReject ? (
                <>
                  <XCircle className="h-4 w-4" />
                  Reject Vendor
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Accept Vendor
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DetailModal = () => {
    if (!selectedVendor) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedVendor(null)}
        />
        <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Store className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400 tracking-wide mb-1">Vendor Details</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedVendor.companyName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-sm text-gray-400">{selectedVendor.email}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body - Documents */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-400">
                Last updated {formatDate(selectedVendor.updatedAt)}
              </p>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                Uploaded Documents
              </h4>
              <DocumentActions vendor={selectedVendor} />
            </div>

            {/* Document Status Summary */}
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Document Status
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  {selectedVendor.hasLogo ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400">Logo Uploaded</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">Logo Missing</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedVendor.hasTaxCard ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400">Tax Card Uploaded</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">Tax Card Missing</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 px-6 py-4 flex justify-end">
            <button
              onClick={() => setSelectedVendor(null)}
              className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    {
      key: "companyName",
      label: "Company",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Store className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-white font-semibold">{value}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-white">{value}</span>
        </div>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-white text-sm">{formatDate(value)}</span>
        </div>
      ),
    },
    {
      key: "documents",
      label: "Documents",
      render: (_, vendor) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            vendor.hasLogo && vendor.hasTaxCard
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : vendor.hasLogo || vendor.hasTaxCard
              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {vendor.hasLogo && vendor.hasTaxCard ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Complete
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                Incomplete
              </>
            )}
          </span>
        </div>
      ),
    },
    {
      key: "details",
      label: "View Details",
      render: (_, vendor) => (
        <button
          onClick={() => setSelectedVendor(vendor)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, vendor) => {
        const id = vendor._id || vendor.id;
        return canModerate ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => openConfirmationModal(id, vendor.companyName, "accept")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Accept
            </button>
            <button
              onClick={() => openConfirmationModal(id, vendor.companyName, "reject")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        ) : (
          <span className="text-gray-500 italic text-sm">No actions</span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading vendor applications...</p>
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
                <Store className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Vendor Applications
                </h2>
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Review pending vendor applications and approve or reject them.
            </p>
          </div>
          <button
            onClick={fetchVendors}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {filtered.length > 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-4 mb-6 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by company name or email..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => setQ("")}
              disabled={!q}
              className="rounded-xl bg-yellow-500 hover:bg-yellow-400 px-6 py-3 text-sm font-semibold text-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Store className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Applications</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                {q ? "No vendors match your search criteria. Try a different search term." : "There are currently no pending vendor applications to review. Check back later for new submissions."}
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
                  {filtered.length} vendor{filtered.length !== 1 ? "s" : ""} awaiting review
                </p>
              </div>
            </div>
          </div>
          <DynamicTable
            columns={columns}
            data={filtered}
            onEdit={null}
            onCreate={null}
          />
        </div>
      )}

      <DetailModal />
      <ConfirmationModal />
    </div>
  );
}
