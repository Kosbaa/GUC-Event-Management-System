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
  BarChart3,
  Vote,
  Trash2,
  Eye,
  Download,
  Lock,
  RefreshCw,
  FileText,
  TrendingUp,
  ShoppingBag,
  Activity,
  Building2,
  Mail,
  DollarSign,
  Package,
  AlertTriangle
} from "lucide-react";

export default function BoothManagement() {
  const { user } = useAuth();
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [action, setAction] = useState(""); // "approve" or "reject"
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [selectedForPoll, setSelectedForPoll] = useState([]); // booking objects
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollError, setPollError] = useState("");

  // Delete poll modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pollToDelete, setPollToDelete] = useState(null);
  const [deletingPoll, setDeletingPoll] = useState(false);
  // Polls state (show results below table)
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(true);

  // Map voterId -> displayName (cached)
  const [voterMap, setVoterMap] = useState({});

  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesBooking, setAttendeesBooking] = useState(null);
  const [attendees, setAttendees] = useState([]);

  const hasPermission = user?.role === "Admin" || user?.role === "Event Office";
  const isEventOffice = user?.role === "Event Office";
  // allow Admin and Event Office to view/download attendee IDs
  const canViewAttendees = hasPermission;

  // Fetch pending booth bookings
  const fetchPendingBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events/booth-bookings/pending");
      setPendingBookings(response.data.bookings || []);
    } catch (error) {
      console.error("Error fetching pending bookings:", error);
      toast.error("Failed to load pending booth applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission) {
      fetchPendingBookings();
    }
    // Event Office should also load polls created by them
    if (isEventOffice) {
      fetchPolls();
    }
  }, [hasPermission, isEventOffice]);

  // Fetch polls created by this Event Office
  const fetchPolls = async () => {
    try {
      setLoadingPolls(true);
      const res = await api.get("/events/booth-polls");
      const all = Array.isArray(res.data) ? res.data : [];
      // show polls created by this Event Office (most recent first)
      const mine = all
        .filter((p) => String(p.createdBy || p.createdBy?._id) === String(user?._id || user?.id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPolls(mine);

      // Resolve voter names for any votes we don't already have
      const ids = new Set();
      mine.forEach((p) => {
        (p.votes || []).forEach((v) => {
          const uid = String(v.user || "");
          if (uid && !voterMap[uid]) ids.add(uid);
        });
      });

      if (ids.size > 0) {
        const idArray = Array.from(ids);
        // fetch each user (no batch endpoint assumed)
        const results = await Promise.allSettled(
          idArray.map((id) => api.get(`/users/${id}`).catch((e) => ({ error: e })))
        );
        const nextMap = { ...voterMap };
        results.forEach((r, i) => {
          const id = idArray[i];
          if (r.status === "fulfilled" && r.value && r.value.data) {
            const u = r.value.data;
            const name =
              u.name ||
              u.fullName ||
              (u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null) ||
              null;
            nextMap[id] = name || String(id).slice(0, 8);
          } else {
            // fallback to truncated id
            nextMap[id] = String(id).slice(0, 8);
          }
        });
        setVoterMap(nextMap);
      }
    } catch (err) {
      console.error("Failed to fetch polls:", err);
      setPolls([]);
    } finally {
      setLoadingPolls(false);
    }
  };

  // display name for a vote entry
  const displayVoterName = (vote) => {
    if (!vote) return "Unknown";
    if (vote.user && typeof vote.user === "object") {
      // populated user object
      return vote.user.name || vote.user.fullName || `${vote.user.firstName || ""} ${vote.user.lastName || ""}`.trim() || String(vote.user._id || "").slice(0, 8);
    }
    const id = String(vote.user || "");
    return voterMap[id] || id.slice(0, 8);
  };

  // toggle poll status (close / open). Close uses existing endpoint; open attempts an /open endpoint then falls back to generic patch.
  const togglePollStatus = async (p) => {
    try {
      if (!isEventOffice) return;
      if (p.status === "open") {
        await api.patch(`/events/booth-polls/${p._id}/close`);
        toast.success("Poll closed");
      } else {
        try {
          await api.patch(`/events/booth-polls/${p._id}/open`);
        } catch (e) {
          await api.patch(`/events/booth-polls/${p._id}`, { status: "open" });
        }
        toast.success("Poll opened");
      }
      await fetchPolls();
    } catch (err) {
      console.error("togglePollStatus error:", err);
      toast.error(err?.response?.data?.message || "Failed to toggle poll status");
    }
  };

  // Open delete confirmation modal for a poll (Event Office only)
  const openDeleteModal = (p) => {
    if (!isEventOffice) return;
    setPollToDelete(p);
    setShowDeleteModal(true);
  };

  // Perform delete (Event Office only) — called from modal confirm
  const deletePoll = async (pollId) => {
    if (!isEventOffice) return;
    try {
      await api.delete(`/events/booth-polls/${pollId}`);
      await fetchPolls();
      return true;
    } catch (err) {
      console.error("deletePoll error:", err);
      throw err;
    }
  };

  const confirmDeletePoll = async () => {
    if (!isEventOffice || !pollToDelete) return;
    const id = pollToDelete._id;
    try {
      setDeletingPoll(true);
      await deletePoll(id);
      toast.success("Poll deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete poll");
    } finally {
      setDeletingPoll(false);
      setShowDeleteModal(false);
      setPollToDelete(null);
    }
  };

  // Handle approve/reject action
  const handleAction = (booking, actionType) => {
    setSelectedBooking(booking);
    setAction(actionType);
    setRejectionReason("");
    setShowModal(true);
  };

  // Submit the action
  const handleSubmit = async () => {
    if (!selectedBooking) return;

    try {
      if (action === "approve") {
        await api.patch(`/events/booth-booking/${selectedBooking._id}/approve`, {
          approvedBy: user?._id,
        });
        toast.success("Booth booking approved successfully!");
      } else if (action === "reject") {
        if (!rejectionReason.trim()) {
          toast.error("Please provide a reason for rejection");
          return;
        }
        await api.patch(`/events/booth-booking/${selectedBooking._id}/reject`, {
          rejectionReason: rejectionReason.trim(),
        });
        toast.success("Booth booking rejected successfully!");
      }

      // Refresh the list
      await fetchPendingBookings();
      setShowModal(false);
      setSelectedBooking(null);
      setAction("");
      setRejectionReason("");
    } catch (error) {
      console.error("Error processing booking:", error);
      toast.error(`Failed to ${action} booth booking`);
    }
  };

  // Toggle selection for poll
  const togglePollSelection = (booking) => {
    if (!isEventOffice) return;
    setSelectedForPoll((prev) => {
      const exists = prev.find((b) => b._id === booking._id);
      if (exists) return prev.filter((b) => b._id !== booking._id);
      return [...prev, booking];
    });
  };

  // Validate that selected bookings share location and that at least two overlap in time
  const pollValidation = (() => {
    if (selectedForPoll.length < 2) return { ok: false, reason: "Select at least 2 bookings" };

    const loc = selectedForPoll[0]?.booth?.location;
    for (let b of selectedForPoll) {
      if (b.booth?.location !== loc) return { ok: false, reason: "Locations differ" };
    }

    // Build ranges and check any overlap
    const parseWeeks = (durationStr) => {
      if (typeof durationStr === "number") return durationStr;
      const m = String(durationStr || "").match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    };
    const getEnd = (b) => {
      if (b.endDate) return new Date(b.endDate);
      const w = parseWeeks(b.duration);
      const e = new Date(b.startDate);
      e.setDate(e.getDate() + (w > 0 ? w * 7 : 0));
      return e;
    };

    const ranges = selectedForPoll.map((b) => ({
      start: new Date(b.startDate),
      end: getEnd(b),
    }));

    let hasOverlap = false;
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const a = ranges[i], b = ranges[j];
        if (a.start <= b.end && b.start <= a.end) {
          hasOverlap = true;
          break;
        }
      }
      if (hasOverlap) break;
    }

    if (!hasOverlap) return { ok: false, reason: "No overlapping dates" };
    return { ok: true, reason: "" };
  })();

  const openPollModal = () => {
    setShowPollModal(true);
    setPollError("");
  };

  const resetPollState = () => {
    setShowPollModal(false);
    setSelectedForPoll([]);
    setCreatingPoll(false);
    setPollError("");
  };

  const createPoll = async () => {
    if (!pollValidation.ok) {
      setPollError(pollValidation.reason);
      return;
    }
    try {
      setCreatingPoll(true);
      const bookingIds = selectedForPoll.map((b) => b._id);
      await api.post("/events/booth-polls", { bookingIds });
      toast.success("Poll created");
      resetPollState();
      // Optionally refresh pending bookings (poll creation does not approve/reject them)
      fetchPendingBookings();
      // refresh poll results after creating
      fetchPolls();
    } catch (err) {
      console.error("createPoll error:", err);
      setPollError(err.response?.data?.message || "Failed to create poll");
    } finally {
      setCreatingPoll(false);
    }
  };

  const openAttendees = async (booking) => {
    if (!canViewAttendees) return;
    setAttendeesBooking(booking);
    setShowAttendeesModal(true);
    setAttendees([]);
    setAttendeesLoading(true);
    try {
      const res = await api.get(`/events/booth-booking/${booking._id}/attendees`);
      setAttendees(res.data.attendees || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load attendees");
    } finally {
      setAttendeesLoading(false);
    }
  };

  const viewAttendeeId = async (index) => {
    if (!attendeesBooking) return;
    try {
      const res = await api.get(
        `/events/booth-booking/${attendeesBooking._id}/attendees/${index}/id`
      );
      const { contentType, data } = res.data;
      const byteChars = atob(data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: contentType });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to view ID");
    }
  };

  const downloadAttendeeId = async (index) => {
    if (!attendeesBooking) return;
    try {
      const res = await api.get(
        `/events/booth-booking/${attendeesBooking._id}/attendees/${index}/id/download`,
        { responseType: "blob" }
      );
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendee-${index}-id`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download ID");
    }
  };

  // Calculate statistics
  const stats = {
    total: pendingBookings.length,
    totalAttendees: pendingBookings.reduce((sum, b) => sum + (Array.isArray(b.attendees) ? b.attendees.length : 0), 0),
    activePolls: polls.filter(p => p.status === "open").length,
    totalPolls: polls.length,
  };

  // Table columns configuration
  const columns = [
    // NEW: selection checkbox (Event Office only)
    isEventOffice
      ? {
          key: "_select",
          label: "Poll",
          render: (_, booking) => (
            <input
              type="checkbox"
              className="accent-yellow-500 h-4 w-4 cursor-pointer"
              onChange={() => togglePollSelection(booking)}
              checked={!!selectedForPoll.find((b) => b._id === booking._id)}
              title="Include in conflict poll"
            />
          ),
        }
      : null,
    {
      key: "companyName",
      label: "Company",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Store className="h-4 w-4 text-blue-400" />
          </div>
          <span className="font-semibold text-white">{value}</span>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (value, booking) => (
        <div className="flex items-center gap-2 text-white">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{booking?.booth?.location || value || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      render: (value) => (
        <div className="flex items-center gap-2 text-white">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>{value || "N/A"}</span>
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
      key: "createdAt",
      label: "Applied",
      render: (value) => (
        <span className="text-sm text-gray-400">
          {value ? new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
          }) : "N/A"}
        </span>
      ),
    },
    {
      key: "attendeesActions",
      label: "View Details",
      render: (_, booking) =>
        canViewAttendees ? (
          <button
            onClick={() => openAttendees(booking)}
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
  ].filter(Boolean);

  // Check permissions
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
                You don't have permission to manage booth applications. Please contact an administrator.
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
            <p className="text-gray-400 font-medium">Loading booth applications...</p>
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
                  Booth Applications
                </h2>
                {user?.role === "Admin" && (
                  <span className="text-xs font-medium text-blue-400 ml-1">Admin View</span>
                )}
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Review and manage pending booth booking applications from vendors.
            </p>
          </div>
          <button
            onClick={fetchPendingBookings}
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
              <p className="text-sm text-gray-400">Across all bookings</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
              <Vote className="h-7 w-7 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Active Polls
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.activePolls}</p>
              <p className="text-sm text-gray-400">Currently open</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="h-7 w-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Total Polls
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.totalPolls}</p>
              <p className="text-sm text-gray-400">All time</p>
            </div>
          </div>
        </div>
      </div>

      {pendingBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Store className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Applications</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                There are currently no pending booth applications to review. Check back later for new submissions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg mb-6">
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
                    {pendingBookings.length} application{pendingBookings.length !== 1 ? "s" : ""} awaiting review
                  </p>
                </div>
              </div>
            </div>
            <DynamicTable
              columns={columns}
              data={pendingBookings}
              onEdit={null}
              onCreate={null}
            />
          </div>

          {/* Create Poll Button */}
          {isEventOffice && (
            <div className="mb-6">
              <button
                type="button"
                onClick={openPollModal}
                disabled={!pollValidation.ok}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-200 ${
                  !pollValidation.ok
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
                }`}
                title="Create a conflict poll for selected bookings"
              >
                <Vote className="h-5 w-5" />
                Create Conflict Poll
                {selectedForPoll.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {selectedForPoll.length}
                  </span>
                )}
              </button>
              {!pollValidation.ok && selectedForPoll.length > 0 && (
                <p className="text-sm text-red-400 mt-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {pollValidation.reason}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Enhanced Poll Results Section */}
      {isEventOffice && (
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
          <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Conflict Polls</h3>
                  <p className="text-sm text-gray-400">
                    {polls.length} poll{polls.length !== 1 ? "s" : ""} created
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            {loadingPolls ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500 mx-auto mb-3"></div>
                <p className="text-sm text-gray-400">Loading polls...</p>
              </div>
            ) : polls.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 mx-auto mb-3">
                  <Vote className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-400">No polls created yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((p) => (
                  <div key={p._id} className="group rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 overflow-hidden transition-all duration-200">
                    {/* Poll Header */}
                    <div className="border-b border-gray-700/50 px-4 py-3 bg-gray-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <MapPin className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-white capitalize">{p.location}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {p.startDate ? new Date(p.startDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric"
                              }) : "N/A"}
                              {" → "}
                              {p.endDate ? new Date(p.endDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric"
                              }) : "N/A"}
                              <span className="mx-1">•</span>
                              <Clock className="h-3 w-3" />
                              {p.duration}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            p.status === "open"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                          }`}>
                            {p.status === "open" ? <Activity className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {p.status}
                          </span>
                          <button
                            onClick={() => togglePollStatus(p)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 ${
                              p.status === "open"
                                ? "bg-yellow-600 hover:bg-yellow-500"
                                : "bg-green-600 hover:bg-green-500"
                            }`}
                          >
                            {p.status === "open" ? "Close Poll" : "Open Poll"}
                          </button>
                          <button
                            onClick={() => openDeleteModal(p)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 transition-all duration-200"
                            title="Delete this poll"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Poll Votes */}
                    <div className="p-4">
                      <div className="space-y-3">
                        {(p.candidates || []).map((c) => {
                          const cid = String(c._id);
                          const votes = p.tallies?.[cid] ?? 0;
                          const voters = (p.votes || []).filter((v) => String(v.voteFor) === cid);
                          const maxVotes = Math.max(...Object.values(p.tallies || {}), 1);
                          const percentage = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
                          
                          return (
                            <div key={cid} className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10">
                                    <Store className="h-3.5 w-3.5 text-blue-400" />
                                  </div>
                                  <span className="font-medium text-white">{c.companyName || "Vendor"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-white">{votes}</span>
                                  <span className="text-xs text-gray-400">vote{votes !== 1 ? "s" : ""}</span>
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>

                              {/* Voters List */}
                              {voters.length > 0 && (
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                                    View voters ({voters.length})
                                  </summary>
                                  <ul className="mt-2 space-y-1 text-xs text-gray-300 pl-4">
                                    {voters.map((v, i) => (
                                      <li key={i} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                        <span>{v.email || "Unknown"}</span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-400">{v.role || "Voter"}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Approve/Reject Confirmation Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setSelectedBooking(null);
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
                      {action === "approve" ? "Approve Booth Application" : "Reject Booth Application"}
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
                    setSelectedBooking(null);
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
                    <Store className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Company Name</p>
                    <p className="text-white font-semibold text-lg">
                      {selectedBooking.companyName || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                      <MapPin className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Location</p>
                      <p className="text-sm text-gray-200 capitalize">
                        {selectedBooking.booth?.location || selectedBooking.location || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Duration</p>
                      <p className="text-sm text-gray-200">
                        {selectedBooking.duration || "N/A"}
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
                        {selectedBooking.startDate 
                          ? new Date(selectedBooking.startDate).toLocaleDateString("en-US", {
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
                        {selectedBooking.attendees?.length || 0} registered
                      </p>
                    </div>
                  </div>

                  {selectedBooking.booth?.size && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <Package className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Booth Size</p>
                        <p className="text-sm text-gray-200">{selectedBooking.booth.size}</p>
                      </div>
                    </div>
                  )}

                  {selectedBooking.booth?.price != null && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Price</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          EGP {Number(selectedBooking.booth.price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
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
                        This vendor will be notified and their booth booking status will be updated to "Approved - Awaiting Payment". 
                        They will be able to proceed with payment to secure their booth space.
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
                  setSelectedBooking(null);
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

      {/* Enhanced Poll Creation Modal */}
      {showPollModal && isEventOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={resetPollState}
          />
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Vote className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Create Booth Conflict Poll</h3>
                    <p className="text-sm text-gray-400">Let the community vote on booth allocation</p>
                  </div>
                </div>
                <button
                  onClick={resetPollState}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Info Message */}
              <div className="rounded-xl bg-blue-900/20 border border-blue-800/30 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-1">Community Voting</p>
                  <p className="text-sm text-blue-200">
                    This poll lets students, professors, TAs, and staff vote on which vendor should get the booth for the specified location and duration.
                  </p>
                </div>
              </div>

              {/* Selected Bookings Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <Vote className="h-4 w-4 text-yellow-400" />
                  </div>
                  <h4 className="font-semibold text-white">
                    Selected Bookings ({selectedForPoll.length})
                  </h4>
                </div>

                {selectedForPoll.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 mx-auto mb-3">
                      <Store className="h-6 w-6 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-400">No bookings selected yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedForPoll.map((b) => (
                      <div
                        key={b._id}
                        className="group rounded-lg border border-gray-700/50 bg-gray-900/50 hover:bg-gray-800/50 p-3 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                              <Store className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{b.companyName}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="capitalize">{b.booth?.location}</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(b.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {b.duration}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePollSelection(b)}
                            className="flex-shrink-0 text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Validation Messages */}
              {!pollValidation.ok && selectedForPoll.length > 0 && (
                <div className="rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-1">Requirements Not Met</p>
                    <p className="text-sm text-red-200">
                      {pollValidation.reason}. All selected bookings must share the same location and have overlapping date ranges.
                    </p>
                  </div>
                </div>
              )}

              {pollError && (
                <div className="rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-1">Error</p>
                    <p className="text-sm text-red-200">{pollError}</p>
                  </div>
                </div>
              )}

              {creatingPoll && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500"></div>
                  Creating poll...
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={resetPollState}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={createPoll}
                disabled={!pollValidation.ok || creatingPoll}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  pollValidation.ok && !creatingPoll
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
                    : "bg-gray-600"
                }`}
              >
                <Vote className="h-4 w-4" />
                Create Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Poll Modal */}
      {showDeleteModal && isEventOffice && pollToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false);
              setPollToDelete(null);
              setDeletingPoll(false);
            }}
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
                    <h3 className="text-xl font-bold text-white">Delete Poll</h3>
                    <p className="text-sm text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPollToDelete(null);
                    setDeletingPoll(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Warning Message */}
              <div className="rounded-xl bg-yellow-900/20 border border-yellow-800/30 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300 mb-1">Warning</p>
                  <p className="text-sm text-yellow-200">
                    Deleting this poll will permanently remove all votes and candidate information. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Poll Details Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                    <Vote className="h-4 w-4 text-red-400" />
                  </div>
                  <h4 className="font-semibold text-white">Poll to be deleted</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20 flex-shrink-0">
                      <MapPin className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Location</p>
                      <p className="text-sm text-white capitalize">{pollToDelete.location || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Duration</p>
                      <p className="text-sm text-white">{pollToDelete.duration || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                      <Calendar className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date Range</p>
                      <p className="text-sm text-white">
                        {pollToDelete.startDate 
                          ? new Date(pollToDelete.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "N/A"}
                        {" → "}
                        {pollToDelete.endDate 
                          ? new Date(pollToDelete.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Votes</p>
                      <p className="text-sm text-white">
                        {pollToDelete.votes?.length || 0} vote{pollToDelete.votes?.length !== 1 ? "s" : ""} cast
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {deletingPoll && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-red-500"></div>
                  Deleting poll...
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPollToDelete(null);
                  setDeletingPoll(false);
                }}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePoll}
                disabled={deletingPoll}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Delete Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendees Modal - enhanced styling */}
      {showAttendeesModal && canViewAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowAttendeesModal(false);
              setAttendeesBooking(null);
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
                    {attendeesBooking?.companyName || attendeesBooking?.vendor?.companyName || "Vendor"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAttendeesModal(false);
                  setAttendeesBooking(null);
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
                  setAttendeesBooking(null);
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
