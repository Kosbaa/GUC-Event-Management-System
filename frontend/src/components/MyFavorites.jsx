import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  MapPin,
  CalendarRange,
  Clock3,
  Users,
  FileText,
  Globe,
} from "lucide-react";

export default function MyFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsEvent, setDetailsEvent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { user, loading: authLoading } = useAuth();

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/favorites/my");
      setFavorites(res.data?.favorites || []);
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchFavorites();
    }
  }, [authLoading, user]);

  // Listen for favorite changes
  useEffect(() => {
    const handleFavoriteChange = () => {
      fetchFavorites();
    };
    
    window.addEventListener('ratingSubmitted', handleFavoriteChange);
    
    return () => {
      window.removeEventListener('ratingSubmitted', handleFavoriteChange);
    };
  }, []);

  const handleShowDetails = (event) => {
    setDetailsEvent(event);
    setShowDetailsModal(true);
  };

  const handleRemoveFavorite = async (eventId) => {
    try {
      await api.delete(`/events/${eventId}/favorite`);
      toast.success("Removed from favorites");
      fetchFavorites(); // Refresh the list
    } catch (err) {
      console.error("Failed to remove favorite:", err);
      toast.error(err?.response?.data?.message || "Failed to remove from favorites");
    }
  };

  const getNormalizedType = (event) => {
    const raw = String(event?.type || event?.eventType || event?.category || "")
      .trim()
      .toLowerCase();
    if (raw === "workshop") return "Workshop";
    if (raw === "trip") return "Trip";
    if (raw === "conference") return "Conference";
    if (raw === "bazaar") return "Bazaar";
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
  };

  const formatDateTimeRange = (start, end) => {
    if (!start && !end) return "Not specified";
    const baseDateOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };
    const timeOptions = { hour: "2-digit", minute: "2-digit" };
    const fmt = (value, options) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "N/A";
      return date.toLocaleString("en-EG", {
        timeZone: "Africa/Cairo",
        ...options,
      });
    };
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (
        !Number.isNaN(startDate.getTime()) &&
        !Number.isNaN(endDate.getTime())
      ) {
        const sameDay = startDate.toDateString() === endDate.toDateString();
        if (sameDay) {
          return `${fmt(start, { ...baseDateOptions, ...timeOptions })} - ${fmt(
            end,
            timeOptions
          )}`;
        }
        return `${fmt(start, { ...baseDateOptions, ...timeOptions })} → ${fmt(
          end,
          { ...baseDateOptions, ...timeOptions }
        )}`;
      }
    }
    if (start) {
      return fmt(start, { ...baseDateOptions, ...timeOptions });
    }
    if (end) {
      return fmt(end, { ...baseDateOptions, ...timeOptions });
    }
    return "Not specified";
  };

  if (authLoading) {
    return (
      <div className="p-8 text-gray-200">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-gray-200">
        <div className="bg-gray-900 border border-red-500 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-400">
            Please log in to view your favorites.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6 shadow-md">
        <h2 className="text-2xl font-semibold text-yellow-400">
          My Favorites
        </h2>
        <p className="text-gray-400 mt-2">
          Events you've marked as favorites
        </p>
      </div>

      {loading && (
        <div className="text-gray-300 text-center py-10">Loading favorites...</div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="text-gray-400 text-center py-10">
          <p className="text-lg mb-2">No favorites yet</p>
          <p className="text-sm">
            Go to Available Events and click the ❤️ button to add events to your favorites.
          </p>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((event) => {
            const id = event._id || event.id;
            const title = event.name || event.title || "Untitled event";

            return (
              <article
                key={id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-yellow-400">
                        {title}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-purple-600/30 text-purple-300 rounded">
                        {event.type || "Event"}
                      </span>
                    </div>
                    {event.location && (
                      <p className="text-sm text-gray-400 mt-1">📍 {event.location}</p>
                    )}
                    {(event.description || event.shortDescription) && (
                      <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                        {event.description || event.shortDescription}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    {event.startDate && (
                      <span className="text-xs text-gray-400">
                        {new Date(event.startDate).toLocaleDateString()}
                      </span>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShowDetails(event)}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-sm rounded-md transition"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleRemoveFavorite(id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded-md transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Details Modal - Same as AvailableEvents */}
      {showDetailsModal && detailsEvent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="relative border-b border-gray-700/50 px-8 py-6 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
                      {getNormalizedType(detailsEvent)}
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white leading-tight">
                    {detailsEvent.name || detailsEvent.title || "Event Details"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setDetailsEvent(null);
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
              <div className="space-y-6">
                {/* Key Information Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Location */}
                  <div className="bg-gray-800/40 backdrop-blur border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <MapPin className="h-5 w-5 text-pink-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Location
                        </p>
                        <p className="text-base text-white font-medium">
                          {detailsEvent.location || "To be announced"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Capacity */}
                  {detailsEvent.capacity != null && (
                    <div className="bg-gray-800/40 backdrop-blur border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Capacity
                          </p>
                          <p className="text-base text-white font-medium">
                            {detailsEvent.registrants?.length || 0} / {detailsEvent.capacity}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {(detailsEvent.description || detailsEvent.shortDescription) && (
                  <div className="bg-gray-800/40 backdrop-blur border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-yellow-400" />
                      <p className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Description
                      </p>
                    </div>
                    <p className="text-base text-gray-300 leading-relaxed">
                      {detailsEvent.description || detailsEvent.shortDescription}
                    </p>
                  </div>
                )}

                {/* Schedule Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
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
                            if (!detailsEvent.startDate) return "Not set";
                            const date = new Date(detailsEvent.startDate);
                            const dateStr = date.toLocaleDateString("en-EG", {
                              timeZone: "Africa/Cairo",
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                            const timeStr = detailsEvent.startTime 
                              ? (() => {
                                  const [hours, minutes] = detailsEvent.startTime.split(':');
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

                  {/* End Date */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
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
                            if (!detailsEvent.endDate) return "Not set";
                            const date = new Date(detailsEvent.endDate);
                            const dateStr = date.toLocaleDateString("en-EG", {
                              timeZone: "Africa/Cairo",
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                            const timeStr = detailsEvent.endTime 
                              ? (() => {
                                  const [hours, minutes] = detailsEvent.endTime.split(':');
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
                {detailsEvent.registrationDeadline && (
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Clock3 className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                          Registration Deadline
                        </p>
                        <p className="text-base text-white font-medium">
                          {formatDateTimeRange(detailsEvent.registrationDeadline, null)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Website Link */}
                {(detailsEvent.website || detailsEvent.link) && (
                  <div className="bg-gray-800/40 backdrop-blur border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Globe className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Website
                        </p>
                        <a
                          href={detailsEvent.website || detailsEvent.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-blue-400 hover:text-blue-300 font-medium underline break-all"
                        >
                          {detailsEvent.website || detailsEvent.link}
                        </a>
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
                    setDetailsEvent(null);
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
    </div>
  );
}

