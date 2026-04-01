import React, { useEffect, useRef, useState } from "react";
import api from "../lib/axios";
import EventRating from "./EventRating";
import {
  Star,
  Calendar,
  Wrench,
  Plane,
  Mic,
  Store,
  ChevronDown,
} from "lucide-react";

const UnifiedEventRatingPicker = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState({
    workshops: [],
    trips: [],
    conferences: [],
  });
  const [bazaars, setBazaars] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch attended events (workshops, trips, conferences)
        const attendedRes = await api.get("/events/my-attended");
        setEvents(
          attendedRes.data || { workshops: [], trips: [], conferences: [] }
        );

        // Fetch all bazaars
        const bazaarsRes = await api.get("/events/bazaars");
        setBazaars(bazaarsRes.data || []);
      } catch (e) {
        console.error("Failed to fetch events", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const TYPE_VISUALS = {
    Workshop: {
      IconComponent: Wrench,
      iconBg: "bg-purple-500/10",
      iconBorder: "border-purple-500/20",
      iconColor: "text-purple-300",
    },
    Trip: {
      IconComponent: Plane,
      iconBg: "bg-sky-500/10",
      iconBorder: "border-sky-500/20",
      iconColor: "text-sky-300",
    },
    Conference: {
      IconComponent: Mic,
      iconBg: "bg-amber-500/10",
      iconBorder: "border-amber-500/20",
      iconColor: "text-amber-300",
    },
    Bazaar: {
      IconComponent: Store,
      iconBg: "bg-emerald-500/10",
      iconBorder: "border-emerald-500/20",
      iconColor: "text-emerald-300",
    },
    default: {
      IconComponent: Star,
      iconBg: "bg-gray-500/10",
      iconBorder: "border-gray-500/20",
      iconColor: "text-gray-200",
    },
  };

  const getVisualsForType = (type) =>
    TYPE_VISUALS[type] || TYPE_VISUALS.default;

  // Combine all event types into one options array
  const options = [];

  // Add workshops
  (events.workshops || []).forEach((w) => {
    options.push({
      id: w._id,
      label: w.name,
      type: "Workshop",
      ...getVisualsForType("Workshop"),
    });
  });

  // Add trips
  (events.trips || []).forEach((t) => {
    options.push({
      id: t._id,
      label: t.name,
      type: "Trip",
      ...getVisualsForType("Trip"),
    });
  });

  // Add conferences
  (events.conferences || []).forEach((c) => {
    options.push({
      id: c._id,
      label: c.name,
      type: "Conference",
      ...getVisualsForType("Conference"),
    });
  });

  // Add bazaars
  bazaars.forEach((b) => {
    options.push({
      id: b._id,
      label: `${b.name} (${b.location})`,
      type: "Bazaar",
      ...getVisualsForType("Bazaar"),
    });
  });

  // Statistics
  const stats = {
    total: options.length,
    workshops: events.workshops?.length || 0,
    trips: events.trips?.length || 0,
    conferences: events.conferences?.length || 0,
    bazaars: bazaars.length,
  };

  return (
    <div className="p-6 text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Rate Your Events
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Share your experience and help improve future events.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {!loading && stats.total > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[
            {
              label: "Workshops",
              count: stats.workshops,
              visuals: TYPE_VISUALS.Workshop,
            },
            { label: "Trips", count: stats.trips, visuals: TYPE_VISUALS.Trip },
            {
              label: "Conferences",
              count: stats.conferences,
              visuals: TYPE_VISUALS.Conference,
            },
            {
              label: "Bazaars",
              count: stats.bazaars,
              visuals: TYPE_VISUALS.Bazaar,
            },
          ].map(({ label, count, visuals }) => (
            <div
              key={label}
              className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${visuals.iconBg} border ${visuals.iconBorder} group-hover:scale-110 transition-transform duration-300`}
                >
                  <visuals.IconComponent
                    className={`h-7 w-7 ${
                      visuals.iconColor || "text-white/80"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    {label}
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">{count}</p>
                  <p className="text-sm text-gray-400">Available to rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading your events...</p>
          </div>
        </div>
      ) : !options.length ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Calendar className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Events Available
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                You'll see workshops, trips, conferences, and bazaars here after
                their start time has passed. Check back later to rate your
                experiences!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Event Selection */}
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5 mb-5 shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <label className="block text-base font-semibold text-white">
                    Select an Event to Rate
                  </label>
                  <p className="text-xs text-gray-400">
                    Choose from {stats.total} attended event
                    {stats.total === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="relative w-full md:max-w-md" ref={dropdownRef}>
                <button
                  type="button"
                  disabled={!options.length}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    options.length
                      ? "bg-gray-800 border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      : "bg-gray-800/60 border-gray-700/60 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <span className="truncate text-white">
                    {selected
                      ? `${selected.type} — ${selected.label}`
                      : "Choose an event to share your feedback"}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 mt-2 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl z-30 max-h-40 overflow-y-auto">
                    {options.length ? (
                      <ul className="divide-y divide-gray-800">
                        {options.map((opt) => {
                          const isActive = selected?.id === opt.id;
                          return (
                            <li key={opt.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelected(opt);
                                  setDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition ${
                                  isActive
                                    ? "bg-gray-800 text-yellow-300"
                                    : "text-gray-200 hover:bg-gray-800/80"
                                }`}
                              >
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${opt.iconBg} border ${opt.iconBorder}`}
                                >
                                  {opt.IconComponent ? (
                                    <opt.IconComponent
                                      className={`h-5 w-5 ${
                                        opt.iconColor || "text-white/80"
                                      }`}
                                    />
                                  ) : (
                                    <Star className="h-5 w-5 text-white/80" />
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-xs uppercase tracking-wide text-gray-400">
                                    {opt.type}
                                  </p>
                                  <p className="text-sm font-semibold text-white">
                                    {opt.label}
                                  </p>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-400">
                        No events available to rate yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Event Preview */}
            {selected && (
              <div className="mt-3 p-4 rounded-xl bg-gray-800/60 border border-gray-700">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${selected.iconBg} border ${selected.iconBorder}`}
                  >
                    {selected.IconComponent ? (
                      <selected.IconComponent className="h-6 w-6 text-white/80" />
                    ) : (
                      <Star className="h-6 w-6 text-white/80" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      {selected.type}
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {selected.label}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setDropdownOpen(false);
                    }}
                    className="text-gray-400 hover:text-white transition rounded-full hover:bg-gray-700 p-2"
                    aria-label="Clear selection"
                  >
                    <span className="text-xl leading-none">{"×"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rating Component */}
          {selected ? (
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
              <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <Star className="h-5 w-5 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Submit Your Rating
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <EventRating
                  eventId={selected.id}
                  eventType={selected.type}
                  onRatingSubmitted={() => {
                    setSelected(null); // Reset selection after rating is submitted
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                  <Star className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-gray-400">
                  Select an event from the dropdown above to share your feedback
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UnifiedEventRatingPicker;
