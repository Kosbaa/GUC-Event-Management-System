import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicModal from "./DynamicModal";
import { useAuth } from "../context/AuthContext";
import {
  ShoppingBag,
  MapPin,
  CalendarRange,
  Clock,
  Store,
  UploadCloud,
  User,
  Mail,
  Phone,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Package,
  Users,
  Briefcase,
  RefreshCw,
  TrendingUp,
  Calendar,
  Info,
} from "lucide-react";

export default function BazaarApplication({ onSubmitted }) {
  const { user } = useAuth();
  const vendorId = user?._id || user?.id;
  const [bazaars, setBazaars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBazaar, setSelectedBazaar] = useState(null);
  const [detailsBazaar, setDetailsBazaar] = useState(null);

  // helper: determine if bazaar location is "on the platform"
  const isBazaarOnPlatform = (bazaar) => {
    if (!bazaar) return false;
    if (bazaar.onPlatform === true) return true;
    if (
      bazaar.locationType &&
      String(bazaar.locationType).toLowerCase().includes("platform")
    )
      return true;
    const loc = String(bazaar.location || "").toLowerCase();
    return (
      loc.includes("platform") ||
      loc.includes("on platform") ||
      loc.includes("in platform")
    );
  };

  const [form, setForm] = useState({
    bazaarId: "",
    companyName: user?.name || "",
    contactEmail: user?.email || "",
    phoneNumber: "",
    businessDescription: "",
    boothSize: "2x2",
  });

  // manage attendees separately (this is the single attendees UI we keep)
  const [attendees, setAttendees] = useState([{ name: "", email: "" }]);

  const [idFiles, setIdFiles] = useState([null]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      companyName: user?.name || prev.companyName,
      contactEmail: user?.email || prev.contactEmail,
    }));
  }, [user?.name, user?.email]);

  // Fetch available bazaars for application
  const fetchBazaars = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/bazaars");
      const today = new Date();
      const availableBazaars = res.data.filter(
        (bazaar) => new Date(bazaar.registrationDeadline) > today
      );
      setBazaars(availableBazaars);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bazaars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBazaars();
  }, []);

  const openDetails = (bazaar) => setDetailsBazaar(bazaar);
  const closeDetails = () => setDetailsBazaar(null);

  const handleBazaarSelect = (bazaar) => {
    setSelectedBazaar(bazaar);
    setForm((prev) => ({ ...prev, bazaarId: bazaar._id }));
    setShowModal(true);
  };

  // Add new attendee (max 5)
  const addAttendee = () => {
    setAttendees((prev) => {
      if (prev.length >= 5) {
        toast.error("You can add up to 5 attendees only");
        return prev;
      }
      return [...prev, { name: "", email: "" }];
    });
    setIdFiles((prev) => [...prev, null]);
  };

  // Remove attendee (only shown when more than 1 attendee)
  const removeAttendee = (index) => {
    setAttendees((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    setIdFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Update attendee field
  const updateAttendee = (index, field, value) => {
    setAttendees((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleIdFileChange = (index, file) => {
    setIdFiles((prev) => {
      const arr = [...prev];
      arr[index] = file || null;
      return arr;
    });
  };

  // Handle form submission
  const handleApplication = async (formData) => {
    try {
      if (!selectedBazaar?._id) return toast.error("No bazaar selected");
      if (!vendorId) return toast.error("Vendor not logged in");

      // Build multipart FormData to include attendee ID files (field name: idFiles)
      const fd = new FormData();
      const validAttendees = attendees.filter(
        (a) => a.name.trim() && a.email.trim()
      );
      fd.append("attendees", JSON.stringify(validAttendees));
      fd.append("boothSize", formData.boothSize);
      if (formData.phoneNumber) fd.append("phoneNumber", formData.phoneNumber);
      if (formData.businessDescription)
        fd.append("businessDescription", formData.businessDescription);
      // Additional marketing fields removed (category/social links)

      // append idFiles for all bazaars
      validAttendees.forEach((_, idx) => {
        const file = idFiles[idx];
        if (file) fd.append("idFiles", file);
      });

      await api.post(
        `/bazaars/vendors/${vendorId}/bazaars/${selectedBazaar._id}/apply`,
        fd
      );

      toast.success("Application submitted successfully!");
      setShowModal(false);
      setForm({
        bazaarId: "",
        companyName: user?.name || "",
        contactEmail: user?.email || "",
        phoneNumber: "",
        businessDescription: "",
        boothSize: "2x2",
      });
      setAttendees([{ name: "", email: "" }]);
      setIdFiles([null]);

      if (typeof onSubmitted === "function") onSubmitted();
    } catch (err) {
      console.error("Failed to submit application:", err);
      toast.error(
        err.response?.data?.message || "Failed to submit application"
      );
    }
  };

  // Main modal fields
  const fields = [
    {
      name: "companyName",
      type: "text",
      placeholder: "Your Company Name",
      label: "Company Name",
      required: true,
    },
    {
      name: "contactEmail",
      type: "email",
      placeholder: "Contact Email",
      label: "Contact Email",
      required: true,
    },
    {
      name: "phoneNumber",
      type: "text",
      placeholder: "Phone Number",
      label: "Phone Number",
      required: true,
    },
    {
      name: "businessDescription",
      type: "textarea",
      placeholder: "Describe your business and what you'll be selling",
      label: "Business Description",
      required: true,
    },
  ];
  const formatCurrency = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "Not set";
    return numeric.toLocaleString("en-EG", {
      style: "currency",
      currency: "EGP",
    });
  };
  const boothPriceHint = useMemo(() => {
    const price =
      form.boothSize === "4x4"
        ? selectedBazaar?.price4x4
        : selectedBazaar?.price2x2;
    return formatCurrency(price);
  }, [form.boothSize, selectedBazaar]);

  const upcomingBazaars = useMemo(() => {
    return [...bazaars].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );
  }, [bazaars]);

  const calculateDaysUntilDeadline = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderPricingRow = (bazaar) => (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Package className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Small Booth
          </p>
        </div>
        <p className="text-sm text-gray-300">2x2 Size</p>
        <p className="text-lg font-bold text-emerald-400 mt-1">
          {formatCurrency(bazaar.price2x2)}
        </p>
      </div>
      <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Large Booth
          </p>
        </div>
        <p className="text-sm text-gray-300">4x4 Size</p>
        <p className="text-lg font-bold text-blue-400 mt-1">
          {formatCurrency(bazaar.price4x4)}
        </p>
      </div>
    </div>
  );

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: bazaars.length,
      closingSoon: bazaars.filter((b) => {
        const days = calculateDaysUntilDeadline(b.registrationDeadline);
        return days <= 7 && days > 0;
      }).length,
      onPlatform: bazaars.filter((b) => isBazaarOnPlatform(b)).length,
      upcoming: bazaars.filter((b) => new Date(b.startDate) > now).length,
    };
  }, [bazaars]);

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading bazaars...</p>
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
                  <ShoppingBag className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                    Bazaar Applications
                  </h2>
                  <p className="text-xs font-medium text-gray-400 ml-1">
                    Vendor Opportunities Portal
                  </p>
                </div>
              </div>
              <p className="text-base text-gray-400 ml-15 max-w-3xl">
                Browse upcoming bazaars, review booth pricing and event details, then
                submit your application before the registration deadline.
              </p>
            </div>
            <button
              onClick={fetchBazaars}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bazaars List */}
        {bazaars.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                <ShoppingBag className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Bazaars Available
                </h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  No bazaars are accepting applications at the moment. Check back soon or
                  contact the Event Office for more details.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {upcomingBazaars.map((bazaar) => {
              const isOnPlatform = isBazaarOnPlatform(bazaar);
              const daysUntilDeadline = calculateDaysUntilDeadline(
                bazaar.registrationDeadline
              );
              const isClosingSoon = daysUntilDeadline <= 7 && daysUntilDeadline > 0;

              return (
                <div
                  key={bazaar._id}
                  className="group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <ShoppingBag className="h-6 w-6 text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="text-xl font-bold text-white">
                              {bazaar.name}
                            </h3>
                            {isOnPlatform && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                                <Store className="h-3 w-3" />
                                On Platform
                              </span>
                            )}
                            {isClosingSoon && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border bg-amber-500/10 border-amber-500/20 text-amber-400">
                                <Clock className="h-3 w-3" />
                                Closing Soon
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <MapPin className="h-4 w-4 text-pink-400 flex-shrink-0" />
                              <span>{bazaar.location || "Location TBA"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <CalendarRange className="h-4 w-4 text-blue-400 flex-shrink-0" />
                              <span>
                                {new Date(bazaar.startDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}{" "}
                                -{" "}
                                {new Date(bazaar.endDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                          Registration Deadline
                        </p>
                        <p className="text-lg font-bold text-yellow-400">
                          {new Date(bazaar.registrationDeadline).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                        {isClosingSoon && (
                          <p className="text-xs text-amber-400 mt-1">
                            {daysUntilDeadline} day{daysUntilDeadline !== 1 ? "s" : ""}{" "}
                            left
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pricing Preview */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-emerald-400" />
                          <p className="text-xs text-gray-400">2x2 Booth</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-400">
                          {formatCurrency(bazaar.price2x2)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-blue-400" />
                          <p className="text-xs text-gray-400">4x4 Booth</p>
                        </div>
                        <p className="text-sm font-bold text-blue-400">
                          {formatCurrency(bazaar.price4x4)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-800">
                      <button
                        onClick={() => openDetails(bazaar)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:border-blue-400 hover:text-white transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleBazaarSelect(bazaar)}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
                      >
                        <Briefcase className="h-4 w-4" />
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Details Modal */}
      {detailsBazaar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDetails}
          />
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <ShoppingBag className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Bazaar Details
                    </p>
                    <h3 className="text-xl font-bold text-white">
                      {detailsBazaar.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              {isBazaarOnPlatform(detailsBazaar) && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                    <Store className="h-3 w-3" />
                    Virtual Booth Available
                  </span>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Location and Dates Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-400" />
                  Event Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 border border-pink-500/20">
                      <MapPin className="h-5 w-5 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Location
                      </p>
                      <p className="text-sm text-gray-200">
                        {detailsBazaar.location || "Location TBA"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Calendar className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Start Date
                      </p>
                      <p className="text-sm text-gray-200">
                        {new Date(detailsBazaar.startDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Calendar className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        End Date
                      </p>
                      <p className="text-sm text-gray-200">
                        {new Date(detailsBazaar.endDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Registration Deadline
                      </p>
                      <p className="text-sm font-semibold text-amber-400">
                        {new Date(
                          detailsBazaar.registrationDeadline
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Booth Pricing
                </h4>
                {renderPricingRow(detailsBazaar)}
              </div>

              {/* Description */}
              {(detailsBazaar.shortDescription || detailsBazaar.description) && (
                <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    About This Bazaar
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {detailsBazaar.shortDescription ||
                      detailsBazaar.description ||
                      "No description provided."}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4 sticky bottom-0 bg-gray-900/95 backdrop-blur-sm">
              <button
                onClick={closeDetails}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  closeDetails();
                  handleBazaarSelect(detailsBazaar);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
              >
                <Briefcase className="h-4 w-4" />
                Apply Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showModal && selectedBazaar && (
        <DynamicModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`Apply to ${selectedBazaar.name}`}
          description="Complete the application below. Fields marked with * are required."
          onSubmit={handleApplication}
          fields={fields}
          formState={form}
          setFormState={setForm}
          submitLabel="Submit Application"
          size="xl"
        >
          <div className="space-y-6">
            {/* Booth Size Selection */}
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-400" />
                    Choose Booth Size
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Select your preferred booth dimensions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Selected Price
                  </p>
                  <p className="text-sm font-bold text-yellow-400">{boothPriceHint}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["2x2", "4x4"].map((sizeOption) => {
                  const isActive = form.boothSize === sizeOption;
                  const price =
                    sizeOption === "4x4"
                      ? selectedBazaar?.price4x4
                      : selectedBazaar?.price2x2;
                  return (
                    <button
                      key={sizeOption}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, boothSize: sizeOption }))
                      }
                      className={`group rounded-xl border p-4 text-left transition-all duration-200 ${
                        isActive
                          ? "border-yellow-400 bg-yellow-500/10 shadow-lg shadow-yellow-500/20"
                          : "border-gray-700 bg-gray-900/40 hover:border-yellow-400/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-yellow-500/20 border border-yellow-500/30"
                              : "bg-gray-800 border border-gray-700"
                          }`}
                        >
                          <Package
                            className={`h-5 w-5 ${
                              isActive ? "text-yellow-400" : "text-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              isActive ? "text-white" : "text-gray-300"
                            }`}
                          >
                            {sizeOption} Booth
                          </p>
                          <p className="text-xs text-gray-400">
                            {sizeOption === "2x2" ? "Small size" : "Large size"}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-lg font-bold ${
                          isActive ? "text-yellow-400" : "text-gray-400"
                        }`}
                      >
                        {formatCurrency(price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attendees Section */}
            <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    Attendee Information
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Add up to 5 representatives with their National IDs
                  </p>
                </div>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">
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
