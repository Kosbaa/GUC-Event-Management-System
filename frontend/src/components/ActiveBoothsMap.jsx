import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import {
  Store,
  RefreshCw,
  Clock,
  Users,
  AlertCircle,
  MapPin,
  TrendingUp,
  Calendar,
  Package,
  Building2,
  Eye,
  Filter,
  Search,
  DollarSign,
  CheckCircle2,
} from "lucide-react";

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

const normalizeLocationKey = (value = "") =>
  String(value).trim().toLowerCase();

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() || "")
    .join("") || "B";

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "—";
  return numeric.toLocaleString("en-EG", {
    style: "currency",
    currency: "EGP",
  });
};

export default function ActiveBoothsMap() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const fetchActiveBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/events/booth-bookings");
      const list = Array.isArray(res.data?.bookings)
        ? res.data.bookings
        : Array.isArray(res.data)
        ? res.data
        : [];
      setBookings(list);
    } catch (err) {
      console.error("Failed to fetch booth bookings", err);
      setError(
        err?.response?.data?.message ||
          "Unable to load active booths right now."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBookings();
  }, []);

  const isActiveDuringNow = (booking) => {
    const now = new Date();
    const start = booking.startDate ? new Date(booking.startDate) : null;
    const end = booking.endDate ? new Date(booking.endDate) : null;

    if (start && end) return start <= now && now <= end;
    if (start) return start <= now;
    if (end) return now <= end;
    return true;
  };

  const activeBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const status = String(booking.status || "").toLowerCase();
        return (
          status === "approved" &&
          booking.expired !== true &&
          isActiveDuringNow(booking)
        );
      })
      .map((booking) => ({
        id: booking._id || booking.id,
        vendorName:
          booking.vendor?.companyName ||
          booking.companyName ||
          "Vendor (Pending)",
        boothName: booking.booth?.boothName || "Booth",
        location: booking.booth?.location || booking.location || "",
        duration: booking.duration || "—",
        attendees: booking.attendees || [],
        startDate: booking.startDate,
        endDate: booking.endDate,
        boothPrice: booking.boothPrice,
        boothSize: booking.booth?.size || booking.boothSize,
        raw: booking,
      }));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return activeBookings.filter((booking) => {
      const matchesSearch =
        searchQuery === "" ||
        booking.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.boothName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLocation =
        locationFilter === "all" ||
        normalizeLocationKey(booking.location) === normalizeLocationKey(locationFilter);

      return matchesSearch && matchesLocation;
    });
  }, [activeBookings, searchQuery, locationFilter]);

  const { placedBookings, unplacedBookings } = useMemo(() => {
    const placed = [];
    const unplaced = [];
    filteredBookings.forEach((booking) => {
      const key = normalizeLocationKey(booking.location);
      if (boothPositions[key]) {
        placed.push({ ...booking, locationKey: key });
      } else {
        unplaced.push(booking);
      }
    });
    return { placedBookings: placed, unplacedBookings: unplaced };
  }, [filteredBookings]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set();
    activeBookings.forEach((booking) => {
      if (booking.location) {
        locations.add(booking.location);
      }
    });
    return Array.from(locations).sort();
  }, [activeBookings]);

  const stats = useMemo(() => {
    const totalRevenue = activeBookings.reduce((sum, booking) => {
      return sum + (Number(booking.boothPrice) || 0);
    }, 0);

    const totalAttendees = activeBookings.reduce((sum, booking) => {
      return sum + (booking.attendees?.length || 0);
    }, 0);

    return {
      active: activeBookings.length,
      mapped: placedBookings.length,
      revenue: totalRevenue,
      attendees: totalAttendees,
    };
  }, [activeBookings, placedBookings]);

  const renderTimeline = (booking) => {
    if (!booking.startDate && !booking.endDate) return "Dates TBD";
    const formatter = new Intl.DateTimeFormat("en-EG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const start = booking.startDate
      ? formatter.format(new Date(booking.startDate))
      : null;
    const end = booking.endDate
      ? formatter.format(new Date(booking.endDate))
      : null;

    if (start && end) return `${start} → ${end}`;
    if (start) return `Starting ${start}`;
    return `Until ${end}`;
  };

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/20">
                <Store className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                  Live Booth Occupancy
                </h2>
                <p className="text-xs font-medium text-gray-400 ml-1">
                  Real-time Campus Activity
                </p>
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15 max-w-3xl">
              Interactive map showing {activeBookings.length} active vendors currently
              operating on the GUC platform with real-time availability.
            </p>
          </div>
          <button
            onClick={fetchActiveBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-500"></div>
            <p className="text-gray-400 font-medium">Loading active booths...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">
              Unable to Load Booths
            </p>
            <p className="text-sm text-red-200">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Enhanced Search and Filter Section */}
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                  Search Vendors
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by vendor name, booth, or location..."
                    className="w-full rounded-xl border border-gray-700 bg-gray-800/60 text-gray-100 placeholder-gray-500 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="sm:w-64">
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                  Filter by Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Filter className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800/60 text-gray-100 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">All Locations</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc.replace(/-/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {(searchQuery || locationFilter !== "all") && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Showing {filteredBookings.length} of {activeBookings.length} vendors
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setLocationFilter("all");
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Map Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-400" />
                      Interactive Platform Map
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Hover over markers to highlight vendor details
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs font-semibold text-emerald-400">
                        Live
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1.5 rounded-lg">
                      {placedBookings.length} mapped
                    </span>
                  </div>
                </div>

                <div className="relative w-full rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                  <div
                    className="relative w-full"
                    style={{
                      backgroundImage: "url('/GUCPlat.png')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30 pointer-events-none rounded-2xl" />
                    <img
                      src="/GUCPlat.png"
                      alt="Platform map"
                      className="w-full opacity-0 select-none pointer-events-none"
                    />

                    {placedBookings.map((booking) => {
                      const pos = boothPositions[booking.locationKey];
                      const isActive = highlightedId === booking.id;
                      return (
                        <div
                          key={booking.id}
                          style={{
                            top: pos.top,
                            left: pos.left,
                            transform: "translate(-50%, -50%)",
                          }}
                          className={`absolute flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                            isActive ? "scale-125 z-10" : "scale-100"
                          }`}
                          onMouseEnter={() => setHighlightedId(booking.id)}
                          onMouseLeave={() => setHighlightedId(null)}
                        >
                          <div
                            className={`flex items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-200 ${
                              isActive
                                ? "h-10 w-10 bg-emerald-500 text-gray-900 border-white shadow-[0_0_25px_rgba(16,185,129,0.9)]"
                                : "h-8 w-8 bg-white/90 text-gray-800 border-white/80 hover:bg-emerald-200 hover:border-emerald-300"
                            }`}
                          >
                            <Store className="h-4 w-4" />
                          </div>
                          {isActive && (
                            <div className="absolute top-12 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl min-w-[220px] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200">
                              <p className="text-sm font-bold text-white mb-1">
                                {booking.vendorName}
                              </p>
                              <p className="text-xs text-gray-400 mb-2">
                                {booking.boothName}
                              </p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Location:</span>
                                <span className="text-emerald-400 font-semibold capitalize">
                                  {booking.location.replace(/-/g, " ")}
                                </span>
                              </div>
                              {booking.boothSize && (
                                <div className="flex items-center justify-between text-xs mt-1">
                                  <span className="text-gray-400">Size:</span>
                                  <span className="text-blue-400 font-medium">
                                    {booking.boothSize}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Unplaced Booths */}
              {unplacedBookings.length > 0 && (
                <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Awaiting Map Placement
                      </h3>
                      <p className="text-xs text-gray-400">
                        {unplacedBookings.length} vendor
                        {unplacedBookings.length !== 1 ? "s" : ""} pending location
                        assignment
                      </p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {unplacedBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-xl border border-gray-700 bg-gray-900/60 p-4 hover:border-yellow-400/60 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <Building2 className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {booking.vendorName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {booking.boothName}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Location:</span>
                            <span className="text-gray-300">
                              {booking.location || "TBD"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-gray-300">{booking.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vendor List Sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden">
                <div className="border-b border-gray-700 bg-gray-900/50 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-400" />
                        Active Vendors
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Click to highlight on map
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {filteredBookings.length}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-gray-600" />
                      </div>
                      <p className="text-sm font-semibold text-white mb-2">
                        No Vendors Found
                      </p>
                      <p className="text-xs text-gray-400">
                        {searchQuery || locationFilter !== "all"
                          ? "Try adjusting your filters"
                          : "No active booths at the moment"}
                      </p>
                    </div>
                  ) : (
                    filteredBookings.map((booking) => {
                      const isActive = highlightedId === booking.id;
                      const attendeeCount = booking.attendees?.length || 0;
                      return (
                        <div
                          key={booking.id}
                          className={`group rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                            isActive
                              ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                              : "border-gray-700 bg-gray-900/60 hover:border-emerald-400/60 hover:bg-gray-800/60"
                          }`}
                          onMouseEnter={() => setHighlightedId(booking.id)}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() =>
                            setHighlightedId(
                              highlightedId === booking.id ? null : booking.id
                            )
                          }
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                                  isActive
                                    ? "bg-emerald-500/20 border border-emerald-500/30"
                                    : "bg-gray-800 border border-gray-700"
                                }`}
                              >
                                <Store
                                  className={`h-5 w-5 ${
                                    isActive ? "text-emerald-400" : "text-gray-400"
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                  {booking.vendorName}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {booking.boothName}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide ${
                                isActive
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-gray-800 text-gray-400"
                              }`}
                            >
                              <MapPin className="h-3 w-3" />
                              {booking.location
                                ? booking.location.replace(/-/g, " ")
                                : "TBD"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            <p className="text-xs text-gray-400 truncate">
                              {renderTimeline(booking)}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Package className="h-3 w-3 text-purple-400" />
                                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                  Size
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-white">
                                {booking.boothSize || "Standard"}
                              </p>
                            </div>

                            <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Users className="h-3 w-3 text-blue-400" />
                                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                  Team
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-white">
                                {attendeeCount}{" "}
                                {attendeeCount === 1 ? "person" : "people"}
                              </p>
                            </div>
                          </div>

                          {booking.boothPrice && (
                            <div className="mt-3 pt-3 border-t border-gray-800">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  Booking Value:
                                </span>
                                <span className="text-sm font-bold text-emerald-400">
                                  {formatCurrency(booking.boothPrice)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
}
