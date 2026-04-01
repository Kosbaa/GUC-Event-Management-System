import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import DynamicModal from "./DynamicModal";
import Calendar from "./Calendar";
import { Plus, Dumbbell, Calendar as CalendarIcon, Clock, Users as UsersIcon } from "lucide-react";
import GymCard from "./GymCard";

// Helpers
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

function fmtHM(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function sameYMD(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const REGISTRATION_ALLOWED_ROLES = new Set([
  "Student",
  "Staff",
  "TA",
  "Professor",
]);

// Gym session types with images
const GYM_SESSIONS = [
  {
    type: "Yoga",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop",
  },
  {
    type: "Pilates",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop",
  },
  {
    type: "Aerobics",
    image:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop",
  },
  {
    type: "Zumba",
    image:
      "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop",
  },
  {
    type: "Cross Circuit",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop",
  },
  {
    type: "Kick-boxing",
    image:
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&auto=format&fit=crop",
  },
];

export default function GymSchedule() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSessionType, setSelectedSessionType] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gymForm, setGymForm] = useState({
    type: "",
    date: "",
    time: "",
    duration: "",
    maxParticipants: "",
  });
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedSessionForRegistration, setSelectedSessionForRegistration] =
    useState(null);
  const [registrationForm, setRegistrationForm] = useState({
    name: "",
    email: "",
    UniId: "",
  });
  const [cancellingId, setCancellingId] = useState(null);
  const [pendingCancelSession, setPendingCancelSession] = useState(null);
  const [pendingEditSession, setPendingEditSession] = useState(null);
  const [editForm, setEditForm] = useState({
    date: "",
    time: "",
    duration: "",
  });
  const [editingId, setEditingId] = useState(null);

  const canRegisterForSessions = REGISTRATION_ALLOWED_ROLES.has(user?.role);
  const canManageSessions = user?.role === "Event Office";

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/gym/");
      const data = res.data;

      const list = Array.isArray(data)
        ? data
        : data.sessions || data.schedule || [];

      const normalized = list.map((s) => {
        const raw =
          s.date ||
          s.datetime ||
          s.startDate ||
          s.start ||
          s.time ||
          s.sessionDate ||
          null;

        let dateObj = null;
        if (raw && typeof raw === "string" && /\d{4}-\d{2}-\d{2}/.test(raw)) {
          dateObj = new Date(raw);
        } else if (s.date && s.time) {
          dateObj = new Date(`${s.date}T${s.time}`);
        } else if (raw) {
          dateObj = new Date(raw);
        }

        const explicitTime =
          s.time || (dateObj ? dateObj.toTimeString().slice(0, 5) : null);

        return {
          ...s,
          date:
            dateObj && !Number.isNaN(dateObj.getTime())
              ? dateObj.toISOString()
              : s.date,
          eventName: s.eventName || s.name || s.type || "Gym Session",
          _parsedDate:
            dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj : null,
          _parsedTime:
            explicitTime ||
            (dateObj ? dateObj.toTimeString().slice(0, 5) : null),
        };
      });

      setSessions(normalized);
    } catch (err) {
      console.error(err);
      setError("Failed to load gym schedules");
      toast.error(
        err?.response?.data?.message || "Failed to load gym schedules"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (selectedSessionType) {
      // Set to current month and today's date
      const today = new Date();
      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
      setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    }
  }, [selectedSessionType, sessions]);

  const isSessionUpcoming = (session) => {
    if (!session._parsedDate) return false;
    const sessionDateTime = new Date(session._parsedDate);
    if (session._parsedTime) {
      const [hours, minutes] = session._parsedTime.split(":").map(Number);
      sessionDateTime.setHours(hours, minutes, 0, 0);
    }
    return sessionDateTime > new Date();
  };

  const isUserRegistered = (session) => {
    if (!user || !session?.registrants) return false;
    const currentId = (user.id || user._id || "").toString();
    if (!currentId) return false;
    return session.registrants.some((registrant) => {
      if (!registrant?.user) return false;
      if (typeof registrant.user === "object") {
        const candidate =
          registrant.user._id ||
          registrant.user.id ||
          registrant.user.toString?.();
        return candidate?.toString() === currentId;
      }
      return registrant.user.toString() === currentId;
    });
  };

  const isSessionFull = (session) => {
    if (!session.maxParticipants) return false;
    const registrantCount = session.registrants?.length || 0;
    return registrantCount >= session.maxParticipants;
  };

  const handleRegister = (session) => {
    if (!user) {
      toast.error("Please log in to register for gym sessions");
      return;
    }
    if (!canRegisterForSessions) {
      toast.error(
        "Only students, staff, TAs, and professors can register for gym sessions"
      );
      return;
    }
    if (!isSessionUpcoming(session)) {
      toast.error("You can only register for upcoming gym sessions");
      return;
    }
    if (isSessionFull(session)) {
      toast.error("This gym session has reached its maximum capacity");
      return;
    }
    const savedUniKey = user?.id ? `uniId:${user.id}` : null;
    const savedUniId = savedUniKey
      ? localStorage.getItem(savedUniKey) || ""
      : "";
    const defaultUniId = user?.UniId || savedUniId || "";
    setSelectedSessionForRegistration(session);
    setRegistrationForm({
      name: user?.name || user?.firstName || "",
      email: user?.email || "",
      UniId: defaultUniId,
    });
    setShowRegistrationModal(true);
  };

  const handleRegistrationSubmit = async (formData) => {
    try {
      if (!selectedSessionForRegistration?._id) return;

      const res = await api.patch(
        `/gym/register/${selectedSessionForRegistration._id}`,
        {
          email: formData.email,
          UniId: formData.UniId,
        }
      );

      if (res.data?.success) {
        toast.success(
          res.data.message || "Successfully registered for gym session"
        );
        if (user?.id && formData.UniId) {
          localStorage.setItem(`uniId:${user.id}`, formData.UniId);
        }
        setShowRegistrationModal(false);
        setSelectedSessionForRegistration(null);
        fetchSchedules();
      } else {
        toast.error(res.data?.message || "Failed to register for gym session");
      }
    } catch (err) {
      console.error(err);
      const errorMessage =
        err.response?.data?.message || "Failed to register for gym session";
      toast.error(errorMessage);
    }
  };

  const requestCancelSession = (session) => {
    if (!canManageSessions) return;
    if (!session || (!session._id && !session.id)) return;
    if (!isSessionUpcoming(session)) {
      toast.error("Only upcoming gym sessions can be cancelled");
      return;
    }
    setPendingEditSession(null);
    setEditingId(null);
    setPendingCancelSession(session);
  };

  const confirmCancelSession = async () => {
    const session = pendingCancelSession;
    if (!session) return;
    const sessionId = session._id || session.id;
    try {
      setCancellingId(sessionId);
      await api.delete(`/gym/${sessionId}`);
      toast.success("Gym session cancelled");
      if (
        selectedSession?._id === sessionId ||
        selectedSession?.id === sessionId
      ) {
        setSelectedSession(null);
      }
      fetchSchedules();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to cancel gym session"
      );
    } finally {
      setCancellingId(null);
      setPendingCancelSession(null);
    }
  };

  const requestEditSession = (session) => {
    if (!canManageSessions) return;
    if (!session || (!session._id && !session.id)) return;
    if (!isSessionUpcoming(session)) {
      toast.error("Only upcoming gym sessions can be edited");
      return;
    }
    setPendingCancelSession(null);
    setCancellingId(null);

    const dateSource = session._parsedDate
      ? session._parsedDate
      : session.date
      ? new Date(session.date)
      : null;
    const dateValue =
      dateSource && !Number.isNaN(dateSource.getTime())
        ? dateSource.toISOString().slice(0, 10)
        : "";
    const timeValue =
      session.time ||
      session._parsedTime ||
      (dateSource && !Number.isNaN(dateSource.getTime())
        ? fmtHM(dateSource)
        : "");

    setEditForm({
      date: dateValue,
      time: timeValue,
      duration: session.duration || "",
    });
    setPendingEditSession(session);
  };

  const submitEditSession = async (event) => {
    event?.preventDefault?.();
    const session = pendingEditSession;
    if (!session) return;
    const sessionId = session._id || session.id;
    if (!sessionId) return;
    if (!editForm.date || !editForm.time || !editForm.duration) {
      toast.error("Date, time, and duration are required");
      return;
    }
    try {
      setEditingId(sessionId);
      await api.patch(`/gym/${sessionId}`, {
        date: editForm.date,
        time: editForm.time,
        duration: editForm.duration,
      });
      toast.success("Gym session updated");
      setPendingEditSession(null);
      setEditingId(null);
      setEditForm({ date: "", time: "", duration: "" });
      fetchSchedules();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to update gym session"
      );
      setEditingId(null);
    }
  };

  async function handleCreateGymSession(formData) {
    if (!formData || typeof formData !== "object" || formData.target) {
      formData = gymForm;
    }

    if (!formData.type) return toast.error("Select gym session type");
    if (!formData.date) return toast.error("Select date");
    if (!formData.time) return toast.error("Select start time");
    if (!formData.duration) return toast.error("Enter duration");

    try {
      await api.post("/gym", formData);
      toast.success("Gym Session created");
      setShowCreateModal(false);
      setGymForm({
        type: "",
        date: "",
        time: "",
        duration: "",
        maxParticipants: "",
      });
      fetchSchedules();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to create gym session"
      );
    }
  }

  function buildFields() {
    return [
      {
        name: "type",
        type: "select",
        label: "Gym Session Type",
        required: true,
        options: [
          { value: "", label: "-- Select Gym Session Type --" },
          ...GYM_SESSIONS.map((s) => ({ value: s.type, label: s.type })),
        ],
      },
      { name: "date", type: "date", label: "Date", required: true },
      { name: "time", type: "time", label: "Start Time", required: true },
      {
        name: "duration",
        type: "text",
        label: "Duration (HH:MM format)",
        placeholder: "e.g., 01:30",
        required: true,
      },
      { name: "maxParticipants", type: "number", label: "Max Participants" },
    ];
  }

  const monthEvents = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return sessions
      .filter(
        (s) =>
          s.type === selectedSessionType &&
          s._parsedDate &&
          s._parsedDate.getFullYear() === y &&
          s._parsedDate.getMonth() === m
      )
      .map((s) => ({
        date: s._parsedDate,
        eventName: s.eventName,
        _source: s,
      }));
  }, [sessions, currentDate, selectedSessionType]);

  const sessionsForSelectedDay = useMemo(() => {
    return sessions
      .filter(
        (s) =>
          s.type === selectedSessionType &&
          s._parsedDate &&
          sameYMD(s._parsedDate, selectedDate)
      )
      .sort(
        (a, b) =>
          (a._parsedDate?.getTime() || 0) - (b._parsedDate?.getTime() || 0)
      );
  }, [sessions, selectedDate, selectedSessionType]);

  const handlePrevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleCardClick = (sessionType) => {
    setSelectedSessionType(sessionType);
    //    setCurrentDate(new Date());
    //    setSelectedDate(new Date());
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    setSelectedSession(null);
  };

  const handleCloseCalendar = () => {
    setSelectedSessionType(null);
    setSelectedSession(null);
  };

  const otherSessionsForSelectedDay = useMemo(() => {
    if (!selectedSession) return sessionsForSelectedDay;
    return sessionsForSelectedDay.filter((s) => {
      if (s._id && selectedSession._id) return s._id !== selectedSession._id;
      if (s.id && selectedSession.id) return s.id !== selectedSession.id;
      return (
        (s._parsedDate?.getTime() || 0) !==
          (selectedSession._parsedDate?.getTime() || 0) ||
        (s._parsedTime || "") !== (selectedSession._parsedTime || "")
      );
    });
  }, [sessionsForSelectedDay, selectedSession]);

  // Filter user's registered sessions
  const myRegisteredSessions = useMemo(() => {
    if (!user) return [];
    
    const registered = sessions.filter((session) => {
      if (!session.registrants || !Array.isArray(session.registrants)) return false;
      return session.registrants.some(
        (registrant) =>
          registrant.user?._id === user?.id ||
          registrant.user?._id === user?._id ||
          String(registrant.user) === String(user?.id)
      );
    });

    // Sort by date
    return registered.sort((a, b) => {
      if (!a._parsedDate && !b._parsedDate) return 0;
      if (!a._parsedDate) return 1;
      if (!b._parsedDate) return -1;
      return a._parsedDate.getTime() - b._parsedDate.getTime();
    });
  }, [sessions, user]);
  
  const upcomingRegisteredSessions = useMemo(() => {
    return myRegisteredSessions.filter(isSessionUpcoming);
  }, [myRegisteredSessions]);

  const pastRegisteredSessions = useMemo(() => {
    return myRegisteredSessions.filter((s) => !isSessionUpcoming(s));
  }, [myRegisteredSessions]);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                  <Dumbbell className="h-6 w-6 text-yellow-400" />
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Gym Schedule
                </h2>
              </div>
              <p className="text-base text-gray-400 ml-15">
                Browse available gym sessions and manage your registrations.
              </p>
            </div>
          {canManageSessions && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-6 py-3 font-bold text-gray-900 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Create Session
            </button>
          )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
              <p className="text-gray-400 font-medium">Loading gym sessions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="max-w-sm w-full rounded-2xl border border-red-700 bg-gray-900 p-6 text-center shadow-2xl">
              <div className="mb-4 text-lg font-semibold text-red-300">
                Oops! Something went wrong
              </div>
              <p className="text-sm text-gray-200">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-6 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Gym Session Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {GYM_SESSIONS.map((gymSession) => (
              <GymCard
                key={gymSession.type}
                sessionType={gymSession.type}
                image={gymSession.image}
                onClick={() => handleCardClick(gymSession.type)}
              />
            ))}
          </div>

          {/* My Registered Sessions */}
          {canRegisterForSessions && myRegisteredSessions.length > 0 && (
            <div className="mt-10">
              <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <CalendarIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    My Gym Sessions
                  </h3>
                </div>
                <p className="text-base text-gray-400 ml-15">
                  Track your upcoming and past gym session registrations.
                </p>
              </div>

              {/* Statistics Cards */}
              <div className="grid gap-5 sm:grid-cols-3 mb-6">
                <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20 group-hover:scale-110 transition-transform duration-300">
                      <Dumbbell className="h-7 w-7 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Total Sessions
                      </p>
                      <p className="text-3xl font-bold text-white mb-1">{myRegisteredSessions.length}</p>
                      <p className="text-sm text-gray-400">All registrations</p>
                    </div>
                  </div>
                </div>

                <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                      <CalendarIcon className="h-7 w-7 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Upcoming
                      </p>
                      <p className="text-3xl font-bold text-white mb-1">{upcomingRegisteredSessions.length}</p>
                      <p className="text-sm text-gray-400">Scheduled sessions</p>
                    </div>
                  </div>
                </div>

                <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-500/10 border border-gray-500/20 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="h-7 w-7 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Completed
                      </p>
                      <p className="text-3xl font-bold text-white mb-1">{pastRegisteredSessions.length}</p>
                      <p className="text-sm text-gray-400">Past sessions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Sessions */}
              {upcomingRegisteredSessions.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold mb-4 text-green-400 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Upcoming Sessions ({upcomingRegisteredSessions.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {upcomingRegisteredSessions.map((s, i) => {
                      const durMin = parseDurationToMinutes(s.duration);
                      return (
                        <article
                          key={s._id || s.id || i}
                          className="group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                  <Dumbbell className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="text-lg font-bold text-yellow-400">
                                  {s.type || "Gym Session"}
                                </div>
                              </div>
                              <div className="ml-12 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                                  {s._parsedDate &&
                                    s._parsedDate.toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  {s._parsedTime && `${s._parsedTime}`}
                                  {durMin != null && !Number.isNaN(durMin) && (
                                    <span className="text-gray-400">
                                      • Duration {Math.round(durMin / 60)}h
                                      {durMin % 60 ? ` ${durMin % 60}m` : ""}
                                    </span>
                                  )}
                                </div>
                                {s.maxParticipants != null && (
                                  <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <UsersIcon className="h-4 w-4 text-gray-400" />
                                    Max {s.maxParticipants} participants
                                  </div>
                                )}
                                {s.location && (
                                  <div className="text-sm text-gray-400">
                                    📍 {s.location}
                                  </div>
                                )}
                                {s.trainer || s.instructor ? (
                                  <div className="text-sm text-gray-400">
                                    🏋️ {s.trainer || s.instructor}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div>
                              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                <CalendarIcon className="h-3 w-3" />
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
              {pastRegisteredSessions.length > 0 && (
                <div>
                  <h4 className="text-xl font-semibold mb-4 text-gray-400 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Past Sessions ({pastRegisteredSessions.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {pastRegisteredSessions.map((s, i) => {
                      const durMin = parseDurationToMinutes(s.duration);
                      return (
                        <article
                          key={s._id || s.id || i}
                          className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5 opacity-75"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-700/50 border border-gray-700">
                                  <Dumbbell className="h-5 w-5 text-gray-500" />
                                </div>
                                <div className="text-lg font-semibold text-gray-400">
                                  {s.type || "Gym Session"}
                                </div>
                              </div>
                              <div className="ml-12 space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <CalendarIcon className="h-4 w-4" />
                                  {s._parsedDate &&
                                    s._parsedDate.toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Clock className="h-4 w-4" />
                                  {s._parsedTime && `${s._parsedTime}`}
                                  {durMin != null && !Number.isNaN(durMin) && (
                                    <span className="text-gray-500">
                                      • Duration {Math.round(durMin / 60)}h
                                      {durMin % 60 ? ` ${durMin % 60}m` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div>
                              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-gray-700/40 text-gray-400 border border-gray-600">
                                <Clock className="h-3 w-3" />
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
            </div>
          )}
          </>
        )}
      </div>

      {/* Calendar Modal */}
      {selectedSessionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                {selectedSessionType} Schedule
              </h2>
              <button
                onClick={handleCloseCalendar}
                className="text-gray-400 hover:text-white transition"
              >
                <span className="text-3xl">×</span>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-300">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm bg-green-900/40 ring-1 ring-green-700" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm bg-red-900/40 ring-1 ring-red-700" />
                    Booked
                  </span>
                </div>
              </div>

              <Calendar
                sportName={selectedSessionType}
                events={monthEvents}
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                selectedDate={selectedDate}
                onSelectDay={(date) => {
                  setSelectedDate(date);
                  const found = sessions.find(
                    (s) => s._parsedDate && sameYMD(s._parsedDate, date)
                  );
                  setSelectedSession(null);
                }}
                onSelectEvent={(evt) => {
                  const s = evt?._source || null;
                  if (s) {
                    setSelectedSession(s);
                    if (s._parsedDate) setSelectedDate(new Date(s._parsedDate));
                  }
                }}
              />

              <div className="mt-6">
                <div className="mb-2 text-sm text-gray-400">
                  Selected day:{" "}
                  <span className="font-semibold text-gray-200">
                    {selectedDate.toLocaleDateString()}
                  </span>
                </div>

                {selectedSession ? (
                  <div className="mb-4">
                    <article className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold text-yellow-400">
                            {selectedSession.eventName ||
                              selectedSession.name ||
                              "Gym Session"}
                          </div>
                          <div className="mt-1 text-sm text-gray-300">
                            {selectedSession._parsedTime
                              ? `Starts at ${selectedSession._parsedTime}`
                              : null}
                            {(() => {
                              const durMin = parseDurationToMinutes(
                                selectedSession.duration
                              );
                              if (durMin != null && !Number.isNaN(durMin)) {
                                return (
                                  <span className="text-gray-400">
                                    {" "}
                                    &middot; Duration {Math.floor(durMin / 60)}h
                                    {durMin % 60 ? ` ${durMin % 60}m` : ""}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {selectedSession.maxParticipants != null ? (
                              <span className="text-gray-400">
                                {" "}
                                &middot; Max {selectedSession.maxParticipants}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                              selectedSession.eventName ||
                              isUserRegistered(selectedSession)
                                ? "bg-red-900/40 text-red-200 ring-1 ring-red-700"
                                : "bg-green-900/40 text-green-200 ring-1 ring-green-700"
                            }`}
                          >
                            {selectedSession.eventName ||
                            isUserRegistered(selectedSession)
                              ? "Booked"
                              : "Available"}
                          </span>
                          {canRegisterForSessions &&
                            (isUserRegistered(selectedSession) ? (
                              <span className="text-sm text-green-400 font-medium">
                                Registered
                              </span>
                            ) : isSessionUpcoming(selectedSession) &&
                              !isSessionFull(selectedSession) ? (
                              <button
                                onClick={() => handleRegister(selectedSession)}
                                className="px-3 py-1 text-sm rounded-md font-medium transition bg-yellow-500 hover:bg-yellow-400 text-gray-900"
                              >
                                Register
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">
                                {isSessionFull(selectedSession)
                                  ? "Session full"
                                  : "Session has passed"}
                              </span>
                            ))}
                          {canManageSessions &&
                            isSessionUpcoming(selectedSession) && (
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  onClick={() =>
                                    requestEditSession(selectedSession)
                                  }
                                  className="px-3 py-1 text-sm rounded-md font-medium transition bg-blue-600 hover:bg-blue-500 text-white"
                                >
                                  Edit Session
                                </button>
                                <button
                                  onClick={() =>
                                    requestCancelSession(selectedSession)
                                  }
                                  className="px-3 py-1 text-sm rounded-md font-medium transition bg-red-600 hover:bg-red-500 text-white"
                                >
                                  {cancellingId ===
                                  (selectedSession._id || selectedSession.id)
                                    ? "Cancelling..."
                                    : "Cancel Session"}
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    </article>
                  </div>
                ) : null}

                {!selectedSession && sessionsForSelectedDay.length === 0 ? (
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-gray-400">
                    No sessions for this day.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {otherSessionsForSelectedDay.map((s, i) => {
                      const durMin = parseDurationToMinutes(s.duration);
                      return (
                        <article
                          key={s._id || s.id || i}
                          className="rounded-xl border border-gray-800 bg-gray-900 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-semibold text-yellow-400">
                                {s.eventName || s.name || "Gym Session"}
                              </div>
                              <div className="mt-1 text-sm text-gray-300">
                                {s._parsedTime
                                  ? `Starts at ${s._parsedTime}`
                                  : "Time TBD"}
                                {durMin != null && !Number.isNaN(durMin) && (
                                  <span className="text-gray-400">
                                    {" "}
                                    &middot; Duration{" "}
                                    {Math.round(durMin / 60)}h
                                    {durMin % 60 ? ` ${durMin % 60}m` : ""}
                                  </span>
                                )}
                                {s.maxParticipants != null ? (
                                  <span className="text-gray-400">
                                    {" "}
                                    &middot; Max {s.maxParticipants}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                  s.eventName || isUserRegistered(s)
                                    ? "bg-red-900/40 text-red-200 ring-1 ring-red-700"
                                    : "bg-green-900/40 text-green-200 ring-1 ring-green-700"
                                }`}
                              >
                                {s.eventName || isUserRegistered(s)
                                  ? "Booked"
                                  : "Available"}
                              </span>
                              {canRegisterForSessions &&
                                (isUserRegistered(s) ? (
                                  <span className="text-sm text-green-400 font-medium">
                                    Registered
                                  </span>
                                ) : isSessionUpcoming(s) &&
                                  !isSessionFull(s) ? (
                                  <button
                                    onClick={() => handleRegister(s)}
                                    className="px-3 py-1 text-sm rounded-md font-medium transition bg-yellow-500 hover:bg-yellow-400 text-gray-900"
                                  >
                                    Register
                                  </button>
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    {isSessionFull(s)
                                      ? "Session full"
                                      : "Session has passed"}
                                  </span>
                                ))}
                              {canManageSessions && isSessionUpcoming(s) && (
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    onClick={() => requestEditSession(s)}
                                    className="px-3 py-1 text-sm rounded-md font-medium transition bg-blue-600 hover:bg-blue-500 text-white"
                                  >
                                    Edit Session
                                  </button>
                                  <button
                                    onClick={() => requestCancelSession(s)}
                                    className="px-3 py-1 text-sm rounded-md font-medium transition bg-red-600 hover:bg-red-500 text-white"
                                  >
                                    {cancellingId === (s._id || s.id)
                                      ? "Cancelling..."
                                      : "Cancel Session"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Gym Session Modal */}
      {showCreateModal && (
        <DynamicModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Gym Session"
          onSubmit={(formState) => handleCreateGymSession(formState)}
          fields={buildFields()}
          formState={gymForm}
          setFormState={setGymForm}
          submitLabel="Create"
        />
      )}

      {/* Registration Modal */}
      {showRegistrationModal && selectedSessionForRegistration && (
        <DynamicModal
          isOpen={showRegistrationModal}
          onClose={() => {
            setShowRegistrationModal(false);
            setSelectedSessionForRegistration(null);
          }}
          title={`Register for ${
            selectedSessionForRegistration.eventName ||
            selectedSessionForRegistration.type ||
            "Gym Session"
          }`}
          onSubmit={handleRegistrationSubmit}
          fields={[
            {
              name: "name",
              type: "text",
              placeholder: "Your Full Name",
              label: "Full Name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              placeholder: "your.email@example.com",
              label: "Email Address",
              required: true,
            },
            {
              name: "UniId",
              type: "text",
              placeholder: "Your Student/Staff ID",
              label: "Student/Staff ID",
              required: true,
            },
          ]}
          formState={registrationForm}
          setFormState={setRegistrationForm}
          submitLabel="Register"
        />
      )}

      {/* Edit Session Modal */}
      {pendingEditSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-100 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              Edit Gym Session
            </h3>
            <div className="mt-4 space-y-2 text-sm text-gray-300">
              <div>
                <span className="text-gray-400">Type:</span>{" "}
                {pendingEditSession.eventName ||
                  pendingEditSession.type ||
                  "Gym Session"}
              </div>
              {pendingEditSession.maxParticipants != null && (
                <div>
                  <span className="text-gray-400">Max Participants:</span>{" "}
                  {pendingEditSession.maxParticipants}
                </div>
              )}
              <div>
                <span className="text-gray-400">Registered:</span>{" "}
                {pendingEditSession.registrants?.length || 0}
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submitEditSession}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-300" htmlFor="edit-date">
                    Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300" htmlFor="edit-time">
                    Start Time
                  </label>
                  <input
                    id="edit-time"
                    type="time"
                    value={editForm.time}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        time: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-100"
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-sm text-gray-300"
                  htmlFor="edit-duration"
                >
                  Duration (HH:MM)
                </label>
                <input
                  id="edit-duration"
                  type="text"
                  value={editForm.duration}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      duration: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-100"
                  placeholder="e.g., 01:30"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (editingId) return;
                    setPendingEditSession(null);
                    setEditForm({ date: "", time: "", duration: "" });
                    setEditingId(null);
                  }}
                  className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700 disabled:opacity-60"
                  disabled={Boolean(editingId)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(editingId)}
                >
                  {editingId ===
                  (pendingEditSession._id || pendingEditSession.id)
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {pendingCancelSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-100 shadow-2xl">
            <p className="text-base text-gray-100">
              Are you sure you want to cancel this gym session?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (cancellingId) return;
                  setPendingCancelSession(null);
                }}
                className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700"
                disabled={Boolean(cancellingId)}
              >
                Cancel
              </button>
              <button
                onClick={confirmCancelSession}
                className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  Boolean(cancellingId) ||
                  !pendingCancelSession ||
                  !isSessionUpcoming(pendingCancelSession)
                }
              >
                {cancellingId ===
                (pendingCancelSession?._id || pendingCancelSession?.id)
                  ? "Cancelling..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
