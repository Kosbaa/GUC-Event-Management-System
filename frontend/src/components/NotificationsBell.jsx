// src/components/NotificationBell.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../lib/axios";
import { Bell, Trash2, Check, X } from "lucide-react"; // NEW (added X)
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useDashboardNav } from "../context/DashboardNavContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { navigateToSection } = useDashboardNav();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // NEW: keep previous notifications to detect new ones for toast
  const prevNotificationsRef = useRef([]);        // (was already there)
  const isFirstLoadRef = useRef(true);            // (was already there)

  // NEW: modal state for clicked notification
  const [selectedNotification, setSelectedNotification] = useState(null); // NEW
  const [isModalOpen, setIsModalOpen] = useState(false);                  // NEW

  const normalizeRole = (value) => {
    if (!value) return "";
    const v = String(value).trim().toLowerCase();
    if (v === "professor" || v === "prof" || v === "prof.") return "Professor";
    if (v === "ta" || v === "teaching assistant" || v === "teachingassistant") return "TA";
    if (v === "staff") return "Staff";
    if (v === "student") return "Student";
    if (v === "event office" || v === "eventoffice") return "Event Office";
    if (v === "admin") return "Admin";
    return v;
  };

  const filterReminderAudience = (list = []) => {
    const userRole = normalizeRole(user?.role);
    return list.filter((n) => {
      if (n.type !== "EVENT_REMINDER") return true;
      const roles = Array.isArray(n?.audienceFilter?.roles) ? n.audienceFilter.roles : null;
      if (!roles || !roles.length) return true;
      const normalized = roles.map(normalizeRole);
      return normalized.includes(userRole);
    });
  };

  const dedupeNotifications = (list = []) => {
    const seenReminderKeys = new Set();
    const result = [];

    for (const n of list) {
      if (n.type === "EVENT_REMINDER") {
        const evt = n?.data?.event || n?.data?.eventId || n?.data?.eventModel || n._id;
        const label = n?.data?.reminderLabel || "";
        const key = `${evt}_${label}`;
        if (seenReminderKeys.has(key)) continue;
        seenReminderKeys.add(key);
      }
      result.push(n);
    }

    return result;
  };

  // === BACKEND FUNCTION: getUserNotifications ===
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications/user");
      const incomingRaw = res.data?.items || [];
      const filtered = filterReminderAudience(incomingRaw);
      const incoming = dedupeNotifications(filtered);

      // detect new notifications (by _id) to show toast
      const prev = prevNotificationsRef.current;
      const prevIds = new Set(prev.map((n) => String(n._id)));
      const newOnes = incoming.filter((n) => !prevIds.has(String(n._id)));

      // skip toasts on very first load
      if (!isFirstLoadRef.current && newOnes.length > 0) {
        newOnes.forEach((n) => {
          toast.success(
            `New notification: ${n.title}`,
            {
              duration: 4000,
            }
          );
        });
      }

      // update ref & state
      prevNotificationsRef.current = incoming;
      isFirstLoadRef.current = false;

      setNotifications(incoming);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh + initial load
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      // faster refresh every 5 seconds
      const id = setInterval(fetchNotifications, 5000);
      return () => clearInterval(id);
    }
  }, [user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // === BACKEND FUNCTION: markNotificationAsRead (single) ===
  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/read/${id}`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark as read");
    }
  };

  // === BACKEND FUNCTION: dismissNotification (single) ===
  const deleteForUser = async (id) => {
    try {
      await api.delete(`/notifications/user/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete notification");
    }
  };

  // === BACKEND FUNCTION: markAllNotificationsAsRead ===
  const markAllRead = async () => {
    try {
      await api.patch("/notifications/user/mark-all-read");
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || now }))
      );
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark all as read");
    }
  };

  // === BACKEND FUNCTION: dismissAllNotificationsForUser ===
  const deleteAll = async () => {
    try {
      const res = await api.delete("/notifications/user-all");
      console.log("delete-all response:", res.data);
      setNotifications([]);
      toast.success("All notifications deleted");
    } catch (err) {
      console.error(
        "delete-all error:",
        err.response?.status,
        err.response?.data || err.message
      );
      toast.error("Failed to delete all notifications");
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const formatEventTime = (n) => {
    const startsAt = n?.data?.startsAt ? new Date(n.data.startsAt) : null;
    const startTime = n?.data?.startTime;
    if (!startsAt) return null;
    return `${startsAt.toLocaleDateString()}${startTime ? ` ${startTime}` : ""
      }`;
  };

  // NEW: open modal when clicking a notification item
  const handleOpenNotification = async (notification) => {
    try {
      // If unread, mark it as read first (reusing existing backend logic)
      if (!notification.readAt) {
        await markRead(notification._id);
      }

      setSelectedNotification({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to open notification details:", err);
    }
  };

  // NEW: close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  // NEW: decide where "Go now" should navigate
  const handleGoNow = () => {
    if (!selectedNotification) return;

    const allowedTypes = ["NEW_EVENT", "EVENT_REMINDER"];
    if (!allowedTypes.includes(selectedNotification.type)) {
      return;
    }

    setIsModalOpen(false);
    setOpen(false);
    navigate("/dashboard");
    navigateToSection("Available Events");
  };

  const canGoNow =
    selectedNotification &&
    (selectedNotification.type === "NEW_EVENT" ||
      selectedNotification.type === "EVENT_REMINDER"); // NEW

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-800 transition"
        title="Notifications"
      >
        <Bell className="h-6 w-6 text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-xs min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
          {/* Header with actions */}
          <div className="flex items-center justify-between p-3 border-b border-gray-800 gap-2">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="text-xs text-gray-400">
                {unreadCount} unread • {notifications.length} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-[11px] px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white"
              >
                Mark all read
              </button>
              <button
                onClick={deleteAll}
                className="text-[11px] px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white"
              >
                Clear all
              </button>
              <button
                onClick={fetchNotifications}
                className="text-[11px] text-gray-400 hover:text-gray-200"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* keep old notifications visible while loading */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && loading ? (
              // Only show "Loading..." when there are no notifications yet
              <div className="p-4 text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                You’re all caught up 🎉
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                const eventTime = formatEventTime(n);

                return (
                  <div
                    key={n._id}
                    role="button"
                    onClick={() => handleOpenNotification(n)}
                    className={`px-3 py-3 border-b border-gray-800 last:border-b-0 flex gap-3 cursor-pointer ${isUnread ? "bg-gray-900/80" : "bg-gray-900"
                      }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isUnread && (
                          <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full" />
                        )}
                        <span className="text-[11px] uppercase tracking-wide text-gray-400">
                          {n.type?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-300 mt-1">{n.message}</p>

                      {n?.data?.eventModel && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Event:{" "}
                          <span className="font-medium text-gray-200">
                            {n.data.eventModel}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">
                      {eventTime}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead(n._id);
                          }}
                          className="flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-500 p-1"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4 text-white" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteForUser(n._id);
                        }}
                        className="flex items-center justify-center rounded-md bg-red-600 hover:bg-red-500 p-1"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL for viewing single notification details */}
      {isModalOpen && selectedNotification && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gray-800 px-4 py-3 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {selectedNotification.type?.replace(/_/g, " ")}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 break-words">
                  {selectedNotification.title}
                </h2>
                <p className="text-gray-300 leading-relaxed text-sm break-words">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Rich Data Display */}
              {selectedNotification.data && (
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm border border-gray-700/50">
                  {selectedNotification.data.eventModel && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Event Type:</span>
                      <span className="text-gray-200 font-medium">{selectedNotification.data.eventModel}</span>
                    </div>
                  )}
                  {selectedNotification.data.shortDescription && (
                    <div className="pt-2 border-t border-gray-700/50 mt-2">
                      <span className="text-gray-500 block mb-1">Description:</span>
                      <p className="text-gray-300 italic break-words whitespace-pre-wrap">{selectedNotification.data.shortDescription}</p>
                    </div>
                  )}

                  {(selectedNotification.data.startDate || selectedNotification.data.startTime) && (
                    <div className="pt-2 border-t border-gray-700/50 mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500 block text-xs">Starts:</span>
                        <span className="text-gray-200">
                          {selectedNotification.data.startDate ? new Date(selectedNotification.data.startDate).toLocaleDateString() : ''}
                          {selectedNotification.data.startTime ? ` at ${selectedNotification.data.startTime}` : ''}
                        </span>
                      </div>
                      {(selectedNotification.data.endDate || selectedNotification.data.endTime) && (
                        <div>
                          <span className="text-gray-500 block text-xs">Ends:</span>
                          <span className="text-gray-200">
                            {selectedNotification.data.endDate ? new Date(selectedNotification.data.endDate).toLocaleDateString() : ''}
                            {selectedNotification.data.endTime ? ` at ${selectedNotification.data.endTime}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNotification.data.registrationDeadline && (
                    <div className="pt-2 border-t border-gray-700/50 mt-2">
                      <span className="text-red-400 block text-xs font-medium">Registration Deadline:</span>
                      <span className="text-gray-200">
                        {new Date(selectedNotification.data.registrationDeadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedNotification.data.location && (
                    <div className="pt-2 border-t border-gray-700/50 mt-2">
                      <span className="text-gray-500 block text-xs">Location:</span>
                      <span className="text-gray-200">{selectedNotification.data.location}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
                Received: {new Date(selectedNotification.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-800 px-4 py-3 flex justify-end gap-3 border-t border-gray-700">
              {!selectedNotification.readAt && (
                <button
                  onClick={() => {
                    markRead(selectedNotification._id);
                    handleCloseModal();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
                >
                  Mark as Read
                </button>
              )}
              <button
                onClick={() => {
                  deleteForUser(selectedNotification._id);
                  handleCloseModal();
                }}
                className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 text-xs font-medium rounded transition-colors"
              >
                Dismiss
              </button>
              {canGoNow && (
                <button
                  onClick={handleGoNow}
                  className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-medium rounded transition-colors"
                >
                  Go now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
