import React, { useState, useEffect } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import DynamicModal from "./DynamicModal";
import { useAuth } from "../context/AuthContext";
import {
  Store,
  CheckCircle,
  XCircle,
  Users,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Lock,
  RefreshCw,
  FileText,
  Activity,
  ShoppingBag,
  TrendingUp,
  Building2,
  Mail,
  DollarSign,
  Package,
  AlertTriangle
} from "lucide-react";

export default function BazaarManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [action, setAction] = useState(""); // "approve" or "reject"
  const [rejectionReason, setRejectionReason] = useState("");

  const hasPermission = user?.role === "Admin" || user?.role === "Event Office";
  const canViewAttendees = hasPermission;

  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesRequest, setAttendeesRequest] = useState(null);
  const [attendees, setAttendees] = useState([]);

  async function fetchAllRequests() {
    try {
      setLoading(true);
      const res = await api.get("/bazaars/all-requests");
      const list = Array.isArray(res.data)
        ? res.data
        : res.data.requests || res.data || [];
      setRequests(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load vendor requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasPermission) {
      fetchAllRequests();
    }
  }, [hasPermission]);

  function resolveBazaarId(req) {
    return (
      req.bazaarId ||
      req.bazaar?._id ||
      req.bazaar?.id ||
      req.bazaar_id ||
      req.eventId ||
      req.event?._id ||
      null
    );
  }

  function resolveVendorId(req) {
    return (
      req.vendorId ||
      req.vendor?._id ||
      req.vendor?.id ||
      req.vendor_id ||
      req._id ||
      req.id ||
      null
    );
  }

  const handleAction = (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setRejectionReason("");
    setShowModal(true);
  };

  const openAttendees = async (req) => {
    if (!canViewAttendees) return;
    const bazaarId = resolveBazaarId(req);
    const vendorId = resolveVendorId(req);
    if (!bazaarId || !vendorId) {
      toast.error("Missing bazaar or vendor id");
      return;
    }
    setAttendeesRequest(req);
    setShowAttendeesModal(true);
    setAttendees([]);
    setAttendeesLoading(true);
    try {
      const res = await api.get(
        `/bazaars/${bazaarId}/vendor/${vendorId}/attendees`
      );
      setAttendees(res.data.attendees || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load attendees");
    } finally {
      setAttendeesLoading(false);
    }
  };

  const viewAttendeeId = async (index) => {
    if (!attendeesRequest) return;
    const bazaarId = resolveBazaarId(attendeesRequest);
    const vendorId = resolveVendorId(attendeesRequest);
    try {
      const res = await api.get(
        `/bazaars/${bazaarId}/vendor/${vendorId}/attendees/${index}/id`
      );
      const { contentType, data } = res.data || {};
      if (!data) throw new Error("No file data");
      const byteChars = atob(data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++)
        byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: contentType || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to view ID");
    }
  };

  const downloadAttendeeId = async (index) => {
    if (!attendeesRequest) return;
    const bazaarId = resolveBazaarId(attendeesRequest);
    const vendorId = resolveVendorId(attendeesRequest);
    try {
      const res = await api.get(
        `/bazaars/${bazaarId}/vendor/${vendorId}/attendees/${index}/id/download`,
        { responseType: "blob" }
      );
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bazaar-attendee-${index}-id`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to download ID");
    }
  };

  async function handleSubmit() {
    if (!selectedRequest) return;
    try {
      const bazaarId = resolveBazaarId(selectedRequest);
      const vendorId = resolveVendorId(selectedRequest);
      if (!bazaarId || !vendorId) {
        toast.error("Unable to identify bazaar or vendor id for this request.");
        return;
      }

      if (action === "reject" && !rejectionReason.trim()) {
        toast.error("Please provide a reason for rejection");
        return;
      }

      if (action === "approve") {
        await api.patch(`/bazaars/${bazaarId}/vendor/${vendorId}/accept`);
        toast.success("Vendor approved – awaiting payment");
      } else if (action === "reject") {
        await api.patch(`/bazaars/${bazaarId}/vendor/${vendorId}/reject`, {
          reason: rejectionReason.trim(),
        });
        toast.success("Vendor rejected");
      }

      setShowModal(false);
      setSelectedRequest(null);
      setAction("");
      setRejectionReason("");
      fetchAllRequests();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || `Failed to ${action} vendor`);
    }
  }

  // Calculate statistics
  const stats = {
    total: requests.length,
    totalAttendees: requests.reduce((sum, r) => sum + (Array.isArray(r.attendees) ? r.attendees.length : 0), 0),
    uniqueLocations: new Set(requests.map(r => r.location)).size,
    thisWeek: requests.filter(r => {
      if (!r.startDate) return false;
      const start = new Date(r.startDate);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return start >= now && start <= weekFromNow;
    }).length
  };

  const columns = [
    {
      key: "bazaarName",
      label: "Bazaar Name",
      render: (value, req) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <ShoppingBag className="h-4 w-4 text-blue-400" />
          </div>
          <span className="font-semibold text-white">{value || req.vendor?.companyName || "N/A"}</span>
        </div>
      )
    },
    {
      key: "location",
      label: "Location",
      render: (value) => (
        <div className="flex items-center gap-2 text-white">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{value || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (value) => (
        <div className="flex items-center gap-2 text-white">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            {value ? new Date(value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            }) : "N/A"}
          </span>
        </div>
      )
    },
    {
      key: "endDate",
      label: "End Date",
      render: (value) => (
        <div className="flex items-center gap-2 text-white">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            {value
              ? new Date(value).toLocaleDateString("en-US", {
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
      key: "attendees",
      label: "Attendees",
      render: (value) => {
        const count = Array.isArray(value) ? value.length : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <span className="text-white font-medium">{count}</span>
          </div>
        );
      },
    },
    {
      key: "attendeesActions",
      label: "View Details",
      render: (_, req) =>
        canViewAttendees ? (
          <button
            onClick={() => openAttendees(req)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <Eye className="h-3.5 w-3.5" />
            Attendees
          </button>
        ) : (
          <span className="text-xs text-gray-500">N/A</span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, booking) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction(booking, "approve")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={() => handleAction(booking, "reject")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      ),
    },
  ];

  if (!hasPermission) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20 border border-red-700">
              <Lock className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                You don't have permission to manage bazaar applications. Please contact an administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading bazaar applications...</p>
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
                <ShoppingBag className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Bazaar Applications
                </h2>
                {user?.role === "Admin" && (
                  <span className="text-xs font-medium text-blue-400 ml-1">Admin View</span>
                )}
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Review and manage pending bazaar booking applications from vendors.
            </p>
          </div>
          <button
            onClick={fetchAllRequests}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
              <p className="text-sm text-gray-400">Pending review</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Total Attendees
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.totalAttendees}</p>
              <p className="text-sm text-gray-400">Across all bazaars</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
              <MapPin className="h-7 w-7 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Locations
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.uniqueLocations}</p>
              <p className="text-sm text-gray-400">Unique venues</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-7 w-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                This Week
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.thisWeek}</p>
              <p className="text-sm text-gray-400">Starting soon</p>
            </div>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <ShoppingBag className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Applications</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                There are currently no pending bazaar applications to review. Check back later for new submissions.
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
                  {requests.length} application{requests.length !== 1 ? "s" : ""} awaiting review
                </p>
              </div>
            </div>
          </div>
          <DynamicTable
            columns={columns}
            data={requests}
            onEdit={null}
            onCreate={null}
          />
        </div>
      )}

      {/* Enhanced Approve/Reject Confirmation Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setSelectedRequest(null);
              setAction("");
              setRejectionReason("");
            }}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    action === "approve" 
                      ? "bg-green-500/10 border border-green-500/20" 
                      : "bg-red-500/10 border border-red-500/20"
                  }`}>
                    {action === "approve" ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {action === "approve" ? "Approve Application" : "Reject Application"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {action === "approve" 
                        ? "Confirm vendor approval and payment status" 
                        : "Provide rejection reason"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setAction("");
                    setRejectionReason("");
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Application Details Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <ShoppingBag className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Bazaar Name</p>
                    <p className="text-white font-semibold text-lg">
                      {selectedRequest.bazaarName || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Building2 className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Vendor</p>
                      <p className="text-sm text-gray-200 font-medium">
                        {selectedRequest.vendor?.companyName || "N/A"}
                      </p>
                      {selectedRequest.vendor?.email && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedRequest.vendor.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                      <MapPin className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Location</p>
                      <p className="text-sm text-gray-200 capitalize">{selectedRequest.location || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Package className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Booth Size
                      </p>
                      <p className="text-sm text-gray-200">
                        {selectedRequest.boothSize ||
                          selectedRequest.booth?.size ||
                          selectedRequest.booth?.label ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Price</p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {selectedRequest.boothPrice != null 
                          ? `EGP ${Number(selectedRequest.boothPrice).toLocaleString()}`
                          : selectedRequest.price != null
                          ? `EGP ${Number(selectedRequest.price).toLocaleString()}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Calendar className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Start Date</p>
                      <p className="text-sm text-gray-200">
                        {selectedRequest.startDate 
                          ? new Date(selectedRequest.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <Users className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Attendees</p>
                      <p className="text-sm text-gray-200">
                        {selectedRequest.attendees?.length || 0} registered
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Message */}
              <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
                action === "approve"
                  ? "bg-green-900/20 border border-green-800/30"
                  : "bg-red-900/20 border border-red-800/30"
              }`}>
                {action === "approve" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-300 mb-1">Ready to Approve</p>
                      <p className="text-sm text-green-200">
                        This vendor will be notified and their application status will be updated to "Awaiting Payment". 
                        They will be able to proceed with payment to secure their booth.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-300 mb-1">Rejection Notice</p>
                      <p className="text-sm text-red-200">
                        The vendor will be notified of this rejection along with your provided reason. 
                        Please ensure your reason is clear and professional.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Rejection Reason Field */}
              {action === "reject" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Rejection Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a clear and professional reason for rejection..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all resize-none"
                  />
                  {rejectionReason.trim() && (
                    <p className="mt-2 text-xs text-gray-400">
                      {rejectionReason.trim().length} characters
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedRequest(null);
                  setAction("");
                  setRejectionReason("");
                }}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={action === "reject" && !rejectionReason.trim()}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === "approve"
                    ? "bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105"
                    : "bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105"
                }`}
              >
                {action === "approve" ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approve Application
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Reject Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Attendees Modal */}
      {showAttendeesModal && canViewAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowAttendeesModal(false);
              setAttendeesRequest(null);
              setAttendees([]);
            }}
          />
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Attendees</h3>
                  <p className="text-sm text-gray-400">
                    {attendeesRequest?.vendorName || attendeesRequest?.vendor?.companyName || "Vendor"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAttendeesModal(false);
                  setAttendeesRequest(null);
                  setAttendees([]);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {attendeesLoading ? (
                <div className="text-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading attendees...</p>
                </div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 mx-auto mb-4">
                    <Users className="h-7 w-7 text-gray-600" />
                  </div>
                  <p className="text-gray-400">No attendees submitted.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendees.map((a) => (
                    <div
                      key={a.index}
                      className="group rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 p-4 transition-all duration-200"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <Users className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {a.name || `Attendee #${a.index + 1}`}
                              </div>
                              {a.email && (
                                <div className="text-xs text-gray-400">{a.email}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                              a.hasIdDocument
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {a.hasIdDocument ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              ID {a.hasIdDocument ? "Uploaded" : "Missing"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={!a.hasIdDocument}
                            onClick={() => viewAttendeeId(a.index)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                              a.hasIdDocument
                                ? "bg-blue-600 hover:bg-blue-500 text-white"
                                : "bg-gray-700 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          <button
                            disabled={!a.hasIdDocument}
                            onClick={() => downloadAttendeeId(a.index)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                              a.hasIdDocument
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "bg-gray-700 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowAttendeesModal(false);
                  setAttendeesRequest(null);
                  setAttendees([]);
                }}
                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Premium details layout inside the DynamicModal:
 * vendor card + info grid + attendees preview + action summary.
 */
function ApproveRejectDetails({ request, action }) {
  const vendorName =
    request.vendorName ||
    request.vendor?.companyName ||
    request.companyName ||
    "Vendor";

  const vendorEmail =
    request.vendorEmail || request.vendor?.email || request.email || "N/A";

  const bazaarName = request.bazaarName || request.bazaar?.name || "Bazaar";

  const boothLabel =
    request.boothSize ||
    request.booth?.label ||
    request.booth?.size ||
    request.booth?.location ||
    "N/A";

  const formatMoney = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "N/A";
    return `EGP ${num.toLocaleString()}`;
  };

  const priceLabel =
    request.boothPrice != null
      ? formatMoney(request.boothPrice)
      : request.price != null
      ? formatMoney(request.price)
      : request.booth?.price != null
      ? formatMoney(request.booth.price)
      : "N/A";

  const startDate = request.startDate
    ? new Date(request.startDate).toLocaleDateString()
    : "N/A";

  const endDate = request.endDate
    ? new Date(request.endDate).toLocaleDateString()
    : "N/A";

  return (
    <div className="space-y-6">
      {/* Vendor + bazaar card */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              {bazaarName}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-semibold text-slate-50">
                {vendorName}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  action === "approve"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                }`}
              >
                {action === "approve" ? "Pending Approval" : "To Be Rejected"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">{vendorEmail}</p>
          </div>

          <div className="flex flex-col items-end gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200">
              Booth:
              <span className="ml-1 font-semibold">{boothLabel}</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-emerald-50">
              Price: {priceLabel}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <InfoItem
            label="Location"
            value={
              request.location ||
              request.booth?.location ||
              request.bazaar?.location ||
              "N/A"
            }
          />
          <InfoItem
            label="Booth Size"
            value={
              request.boothSize ||
              request.booth?.size ||
              request.booth?.label ||
              "N/A"
            }
          />
          <InfoItem label="Start Date" value={startDate} />
          <InfoItem label="End Date" value={endDate} />
        </div>
      </section>

      {/* Action summary */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-slate-400">
            You are about to{" "}
            <span
              className={
                action === "approve"
                  ? "text-emerald-400 font-semibold"
                  : "text-rose-400 font-semibold"
              }
            >
              {action === "approve" ? "approve" : "reject"}
            </span>{" "}
            this bazaar application. This will notify the vendor and update the
            application status.
          </p>

          {action === "reject" && (
            <p className="text-[11px] text-slate-500">
              Please provide a clear rejection reason in the field below before
              submitting.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}
