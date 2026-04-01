// src/pages/ViewReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import {
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  X,
  ChevronUp,
  ChevronDown,
  FileText,
  MapPin,
  Briefcase,
  Activity,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  Download,
  Eye,
  Target
} from "lucide-react";

const ATTENDEES_ENDPOINT = "/reports/attendees/summary";
const REVENUE_ENDPOINT = "/reports/revenue/summary";

export default function ViewReports({ onViewRevenue }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // UI toggles
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [activeReport, setActiveReport] = useState("");

  // Modal for advanced filters
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filters (shared state)
  const [advFilters, setAdvFilters] = useState({
    type: "all",
    q: "",
    startDate: "",
    endDate: "",
  });

  // Local modal copy
  const [modalFilters, setModalFilters] = useState({ ...advFilters });

  // Loading & data states
  const [loading, setLoading] = useState(false);

  // Attendees data
  const [attendeesSummary, setAttendeesSummary] = useState({
    totalEvents: 0,
    totalAttendees: 0,
    averagePerEvent: 0,
    events: [],
  });

  // Revenue data
  const [revenueSummary, setRevenueSummary] = useState({
    totalEvents: 0,
    totalRevenue: 0,
    revenueByType: {},
    events: [],
  });

  // Sort state for revenue
  const [revenueSortOrder, setRevenueSortOrder] = useState(null);

  const userRole = user?.role || "User";

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport, advFilters]);

  useEffect(() => {
    if (activeReport !== "revenue") setRevenueSortOrder(null);
  }, [activeReport]);

  function buildParams() {
    const p = {};
    if (advFilters.type) p.type = advFilters.type;
    if (advFilters.q) p.q = advFilters.q;
    if (advFilters.startDate) p.startDate = advFilters.startDate;
    if (advFilters.endDate) p.endDate = advFilters.endDate;
    return p;
  }

  async function fetchReport() {
    if (!activeReport) return;
    setLoading(true);
    try {
      if (activeReport === "attendees") {
        const { data } = await api.get(ATTENDEES_ENDPOINT, { params: buildParams() });
        setAttendeesSummary({
          totalEvents: data.totalEvents || 0,
          totalAttendees: data.totalAttendees || 0,
          averagePerEvent:
            data.totalEvents && data.totalAttendees ? Math.round(data.totalAttendees / data.totalEvents) : 0,
          events: data.events || [],
        });
      } else {
        const { data } = await api.get(REVENUE_ENDPOINT, { params: buildParams() });
        setRevenueSummary({
          totalEvents: data.totalEvents || 0,
          totalRevenue: data.totalRevenue || 0,
          revenueByType: data.revenueByType || {},
          events: data.events || [],
        });
      }
    } catch (err) {
      console.error("Report fetch error:", err);
      toast.error("Failed to load report. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAttendees() {
    if (activeReport === "attendees") {
      setAttendeesOpen(false);
      setActiveReport("");
    } else {
      setAttendeesOpen(true);
      setActiveReport("attendees");
    }
  }

  function handleOpenRevenue() {
    if (activeReport === "revenue") {
      setAttendeesOpen(false);
      setActiveReport("");
    } else {
      setAttendeesOpen(true);
      setActiveReport("revenue");
      if (typeof onViewRevenue === "function") onViewRevenue();
    }
  }

  function openFilterModal() {
    setModalFilters({ ...advFilters });
    setShowFilterModal(true);
  }

  function handleApplyAdvancedFilters(e) {
    if (e && e.preventDefault) e.preventDefault();
    setAdvFilters({ ...modalFilters });
    setShowFilterModal(false);
  }

  function handleResetAdvancedFilters() {
    const reset = { type: "all", q: "", startDate: "", endDate: "" };
    setModalFilters(reset);
  }

  function handleResetReport() {
    const reset = { type: "all", q: "", startDate: "", endDate: "" };
    setAdvFilters(reset);
    setModalFilters(reset);
  }

  function toggleRevenueSort() {
    setRevenueSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  const sortedRevenueEvents = useMemo(() => {
    const arr = Array.isArray(revenueSummary.events) ? [...revenueSummary.events] : [];
    if (!revenueSortOrder) return arr;
    return arr.sort((a, b) => {
      const va = Number(a?.revenue || 0);
      const vb = Number(b?.revenue || 0);
      return revenueSortOrder === "asc" ? va - vb : vb - va;
    });
  }, [revenueSummary.events, revenueSortOrder]);

  const attendeesEvents = useMemo(() => attendeesSummary.events || [], [attendeesSummary]);
  const revenueEventsToRender = sortedRevenueEvents;

  function fmtNumber(n) {
    if (n === undefined || n === null) return "-";
    const num = Number(n) || 0;
    return num.toLocaleString();
  }

  // Check if any filters are active
  const hasActiveFilters = advFilters.type !== "all" || advFilters.q || advFilters.startDate || advFilters.endDate;

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <BarChart3 className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Analytics & Reports
                </h2>
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Generate comprehensive attendees and revenue reports with advanced filtering.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-gray-800/80 border border-gray-700 text-sm text-gray-300">
              <span className="text-yellow-400 font-semibold">{userRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Type Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <button
          onClick={handleOpenAttendees}
          className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 ${
            activeReport === "attendees"
              ? "border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 shadow-lg shadow-yellow-500/20"
              : "border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 hover:border-gray-700 hover:shadow-xl"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
              activeReport === "attendees"
                ? "bg-yellow-500/20 border border-yellow-500/30 group-hover:scale-110"
                : "bg-purple-500/10 border border-purple-500/20 group-hover:scale-110"
            }`}>
              <Users className={`h-7 w-7 ${activeReport === "attendees" ? "text-yellow-400" : "text-purple-400"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-xl font-bold ${activeReport === "attendees" ? "text-yellow-400" : "text-white"}`}>
                  Attendees Report
                </h3>
                {activeReport === "attendees" && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <Activity className="h-3 w-3" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                View detailed attendance statistics across all events
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Target className="h-3.5 w-3.5" />
                <span>Event tracking, capacity analysis, attendance trends</span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={handleOpenRevenue}
          className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 ${
            activeReport === "revenue"
              ? "border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 shadow-lg shadow-yellow-500/20"
              : "border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 hover:border-gray-700 hover:shadow-xl"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
              activeReport === "revenue"
                ? "bg-yellow-500/20 border border-yellow-500/30 group-hover:scale-110"
                : "bg-green-500/10 border border-green-500/20 group-hover:scale-110"
            }`}>
              <DollarSign className={`h-7 w-7 ${activeReport === "revenue" ? "text-yellow-400" : "text-green-400"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-xl font-bold ${activeReport === "revenue" ? "text-yellow-400" : "text-white"}`}>
                  Revenue Report
                </h3>
                {activeReport === "revenue" && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <Activity className="h-3 w-3" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-3">
                Analyze revenue streams and financial performance
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Revenue breakdown, event profitability, financial insights</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Active Report Section */}
      {attendeesOpen && (
        <div className="mt-6 bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Report Header */}
          <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  {activeReport === "revenue" ? (
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Users className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {activeReport === "revenue" ? "Revenue Analysis" : "Attendance Analysis"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {activeReport === "revenue" 
                      ? "Financial performance metrics and revenue breakdown"
                      : "Attendance statistics and event participation data"
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasActiveFilters && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Filter className="h-3 w-3" />
                    Filters Active
                  </span>
                )}
                
                <button
                  onClick={openFilterModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200"
                >
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                </button>

                <button
                  onClick={handleResetReport}
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </button>

                {activeReport === "revenue" && (
                  <button
                    onClick={toggleRevenueSort}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200"
                    title={revenueSortOrder ? `Sort ${revenueSortOrder === "asc" ? "descending" : "ascending"}` : "Sort by revenue"}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    <span>Sort</span>
                    {revenueSortOrder === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : revenueSortOrder === "desc" ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Summary Statistics Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {activeReport === "revenue" ? (
                <>
                  <div className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-7 w-7 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total Events</p>
                        <p className="text-3xl font-bold text-white mb-1">{revenueSummary.totalEvents}</p>
                        <p className="text-sm text-gray-400">Revenue generating</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                        <DollarSign className="h-7 w-7 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-white mb-1">{fmtNumber(revenueSummary.totalRevenue)}</p>
                        <p className="text-sm text-gray-400">EGP</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp className="h-7 w-7 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Revenue by Type</p>
                        {Object.keys(revenueSummary.revenueByType || {}).length === 0 ? (
                          <p className="text-sm text-gray-500">No data available</p>
                        ) : (
                          <div className="space-y-1.5">
                            {Object.entries(revenueSummary.revenueByType).map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between text-sm">
                                <span className="capitalize text-gray-400">{k}</span>
                                <span className="font-semibold text-white">{fmtNumber(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-7 w-7 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total Events</p>
                        <p className="text-3xl font-bold text-white mb-1">{attendeesSummary.totalEvents}</p>
                        <p className="text-sm text-gray-400">With attendance data</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-7 w-7 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total Attendees</p>
                        <p className="text-3xl font-bold text-white mb-1">{attendeesSummary.totalAttendees}</p>
                        <p className="text-sm text-gray-400">Across all events</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp className="h-7 w-7 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Average Per Event</p>
                        <p className="text-3xl font-bold text-white mb-1">{attendeesSummary.averagePerEvent}</p>
                        <p className="text-sm text-gray-400">Attendees</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Enhanced Events Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Type
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Name
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time
                        </div>
                      </th>

                      {activeReport === "revenue" ? (
                        <>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="h-4 w-4" />
                              Revenue
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            <div className="flex items-center justify-end gap-2">
                              <Eye className="h-4 w-4" />
                              Details
                            </div>
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            <div className="flex items-center justify-end gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Attended
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            <div className="flex items-center justify-end gap-2">
                              <Target className="h-4 w-4" />
                              Capacity
                            </div>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="px-4 py-12 text-center text-gray-400" colSpan={6}>
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
                            <p className="text-sm">Loading report data...</p>
                          </div>
                        </td>
                      </tr>
                    ) : activeReport === "revenue" ? (
                      revenueEventsToRender.length === 0 ? (
                        <tr>
                          <td className="px-4 py-12 text-center" colSpan={6}>
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                                <AlertCircle className="h-6 w-6 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white mb-1">No Events Found</p>
                                <p className="text-xs text-gray-400">Try adjusting your filters to see more results</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        revenueEventsToRender.map((e, idx) => (
                          <tr
                            key={e.eventId || e._id || idx}
                            className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                                {e.eventType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-white">{e.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {e.date ? new Date(e.date).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {e.date ? new Date(e.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-green-400">{fmtNumber(e.revenue)}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-400">
                              {e.eventType === "bazaar"
                                ? `${e.boothsTaken || 0} booths (${e.count2x2 || 0}×2, ${e.count4x4 || 0}×4)`
                                : e.eventType === "booth"
                                ? `${e.duration || "-"} @ ${fmtNumber(e.pricePerWeek)}`
                                : e.eventType === "trip"
                                ? `${e.registrantCount || 0} attendees`
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )
                    ) : attendeesEvents.length === 0 ? (
                      <tr>
                        <td className="px-4 py-12 text-center" colSpan={6}>
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                              <AlertCircle className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">No Events Found</p>
                              <p className="text-xs text-gray-400">Try adjusting your filters to see more results</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      attendeesEvents.map((e, idx) => (
                        <tr
                          key={e.eventId || e._id || idx}
                          className="border-t border-gray-800 hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">
                              {e.eventType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-white">{e.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {e.date ? new Date(e.date).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {e.date ? new Date(e.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-purple-400">{e.attendedCount ?? e.registrantCount ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">{e.capacity ?? "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Advanced Filters Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFilterModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <Filter className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Advanced Filters</h3>
                    <p className="text-sm text-gray-400">Refine your report results</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleApplyAdvancedFilters} className="p-6">
              <div className="space-y-5">
                {/* Name field - only for attendees */}
                {activeReport !== "revenue" && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-300">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        Event Name or Keyword
                      </div>
                    </label>
                    <input
                      type="text"
                      value={modalFilters.q}
                      onChange={(e) => setModalFilters((f) => ({ ...f, q: e.target.value }))}
                      placeholder="Search by name, professor, company..."
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-300">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        Event Type
                      </div>
                    </label>
                    <select
                      value={modalFilters.type}
                      onChange={(e) => setModalFilters((f) => ({ ...f, type: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    >
                      <option value="all">All Types</option>
                      <option value="trip">Trips</option>
                      <option value="bazaar">Bazaars</option>
                      <option value="booth">Booths</option>
                      <option value="workshop">Workshops</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        Start Date
                      </div>
                    </label>
                    <input
                      type="date"
                      value={modalFilters.startDate}
                      onChange={(e) => setModalFilters((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        End Date
                      </div>
                    </label>
                    <input
                      type="date"
                      value={modalFilters.endDate}
                      onChange={(e) => setModalFilters((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="rounded-xl bg-blue-900/20 border border-blue-800/30 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-200">
                    Use these filters to narrow down your results by event type and date range. Leave fields empty to include all values.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleResetAdvancedFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-sm font-semibold transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  Clear All
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-sm font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-gray-900 text-sm font-bold transition-all duration-200"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Apply Filters
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
