import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  Edit3,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Lock,
  RefreshCw,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  Briefcase,
  AlertTriangle
} from "lucide-react";

export default function WorkshopManagement() {
  const { user } = useAuth();
  const [pendingWorkshops, setPendingWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [action, setAction] = useState("");
  const [formState, setFormState] = useState({
    rejectionReason: "",
    editRequestComments: "",
    priceToAttend: "",
  });

  const hasPermission = user?.role === "Event Office" || user?.role === "Admin";

  const formatFee = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "Free";
    }
    return numeric.toLocaleString("en-EG", {
      style: "currency",
      currency: "EGP",
    });
  };

  // Fetch pending workshops
  const fetchPendingWorkshops = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events/workshops/pending");
      setPendingWorkshops(response.data.workshops || []);
    } catch (error) {
      console.error("Error fetching workshops:", error);
      toast.error("Failed to fetch workshops");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission) fetchPendingWorkshops();
  }, [hasPermission]);

  // Open modal for action
  const handleAction = (workshop, type) => {
    setSelectedWorkshop(workshop);
    setAction(type);
    setFormState({
      rejectionReason: "",
      editRequestComments: "",
      priceToAttend:
        type === "approve" && workshop?.priceToAttend != null
          ? String(workshop.priceToAttend)
          : "",
    });
    setShowModal(true);
  };

  // Handle submit actions
  const handleSubmit = async () => {
    if (!selectedWorkshop) return;

    try {
      if (action === "approve") {
        const numericPrice = Number(formState.priceToAttend);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
          toast.error("Please provide a valid non-negative participation fee.");
          return;
        }
        await api.patch(`/events/workshops/${selectedWorkshop._id}/approve`, {
          reviewedBy: user?._id,
          priceToAttend: numericPrice,
        });
        toast.success("Workshop approved successfully!");
      } else if (action === "reject") {
        if (!formState.rejectionReason.trim()) {
          toast.error("Please provide a reason for rejection");
          return;
        }
        await api.patch(`/events/workshops/${selectedWorkshop._id}/reject`, {
          rejectionReason: formState.rejectionReason.trim(),
        });
        toast.success("Workshop rejected successfully!");
      } else if (action === "edit") {
        if (!formState.editRequestComments.trim()) {
          toast.error("Please specify the requested edits");
          return;
        }
        await api.patch(`/events/workshops/${selectedWorkshop._id}/request-edits`, {
          editRequestComments: formState.editRequestComments.trim(),
        });
        toast.success("Edit request sent successfully!");
      }

      await fetchPendingWorkshops();
      setShowModal(false);
      setSelectedWorkshop(null);
      setAction("");
      setFormState({
        rejectionReason: "",
        editRequestComments: "",
        priceToAttend: "",
      });
    } catch (error) {
      console.error("Error processing action:", error);
      toast.error(`Failed to ${action} workshop`);
    }
  };

  // Calculate statistics
  const stats = {
    total: pendingWorkshops.length,
    freeWorkshops: pendingWorkshops.filter(w => !w.priceToAttend || w.priceToAttend <= 0).length,
    paidWorkshops: pendingWorkshops.filter(w => w.priceToAttend && w.priceToAttend > 0).length,
    uniqueFaculties: new Set(pendingWorkshops.map(w => w.facultyResponsible).filter(Boolean)).size,
  };

  // Define table columns
  const columns = [
    { 
      key: "name", 
      label: "Workshop Name", 
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <GraduationCap className="h-4 w-4 text-blue-400" />
          </div>
          <span className="font-semibold text-white">{v}</span>
        </div>
      )
    },
    { 
      key: "facultyResponsible", 
      label: "Faculty", 
      render: (v) => (
        <div className="flex items-center gap-2 text-white">
          <Briefcase className="h-4 w-4 text-gray-400" />
          <span>{v || "N/A"}</span>
        </div>
      )
    },
    { 
      key: "professors", 
      label: "Professors", 
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <span className="text-white">{(v || []).join(", ") || "N/A"}</span>
        </div>
      )
    },
    { 
      key: "location", 
      label: "Location", 
      render: (v) => (
        <div className="flex items-center gap-2 text-white">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{v || "N/A"}</span>
        </div>
      )
    },
    {
      key: "priceToAttend",
      label: "Participation Fee",
      render: (v) => {
        const fee = formatFee(v);
        const isFree = fee === "Free";
        return (
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isFree ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <DollarSign className={`h-4 w-4 ${isFree ? 'text-green-400' : 'text-amber-400'}`} />
            </div>
            <span className={`font-medium ${isFree ? 'text-green-400' : 'text-amber-400'}`}>
              {fee}
            </span>
          </div>
        );
      },
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (v) => (
        <div className="flex items-center gap-2 text-white">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
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
      render: (_, workshop) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction(workshop, "approve")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={() => handleAction(workshop, "reject")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            onClick={() => handleAction(workshop, "edit")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 px-3 py-1.5 text-white text-sm font-medium transition-all duration-200"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Request Edits
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
                You don't have permission to manage workshops. Please contact an administrator.
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
            <p className="text-gray-400 font-medium">Loading pending workshops...</p>
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
                <GraduationCap className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Workshop Management
                </h2>
                {user?.role === "Admin" && (
                  <span className="text-xs font-medium text-blue-400 ml-1">Admin View</span>
                )}
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Review and manage workshops created by professors.
            </p>
          </div>
          <button
            onClick={fetchPendingWorkshops}
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
                Total Workshops
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
              <p className="text-sm text-gray-400">Pending review</p>
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
                Free Workshops
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.freeWorkshops}</p>
              <p className="text-sm text-gray-400">No participation fee</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Paid Workshops
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.paidWorkshops}</p>
              <p className="text-sm text-gray-400">With fees</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="h-7 w-7 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Faculties
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.uniqueFaculties}</p>
              <p className="text-sm text-gray-400">Involved</p>
            </div>
          </div>
        </div>
      </div>

      {pendingWorkshops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <GraduationCap className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Workshops</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                There are currently no pending workshops to review. Check back later for new submissions.
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
                  Pending Workshops
                </h3>
                <p className="text-sm text-gray-400">
                  {pendingWorkshops.length} workshop{pendingWorkshops.length !== 1 ? "s" : ""} awaiting review
                </p>
              </div>
            </div>
          </div>
          <DynamicTable columns={columns} data={pendingWorkshops} />
        </div>
      )}

      {/* Enhanced Approve/Reject/Edit Modal */}
      {showModal && selectedWorkshop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setSelectedWorkshop(null);
              setAction("");
              setFormState({
                rejectionReason: "",
                editRequestComments: "",
                priceToAttend: "",
              });
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
                      : action === "reject"
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-yellow-500/10 border border-yellow-500/20"
                  }`}>
                    {action === "approve" ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : action === "reject" ? (
                      <XCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <Edit3 className="h-5 w-5 text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {action === "approve" 
                        ? "Approve Workshop"
                        : action === "reject"
                        ? "Reject Workshop"
                        : "Request Workshop Edits"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {action === "approve" 
                        ? "Set participation fee and confirm approval"
                        : action === "reject"
                        ? "Provide rejection reason"
                        : "Specify required changes"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedWorkshop(null);
                    setAction("");
                    setFormState({
                      rejectionReason: "",
                      editRequestComments: "",
                      priceToAttend: "",
                    });
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
              {/* Workshop Details Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <GraduationCap className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Workshop Name</p>
                    <p className="text-white font-semibold text-lg">
                      {selectedWorkshop.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Briefcase className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Faculty</p>
                      <p className="text-sm text-gray-200">
                        {selectedWorkshop.facultyResponsible || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <Users className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Professors</p>
                      <p className="text-sm text-gray-200">
                        {(selectedWorkshop.professors || []).join(", ") || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                      <MapPin className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Location</p>
                      <p className="text-sm text-gray-200 capitalize">
                        {selectedWorkshop.location || "N/A"}
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
                        {selectedWorkshop.startDate 
                          ? new Date(selectedWorkshop.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Current Fee</p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {formatFee(selectedWorkshop.priceToAttend)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action-specific Messages */}
              {action === "approve" && (
                <div className="rounded-xl bg-green-900/20 border border-green-800/30 px-4 py-3 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-300 mb-1">Ready to Approve</p>
                    <p className="text-sm text-green-200">
                      Set the participation fee for this workshop. Enter 0 for free workshops. The professor will be notified of the approval.
                    </p>
                  </div>
                </div>
              )}

              {action === "reject" && (
                <div className="rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-1">Rejection Notice</p>
                    <p className="text-sm text-red-200">
                      The professor will be notified of this rejection along with your provided reason. Please ensure your reason is clear and constructive.
                    </p>
                  </div>
                </div>
              )}

              {action === "edit" && (
                <div className="rounded-xl bg-yellow-900/20 border border-yellow-800/30 px-4 py-3 flex items-start gap-3">
                  <Edit3 className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-300 mb-1">Edit Request</p>
                    <p className="text-sm text-yellow-200">
                      The professor will receive your feedback and can resubmit the workshop after making the requested changes.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              {action === "approve" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Participation Fee (EGP) <span className="text-green-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formState.priceToAttend}
                    onChange={(e) => setFormState({ ...formState, priceToAttend: e.target.value })}
                    placeholder="Enter fee (0 for free workshops)"
                    min={0}
                    step="0.01"
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                  />
                  {formState.priceToAttend && (
                    <p className="mt-2 text-xs text-gray-400">
                      Fee: {formatFee(formState.priceToAttend)}
                    </p>
                  )}
                </div>
              )}

              {action === "reject" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Rejection Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formState.rejectionReason}
                    onChange={(e) => setFormState({ ...formState, rejectionReason: e.target.value })}
                    placeholder="Provide a clear and constructive reason for rejection..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all resize-none"
                  />
                  {formState.rejectionReason.trim() && (
                    <p className="mt-2 text-xs text-gray-400">
                      {formState.rejectionReason.trim().length} characters
                    </p>
                  )}
                </div>
              )}

              {action === "edit" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Requested Edits <span className="text-yellow-400">*</span>
                  </label>
                  <textarea
                    value={formState.editRequestComments}
                    onChange={(e) => setFormState({ ...formState, editRequestComments: e.target.value })}
                    placeholder="Explain what needs to be changed or improved..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none"
                  />
                  {formState.editRequestComments.trim() && (
                    <p className="mt-2 text-xs text-gray-400">
                      {formState.editRequestComments.trim().length} characters
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
                  setSelectedWorkshop(null);
                  setAction("");
                  setFormState({
                    rejectionReason: "",
                    editRequestComments: "",
                    priceToAttend: "",
                  });
                }}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  (action === "approve" && (!formState.priceToAttend || Number(formState.priceToAttend) < 0)) ||
                  (action === "reject" && !formState.rejectionReason.trim()) ||
                  (action === "edit" && !formState.editRequestComments.trim())
                }
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === "approve"
                    ? "bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105"
                    : action === "reject"
                    ? "bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105"
                    : "bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105"
                }`}
              >
                {action === "approve" ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approve Workshop
                  </>
                ) : action === "reject" ? (
                  <>
                    <XCircle className="h-4 w-4" />
                    Reject Workshop
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Send Edit Request
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
