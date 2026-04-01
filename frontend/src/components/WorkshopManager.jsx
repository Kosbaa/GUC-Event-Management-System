import React, { useState, useEffect } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { MapPin, CalendarRange, Heart, CheckCircle, XCircle, Clock, AlertCircle, Search, Users, DollarSign, FileText, Briefcase, Plus } from "lucide-react";

// Enhanced Modal Component
const WorkshopModal = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  initialData = {},
  loading,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    shortDescription: "",
    fullAgenda: "",
    faculty: "",
    professors: "",
    budget: "",
    fundingSource: "",
    extraResources: "",
    capacity: "",
    registrationDeadline: "",
  });

  // normalize dates to YYYY-MM-DD for <input type="date">
  const formatToDateInput = (val) => {
    if (!val) return "";
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        location: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        shortDescription: "",
        fullAgenda: "",
        faculty: "",
        professors: "",
        budget: "",
        fundingSource: "",
        extraResources: "",
        capacity: "",
        registrationDeadline: "",
        ...initialData,
        startDate: formatToDateInput(initialData.startDate || ""),
        endDate: formatToDateInput(initialData.endDate || ""),
        registrationDeadline: formatToDateInput(
          initialData.registrationDeadline || ""
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleStartDateChange = (e) => {
    const startDate = e.target.value;
    setFormData((prev) => ({
      ...prev,
      startDate,
      endDate: prev.endDate || startDate,
    }));
  };

  const handleStartTimeChange = (e) => {
    const startTime = e.target.value;
    if (startTime && !formData.endTime) {
      const [hours, minutes] = startTime.split(":");
      const endHours = (parseInt(hours) + 2) % 24;
      const endTime = `${endHours.toString().padStart(2, "0")}:${minutes}`;
      setFormData((prev) => ({ ...prev, startTime, endTime }));
    } else {
      setFormData((prev) => ({ ...prev, startTime }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Workshop Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Location *
                </label>
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Location</option>
                  <option value="GUC Cairo">GUC Cairo</option>
                  <option value="GUC Berlin">GUC Berlin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleStartDateChange}
                    className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleStartTimeChange}
                    className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    min={formData.startDate}
                    className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    End Time *
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Description & Agenda
            </h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Short Description *
              </label>
              <textarea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Full Agenda *
              </label>
              <textarea
                name="fullAgenda"
                value={formData.fullAgenda}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                rows={5}
                required
              />
            </div>
          </div>

          {/* Faculty & Professors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Academic Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Faculty *
                </label>
                <select
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Faculty</option>
                  <option value="MET">MET</option>
                  <option value="IET">IET</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Participating Professors *
                </label>
                <input
                  type="text"
                  name="professors"
                  value={formData.professors}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Dr. Smith, Dr. Jones, Prof. Brown"
                  required
                />
              </div>
            </div>
          </div>

          {/* Budget & Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Budget & Resources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Required Budget (EGP) *
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Funding Source *
                </label>
                <select
                  name="fundingSource"
                  value={formData.fundingSource}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Funding Source</option>
                  <option value="External">External</option>
                  <option value="GUC">GUC</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Extra Resources
              </label>
              <textarea
                name="extraResources"
                value={formData.extraResources}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Projectors, whiteboards, lab equipment, etc."
              />
            </div>
          </div>

          {/* Registration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Registration Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Capacity *
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Registration Deadline *
                </label>
                <input
                  type="date"
                  name="registrationDeadline"
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  max={formData.startDate}
                  className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Workshop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function WorkshopManager() {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantsData, setParticipantsData] = useState(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [sendingWorkshopId, setSendingWorkshopId] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsWorkshop, setDetailsWorkshop] = useState(null);

  const formatStatusLabel = (s) => {
    if (!s) return "Pending";
    return String(s)
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatParticipationFee = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "Free";
    }
    return numeric.toLocaleString("en-EG", {
      style: "currency",
      currency: "EGP",
    });
  };

  const parseProfessorsInput = (value) => {
    if (!value) return [];
    return value
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  };

  useEffect(() => {
    if (user?.id) {
      fetchMyWorkshops();
    }
  }, [user?.id]);

  const fetchMyWorkshops = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events/workshops");
      const allWorkshops = response.data || [];
      const myWorkshops = allWorkshops.filter((workshop) => {
        const createdBy =
          workshop?.createdBy?._id ||
          workshop?.createdBy?.id ||
          workshop?.createdBy;
        if (!createdBy || !user?.id) return false;
        return String(createdBy) === String(user.id);
      });
      setWorkshops(myWorkshops);
    } catch (error) {
      toast.error("Failed to fetch workshops. Please try again shortly.");
      console.error("Error fetching workshops:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewParticipants = async (workshop) => {
    try {
      setParticipantsLoading(true);
      const res = await api.get(
        `/events/workshops/${workshop._id}/participants`
      );
      setParticipantsData(res.data?.data || null);
      setShowParticipantsModal(true);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load participants"
      );
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleShowDetails = (workshop) => {
    setDetailsWorkshop(workshop);
    setShowDetailsModal(true);
  };

  const handleCreate = async (formData) => {
    try {
      setLoading(true);
      const submitData = {
        name: formData.name,
        location: formData.location,
        shortDescription: formData.shortDescription,
        agenda: formData.fullAgenda,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        facultyResponsible: formData.faculty,
        professors: parseProfessorsInput(formData.professors),
        budget: Number(formData.budget),
        fundingSource: formData.fundingSource,
        extraResources: formData.extraResources,
        capacity: Number(formData.capacity),
        registrationDeadline: formData.registrationDeadline,
      };
      await api.post("/events/workshop", submitData);
      toast.success("Workshop created. Submitted for Event Office approval.");
      setShowCreateModal(false);
      fetchMyWorkshops();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to create workshop."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (workshop) => {
    setEditingWorkshop(workshop);
    setShowEditModal(true);
  };

  const handleSendCertificates = async (workshopId) => {
    try {
      setSendingWorkshopId(workshopId);
      await api.post(`/events/workshops/${workshopId}/send-certificates`);
      toast.success(
        "Certificates are being sent. Attendees will receive them via email."
      );
      fetchMyWorkshops();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to trigger certificate delivery."
      );
      console.error("send certificates error:", error);
    } finally {
      setSendingWorkshopId(null);
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      setLoading(true);
      const submitData = {
        name: formData.name,
        location: formData.location,
        shortDescription: formData.shortDescription,
        agenda: formData.fullAgenda,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        facultyResponsible: formData.faculty,
        professors: parseProfessorsInput(formData.professors),
        budget: Number(formData.budget),
        fundingSource: formData.fundingSource,
        extraResources: formData.extraResources,
        capacity: Number(formData.capacity),
        registrationDeadline: formData.registrationDeadline,
      };
      await api.patch(`/events/workshop/${editingWorkshop._id}`, submitData);
      toast.success("Workshop updated. Sent for re-approval by Event Office.");
      setShowEditModal(false);
      setEditingWorkshop(null);
      fetchMyWorkshops();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to update workshop."
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate workshop statistics
  const getWorkshopStats = () => {
    const now = new Date();
    
    const accepted = workshops.filter(w => {
      const status = (w.approvalStatus || "").toString().toLowerCase();
      return status === "accepted" || status === "approved";
    }).length;

    const rejected = workshops.filter(w => {
      const status = (w.approvalStatus || "").toString().toLowerCase();
      return status === "rejected";
    }).length;

    const upcoming = workshops.filter(w => {
      const status = (w.approvalStatus || "").toString().toLowerCase();
      const isApproved = status === "accepted" || status === "approved";
      return isApproved && w.startDate && new Date(w.startDate) > now;
    }).length;

    const needsReview = workshops.filter(w => {
      const status = (w.approvalStatus || "").toString().toLowerCase();
      return status === "pending" || status === "needs_edits" || status === "needs edits";
    }).length;

    return { accepted, rejected, upcoming, needsReview };
  };

  const stats = getWorkshopStats();

  // Filter workshops based on search and active filter
  const getFilteredWorkshops = () => {
    const now = new Date();
    let filtered = workshops;

    // Apply status filter
    if (activeFilter !== "All") {
      filtered = filtered.filter(w => {
        const status = (w.approvalStatus || "").toString().toLowerCase();
        
        if (activeFilter === "Accepted") {
          return status === "accepted" || status === "approved";
        }
        if (activeFilter === "Rejected") {
          return status === "rejected";
        }
        if (activeFilter === "Upcoming") {
          const isApproved = status === "accepted" || status === "approved";
          return isApproved && w.startDate && new Date(w.startDate) > now;
        }
        if (activeFilter === "Needs Review") {
          return status === "pending" || status === "needs_edits" || status === "needs edits";
        }
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w => {
        const name = (w.name || "").toLowerCase();
        const location = (w.location || "").toLowerCase();
        const professors = Array.isArray(w.professors) 
          ? w.professors.join(" ").toLowerCase() 
          : "";
        return name.includes(query) || location.includes(query) || professors.includes(query);
      });
    }

    return filtered;
  };

  const filteredWorkshops = getFilteredWorkshops();

  const renderWorkshopsList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredWorkshops.map((workshop) => {
        const endDatePassed =
          workshop.endDate && new Date(workshop.endDate) <= new Date();
        const registrants = Array.isArray(workshop.registrants)
          ? workshop.registrants
          : [];
        const totalCertificates = registrants.length;
        const sentCertificates = registrants.filter(
          (reg) => reg.certificateSent
        ).length;
        const pendingCertificatesCount = Math.max(
          0,
          totalCertificates - sentCertificates
        );
        const pendingCertificates = pendingCertificatesCount > 0;
        const sendingNow = sendingWorkshopId === workshop._id;
        const sendDisabled =
          !endDatePassed || !pendingCertificates || sendingNow;

        return (
          <article
            key={workshop._id}
            className="relative bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200"
          >
            {/* Status + timeline badges */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  endDatePassed
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-purple-500/30 bg-purple-500/10 text-purple-200"
                }`}
              >
                {endDatePassed ? "Past" : "Upcoming"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const st = (workshop.approvalStatus || "")
                    .toString()
                    .toLowerCase();
                  if (st === "rejected") {
                    setNoteModal({
                      title: "Rejection Reason",
                      message:
                        workshop.rejectionReason ||
                        "No reason provided by Event Office.",
                    });
                  } else if (st === "needs_edits" || st === "needs edits") {
                    setNoteModal({
                      title: "Edits Required",
                      message:
                        workshop.editRequestComments ||
                        workshop.editsReason ||
                        workshop.rejectionReason ||
                        "No specific edits mentioned by Event Office.",
                    });
                  }
                }}
                className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${
                  (() => {
                    const st = (workshop.approvalStatus || "")
                      .toString()
                      .toLowerCase();
                    if (st === "accepted" || st === "approved")
                      return "bg-green-500/15 text-green-200 border-green-500/30";
                    if (st === "pending")
                      return "bg-orange-500/15 text-orange-200 border-orange-500/30";
                    if (st === "rejected")
                      return "bg-red-600/15 text-red-200 border-red-500/30 cursor-pointer hover:bg-red-600/25 transition-colors";
                    if (st === "needs_edits" || st === "needs edits")
                      return "bg-amber-600/20 text-amber-200 border-amber-500/40 cursor-pointer hover:bg-amber-600/30 transition-colors";
                    return "bg-gray-600/20 text-gray-200 border-gray-500/40 cursor-default";
                  })()
                } ${
                  (() => {
                    const st = (workshop.approvalStatus || "")
                      .toString()
                      .toLowerCase();
                    return st === "rejected" ||
                      st === "needs_edits" ||
                      st === "needs edits"
                      ? ""
                      : "pointer-events-none";
                  })()
                }`}
                disabled={(() => {
                  const st = (workshop.approvalStatus || "")
                    .toString()
                    .toLowerCase();
                  return !(
                    st === "rejected" ||
                    st === "needs_edits" ||
                    st === "needs edits"
                  );
                })()}
                title={(() => {
                  const st = (workshop.approvalStatus || "")
                    .toString()
                    .toLowerCase();
                  if (st === "rejected") return "Click to view rejection reason";
                  if (st === "needs_edits" || st === "needs edits")
                    return "Click to view required edits";
                  return "";
                })()}
              >
                {formatStatusLabel(workshop.approvalStatus)}
              </button>
            </div>

            <div className="flex flex-col justify-between h-full">
              <div className="pr-8">
                <h4 className="text-lg font-semibold text-yellow-400">
                  {workshop.name}
                </h4>
                {workshop.location && (
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-pink-400" />
                    {workshop.location}
                  </p>
                )}
                {workshop.startDate && (
                  <p className="text-sm text-gray-300 mt-2 flex items-center gap-1">
                    <CalendarRange className="h-4 w-4 text-blue-400" />
                    {(() => {
                      const date = new Date(workshop.startDate);
                      const dateStr = date.toLocaleDateString("en-EG", {
                        timeZone: "Africa/Cairo",
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      const timeStr = workshop.startTime
                        ? (() => {
                            const [hours, minutes] =
                              workshop.startTime.split(":");
                            const hour = parseInt(hours, 10);
                            const period = hour >= 12 ? "PM" : "AM";
                            const displayHour =
                              hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            return `${displayHour}:${minutes} ${period}`;
                          })()
                        : date.toLocaleTimeString("en-US", {
                            timeZone: "Africa/Cairo",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });
                      return `${dateStr} at ${timeStr}`;
                    })()}
                  </p>
                )}
                {Array.isArray(workshop.professors) &&
                  workshop.professors.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Professors: {workshop.professors.join(", ")}
                    </p>
                  )}
              </div>

              <div className="flex justify-between items-center mt-4 gap-4">
                <div className="flex-1 min-w-0">
                  {workshop.capacity != null && (
                    <span className="text-xs text-gray-400 block">
                      Capacity: {workshop.registrants?.length || 0} /{" "}
                      {workshop.capacity}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(workshop)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleShowDetails(workshop)}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-sm rounded-md transition"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleSendCertificates(workshop._id)}
                    disabled={sendDisabled}
                    className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      !endDatePassed
                        ? "Workshop must end before sending certificates"
                        : !pendingCertificates
                        ? "All certificates already sent"
                        : "Send certificates to participants"
                    }
                  >
                    {sendingNow ? "Sending..." : "Certificates"}
                  </button>
                </div>
              </div>
            </div>

            {/* Participants Icon - Below Status Badge */}
            <button
              onClick={() => handleViewParticipants(workshop)}
              className="absolute top-12 right-3 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full p-2 text-purple-300 hover:text-purple-200 transition-all duration-200"
              title={`View participants (${workshop.registrants?.length || 0})`}
              aria-label="View participants"
            >
              <Users className="h-4 w-4" />
            </button>
          </article>
        );
      })}
      {filteredWorkshops.length === 0 && workshops.length === 0 && (
        <div className="col-span-full text-center py-16 text-gray-400">
          <p className="text-lg">No workshops created yet</p>
          <p className="text-sm mt-2">
            Click "Create New Workshop" to get started
          </p>
        </div>
      )}
      {filteredWorkshops.length === 0 && workshops.length > 0 && (
        <div className="col-span-full text-center py-16 text-gray-400">
          <p className="text-lg">No workshops match your filters</p>
          <p className="text-sm mt-2">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Briefcase className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Workshop Manager
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Create, manage, and track your workshop proposals and approvals.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-6 py-3 font-bold text-gray-900 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Create Workshop
          </button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {/* Accepted Workshops */}
          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Approved
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.accepted}</p>
                <p className="text-sm text-gray-400">
                  Ready to go
                </p>
              </div>
            </div>
          </div>

          {/* Rejected Workshops */}
          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Rejected
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.rejected}</p>
                <p className="text-sm text-gray-400">
                  Not approved
                </p>
              </div>
            </div>
          </div>

          {/* Upcoming Workshops */}
          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6 text-blue-400" />
                </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Upcoming
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.upcoming}</p>
                <p className="text-sm text-gray-400">
                  Scheduled
                </p>
              </div>
            </div>
          </div>

          {/* Needs Review */}
          <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                  <AlertCircle className="h-6 w-6 text-orange-400" />
                </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Needs Edits
                </p>
                <p className="text-3xl font-bold text-white mb-1">{stats.needsReview}</p>
                <p className="text-sm text-gray-400">
                  Requires action
                </p>
              </div>
            </div>
          </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5 mb-6 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, location, or professor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter("All")}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === "All"
                  ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/25"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("Accepted")}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === "Accepted"
                  ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/25"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setActiveFilter("Rejected")}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === "Rejected"
                  ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/25"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setActiveFilter("Upcoming")}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === "Upcoming"
                  ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/25"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }
              `}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveFilter("Needs Review")}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === "Needs Review"
                  ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/25"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }
              `}
            >
              Needs Edits
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading workshops...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {renderWorkshopsList()}
        </>
      )}

      {/* Details Modal */}
      {showDetailsModal && detailsWorkshop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-gray-800 via-gray-900 to-gray-900 border border-gray-700/50 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="relative border-b border-gray-700/50 px-8 py-6 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
                      Workshop
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white leading-tight">
                    {detailsWorkshop.name}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setDetailsWorkshop(null);
                  }}
                  className="flex-shrink-0 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600 p-2 text-gray-400 hover:text-white transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-4">
                {/* Location */}
                <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <MapPin className="h-5 w-5 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-1">
                        Location
                      </p>
                      <p className="text-lg text-white font-medium">
                        {detailsWorkshop.location || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Capacity */}
                <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                        Capacity
                      </p>
                      <p className="text-lg text-white font-medium">
                        {detailsWorkshop.registrants?.length || 0} / {detailsWorkshop.capacity} Participants
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {detailsWorkshop.shortDescription && (
                  <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <FileText className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-yellow-300 uppercase tracking-wider mb-2">
                          Description
                        </p>
                        <p className="text-base text-gray-300 leading-relaxed">
                          {detailsWorkshop.shortDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Start Date/Time */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <CalendarRange className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                          Starts
                        </p>
                        <p className="text-base text-white font-medium">
                          {(() => {
                            if (!detailsWorkshop.startDate) return "Not set";
                            const date = new Date(detailsWorkshop.startDate);
                            const dateStr = date.toLocaleDateString("en-EG", {
                              timeZone: "Africa/Cairo",
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                            const timeStr = detailsWorkshop.startTime 
                              ? (() => {
                                  const [hours, minutes] = detailsWorkshop.startTime.split(':');
                                  const hour = parseInt(hours, 10);
                                  const period = hour >= 12 ? 'PM' : 'AM';
                                  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                  return `${displayHour}:${minutes} ${period}`;
                                })()
                              : date.toLocaleTimeString("en-US", {
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
                  </div>
                  {/* End Date/Time */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <CalendarRange className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1">
                          Ends
                        </p>
                        <p className="text-base text-white font-medium">
                          {(() => {
                            if (!detailsWorkshop.endDate) return "Not set";
                            const date = new Date(detailsWorkshop.endDate);
                            const dateStr = date.toLocaleDateString("en-EG", {
                              timeZone: "Africa/Cairo",
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                            const timeStr = detailsWorkshop.endTime 
                              ? (() => {
                                  const [hours, minutes] = detailsWorkshop.endTime.split(':');
                                  const hour = parseInt(hours, 10);
                                  const period = hour >= 12 ? 'PM' : 'AM';
                                  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                  return `${displayHour}:${minutes} ${period}`;
                                })()
                              : date.toLocaleTimeString("en-US", {
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
                  </div>
                </div>

                {/* Registration Deadline */}
                {detailsWorkshop.registrationDeadline && (
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Clock className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                          Registration Deadline
                        </p>
                        <p className="text-base text-white font-medium">
                          {new Date(detailsWorkshop.registrationDeadline).toLocaleDateString("en-EG", {
                            timeZone: "Africa/Cairo",
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Workshop Budget */}
                {detailsWorkshop.budget != null && (
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <DollarSign className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-300 uppercase tracking-wider mb-1">
                          Workshop Budget
                        </p>
                        <p className="text-base text-white font-medium">
                          {Number(detailsWorkshop.budget).toLocaleString("en-EG", {
                            style: "currency",
                            currency: "EGP",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-700/50 px-8 py-5 bg-gray-900/50">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setDetailsWorkshop(null);
                  }}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <WorkshopModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Workshop"
          onSubmit={handleCreate}
          loading={loading}
        />
      )}

      {showEditModal && editingWorkshop && (
        <WorkshopModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingWorkshop(null);
          }}
          title={`Edit Workshop: ${editingWorkshop.name}`}
          onSubmit={handleEditSubmit}
          initialData={{
            name: editingWorkshop.name || "",
            location: editingWorkshop.location || "",
            startDate: editingWorkshop.startDate || "",
            startTime: editingWorkshop.startTime || "",
            endDate: editingWorkshop.endDate || "",
            endTime: editingWorkshop.endTime || "",
            shortDescription: editingWorkshop.shortDescription || "",
            fullAgenda: editingWorkshop.agenda || "",
            faculty:
              editingWorkshop.facultyResponsible ||
              editingWorkshop.faculty ||
              "",
            professors: Array.isArray(editingWorkshop.professors)
              ? editingWorkshop.professors.join(", ")
              : editingWorkshop.professors || "",
            budget: editingWorkshop.budget || "",
            fundingSource: editingWorkshop.fundingSource || "",
            extraResources: editingWorkshop.extraResources || "",
            capacity: editingWorkshop.capacity || "",
            registrationDeadline: editingWorkshop.registrationDeadline || "",
          }}
          loading={loading}
        />
      )}

      {noteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="text-white text-lg font-semibold">
                {noteModal.title}
              </div>
              <button
                className="text-gray-300 hover:text-white"
                onClick={() => setNoteModal(null)}
                aria-label="Close note"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4 text-white text-sm whitespace-pre-wrap">
              {noteModal.message}
            </div>
            <div className="px-5 pb-4 flex justify-end">
              <button
                className="rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
                onClick={() => setNoteModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showParticipantsModal && participantsData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-white">
                Participants — {participantsData.workshopName}
              </h2>
              <button
                onClick={() => {
                  setShowParticipantsModal(false);
                  setParticipantsData(null);
                }}
                className="text-gray-400 hover:text-white text-2xl leading-none"
                type="button"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-gray-300">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-gray-400">Capacity:</span>
                    <span className="ml-2 font-semibold">
                      {participantsData.totalCapacity}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Registered:</span>
                    <span className="ml-2 font-semibold">
                      {participantsData.registeredParticipants}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Remaining Spots:</span>
                    <span className="ml-2 font-semibold">
                      {participantsData.remainingSpots}
                    </span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-300">
                  <thead className="bg-gray-800 text-gray-200">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">UniId</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantsData.participants?.length ? (
                      participantsData.participants.map((p, idx) => (
                        <tr key={idx} className="border-b border-gray-800">
                          <td className="px-4 py-2">{p.name || "-"}</td>
                          <td className="px-4 py-2">{p.UniId || "-"}</td>
                          <td className="px-4 py-2">{p.email || "-"}</td>
                          <td className="px-4 py-2">{p.userType}</td>
                          <td className="px-4 py-2">
                            {p.registeredAt
                              ? new Date(p.registeredAt).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-4 py-6 text-center text-gray-400"
                        >
                          No participants yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowParticipantsModal(false);
                    setParticipantsData(null);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
