import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

function parseDurationToMinutes(v) {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v).trim();
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => parseInt(p, 10));
    if (
      parts.length >= 2 &&
      !Number.isNaN(parts[0]) &&
      !Number.isNaN(parts[1])
    ) {
      const hours = parts[0];
      const minutes = parts[1];
      return hours * 60 + minutes;
    }
    return null;
  }
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

export default function MySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMySessions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gym/");
      const allSessions = Array.isArray(res.data) ? res.data : res.data.sessions || [];

      // Filter sessions where user is registered
      const mySessions = allSessions.filter((session) => {
        if (!session.registrants || !Array.isArray(session.registrants)) return false;
        return session.registrants.some(
          (registrant) =>
            registrant.user?._id === user?.id ||
            registrant.user?._id === user?._id ||
            String(registrant.user) === String(user?.id)
        );
      });

      // Normalize sessions
      const normalized = mySessions.map((s) => {
        let dateObj = null;
        if (s.date) {
          dateObj = new Date(s.date);
        } else if (s.date && s.time) {
          dateObj = new Date(`${s.date}T${s.time}`);
        }

        const explicitTime = s.time || (dateObj ? dateObj.toTimeString().slice(0, 5) : null);

        return {
          ...s,
          _parsedDate: dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj : null,
          _parsedTime: explicitTime,
        };
      });

      // Sort by date (upcoming first)
      normalized.sort((a, b) => {
        if (!a._parsedDate && !b._parsedDate) return 0;
        if (!a._parsedDate) return 1;
        if (!b._parsedDate) return -1;
        return a._parsedDate.getTime() - b._parsedDate.getTime();
      });

      setSessions(normalized);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your gym sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMySessions();
    }
  }, [user?.id]);

  const isUpcoming = (session) => {
    if (!session._parsedDate) return false;
    const sessionDateTime = new Date(session._parsedDate);
    if (session._parsedTime) {
      const [hours, minutes] = session._parsedTime.split(":").map(Number);
      sessionDateTime.setHours(hours, minutes, 0, 0);
    }
    return sessionDateTime > new Date();
  };

  const upcomingSessions = sessions.filter(isUpcoming);
  const pastSessions = sessions.filter((s) => !isUpcoming(s));

  return (
    <div className="p-8 text-white">
      <h2 className="text-2xl font-bold mb-6">My Gym Sessions</h2>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading your sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            No Registered Sessions
          </h3>
          <p className="text-gray-500">
            You haven't registered for any gym sessions yet. Check out the gym
            schedule and register for sessions that interest you!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">
                Upcoming Sessions ({upcomingSessions.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {upcomingSessions.map((s, i) => {
                  const durMin = parseDurationToMinutes(s.duration);
                  return (
                    <article
                      key={s._id || s.id || i}
                      className="rounded-xl border border-gray-800 bg-gray-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-lg font-semibold text-yellow-400">
                            {s.type || "Gym Session"}
                          </div>
                          <div className="mt-1 text-sm text-gray-300">
                            {s._parsedDate &&
                              s._parsedDate.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            {s._parsedTime && ` at ${s._parsedTime}`}
                            {durMin != null && !Number.isNaN(durMin) && (
                              <span className="text-gray-400">
                                {" "}
                                &middot; Duration {Math.round(durMin / 60)}h
                                {durMin % 60 ? ` ${durMin % 60}m` : ""}
                              </span>
                            )}
                            {s.maxParticipants != null && (
                              <span className="text-gray-400">
                                {" "}
                                &middot; Max {s.maxParticipants} participants
                              </span>
                            )}
                          </div>
                          {s.location && (
                            <div className="text-sm text-gray-400 mt-1">
                              📍 {s.location}
                            </div>
                          )}
                          {s.trainer || s.instructor ? (
                            <div className="text-sm text-gray-400 mt-1">
                              🏋️ {s.trainer || s.instructor}
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-900/40 text-green-200 ring-1 ring-green-700">
                            Registered
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-400">
                Past Sessions ({pastSessions.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {pastSessions.map((s, i) => {
                  const durMin = parseDurationToMinutes(s.duration);
                  return (
                    <article
                      key={s._id || s.id || i}
                      className="rounded-xl border border-gray-800 bg-gray-900 p-4 opacity-75"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-lg font-semibold text-gray-400">
                            {s.type || "Gym Session"}
                          </div>
                          <div className="mt-1 text-sm text-gray-400">
                            {s._parsedDate &&
                              s._parsedDate.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            {s._parsedTime && ` at ${s._parsedTime}`}
                            {durMin != null && !Number.isNaN(durMin) && (
                              <span className="text-gray-500">
                                {" "}
                                &middot; Duration {Math.round(durMin / 60)}h
                                {durMin % 60 ? ` ${durMin % 60}m` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-700/40 text-gray-400 ring-1 ring-gray-600">
                            Completed
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-yellow-400 mb-2">
              Session Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Sessions:</span>
                <span className="ml-2 font-semibold">{sessions.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Upcoming:</span>
                <span className="ml-2 font-semibold text-green-400">
                  {upcomingSessions.length}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Completed:</span>
                <span className="ml-2 font-semibold text-gray-400">
                  {pastSessions.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

