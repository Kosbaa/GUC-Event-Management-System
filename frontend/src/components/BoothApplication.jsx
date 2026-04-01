import React, { useState, useEffect, useMemo } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  UploadCloud,
  CheckCircle2,
  MapPin,
  CalendarClock,
  Store,
  DollarSign,
  TrendingUp,
  Users,
  Award,
  Clock,
  FileText,
  User,
  Mail,
  XCircle,
  CheckCircle,
  Package,
  AlertCircle,
  Info,
  Briefcase,
  RefreshCw,
  Eye,
  Calendar,
} from "lucide-react";
import DynamicModal from "./DynamicModal";

const boothPositions = {
  north: { top: "12%", left: "50%" },
  "north-east": { top: "18%", left: "78%" },
  "north-west": { top: "18%", left: "28%" },
  east: { top: "50%", left: "80%" },
  west: { top: "50%", left: "20%" },
  "south-east": { top: "78%", left: "72%" },
  "south-west": { top: "78%", left: "20%" },
  south: { top: "80%", left: "50%" },
};

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Not set";
  return numeric.toLocaleString("en-EG", {
    style: "currency",
    currency: "EGP",
  });
};

export default function BoothApplication({ onSubmitted }) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [attendees, setAttendees] = useState([{ name: "", email: "" }]);
  const [idFiles, setIdFiles] = useState([null]);
  const [form, setForm] = useState({
    companyName: "",
    duration: "1 week",
    startDate: "",
    location: "",
    boothId: "",
    boothPricePerWeek: 0,
  });
  const [booths, setBooths] = useState([]);
  const [loadingBooths, setLoadingBooths] = useState(false);
  const [selectedBoothDetails, setSelectedBoothDetails] = useState(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      companyName: user?.name || user?.companyName || prev.companyName,
    }));
  }, [user?.name, user?.companyName]);

  useEffect(() => {
    const fetchBooths = async () => {
      try {
        setLoadingBooths(true);
        const res = await api.get("/events/booths");
        const list = Array.isArray(res.data?.booths)
          ? res.data.booths
          : Array.isArray(res.data)
          ? res.data
          : [];
        setBooths(list);
      } catch (error) {
        console.error("Failed to load booths", error);
        toast.error("Unable to load booth locations.");
      } finally {
        setLoadingBooths(false);
      }
    };
    fetchBooths();
  }, []);

  const addAttendee = () => {
    if (attendees.length < 5) {
      setAttendees([...attendees, { name: "", email: "" }]);
      setIdFiles((prev) => [...prev, null]);
    } else {
      toast.error("You can add up to 5 attendees only");
    }
  };

  const removeAttendee = (index) => {
    if (attendees.length > 1) {
      setAttendees(attendees.filter((_, i) => i !== index));
      setIdFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateAttendee = (index, field, value) => {
    const updated = [...attendees];
    updated[index][field] = value;
    setAttendees(updated);
  };

  const handleIdFileChange = (index, file) => {
    setIdFiles((prev) => {
      const arr = [...prev];
      arr[index] = file || null;
      return arr;
    });
  };

  const handleSelectBooth = (booth) => {
    setForm((prev) => ({
      ...prev,
      location: booth.location,
      boothId: booth._id,
      boothPricePerWeek: booth.pricePerWeek,
    }));
  };

  const handleBoothApplication = async (formData) => {
    try {
      console.log("Form data received:", formData);
      console.log("Form state:", form);

      const validAttendees = attendees.filter(
        (attendee) => attendee.name.trim() && attendee.email.trim()
      );

      if (validAttendees.length === 0) {
        toast.error("Please add at least one attendee");
        return;
      }

      const fd = new FormData();
      fd.append("companyName", formData.companyName);
      fd.append("vendor", user.id);
      fd.append("attendees", JSON.stringify(validAttendees));
      fd.append("duration", formData.duration);
      fd.append("startDate", formData.startDate);
      fd.append("location", formData.location);
      validAttendees.forEach((_, idx) => {
        const file = idFiles[idx];
        if (file) fd.append("idFiles", file);
      });

      if (!formData.boothId || !formData.location) {
        toast.error("Please select a booth location before submitting.");
        return;
      }

      const apiData = {
        companyName: formData.companyName,
        vendor: user.id,
        attendees: validAttendees,
        duration: formData.duration,
        startDate: formData.startDate,
        location: formData.location,
        boothId: formData.boothId,
      };
      console.log("Data being sent to API:", apiData);

      await api.post("/events/booth-book", fd);

      toast.success(
        "Booth booking application submitted successfully! Event office will review and approve if space is available."
      );
      if (typeof onSubmitted === "function") {
        try {
          onSubmitted();
        } catch (_) {}
      }
      setShowModal(false);
      setForm({
        companyName: "",
        duration: "1 week",
        startDate: "",
        location: "",
        boothId: "",
        boothPricePerWeek: 0,
      });
      setAttendees([{ name: "", email: "" }]);
      setIdFiles([null]);
    } catch (err) {
      console.error(err);
      const serverDetails =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.map((e) => e.msg).join(", ")
          : null);
      toast.error(
        serverDetails
          ? `Failed to submit booth application: ${serverDetails}`
          : "Failed to submit booth application"
      );
    }
  };

  const fields = [
    {
      name: "companyName",
      type: "text",
      placeholder: "Your Company Name",
      label: "Company Name",
      required: true,
    },
    {
      name: "duration",
      type: "select",
      label: "Duration",
      required: true,
      options: [
        { value: "1 week", label: "1 Week" },
        { value: "2 weeks", label: "2 Weeks" },
        { value: "3 weeks", label: "3 Weeks" },
        { value: "4 weeks", label: "4 Weeks" },
      ],
    },
    {
      name: "startDate",
      type: "date",
      label: "Start Date",
      required: true,
    },
  ];

  const selectedBooth = useMemo(
    () => booths.find((booth) => booth._id === form.boothId),
    [booths, form.boothId]
  );

  const durationWeeks = useMemo(() => {
    const match = form.duration?.match(/\d+/);
    return match ? Number(match[0]) || 1 : 1;
  }, [form.duration]);

  const estimatedPrice = useMemo(() => {
    if (!selectedBooth) return 0;
    return (selectedBooth.pricePerWeek || 0) * durationWeeks;
  }, [selectedBooth, durationWeeks]);

  const { placedBooths, unplacedBooths } = useMemo(() => {
    const placed = [];
    const unplaced = [];
    booths.forEach((booth) => {
      if (boothPositions[booth.location]) {
        placed.push(booth);
      } else {
        unplaced.push(booth);
      }
    });
    return { placedBooths: placed, unplacedBooths: unplaced };
  }, [booths]);

  const stats = useMemo(() => {
    return {
      total: booths.length,
      available: booths.filter((b) => b.isAvailable !== false).length,
      priceRange: booths.length > 0 ? {
        min: Math.min(...booths.map(b => b.pricePerWeek || 0)),
        max: Math.max(...booths.map(b => b.pricePerWeek || 0))
      } : { min: 0, max: 0 }
    };
  }, [booths]);

  const boothGrid = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-white mb-1">
            Select Booth Location
          </label>
          <p className="text-xs text-gray-400">
            Click on a booth to view details and select
          </p>
        </div>
        {form.location && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <MapPin className="h-3 w-3" />
            {form.location.replace(/-/g, " ")}
          </span>
        )}
      </div>

      {loadingBooths ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"></div>
            <p className="text-gray-400 font-medium">Loading booth locations...</p>
          </div>
        </div>
      ) : booths.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Store className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Booths Available
              </h3>
              <p className="text-sm text-gray-400">
                Please contact the Event Office for booth availability.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Interactive Booth Map */}
          <div className="relative w-full max-w-4xl mx-auto">
            <div
              className="relative w-full rounded-2xl border border-gray-700 overflow-hidden shadow-2xl"
              style={{
                backgroundImage: "url('/GUCPlat.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30 pointer-events-none rounded-2xl" />
              <img
                src="/GUCPlat.png"
                alt="Booth map"
                className="w-full opacity-0 select-none pointer-events-none"
              />
              {placedBooths.map((booth) => {
                const isActive = booth._id === form.boothId;
                const pos = boothPositions[booth.location];
                return (
                  <button
                    type="button"
                    key={booth._id}
                    onClick={() => handleSelectBooth(booth)}
                    onMouseEnter={() => setSelectedBoothDetails(booth)}
                    onMouseLeave={() => setSelectedBoothDetails(null)}
                    title={`${booth.boothName || "Booth"} • ${formatCurrency(
                      booth.pricePerWeek
                    )}`}
                    style={{
                      top: pos.top,
                      left: pos.left,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`absolute flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 text-[10px] font-bold transition-all duration-200 ${
                      isActive
                        ? "border-blue-400 bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.9)] scale-125 z-10"
                        : "border-white bg-white/90 text-gray-900 hover:bg-blue-200 hover:border-blue-300 hover:scale-110 hover:shadow-lg"
                    }`}
                  >
                    <Store className="h-3 w-3 sm:h-4 sm:h-4" />
                  </button>
                );
              })}

              {/* Hover Tooltip */}
              {selectedBoothDetails && selectedBoothDetails._id !== form.boothId && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: boothPositions[selectedBoothDetails.location]?.top,
                    left: boothPositions[selectedBoothDetails.location]?.left,
                    transform: "translate(-50%, -120%)",
                  }}
                >
                  <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl min-w-[200px]">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                      {selectedBoothDetails.location}
                    </p>
                    <p className="text-sm font-bold text-white mb-2">
                      {selectedBoothDetails.boothName || "Booth"}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Weekly Rate:</span>
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(selectedBoothDetails.pricePerWeek)}
                      </span>
                    </div>
                    {selectedBoothDetails.size && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-400">Size:</span>
                        <span className="text-blue-400 font-medium">
                          {selectedBoothDetails.size}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Unplaced Booths Grid */}
          {unplacedBooths.length > 0 && (
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <p className="text-sm font-semibold text-white">
                  Additional Booth Locations
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unplacedBooths.map((booth) => {
                  const isActive = booth._id === form.boothId;
                  return (
                    <button
                      type="button"
                      key={booth._id}
                      onClick={() => handleSelectBooth(booth)}
                      className={`group rounded-xl border p-4 text-left transition-all duration-200 ${
                        isActive
                          ? "border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                          : "border-gray-700 bg-gray-900/40 hover:border-blue-400/60 hover:bg-gray-800/60"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-blue-500/20 border border-blue-500/30"
                              : "bg-gray-800 border border-gray-700"
                          }`}
                        >
                          <Store
                            className={`h-5 w-5 ${
                              isActive ? "text-blue-400" : "text-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {booth.boothName || "Booth"}
                          </p>
                          <p className="text-xs text-gray-400 capitalize truncate">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {booth.location}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {booth.size && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Size:</span>
                            <span className="text-blue-400 font-medium">
                              {booth.size}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Weekly:</span>
                          <span
                            className={`text-sm font-bold ${
                              isActive ? "text-blue-400" : "text-emerald-400"
                            }`}
                          >
                            {formatCurrency(booth.pricePerWeek)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Selected Booth Summary */}
      {form.boothId && selectedBooth && (
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
              <CheckCircle className="h-4 w-4 text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">
              Selected Booth Summary
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-purple-400" />
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                  Booth Size
                </p>
              </div>
              <p className="text-lg font-bold text-white">
                {selectedBooth.boothSize || selectedBooth.size || "Standard"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                  Duration
                </p>
              </div>
              <p className="text-lg font-bold text-white">{form.duration}</p>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                  Total Cost
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-400">
                {formatCurrency(estimatedPrice)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="p-6 text-white">
        {/* Enhanced Header Section */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/20">
                  <Store className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    Booth Applications
                  </h2>
                  <p className="text-xs font-medium text-gray-400 ml-1">
                    Campus Booth Reservations
                  </p>
                </div>
              </div>
              <p className="text-base text-gray-400 ml-15 max-w-3xl">
                Reserve your booth space on campus. Select your preferred location, set
                your duration (1-4 weeks), and submit your team details for approval.
              </p>
            </div>
            <button
              onClick={() => {
                const fetchBooths = async () => {
                  try {
                    setLoadingBooths(true);
                    const res = await api.get("/events/booths");
                    const list = Array.isArray(res.data?.booths)
                      ? res.data.booths
                      : Array.isArray(res.data)
                      ? res.data
                      : [];
                    setBooths(list);
                    toast.success("Booth locations refreshed");
                  } catch (error) {
                    console.error("Failed to load booths", error);
                    toast.error("Unable to load booth locations.");
                  } finally {
                    setLoadingBooths(false);
                  }
                };
                fetchBooths();
              }}
              disabled={loadingBooths}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingBooths ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Application Info Card */}
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg mb-6">
          <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  How Booth Applications Work
                </h3>
                <p className="text-sm text-gray-400">
                  Simple 4-step process to secure your space
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
                  <MapPin className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-2">
                  1. Select Location
                </p>
                <p className="text-xs text-gray-400">
                  Choose your preferred booth from the interactive map or list
                </p>
              </div>

              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 mb-3">
                  <CalendarClock className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-2">
                  2. Set Schedule
                </p>
                <p className="text-xs text-gray-400">
                  Pick your start date and duration (1-4 weeks)
                </p>
              </div>

              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-2">
                  3. Add Team
                </p>
                <p className="text-xs text-gray-400">
                  Register up to 5 attendees with their ID documents
                </p>
              </div>

              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-2">
                  4. Get Approved
                </p>
                <p className="text-xs text-gray-400">
                  Review within 2 business days, then payment and setup
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-blue-900/20 to-blue-800/20 p-8 text-center mb-6">
          <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-500/30">
              <Briefcase className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Ready to Reserve Your Booth?
              </h3>
              <p className="text-gray-300 mb-6">
                Join successful vendors reaching 15,000+ students weekly. Apply now and
                get approved within 2 business days.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
              >
                <Briefcase className="h-5 w-5" />
                Start Application
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-900/60 px-4 py-3 rounded-xl border border-gray-700">
                <CheckCircle2 size={18} className="text-green-400" />
                Quick approval process
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
          <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <FileText className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Application Requirements
                </h3>
                <p className="text-sm text-gray-400">
                  Everything you need to prepare before applying
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Company Information
                  </p>
                  <p className="text-xs text-gray-400">
                    Your registered company name and contact details
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Team Members (1-5)
                  </p>
                  <p className="text-xs text-gray-400">
                    Full names and email addresses for all attendees
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    ID Documents
                  </p>
                  <p className="text-xs text-gray-400">
                    Valid national ID for each attendee (PDF, JPG, or PNG)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Event Schedule
                  </p>
                  <p className="text-xs text-gray-400">
                    Preferred start date and booth reservation duration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Application Modal */}
      {showModal && (
        <DynamicModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Booth Application Form"
          description="Complete all required fields to submit your booth reservation request."
          onSubmit={handleBoothApplication}
          fields={fields}
          formState={form}
          setFormState={setForm}
          submitLabel="Submit Application"
          size="xl"
        >
          <div className="space-y-6">
            {/* Booth Selection Section */}
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <MapPin className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Booth Location & Pricing
                </h3>
              </div>

              {form.boothId && selectedBooth ? (
                <div className="mb-4 rounded-xl bg-gray-900/80 border border-gray-800 p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Store className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                          Selected Booth
                        </p>
                        <p className="text-lg font-bold text-white">
                          {selectedBooth.boothName || "Booth"}
                        </p>
                        <p className="text-sm text-gray-300 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-pink-400" />
                          {selectedBooth.location}
                        </p>
                        {selectedBooth.size && (
                          <p className="text-xs text-gray-400 mt-1">
                            Size: {selectedBooth.size}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                        Cost Estimate
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatCurrency(selectedBooth.pricePerWeek)} / week
                      </p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">
                        {formatCurrency(estimatedPrice)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total for {durationWeeks} week{durationWeeks !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-xl bg-yellow-900/20 border border-yellow-800/30 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-300 mb-1">
                      No Booth Selected
                    </p>
                    <p className="text-sm text-yellow-200">
                      Please select a booth location from the map or list below to
                      continue.
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
                {boothGrid}
              </div>
            </div>

            {/* Attendees Section */}
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Users className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Team Information
                    </h3>
                    <p className="text-xs text-gray-400">
                      Add up to 5 representatives with their National IDs
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg">
                  {attendees.length}/5
                </span>
              </div>

              <div className="space-y-4">
                {attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-400" />
                        Attendee {index + 1}
                      </p>
                      {attendees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAttendee(index)}
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                          Full Name <span className="text-blue-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <input
                            type="text"
                            placeholder="Enter full name"
                            value={attendee.name}
                            onChange={(e) =>
                              updateAttendee(index, "name", e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-700 bg-gray-800/60 text-gray-100 placeholder-gray-500 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                          Email Address <span className="text-blue-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Mail className="h-4 w-4 text-gray-500" />
                          </div>
                          <input
                            type="email"
                            placeholder="email@example.com"
                            value={attendee.email}
                            onChange={(e) =>
                              updateAttendee(index, "email", e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-700 bg-gray-800/60 text-gray-100 placeholder-gray-500 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                        National ID Document <span className="text-blue-400">*</span>
                      </label>
                      <label className="relative flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/40 px-4 py-4 hover:border-blue-400 cursor-pointer transition-all duration-200 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform">
                          <UploadCloud className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">
                            {idFiles[index]?.name || "Click to upload ID document"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            PDF, JPG, or PNG (max 5MB)
                          </p>
                        </div>
                        {idFiles[index] && (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        )}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) =>
                            handleIdFileChange(index, e.target.files?.[0] || null)
                          }
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {attendees.length < 5 && (
                <button
                  type="button"
                  onClick={addAttendee}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm font-semibold text-green-300 hover:border-green-400 hover:bg-green-500/20 transition-all duration-200"
                >
                  <Users className="h-4 w-4" />
                  Add Another Attendee
                </button>
              )}
            </div>
          </div>
        </DynamicModal>
      )}
    </>
  );
}
