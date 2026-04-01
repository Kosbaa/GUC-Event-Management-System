import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicModal from "./DynamicModal";
import { useAuth } from "../context/AuthContext";
import QRCodeModal from "./QRCodeModal";
import QRCode from "qrcode";
import EventRating from "./EventRating";
import {
  Heart,
  MapPin,
  CalendarRange,
  Clock3,
  Users,
  FileText,
  Globe,
  BadgeDollarSign,
  MoreVertical,
  MessageSquare,
  Search,
  Calendar,
  Plus,
  Filter,
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Store,
  Star,
  StarHalf,
  Sparkles,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "Student", label: "Students" },
  { value: "Staff", label: "Staff" },
  { value: "Professor", label: "Professors" },
  { value: "TA", label: "Teaching Assistants" },
];

// No pre-selected roles by default — Event Office will explicitly choose eligible roles.
const DEFAULT_ALLOWED_ROLES = [];

const PRIVILEGED_ROLES = ["Admin", "Event Office"];
const REVIEW_ALLOWED_ROLES = ["Student", "Staff", "Professor", "TA"];

const normalizeRoleLabel = (role) => {
  if (!role) return "";
  const value = String(role).trim().toLowerCase();
  if (value === "eventoffice" || value === "event office")
    return "Event Office";
  if (value === "admin") return "Admin";
  if (value === "student") return "Student";
  if (value === "faculty") return "Faculty";
  if (value === "staff") return "Staff";
  if (value === "professor" || value === "prof") return "Professor";
  if (value === "ta") return "TA";
  if (value === "vendor") return "Vendor";
  return role;
};

export default function AvailableEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advFilters, setAdvFilters] = useState({
    type: "All",
    location: "All",
    startDate: "",
    endDate: "",
    name: "",
  });
  const [sortApplied, setSortApplied] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const userRoleRaw = user?.role || "";
  const userRole = normalizeRoleLabel(userRoleRaw);
  const isAdmin = userRole === "Admin";
  const isEventOffice = userRole === "Event Office";
  const isPrivilegedUser = PRIVILEGED_ROLES.includes(userRole);
  const canSeeRecommendations = !isAdmin && !isEventOffice;
  const currentUserId =
    user && (user._id || user.id || user.userId)
      ? String(user._id || user.id || user.userId)
      : "";
  const isBazaarLikeEvent = (event) => {
    const eventType = String(
      event?.type || event?.eventType || event?.category || ""
    )
      .trim()
      .toLowerCase();
    if (eventType.includes("bazaar")) return true;
    if (
      Object.prototype.hasOwnProperty.call(event || {}, "price2x2") ||
      Object.prototype.hasOwnProperty.call(event || {}, "price4x4")
    ) {
      return true;
    }
    if (Array.isArray(event?.vendorRequests)) return true;
    return false;
  };

  const eventAllowsCurrentUser = (event) => {
    if (!event) return false;
    const creatorId =
      event?.createdBy?._id ||
      event?.createdBy?.id ||
      event?.createdBy ||
      event?.creatorId;
    if (creatorId && user?.id && String(creatorId) === String(user.id)) {
      return true;
    }
    if (userRole === "Vendor" && isBazaarLikeEvent(event)) {
      return true;
    }
    const roles = Array.isArray(event.allowedRoles) ? event.allowedRoles : [];
    if (!roles.length) return true;
    if (isPrivilegedUser) return true;
    return roles.includes(userRole);
  };
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", UniId: "" });
  const [editForm, setEditForm] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [editFields, setEditFields] = useState([]);
  const [editMeta, setEditMeta] = useState({ typeLabel: "", description: "" });
  const [editSummary, setEditSummary] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState(null);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [ratingsEvent, setRatingsEvent] = useState(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsEvent, setReviewsEvent] = useState(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState("");

  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const favoriteEligibleRoles = ["Student", "TA", "Professor", "Staff"];
  const canUseFavorites = favoriteEligibleRoles.includes(user?.role);
  const [acceptedVendors, setAcceptedVendors] = useState([]);
  const [showVendorsModal, setShowVendorsModal] = useState(false);
  const [vendorsEvent, setVendorsEvent] = useState(null);
  const [vendorsModalLoading, setVendorsModalLoading] = useState(false);
  const [vendorsModalError, setVendorsModalError] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrShareUrl, setQrShareUrl] = useState("");

  // NEW: feedback state for the Details modal
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedback, setFeedback] = useState({
    average: 0,
    count: 0,
    items: [], // {rating, comment, userName, createdAt}
  });
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [commentToDeleteId, setCommentToDeleteId] = useState(null);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);

  // create-event modal state and form (mirrors CreateEvent.jsx)
  const createInitialState = {
    eventType: "bazaar",
    name: "",
    shortDescription: "",
    location: "",
    registrationDeadline: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    capacity: "",
    price: "",
    price2x2: "",
    price4x4: "",
    agenda: "",
    website: "",
    budget: "",
    fundingSource: "",
    extraResources: "",
    allowedRoles: DEFAULT_ALLOWED_ROLES,
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(createInitialState);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [pendingTypeChoice, setPendingTypeChoice] = useState("bazaar");
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessTarget, setAccessTarget] = useState(null);
  const [accessForm, setAccessForm] = useState({ allowedRoles: [] });
  const [savingAccess, setSavingAccess] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleWindowClick = () => setOpenActionMenuId(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);
  const getCreateDateTimeValue = (prefix) => {
    const date = createForm[`${prefix}Date`];
    const time = createForm[`${prefix}Time`];
    if (!date) return "";
    const safeTime = (time || "09:00").slice(0, 5);
    return `${date}T${safeTime}`;
  };

  const handleCreateDateTimeChange = (prefix, value) => {
    setCreateForm((prev) => {
      if (!value) {
        return {
          ...prev,
          [`${prefix}Date`]: "",
          [`${prefix}Time`]: "",
        };
      }
      const [datePart, timePart = "00:00"] = value.split("T");
      return {
        ...prev,
        [`${prefix}Date`]: datePart,
        [`${prefix}Time`]: timePart.slice(0, 5),
      };
    });
  };

  const handleCreateRegistrationDeadlineChange = (value) => {
    setCreateForm((prev) => ({
      ...prev,
      registrationDeadline: value,
    }));
  };
  const fetchAcceptedVendors = async (bazaarId) => {
    try {
      const res = await api.get(`/events/${bazaarId}/accepted-vendors`);
      return res.data.acceptedVendors || [];
    } catch (err) {
      console.error("Failed to fetch accepted vendors:", err);
      throw err;
    }
  };

  const openVendorsModalForEvent = async (event) => {
    if (!event) return;
    const eventId = event._id || event.id || event.eventId;
    if (!eventId) return;

    setVendorsEvent(event);
    setShowVendorsModal(true);
    setVendorsModalError("");
    setAcceptedVendors([]);
    setVendorsModalLoading(true);

    try {
      const vendors = await fetchAcceptedVendors(eventId);
      setAcceptedVendors(vendors);
      if (!vendors.length) {
        setVendorsModalError("No vendors have been accepted yet.");
      }
    } catch (err) {
      setVendorsModalError("Unable to load vendors right now.");
    } finally {
      setVendorsModalLoading(false);
    }
  };

  const closeVendorsModal = () => {
    setShowVendorsModal(false);
    setVendorsEvent(null);
    setVendorsModalError("");
    setVendorsModalLoading(false);
    setAcceptedVendors([]);
  };

  const fetchFavoriteEvents = async () => {
    if (authLoading || !user) return;
    try {
      const res = await api.get("/events/favorites/my");
      const favs = res.data?.favorites || [];
      const favIds = favs.map((ev) => ev._id || ev.id || ev.eventId);
      setFavoriteEvents(favIds);
    } catch (err) {
      console.error("Failed to fetch favorite events:", err);
    }
  };

  // ---- helpers for feedback ----
  // Replace getNormalizedType with this:
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

  const normalizeFeedback = (raw) => {
    // Accept several shapes:
    // 1) { average, count, feedback: [{ rating, comment, by, createdAt }] }
    // 2) { ratings: { average, count }, comments: [...] }
    // 3) event-level: { ratings: { average, count }, comments: [...] }
    // 4) flat arrays or different keys
    try {
      if (!raw || typeof raw !== "object") {
        return { average: 0, count: 0, items: [] };
      }
      if (raw.average != null || raw.count != null || raw.feedback) {
        const avg = Number(raw.average || 0);
        const cnt = Number(
          raw.count || (raw.feedback ? raw.feedback.length : 0)
        );
        const items = Array.isArray(raw.feedback)
          ? raw.feedback
          : Array.isArray(raw.items)
          ? raw.items
          : [];
        return {
          average: isNaN(avg) ? 0 : avg,
          count: isNaN(cnt) ? 0 : cnt,
          items: items.map((i, idx) => ({
            rating: i.rating ?? i.stars ?? i.value ?? 0,
            comment: i.comment ?? i.text ?? "",
            userName: i.userName ?? i.by ?? i.user ?? `User ${idx + 1}`,
            createdAt: i.createdAt ?? i.date ?? null,
          })),
        };
      }
      if (raw.ratings || raw.comments) {
        const avg = Number(raw.ratings?.average || 0);
        const cnt = Number(raw.ratings?.count || raw.comments?.length || 0);
        const items = Array.isArray(raw.comments)
          ? raw.comments.map((c, idx) => ({
              rating: c.rating ?? c.stars ?? c.value ?? 0,
              comment: c.comment ?? c.text ?? "",
              userName: c.userName ?? c.by ?? c.user ?? `User ${idx + 1}`,
              createdAt: c.createdAt ?? c.date ?? null,
            }))
          : [];
        return {
          average: isNaN(avg) ? 0 : avg,
          count: isNaN(cnt) ? 0 : cnt,
          items,
        };
      }
      // Fallback: if it's just an array (unlikely), treat as comments
      if (Array.isArray(raw)) {
        const items = raw.map((c, idx) => ({
          rating: c.rating ?? c.stars ?? c.value ?? 0,
          comment: c.comment ?? c.text ?? "",
          userName: c.userName ?? c.by ?? c.user ?? `User ${idx + 1}`,
          createdAt: c.createdAt ?? c.date ?? null,
        }));
        const ratings = items.map((i) => Number(i.rating) || 0);
        const avg =
          ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0;
        return { average: avg, count: items.length, items };
      }
      return { average: 0, count: 0, items: [] };
    } catch {
      return { average: 0, count: 0, items: [] };
    }
  };

  const renderStars = (value, options = {}) => {
    const numeric = Math.max(0, Math.min(5, Number(value) || 0));
    let full = Math.floor(numeric);
    const fraction = numeric - full;
    let showHalf = false;

    if (fraction >= 0.75) {
      full = Math.min(5, full + 1);
    } else if (fraction >= 0.25) {
      showHalf = true;
    }

    const empty = Math.max(0, 5 - full - (showHalf ? 1 : 0));
    const stars = [];
    const { size = "h-4 w-4", className = "" } = options;

    for (let i = 0; i < full; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className={`${size}`}
          fill="currentColor"
          strokeWidth={1.5}
        />
      );
    }

    if (showHalf && stars.length < 5) {
      stars.push(
        <StarHalf
          key="half"
          className={`${size}`}
          fill="currentColor"
          strokeWidth={1.5}
        />
      );
    }

    for (let i = 0; i < empty; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className={`${size} text-gray-600`}
          fill="none"
          strokeWidth={1.2}
        />
      );
    }

    return (
      <div
        className={`flex items-center gap-0.5 text-yellow-400 ${className}`}
        aria-label={`${numeric.toFixed(1)} out of 5`}
      >
        {stars}
      </div>
    );
  };

  const fetchEventFeedback = async (eventObj, forceRemote = false) => {
    setFeedbackLoading(true);
    setFeedbackError("");
    try {
      // if data exists on the event object already (embedded from backend), use it
      if (!forceRemote && (eventObj?.ratings || eventObj?.comments)) {
        console.log(
          "[fetchEventFeedback] Using embedded ratings/comments from event object"
        );

        // Process the embedded data
        const ratings = eventObj.ratings?.items || [];
        const comments = eventObj.comments?.items || [];

        // Build a map studentId -> rating value for quick lookup
        const ratingByStudent = {};
        ratings.forEach((rt) => {
          if (rt && rt.student) {
            const studentId = rt.student._id || rt.student.id || rt.student;
            ratingByStudent[String(studentId)] = rt.value;
          }
        });

        // Combine ratings and comments into items
        const commentItems = comments.map((cm) => {
          const studentId = cm.student?._id || cm.student?.id || cm.student;
          const studentName = cm.student?.name || cm.userName || "Anonymous";
          const commentId = cm._id || cm.id || cm.commentId || null;
          return {
            rating: ratingByStudent[String(studentId)] ?? 0,
            comment: cm.text || cm.comment || cm.body || "",
            userName: studentName,
            createdAt: cm.createdAt || cm.date || null,
            studentId: studentId ? String(studentId) : undefined,
            commentId,
          };
        });

        // Also include ratings that don't have comments
        const ratingItems = ratings
          .filter((rt) => {
            const studentId = rt.student?._id || rt.student?.id || rt.student;
            return !comments.some((cm) => {
              const cmStudentId =
                cm.student?._id || cm.student?.id || cm.student;
              return String(cmStudentId) === String(studentId);
            });
          })
          .map((rt) => {
            const studentId = rt.student?._id || rt.student?.id || rt.student;
            const studentName = rt.student?.name || "Anonymous";
            return {
              rating: rt.value || 0,
              comment: "",
              userName: studentName,
              createdAt: rt.createdAt || null,
              studentId: String(studentId),
            };
          });

        // Combine and sort by date (newest first)
        const items = [...commentItems, ...ratingItems].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        const average = eventObj.ratings?.average ?? 0;
        const count = eventObj.ratings?.count ?? ratings.length;

        setFeedback({ average, count, items });
        setFeedbackLoading(false);
        return;
      }

      const eventId = eventObj?._id || eventObj?.id || eventObj?.eventId;
      const eventType = getNormalizedType(eventObj);

      console.log("[fetchEventFeedback] Event object:", {
        eventId,
        eventType,
        rawType: eventObj?.type || eventObj?.eventType || eventObj?.category,
        fullEvent: eventObj,
      });

      if (!eventId) {
        console.error("Missing eventId in event object:", eventObj);
        setFeedback({ average: 0, count: 0, items: [] });
        setFeedbackLoading(false);
        return;
      }

      if (!eventType) {
        console.error("Missing eventType in event object:", eventObj);
        setFeedback({ average: 0, count: 0, items: [] });
        setFeedbackError("Could not determine event type.");
        setFeedbackLoading(false);
        return;
      }

      // Our backend exposes two endpoints: /feedback/ratings/:eventId and /feedback/comments/:eventId
      // Fetch both and merge into a normalized shape.
      let ratingsData = null;
      let commentsData = null;
      let ratingsError = null;
      let commentsError = null;

      const ratingsUrl = `/events/feedback/ratings/${eventId}`;
      const commentsUrl = `/events/feedback/comments/${eventId}`;

      console.log(
        `[fetchEventFeedback] Fetching ratings from: ${ratingsUrl}?eventType=${eventType}`
      );

      try {
        const r = await api.get(ratingsUrl, {
          params: { eventType },
        });
        ratingsData = r?.data;
        console.log(`[fetchEventFeedback] Ratings response:`, ratingsData);
      } catch (e) {
        ratingsError = e;
        console.error("Failed to fetch ratings:", {
          url: ratingsUrl,
          params: { eventType },
          error: e?.response?.data || e?.message || e,
          status: e?.response?.status,
        });
      }

      console.log(
        `[fetchEventFeedback] Fetching comments from: ${commentsUrl}?eventType=${eventType}`
      );

      try {
        const c = await api.get(commentsUrl, {
          params: { eventType },
        });
        commentsData = c?.data;
        console.log(`[fetchEventFeedback] Comments response:`, commentsData);
      } catch (e) {
        commentsError = e;
        console.error("Failed to fetch comments:", {
          url: commentsUrl,
          params: { eventType },
          error: e?.response?.data || e?.message || e,
          status: e?.response?.status,
        });
      }

      // if we got nothing useful, fall back to empty
      if (!ratingsData && !commentsData) {
        const errorMsg =
          ratingsError?.response?.data?.message ||
          commentsError?.response?.data?.message;
        setFeedback({ average: 0, count: 0, items: [] });
        setFeedbackError(errorMsg || "Couldn't load ratings for this event.");
      } else {
        const ratings = Array.isArray(ratingsData?.ratings)
          ? ratingsData.ratings
          : [];
        const comments = Array.isArray(commentsData?.comments)
          ? commentsData.comments
          : [];

        // build a map studentId -> rating value for quick lookup
        // Handle both ObjectId (string) and populated student object
        const ratingByStudent = {};
        ratings.forEach((rt) => {
          if (rt && rt.student) {
            const studentId = rt.student._id || rt.student.id || rt.student;
            ratingByStudent[String(studentId)] = rt.value;
          }
        });

        // Combine ratings and comments into items
        // First, create items from comments (which may have ratings)
        const commentItems = comments.map((cm) => {
          const studentId = cm.student?._id || cm.student?.id || cm.student;
          const studentName = cm.student?.name || cm.userName || "Anonymous";
          return {
            rating: ratingByStudent[String(studentId)] ?? 0,
            comment: cm.text || cm.comment || cm.body || "",
            userName: studentName,
            createdAt: cm.createdAt || cm.date || null,
            studentId: String(studentId),
            commentId: cm._id || cm.id || cm.commentId || null,
          };
        });

        // Also include ratings that don't have comments
        const ratingItems = ratings
          .filter((rt) => {
            const studentId = rt.student?._id || rt.student?.id || rt.student;
            // Only include if there's no comment from this student
            return !comments.some((cm) => {
              const cmStudentId =
                cm.student?._id || cm.student?.id || cm.student;
              return String(cmStudentId) === String(studentId);
            });
          })
          .map((rt) => {
            const studentId = rt.student?._id || rt.student?.id || rt.student;
            const studentName = rt.student?.name || "Anonymous";
            return {
              rating: rt.value || 0,
              comment: "",
              userName: studentName,
              createdAt: rt.createdAt || null,
              studentId: String(studentId),
            };
          });

        // Combine and sort by date (newest first)
        const items = [...commentItems, ...ratingItems].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        const average =
          ratingsData?.average ??
          (ratings.length > 0
            ? ratings.reduce((s, r) => s + (r.value || 0), 0) / ratings.length
            : 0);
        const count = ratingsData?.count ?? ratings.length;

        console.log(
          `[fetchEventFeedback] Processed ${items.length} items (${commentItems.length} comments, ${ratingItems.length} ratings only)`
        );

        setFeedback({ average, count, items });
      }
    } catch (err) {
      console.error("Feedback load failed:", err);
      setFeedback({ average: 0, count: 0, items: [] });
      setFeedbackError(
        err?.response?.data?.message || "Failed to load ratings for this event."
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  // buildFields copied from CreateEvent.jsx to power the create modal
  function buildFields(evtType) {
    const basics = [
      {
        type: "section",
        label: "Event Basics",
        description:
          "Set the essential information that appears on listings, invites, and approval workflows.",
      },
      {
        name: "name",
        type: "text",
        label: "Name",
        placeholder: "Give your event a memorable name",
        required: true,
        hint: "This title is shown on event cards, reminders, and reports.",
      },
      {
        name: "shortDescription",
        type: "textarea",
        label: "Short Description",
        placeholder: "Summarize the experience in a couple of sentences",
        hint: "Keep it concise so it fits everywhere.",
      },
      {
        name: "location",
        type: "text",
        label: "Location / Venue",
        placeholder: "e.g., Arena Hall, Sports Complex, Off-campus",
        required: true,
      },
      {
        name: "allowedRoles",
        type: "checkbox-group",
        label: "Eligible Roles",
        options: ROLE_OPTIONS,
        hint: "Only the selected roles will see and register for this event.",
      },
    ];

    if (!evtType) return basics;

    if (evtType === "bazaar") {
      return [
        ...basics,
        {
          type: "section",
          label: "Booth Capacity & Pricing",
          description:
            "Define how many booths you can host and the pricing tiers per booth size.",
        },
        {
          name: "capacity",
          type: "number",
          label: "Booth Capacity",
          placeholder: "e.g., 40 booths",
          min: 0,
          required: true,
        },
        {
          name: "price2x2",
          type: "number",
          label: "Price for 2x2 Booth (EGP)",
          required: true,
          min: 0,
          step: "0.01",
          hint: "Vendors will see this when applying for a standard booth.",
        },
        {
          name: "price4x4",
          type: "number",
          label: "Price for 4x4 Booth (EGP)",
          required: true,
          min: 0,
          step: "0.01",
          hint: "Used for larger premium booths.",
        },
      ];
    }

    if (evtType === "trip") {
      return [
        ...basics,
        {
          type: "section",
          label: "Trip Logistics",
          description: "Outline the slots available and pricing per attendee.",
        },
        {
          name: "capacity",
          type: "number",
          label: "Seats Available",
          placeholder: "e.g., 30 travelers",
          min: 0,
          required: true,
        },
        {
          name: "price",
          type: "number",
          label: "Price per attendee (EGP)",
          placeholder: "e.g., 9500",
          min: 0,
          step: "0.01",
          hint: "Covers transportation, accommodation, and activities.",
        },
      ];
    }

    if (evtType === "conference") {
      return [
        ...basics,
        {
          type: "section",
          label: "Conference Extras",
          description:
            "Share agendas, useful links, or budget requirements for approvals.",
        },
        {
          name: "agenda",
          type: "textarea",
          label: "Agenda / Program",
          placeholder: "Attach or outline the conference program",
        },
        {
          name: "website",
          type: "text",
          label: "Website / Registration Link",
          placeholder: "https://example.com",
        },
        {
          name: "budget",
          type: "number",
          label: "Estimated Budget (EGP)",
          min: 0,
          step: "0.01",
        },
        {
          name: "fundingSource",
          type: "select",
          label: "Funding Source",
          options: [
            { value: "", label: "Select funding source" },
            { value: "External", label: "External" },
            { value: "GUC", label: "GUC" },
          ],
        },
        {
          name: "extraResources",
          type: "textarea",
          label: "Extra Required Resources",
          placeholder: "Equipment, booths, marketing materials, etc.",
        },
      ];
    }

    return basics;
  }

  // handleCreate copied from CreateEvent.jsx (same functionality)
  async function handleCreate(formData) {
    if (!formData.eventType) return toast.error("Select event type");
    let endpoint = "/events";
    switch (formData.eventType) {
      case "bazaar":
        endpoint = "/events/bazaar";
        break;
      case "trip":
        endpoint = "/events/trip";
        break;
      case "conference":
        endpoint = "/events/conference";
        break;
    }
    try {
      await api.post(endpoint, formData);
      toast.success("Event created");
      setShowCreateModal(false);
      setCreateForm(createInitialState);
      fetchAvailableEvents();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create event");
    }
  }

  const fetchAvailableEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/all");
      const data = res.data;
      let merged = [];
      if (Array.isArray(data)) {
        merged = data;
      } else if (data && typeof data === "object") {
        for (const [key, val] of Object.entries(data)) {
          if (!Array.isArray(val)) continue;
          let typeName = key;
          if (typeName.toLowerCase().endsWith("s")) {
            typeName = typeName.slice(0, -1);
          }
          typeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
          merged.push(
            ...val.map((ev) => ({
              ...ev,
              type: ev.type || ev.eventType || typeName,
            }))
          );
        }
      }
      setEvents(merged);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load available events");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedEvents = async () => {
    if (authLoading || !user) return;
    try {
      setRecommendedLoading(true);
      setRecommendedError("");
      const res = await api.get("/events/recommended");
      const data = res.data?.recommended ?? res.data;
      let merged = [];
      if (Array.isArray(data)) {
        merged = data;
      } else if (data && typeof data === "object") {
        for (const [key, val] of Object.entries(data)) {
          if (!Array.isArray(val)) continue;
          let typeName = key;
          if (typeName.toLowerCase().endsWith("s")) {
            typeName = typeName.slice(0, -1);
          }
          typeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
          merged.push(
            ...val.map((ev) => ({
              ...ev,
              type: ev.type || ev.eventType || typeName,
            }))
          );
        }
      }
      setRecommendedEvents(merged);
    } catch (err) {
      console.error(err);
      setRecommendedError("Unable to load recommended events right now.");
      toast.error("Failed to load recommended events");
    } finally {
      setRecommendedLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableEvents();

    // Listen for rating submissions to refresh events
    const handleRatingSubmitted = () => {
      console.log("[AvailableEvents] Rating submitted, refreshing events...");
      fetchAvailableEvents();
    };

    window.addEventListener("ratingSubmitted", handleRatingSubmitted);

    return () => {
      window.removeEventListener("ratingSubmitted", handleRatingSubmitted);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchFavoriteEvents();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!showRecommendedOnly) return;
    if (recommendedEvents.length > 0 || recommendedLoading) return;
    fetchRecommendedEvents();
  }, [
    showRecommendedOnly,
    recommendedEvents.length,
    recommendedLoading,
    authLoading,
    user,
  ]);

  useEffect(() => {
    setShowRecommendedOnly(false);
    setRecommendedEvents([]);
    setRecommendedError("");
  }, [user?.id]);

  function handleRefresh() {
    setFilter("");
    setAdvFilters({
      type: "All",
      location: "All",
      startDate: "",
      endDate: "",
      name: "",
    });
    setSortApplied(false);
    setShowFavoritesOnly(false);
    setShowRecommendedOnly(false);
    setRecommendedEvents([]);
    setRecommendedError("");
    fetchAvailableEvents();
  }

  const handleToggleRecommended = () => {
    setRecommendedError("");
    setShowRecommendedOnly((prev) => {
      const next = !prev;
      if (next) {
        setShowPastEvents(false);
      }
      if (next && recommendedEvents.length === 0 && !recommendedLoading) {
        fetchRecommendedEvents();
      }
      return next;
    });
  };

  const activeEvents = showRecommendedOnly ? recommendedEvents : events;
  const eventsLoading = showRecommendedOnly ? recommendedLoading : loading;

  const types = [
    "All",
    ...Array.from(
      new Set(
        activeEvents.map(
          (ev) => ev.type || ev.eventType || ev.category || "other"
        )
      )
    ),
  ];

  const locations = [
    "All",
    ...Array.from(
      new Set(
        activeEvents
          .map((ev) => ev.location)
          .filter(
            (v) => v !== undefined && v !== null && String(v).trim() !== ""
          )
          .map((v) => String(v).trim())
      )
    ),
  ];

  const eventTypeOptions = [
    {
      value: "bazaar",
      title: "Bazaar",
      blurb: "Pop-up markets with booth pricing and vendor approvals.",
      accent: "text-emerald-300",
    },
    {
      value: "trip",
      title: "Trip",
      blurb: "Off-campus experiences with seats, pricing, and deadlines.",
      accent: "text-sky-300",
    },
    {
      value: "conference",
      title: "Conference",
      blurb: "Multi-day agendas, speaker lineups, and resource links.",
      accent: "text-amber-300",
    },
  ];

  const isCreateTypeSelected = Boolean(createForm.eventType);
  const requiresCreateDeadline = ["bazaar", "trip"].includes(
    String(createForm.eventType || "").toLowerCase()
  );
  const createStartDateTime = getCreateDateTimeValue("start");
  const createEndDateTime = getCreateDateTimeValue("end");
  const createDateInputClasses =
    "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/60 disabled:opacity-60";
  const createScheduleSection = (
    <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-950/70 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Schedule & deadlines</p>
        <p className="text-xs text-gray-400">
          Pick the exact window for this event. Dates are stored in Cairo local
          time.
        </p>
      </div>
      {!isCreateTypeSelected && (
        <p className="text-xs text-yellow-400">
          Select an event type to unlock scheduling options.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-400">
            Start date & time
          </label>
          <input
            type="datetime-local"
            value={createStartDateTime}
            onChange={(e) =>
              handleCreateDateTimeChange("start", e.target.value)
            }
            className={createDateInputClasses}
            disabled={!isCreateTypeSelected}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            When doors open or the trip officially begins.
          </p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-400">
            End date & time
          </label>
          <input
            type="datetime-local"
            value={createEndDateTime}
            onChange={(e) => handleCreateDateTimeChange("end", e.target.value)}
            className={createDateInputClasses}
            disabled={!isCreateTypeSelected}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            When teardown finishes or the trip returns.
          </p>
        </div>
      </div>
      {requiresCreateDeadline && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400">
              Registration deadline
            </label>
            <input
              type="date"
              value={createForm.registrationDeadline || ""}
              onChange={(e) =>
                handleCreateRegistrationDeadlineChange(e.target.value)
              }
              className={createDateInputClasses}
              disabled={!isCreateTypeSelected}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Vendors and attendees cannot sign up after this date.
            </p>
          </div>
        </div>
      )}
    </div>
  );
  const createModalDescription =
    "Provide the basics, timing, and any pricing info so we can publish a polished event card.";

  // utils/bazaarHelpers.js
  const countAcceptedVendors = (bazaar) => {
    if (!bazaar || !Array.isArray(bazaar.vendorRequests)) return 0;
    return bazaar.vendorRequests.filter((req) =>
      ["accepted", "awaiting_payment"].includes(req.status)
    ).length;
  };

  const humanizeType = (value) => {
    if (!value) return "Event";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getEventTypeKey = (eventOrType) => {
    const rawValue =
      typeof eventOrType === "string"
        ? eventOrType
        : eventOrType?.type ||
          eventOrType?.eventType ||
          eventOrType?.category ||
          "";
    const normalized = String(rawValue).trim().toLowerCase();
    if (normalized.includes("bazaar") || normalized.includes("fair"))
      return "bazaar";
    if (normalized === "trip") return "trip";
    if (normalized === "conference") return "conference";
    if (normalized === "workshop") return "workshop";
    if (normalized === "gym" || normalized === "gym session") return "gym";
    return "default";
  };

  const getEventEditEndpoint = (event) => {
    if (!event) return "";
    const id = event._id || event.id;
    if (!id) return "";
    const typeKey = getEventTypeKey(event);
    if (!typeKey || typeKey === "default") return `/events/${id}`;
    return `/events/${typeKey}/${id}`;
  };

  const canSubmitFeedbackForEvent = (event) => {
    if (!event) return false;
    if (!isPrivilegedUser && !eventAllowsCurrentUser(event)) {
      return false;
    }
    if (!event.startDate) return true;
    const start = new Date(event.startDate);
    if (Number.isNaN(start.getTime())) return true;
    return start <= new Date();
  };

  const formatDateForInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const iso = date.toISOString();
    return iso.slice(0, 10);
  };

  const formatTimeForInput = (value) => {
    if (!value) return "";
    if (typeof value === "string" && value.length >= 5) {
      return value.slice(0, 5);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  };

  const formatCurrencyEGP = (value) => {
    if (value == null || Number.isNaN(Number(value))) return "N/A";
    return Number(value).toLocaleString("en-EG", {
      style: "currency",
      currency: "EGP",
    });
  };

  const buildDateTimeFromParts = (dateValue, timeValue) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    if (typeof timeValue === "string" && timeValue.trim()) {
      const [hours = "0", minutes = "0"] = timeValue.split(":");
      const parsedHours = Number(hours);
      const parsedMinutes = Number(minutes);
      date.setHours(
        Number.isNaN(parsedHours) ? 0 : parsedHours,
        Number.isNaN(parsedMinutes) ? 0 : parsedMinutes,
        0,
        0
      );
    }
    return date;
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

  const computeRegistrationDeadlineDate = (event) => {
    if (!event?.registrationDeadline) return null;
    const deadline = new Date(event.registrationDeadline);
    if (Number.isNaN(deadline.getTime())) return null;

    const normalizedDeadline = new Date(deadline);
    normalizedDeadline.setHours(23, 59, 0, 0);

    const startDateTime = buildDateTimeFromParts(
      event.startDate,
      event.startTime
    );

    if (
      startDateTime &&
      startDateTime.toDateString() === normalizedDeadline.toDateString()
    ) {
      return startDateTime;
    }

    return normalizedDeadline;
  };

  const formatRegistrationDeadlineLabel = (event) => {
    const deadline = computeRegistrationDeadlineDate(event);
    if (!deadline) return "Not set";
    return deadline.toLocaleString("en-EG", {
      timeZone: "Africa/Cairo",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const editConfigurations = {
    bazaar: {
      label: "Bazaar",
      description:
        "Update the basic details vendors see. Times and dates stay locked once the bazaar starts.",
      fields: [
        {
          name: "name",
          label: "Bazaar Name",
          type: "text",
          required: true,
          placeholder: "Spring Fair 2025",
        },
        {
          name: "location",
          label: "Location",
          type: "text",
          required: true,
          placeholder: "Main Courtyard",
          hint: "Let vendors know exactly where the bazaar is hosted.",
        },
        {
          name: "shortDescription",
          label: "Short Description",
          type: "textarea",
          placeholder: "Quick teaser for participants",
          hint: "This appears on the event card.",
        },
        {
          name: "registrationDeadline",
          label: "Vendor Registration Deadline",
          type: "date",
          required: true,
          toFormValue: (event) =>
            formatDateForInput(event.registrationDeadline),
          hint: "Accepted vendors can apply until this date.",
        },
        {
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.startDate),
        },
        {
          name: "startTime",
          label: "Start Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.startTime),
          hint: "Use 24-hour format, e.g. 09:30.",
        },
        {
          name: "endDate",
          label: "End Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.endDate),
        },
        {
          name: "endTime",
          label: "End Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.endTime),
          hint: "Leave blank if the bazaar ends when vendors close.",
        },
        {
          name: "capacity",
          label: "Vendor Capacity",
          type: "number",
          min: 0,
          required: true,
        },
        {
          name: "price2x2",
          label: "2x2 Booth Price (EGP)",
          type: "number",
          min: 0,
          step: "0.01",
          required: true,
        },
        {
          name: "price4x4",
          label: "4x4 Booth Price (EGP)",
          type: "number",
          min: 0,
          step: "0.01",
          required: true,
        },
      ],
    },
    trip: {
      label: "Trip",
      description:
        "Fine-tune trip logistics. Participants see changes instantly.",
      fields: [
        {
          name: "name",
          label: "Trip Name",
          type: "text",
          required: true,
          placeholder: "Nile Cruise Adventure",
        },
        {
          name: "shortDescription",
          label: "Short Description",
          type: "textarea",
          placeholder: "Highlight the experience in a sentence or two",
          hint: "Displayed under the trip name for students.",
        },
        {
          name: "location",
          label: "Location",
          type: "text",
          required: true,
          placeholder: "Destination city or venue",
        },
        {
          name: "price",
          label: "Price (EGP)",
          type: "number",
          step: "0.01",
          min: 0,
          fromFormValue: (value) =>
            value === "" ? undefined : Number.parseFloat(value),
          hint: "Set to 0 for complimentary trips.",
        },
        {
          name: "capacity",
          label: "Capacity",
          type: "number",
          min: 1,
          fromFormValue: (value) =>
            value === "" ? undefined : Number.parseInt(value, 10),
          hint: "Students see remaining seats in real time.",
        },
        {
          name: "registrationDeadline",
          label: "Registration Deadline",
          type: "date",
          toFormValue: (event) =>
            formatDateForInput(event.registrationDeadline),
          hint: "After this date the registration button is hidden.",
        },
        {
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.startDate),
        },
        {
          name: "startTime",
          label: "Start Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.startTime),
          hint: "Use 24-hour format, e.g. 07:45.",
        },
        {
          name: "endDate",
          label: "End Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.endDate),
        },
        {
          name: "endTime",
          label: "End Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.endTime),
          hint: "Optional – leave blank if open-ended.",
        },
      ],
    },
    conference: {
      label: "Conference",
      description:
        "Share up-to-date agenda and logistics with attendees and speakers.",
      fields: [
        {
          name: "name",
          label: "Conference Name",
          type: "text",
          required: true,
          placeholder: "AI & Innovation Summit",
        },
        {
          name: "shortDescription",
          label: "Short Description",
          type: "textarea",
          placeholder: "One-liner visible on the event card",
          hint: "Helps attendees quickly understand the focus.",
        },
        {
          name: "agenda",
          label: "Agenda Overview",
          type: "textarea",
          placeholder: "Key topics or sessions",
          hint: "Share highlights; detailed agendas can live on the website.",
        },
        {
          name: "website",
          label: "Website",
          type: "text",
          placeholder: "https://example.com",
        },
        {
          name: "budget",
          label: "Budget (EGP)",
          type: "number",
          min: 0,
          step: "0.01",
          fromFormValue: (value) =>
            value === "" ? undefined : Number.parseFloat(value),
        },
        {
          name: "fundingSource",
          label: "Funding Source",
          type: "select",
          options: [
            { value: "", label: "Select funding source" },
            { value: "External", label: "External" },
            { value: "GUC", label: "GUC" },
          ],
        },
        {
          name: "extraResources",
          label: "Extra Required Resources",
          type: "textarea",
          placeholder: "Equipment, promotion, logistics, etc.",
        },
        {
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.startDate),
        },
        {
          name: "startTime",
          label: "Start Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.startTime),
        },
        {
          name: "endDate",
          label: "End Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.endDate),
        },
        {
          name: "endTime",
          label: "End Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.endTime),
        },
        {
          name: "extraResources",
          label: "Extra Resources",
          type: "textarea",
          placeholder: "Links or notes for participants",
        },
      ],
    },
    workshop: {
      label: "Workshop",
      description:
        "Tweak workshop content and logistics. Edits reset approval to pending.",
      fields: [
        {
          name: "name",
          label: "Workshop Name",
          type: "text",
          required: true,
        },
        {
          name: "shortDescription",
          label: "Short Description",
          type: "textarea",
          placeholder: "Visible to students once approved",
        },
        {
          name: "agenda",
          label: "Agenda",
          type: "textarea",
        },
        {
          name: "location",
          label: "Campus",
          type: "select",
          options: [
            { value: "", label: "Select campus" },
            { value: "GUC Cairo", label: "GUC Cairo" },
            { value: "GUC Berlin", label: "GUC Berlin" },
          ],
        },
        {
          name: "facultyResponsible",
          label: "Faculty Responsible",
          type: "text",
        },
        {
          name: "professors",
          label: "Facilitators",
          type: "textarea",
          toFormValue: (event) =>
            Array.isArray(event.professors)
              ? event.professors.join(", ")
              : event.professors || "",
          fromFormValue: (value) =>
            value
              ? value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : [],
        },
        {
          name: "budget",
          label: "Budget (EGP)",
          type: "number",
          min: 0,
          step: "0.01",
          fromFormValue: (value) =>
            value === "" ? undefined : Number.parseFloat(value),
        },
        {
          name: "fundingSource",
          label: "Funding Source",
          type: "select",
          options: [
            { value: "", label: "Select funding source" },
            { value: "External", label: "External" },
            { value: "GUC", label: "GUC" },
          ],
        },
        {
          name: "extraResources",
          label: "Extra Resources",
          type: "textarea",
          placeholder: "Materials or equipment needed",
        },
        {
          name: "capacity",
          label: "Capacity",
          type: "number",
          min: 1,
          fromFormValue: (value) =>
            value === "" ? undefined : Number.parseInt(value, 10),
        },
        {
          name: "registrationDeadline",
          label: "Registration Deadline",
          type: "date",
          toFormValue: (event) =>
            formatDateForInput(event.registrationDeadline),
        },
        {
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.startDate),
        },
        {
          name: "startTime",
          label: "Start Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.startTime),
        },
        {
          name: "endDate",
          label: "End Date",
          type: "date",
          required: true,
          toFormValue: (event) => formatDateForInput(event.endDate),
        },
        {
          name: "endTime",
          label: "End Time",
          type: "time",
          toFormValue: (event) => formatTimeForInput(event.endTime),
        },
      ],
    },
    default: {
      label: "Event",
      description: "Update event details.",
      fields: [
        {
          name: "name",
          label: "Event Name",
          type: "text",
          required: true,
        },
        {
          name: "shortDescription",
          label: "Short Description",
          type: "textarea",
        },
      ],
    },
  };

  const prepareInitialFormValues = (fields, event) => {
    return fields.reduce((acc, field) => {
      if (!field?.name) return acc;
      if (field.toFormValue) {
        acc[field.name] = field.toFormValue(event);
        return acc;
      }
      if (field.type === "checkbox-group") {
        // Do not pre-select roles. If event has roles use them, otherwise start empty.
        const roles = Array.isArray(event?.[field.name])
          ? event[field.name]
          : [];
        acc[field.name] = roles;
        return acc;
      }
      const value = event?.[field.name];
      if (value == null) {
        acc[field.name] = "";
        return acc;
      }
      if (field.type === "date") {
        acc[field.name] = formatDateForInput(value);
        return acc;
      }
      if (field.type === "time") {
        acc[field.name] = formatTimeForInput(value);
        return acc;
      }
      acc[field.name] = value;
      return acc;
    }, {});
  };

  const prepareEditPayload = (fields, formValues) => {
    return fields.reduce((acc, field) => {
      if (!field?.name) return acc;
      if (!(field.name in formValues)) return acc;

      const rawValue = formValues[field.name];
      if (field.fromFormValue) {
        const transformed = field.fromFormValue(rawValue);
        if (transformed !== undefined) {
          acc[field.name] = transformed;
        }
        return acc;
      }

      if (rawValue !== undefined) {
        acc[field.name] = rawValue;
      }
      return acc;
    }, {});
  };

  const buildEditSummary = (event) => {
    if (!event) return [];
    const summary = [];

    if (event.location) {
      summary.push({
        label: "Location",
        value: event.location,
      });
    }

    if (event.capacity != null) {
      summary.push({
        label: "Capacity",
        value: `${event.capacity}`,
      });
    }

    if (Array.isArray(event.allowedRoles) && event.allowedRoles.length > 0) {
      summary.push({
        label: "Eligible Roles",
        value: event.allowedRoles.join(", "),
      });
    }

    if (event.priceToAttend != null) {
      summary.push({
        label: "Participation Fee",
        value:
          Number(event.priceToAttend) > 0
            ? formatCurrencyEGP(event.priceToAttend)
            : "Free",
      });
    }

    if (event.registrationDeadline) {
      summary.push({
        label: "Registration Deadline",
        value: new Date(event.registrationDeadline).toLocaleDateString(),
      });
    }

    if (event.startDate) {
      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : null;
      const startStr = `${start.toLocaleDateString()}${
        event.startTime ? ` • ${formatTimeForInput(event.startTime)}` : ""
      }`;
      summary.push({
        label: "Current Schedule",
        value: end
          ? `${startStr} → ${end.toLocaleDateString()}${
              event.endTime ? ` • ${formatTimeForInput(event.endTime)}` : ""
            }`
          : startStr,
      });
    }

    return summary;
  };

  // Advanced Filters handlers
  function handleApplyAdvancedFilters(e) {
    if (e && e.preventDefault) e.preventDefault();
    // preview match count (optional toast)
    const matches = events.filter((ev) => {
      const type = ev.type || ev.eventType || ev.category || "other";
      if (
        advFilters?.type &&
        advFilters.type !== "All" &&
        type !== advFilters.type
      )
        return false;
      if (advFilters?.location && advFilters.location !== "All") {
        const evLoc = String(ev.location || "").toLowerCase();
        if (evLoc !== String(advFilters.location).toLowerCase()) return false;
      }
      if (advFilters?.startDate) {
        const evStart = ev.startDate ? new Date(ev.startDate) : null;
        const startD = new Date(advFilters.startDate);
        if (!evStart || evStart < startD) return false;
      }
      if (advFilters?.endDate) {
        const evStart = ev.startDate ? new Date(ev.startDate) : null;
        const endD = new Date(advFilters.endDate);
        if (!evStart || evStart > endD) return false;
      }
      // Filter by name
      if (advFilters?.name && advFilters.name.trim()) {
        const nameQuery = advFilters.name.toLowerCase();
        const nameCandidates = [
          ev.name,
          ev.title,
          ev.eventName,
          ev.professor,
          ev.organizer,
          ev.instructor,
          ev.facultyResponsible,
          ...(Array.isArray(ev.professors) ? ev.professors : []),
          ev.shortDescription,
        ];
        const matchesName = nameCandidates.some(
          (s) => s && String(s).toLowerCase().includes(nameQuery)
        );
        if (!matchesName) return false;
      }
      return true;
    });
    setShowFilterModal(false);
    if (matches.length === 0) {
      toast((t) => <span>No events found for these filters.</span>);
    }
  }

  function handleResetAdvancedFilters() {
    setAdvFilters({
      type: "All",
      location: "All",
      startDate: "",
      endDate: "",
      name: "",
    });
  }

  const filteredEvents = activeEvents.filter((ev) => {
    const type = ev.type || ev.eventType || ev.category || "other";
    // Only show workshops that have been accepted
    try {
      if (
        String(type).toLowerCase() === "workshop" &&
        ev.approvalStatus !== "approved"
      ) {
        return false;
      }
    } catch (e) {
      if (String(type).toLowerCase() === "workshop") return false;
    }
    if (!eventAllowsCurrentUser(ev)) {
      return false;
    }
    // Filter by favorites if showFavoritesOnly is true
    if (showFavoritesOnly) {
      const eventId = ev._id || ev.id || ev.eventId;
      if (!favoriteEvents.includes(eventId)) {
        return false;
      }
    }
    if (
      advFilters?.type &&
      advFilters.type !== "All" &&
      type !== advFilters.type
    )
      return false;
    if (advFilters?.location && advFilters.location !== "All") {
      const evLoc = String(ev.location || "").toLowerCase();
      if (evLoc !== String(advFilters.location).toLowerCase()) return false;
    }
    if (advFilters?.startDate) {
      const evStart = ev.startDate ? new Date(ev.startDate) : null;
      const startD = new Date(advFilters.startDate);
      if (!evStart || evStart < startD) return false;
    }
    if (advFilters?.endDate) {
      const evStart = ev.startDate ? new Date(ev.startDate) : null;
      const endD = new Date(advFilters.endDate);
      if (!evStart || evStart > endD) return false;
    }
    // Filter by name
    if (advFilters?.name && advFilters.name.trim()) {
      const nameQuery = advFilters.name.toLowerCase();
      const nameCandidates = [
        ev.name,
        ev.title,
        ev.eventName,
        ev.professor,
        ev.organizer,
        ev.instructor,
        ev.facultyResponsible,
        ...(Array.isArray(ev.professors) ? ev.professors : []),
        ev.shortDescription,
      ];
      const matchesName = nameCandidates.some(
        (s) => s && String(s).toLowerCase().includes(nameQuery)
      );
      if (!matchesName) return false;
    }
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    const nameCandidates = [
      ev.name,
      ev.title,
      ev.eventName,
      ev.professor,
      ev.organizer,
      ev.instructor,
      ev.facultyResponsible,
      ...(Array.isArray(ev.professors) ? ev.professors : []),
      ev.shortDescription,
      ev.location,
    ];
    return nameCandidates.some((s) => s && String(s).toLowerCase().includes(q));
  });

  const handleEdit = (event) => {
    if (!event) return;

    const typeKey = getEventTypeKey(event);
    const config = editConfigurations[typeKey] || editConfigurations.default;
    const fields = config.fields || [];
    const initialValues = prepareInitialFormValues(fields, event);

    setSelectedEvent(event);
    setEditFields(fields);
    setEditForm(initialValues);
    setEditMeta({
      typeLabel:
        config.label ||
        humanizeType(
          typeKey === "default" ? getNormalizedType(event) : typeKey
        ),
      description: config.description || "",
    });
    setEditSummary(buildEditSummary(event));
    setShowRegistrationModal(false);
    setShowEditModal(true);
  };

  const nowTs = Date.now();
  const { upcomingEvents, pastEvents } = filteredEvents.reduce(
    (acc, ev) => {
      const endDate = ev.endDate
        ? new Date(ev.endDate)
        : ev.startDate
        ? new Date(ev.startDate)
        : null;
      const isPast =
        endDate instanceof Date &&
        !Number.isNaN(endDate.getTime()) &&
        endDate.getTime() < nowTs;

      if (isPast) {
        acc.pastEvents.push(ev);
      } else {
        acc.upcomingEvents.push(ev);
      }
      return acc;
    },
    { upcomingEvents: [], pastEvents: [] }
  );

  const grouped = upcomingEvents.reduce((acc, ev) => {
    const type = ev.type || ev.eventType || ev.category || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(ev);
    return acc;
  }, {});

  const groupedSorted = sortApplied
    ? Object.fromEntries(
        Object.entries(grouped).map(([t, list]) => [
          t,
          [...list].sort((a, b) => {
            const da = a.startDate ? new Date(a.startDate) : new Date(0);
            const db = b.startDate ? new Date(b.startDate) : new Date(0);
            return da - db;
          }),
        ])
      )
    : grouped;

  const groupedPastSorted = Object.fromEntries(
    Object.entries(
      pastEvents.reduce((acc, ev) => {
        const type = ev.type || ev.eventType || ev.category || "other";
        if (!acc[type]) acc[type] = [];
        acc[type].push(ev);
        return acc;
      }, {})
    ).map(([t, list]) => [
      t,
      [...list].sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate) : new Date(0);
        const db = b.startDate ? new Date(b.startDate) : new Date(0);
        return db - da;
      }),
    ])
  );

  // If showPastEvents is true, display only past groups; otherwise show upcoming groups
  const displayedGroups = showPastEvents ? groupedPastSorted : groupedSorted;

  const renderEventCard = (ev, type, { isPast = false } = {}) => {
    const id =
      ev._id || ev.id || ev.eventId || `${type}-${ev.name || ev.title}`;
    const eventKey = ev._id || ev.id || ev.eventId || id;
    const title = ev.name || ev.title || ev.eventName || "Untitled event";
    const isBazaarOrBooth = /bazaar|booth/i.test(type);
    const isConference = /conference/i.test(type);
    const eventTypeKey = getEventTypeKey(ev);
    const normalizedEventType = String(
      ev.type || ev.eventType || ev.category || type || ""
    );
    const hasAcceptedVendors =
      normalizedEventType.toLowerCase() === "bazaar" &&
      countAcceptedVendors(ev) > 0;
    const canDeleteEvent =
      (!Array.isArray(ev.registrants) || ev.registrants.length === 0) &&
      !hasAcceptedVendors;
    const favoriteId =
      ev._id || ev.id || ev.eventId || `${type}-${title.trim()}`;
    const isFavorite = favoriteEvents.includes(favoriteId);
    const canFavorite =
      !isPast && canUseFavorites && Boolean(ev._id || ev.id || ev.eventId);
    const ratingData = ev?.ratings || {};
    const ratingAverage = Number(ratingData.average ?? 0);
    const ratingCount = Number(
      ratingData.count ?? ratingData.items?.length ?? 0
    );
    const hasRatingSummary =
      ratingCount > 0 && ratingAverage > 0 && !Number.isNaN(ratingAverage);

    const showRegisterButton =
      !isPast &&
      !isBazaarOrBooth &&
      !isConference &&
      !isEventOffice &&
      !isAdmin &&
      eventAllowsCurrentUser(ev);

    const showFavoriteButton =
      !isPast && !isEventOffice && !isAdmin && eventAllowsCurrentUser(ev);

    const showAdminActions =
      user?.role === "Admin" || user?.role === "Event Office";
    const canArchiveEvent = hasEventPassed(ev) && ev?.archived !== true;
    const eventId = ev._id || ev.id || ev.eventId;
    const canExportEvent = eventTypeKey !== "conference";
    const isExportingThisEvent =
      Boolean(exportingId) && exportingId === (ev._id || ev.id);
    const isArchivingThisEvent =
      Boolean(archivingId) && archivingId === (ev._id || ev.id);

    return (
      <article
        key={id}
        className="relative bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200"
      >
        {isPast && (
          <span className="absolute top-3 right-10 text-xs font-semibold uppercase tracking-wide text-gray-300 bg-gray-800/80 border border-gray-700 px-2 py-1 rounded-full">
            Past Event
          </span>
        )}

        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {/* Ratings Icon - Visible to all eligible users */}
          <div className={isPast ? "mt-8" : ""}></div>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              setRatingsEvent(ev);
              setShowRatingsModal(true);
              await fetchEventFeedback(ev);
            }}
            className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full p-2 text-purple-300 hover:text-purple-200 transition-all duration-200"
            aria-label="View Ratings"
            title="View Ratings & Reviews"
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          {/* Event Office Menu */}
          {isEventOffice && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionMenuId((prev) =>
                    prev === eventKey ? null : eventKey
                  );
                }}
                className="rounded-full border border-gray-700 bg-gray-800/90 p-1 text-gray-300 hover:text-white z-40"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {openActionMenuId === eventKey && (
                <div
                  className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-700 bg-gray-900 p-2 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAccessModalForEvent(ev);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
                  >
                    Manage access
                  </button>
                  <button
                    type="button"
                    disabled={!canExportEvent || isExportingThisEvent}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canExportEvent && !isExportingThisEvent) {
                        setOpenActionMenuId(null);
                        handleExport(ev);
                      }
                    }}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {canExportEvent
                      ? isExportingThisEvent
                        ? "Exporting..."
                        : "Export registrants"
                      : "Export unavailable"}
                  </button>
                  <button
                    type="button"
                    disabled={!canArchiveEvent || isArchivingThisEvent}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canArchiveEvent || isArchivingThisEvent) return;
                      setOpenActionMenuId(null);
                      handleArchive(ev);
                    }}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {canArchiveEvent
                      ? isArchivingThisEvent
                        ? "Archiving..."
                        : "Archive event"
                      : "Archive after it ends"}
                  </button>
                </div>
              )}
            </>
          )}

          {showFavoriteButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(ev);
              }}
              className={`bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/30 rounded-full p-2 text-pink-300 hover:text-pink-200 transition-all duration-200 ${
                isFavorite ? "text-pink-400 hover:text-pink-300" : ""
              }`}
            >
              <Heart
                className="h-4 w-4"
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>

        <div className="flex flex-col justify-between h-full">
          <div className="pr-8">
            <h4 className="text-lg font-semibold text-yellow-400">{title}</h4>
            {ev.location && (
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-pink-400" />
                {ev.location}
              </p>
            )}
            {ev.startDate && (
              <p className="text-sm text-gray-300 mt-2 flex items-center gap-1">
                <CalendarRange className="h-4 w-4 text-blue-400" />
                {(() => {
                  const date = new Date(ev.startDate);
                  const dateStr = date.toLocaleDateString("en-EG", {
                    timeZone: "Africa/Cairo",
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeStr = ev.startTime
                    ? (() => {
                        const [hours, minutes] = ev.startTime.split(":");
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
            {Array.isArray(ev.allowedRoles) && ev.allowedRoles.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Eligible roles: {ev.allowedRoles.join(", ")}
              </p>
            )}
            {hasRatingSummary && (
              <div className="mt-3 flex items-center gap-2">
                {renderStars(ratingAverage)}
                <span className="text-sm font-semibold text-white">
                  {ratingAverage.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({ratingCount} review{ratingCount === 1 ? "" : "s"})
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            {ev.capacity != null && (
              <span className="text-xs text-gray-400">
                Capacity:{" "}
                {ev.type === "Bazaar"
                  ? `${countAcceptedVendors(ev)} / ${ev.capacity}`
                  : `${ev.registrants?.length || 0} / ${ev.capacity}`}
              </span>
            )}

            <div className="flex gap-2">
              {showRegisterButton && (
                <button
                  onClick={() => handleRegister(ev)}
                  className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm rounded-md font-medium transition"
                >
                  Register
                </button>
              )}
              {eventTypeKey === "bazaar" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openVendorsModalForEvent(ev);
                  }}
                  className="px-2 py-1 rounded-md border border-gray-700 text-gray-300 hover:text-emerald-300 hover:border-emerald-400 transition"
                  aria-label="View participating vendors"
                  title="View participating vendors"
                >
                  <Store className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={async () => {
                  setDetailsEvent(ev);
                  setShowDetailsModal(true);

                  const eventId = ev._id || ev.id || ev.eventId;
                  if (getEventTypeKey(ev) === "bazaar" && eventId) {
                    try {
                      const vendors = await fetchAcceptedVendors(eventId);
                      setAcceptedVendors(vendors);
                    } catch (err) {
                      setAcceptedVendors([]);
                    }
                  } else {
                    setAcceptedVendors([]);
                  }
                }}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-sm rounded-md transition"
              >
                Details
              </button>

              {showAdminActions && (
                <>
                  {new Date(ev.startDate) > new Date() && ev.type == "Trip" && (
                    <button
                      onClick={() => handleEdit(ev)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition"
                    >
                      Edit
                    </button>
                  )}

                  {ev.type === "Conference" &&
                    new Date(ev.startDate) > new Date() && (
                      <button
                        onClick={() => handleEdit(ev)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition"
                      >
                        Edit
                      </button>
                    )}

                  {ev.type === "Bazaar" &&
                    new Date(ev.startDate) > new Date() && (
                      <button
                        onClick={() => handleEdit(ev)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition"
                      >
                        Edit
                      </button>
                    )}

                  {canDeleteEvent && (
                    <button
                      onClick={() => handleDelete(ev._id || ev.id || id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded-md transition"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  function handleShowDetails(event) {
    setDetailsEvent(event);
    setShowDetailsModal(true);
  }

  const handleOpenReviews = async (event) => {
    if (!event) return;
    setFeedback({ average: 0, count: 0, items: [] });
    setFeedbackError("");
    setReviewsEvent(event);
    setShowReviewsModal(true);
    await fetchEventFeedback(event, true);
  };

  const closeReviewsModal = () => {
    setShowReviewsModal(false);
    setReviewsEvent(null);
    setFeedback({ average: 0, count: 0, items: [] });
    setFeedbackError("");
  };

  const handleRegister = (event) => {
    if (!event) return;
    if (!user) {
      toast.error("Please log in to register for events");
      return;
    }
    if (!eventAllowsCurrentUser(event)) {
      toast.error("This event is not available for your role.");
      return;
    }
    if (event.registrants && event.registrants.length >= event.capacity) {
      // Allow proceeding so backend can add to waitlist when full
      toast(
        "Event is full. You will be added to the waiting list if eligible."
      );
    }
    if (!user?.UniId) {
      toast.error(
        "Your profile is missing a University ID. Please contact the Event Office to update your account."
      );
      return;
    }
    const savedUniKey = user?.id ? `uniId:${user.id}` : null;
    const savedUniId = savedUniKey
      ? localStorage.getItem(savedUniKey) || ""
      : "";
    setSelectedEvent(event);
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      UniId: user?.UniId || "",
    });
    setShowRegistrationModal(true);
  };

  const openAccessModalForEvent = (event) => {
    if (!event) return;
    const currentRoles = Array.isArray(event.allowedRoles)
      ? event.allowedRoles
      : [];
    setAccessTarget(event);
    setAccessForm({ allowedRoles: currentRoles });
    setShowAccessModal(true);
    setOpenActionMenuId(null);
  };

  const closeAccessModal = () => {
    if (savingAccess) return;
    setShowAccessModal(false);
    setAccessTarget(null);
    setAccessForm({ allowedRoles: [] });
  };

  const handleSaveAccess = async (formValues) => {
    if (!accessTarget) return;
    const endpoint = getEventEditEndpoint(accessTarget);
    if (!endpoint) return;
    const roles = Array.isArray(formValues.allowedRoles)
      ? formValues.allowedRoles
      : [];

    try {
      setSavingAccess(true);
      const res = await api.patch(endpoint, { allowedRoles: roles });
      toast.success(res.data?.message || "Access updated");
      setShowAccessModal(false);
      setAccessTarget(null);
      setAccessForm({ allowedRoles: [] });
      fetchAvailableEvents();
    } catch (err) {
      console.error("Save access error:", err);
      toast.error(err?.response?.data?.message || "Failed to save access");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleEditSubmit = async (formValues) => {
    if (!selectedEvent) return;
    try {
      const typeKey = getEventTypeKey(selectedEvent);
      const payload = prepareEditPayload(editFields, formValues);
      const endpoint =
        typeKey === "default"
          ? `/events/${selectedEvent._id}`
          : `/events/${typeKey}/${selectedEvent._id}`;
      const res = await api.patch(endpoint, payload);

      toast.success(res.data?.message || "Event updated successfully");
      setShowEditModal(false);
      setEditFields([]);
      setEditForm({});
      setEditMeta({ typeLabel: "", description: "" });
      setEditSummary([]);
      setSelectedEvent(null);
      fetchAvailableEvents();
    } catch (err) {
      console.error("Edit error:", err);
      toast.error(err?.response?.data?.message || "Failed to update event");
    }
  };

  const handleSubmit = async (formData) => {
    try {
      const id = selectedEvent?._id;
      const type = selectedEvent?.type || selectedEvent?.eventType;
      const endpoint =
        type === "Workshop"
          ? `/events/workshop/register/${id}`
          : `/events/trip/register/${id}`;

      setShowRegistrationModal(false);
      setSelectedEvent(null);

      const res = await api.patch(endpoint, {
        email: formData.email,
        UniId: formData.UniId,
      });
      if (res.data?.success) {
        if (res.data.waitlisted) {
          toast.success(
            res.data.message || "Event is full. You have been waitlisted."
          );
        } else {
          toast.success(
            res.data.message || "Successfully registered for event"
          );
        }
        fetchAvailableEvents();
      } else {
        toast.error(res.data?.message || "Failed to register for event");
      }
    } catch (err) {
      console.error(err);
      const errorMessage =
        err.response?.data?.message || "Failed to register for event";
      toast.error(errorMessage);
    }
  };

  async function generateEventQR(event) {
    if (!event || !event._id) return;
    try {
      const normalizedType = String(
        event.type || event.eventType || event.category || ""
      ).toLowerCase();
      const shouldEmailVendors = /bazaar|career\s?fair/.test(normalizedType);

      // Build a share URL for external visitors. Adjust path if backend expects different route.
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/events/external-register/${event._id}`;
      setQrShareUrl(shareUrl);
      setQrDataUrl(""); // show generating state
      setShowQRModal(true);

      const dataUrl = await QRCode.toDataURL(shareUrl, { width: 400 });
      setQrDataUrl(dataUrl);

      if (shouldEmailVendors) {
        await toast.promise(
          api.post(`/events/bazaars/${event._id}/send-vendor-qr`),
          {
            loading: "Emailing QR packs to vendors and attendees...",
            success: "Vendors and attendees received their QR packs via email.",
            error: "Failed to email QR packs. Please try again.",
          }
        );
      } else {
        toast.success("QR ready to share.");
      }
    } catch (err) {
      console.error("QR generation failed", err);
      toast.error(
        err?.response?.data?.message || "Failed to generate or send QR code"
      );
    }
  }

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
            Please log in to view and register for events.
          </p>
        </div>
      </div>
    );
  }

  function handleDelete(eventId) {
    const event = events.find((e) => e._id === eventId);
    if (!event) return;

    const eventType = String(
      event.type || event.eventType || event.category || ""
    ).toLowerCase();

    if (event.registrants && event.registrants.length > 0) {
      toast.error("Cannot delete: Event has registrants");
      return;
    }

    if (eventType === "bazaar" && countAcceptedVendors(event) > 0) {
      toast.error("Cannot delete: Bazaar has accepted vendors");
      return;
    }

    setEventToDelete(event);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!eventToDelete) return;

    try {
      await api.delete(`/events/${eventToDelete._id}`);
      toast.success("Event deleted successfully");
      setShowDeleteModal(false);
      setEventToDelete(null);
      fetchAvailableEvents();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete event");
    }
  }

  function cancelDelete() {
    setShowDeleteModal(false);
    setEventToDelete(null);
  }

  const handleDeleteFeedback = (commentId) => {
    if (!commentId || !isAdmin) return;
    setCommentToDeleteId(commentId);
    setShowDeleteCommentModal(true);
  };

  async function confirmDeleteFeedback() {
    const commentId = commentToDeleteId;
    if (!commentId || !isAdmin) return;

    try {
      setDeletingCommentId(commentId);
      await api.delete(`/events/feedback/comments/${commentId}`);
      toast.success("Comment deleted");
      setFeedback((prev) => {
        const prevCount = Number(prev.count) || 0;
        const target = prev.items.find(
          (item) => item.commentId === commentId || item._id === commentId
        );
        const targetStudentId = target?.studentId
          ? String(target.studentId)
          : null;
        const ratingValue = Number(target?.rating) || 0;
        const newItems = prev.items.filter((item) => {
          const itemId = item.commentId || item._id;
          if (itemId === commentId) return false;
          if (
            targetStudentId &&
            item.studentId &&
            String(item.studentId) === targetStudentId &&
            !item.commentId
          ) {
            // Remove rating-only entry for this student
            return false;
          }
          return true;
        });
        if (!target) {
          return { ...prev, items: newItems };
        }
        const newCount = Math.max(prevCount - 1, 0);
        const total = (Number(prev.average) || 0) * prevCount;
        const newAverage = newCount > 0 ? (total - ratingValue) / newCount : 0;
        return {
          ...prev,
          items: newItems,
          count: newCount,
          average: newAverage,
        };
      });
      const refreshedIds = new Set();
      if (detailsEvent) {
        await fetchEventFeedback(detailsEvent, true);
        refreshedIds.add(String(detailsEvent._id || detailsEvent.id || ""));
      }
      if (reviewsEvent) {
        const reviewsId = String(
          reviewsEvent._id || reviewsEvent.id || reviewsEvent.eventId || ""
        );
        if (!refreshedIds.has(reviewsId)) {
          await fetchEventFeedback(reviewsEvent, true);
        }
      }
    } catch (err) {
      console.error("Failed to delete comment", err);
      toast.error(
        err?.response?.data?.message || "Failed to delete the comment"
      );
    } finally {
      setDeletingCommentId(null);
      setCommentToDeleteId(null);
      setShowDeleteCommentModal(false);
    }
  }

  function cancelDeleteFeedback() {
    setShowDeleteCommentModal(false);
    setCommentToDeleteId(null);
  }

  const hasEventPassed = (ev) => {
    try {
      const end = ev?.endDate
        ? new Date(ev.endDate)
        : ev?.startDate
        ? new Date(ev.startDate)
        : null;
      if (!end || Number.isNaN(end.getTime())) return false;
      return end < new Date();
    } catch (_) {
      return false;
    }
  };

  const resolveRegistrantUserId = (registrant) => {
    if (!registrant) return null;
    if (typeof registrant === "string" || typeof registrant === "number") {
      return String(registrant);
    }
    if (typeof registrant === "object") {
      return (
        registrant.userId ||
        registrant.user ||
        registrant.studentId ||
        registrant.student ||
        registrant.participantId ||
        registrant.attendeeId ||
        registrant._id ||
        registrant.id ||
        null
      );
    }
    return null;
  };

  const hasUserRegisteredForEvent = (event) => {
    if (!event || !currentUserId) return false;
    const registrants = Array.isArray(event.registrants)
      ? event.registrants
      : [];
    return registrants.some((registrant) => {
      const registrantId = resolveRegistrantUserId(registrant);
      return registrantId && String(registrantId) === currentUserId;
    });
  };

  const requiresAttendanceForRating = (event) => {
    const typeKey = getEventTypeKey(event);
    return !["bazaar", "conference"].includes(typeKey);
  };

  const canUserReviewEvent = (event) => {
    if (!event || !user) return false;
    if (!REVIEW_ALLOWED_ROLES.includes(userRole)) return false;
    if (!hasEventPassed(event)) return false;
    if (requiresAttendanceForRating(event)) {
      return hasUserRegisteredForEvent(event);
    }
    return true;
  };

  const handleArchive = async (ev) => {
    if (!ev?._id && !ev?.id) return;
    const id = ev._id || ev.id;
    if (!hasEventPassed(ev)) {
      toast.error("Only past events can be archived");
      return;
    }
    try {
      setArchivingId(id);
      await api.patch(`/events/${id}/archive`);
      toast.success("Event archived");
      await fetchAvailableEvents();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to archive event");
    } finally {
      setArchivingId(null);
    }
  };

  const handleExport = async (ev) => {
    try {
      const type = String(
        ev?.type || ev?.eventType || ev?.category || ""
      ).toLowerCase();
      if (type === "conference") {
        toast.error("Export not available for conferences");
        return;
      }
      const id = ev._id || ev.id;
      if (!id) return;
      setExportingId(id);
      const res = await api.get(`/events/${id}/export-registrants`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = String(ev.name || ev.title || "event").replace(
        /[^a-z0-9_-]+/gi,
        "_"
      );
      a.download = `${safeName}_registrants.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export generated");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to export registrants"
      );
    } finally {
      setExportingId(null);
    }
  };

  async function toggleFavorite(eventObj) {
    try {
      if (!user) {
        toast.error("Please log in to manage favorites");
        return;
      }
      const id = eventObj?._id || eventObj?.id;
      if (!id) return;
      const isFav = favoriteEvents.includes(id);
      if (isFav) {
        await api.delete(`/events/${id}/favorite`);
        setFavoriteEvents((prev) => prev.filter((x) => x !== id));
        toast.success("Removed from favorites");
      } else {
        await api.post(`/events/${id}/favorite`);
        setFavoriteEvents((prev) => [...prev, id]);
        toast.success("Added to favorites");
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      toast.error(err?.response?.data?.message || "Could not update favorites");
    }
  }

  const reviewModalCanSubmit =
    reviewsEvent && user ? canUserReviewEvent(reviewsEvent) : false;
  const reviewModalLockMessage = (() => {
    if (!reviewsEvent) return "";
    if (!user) return "Please log in to rate events.";
    if (!REVIEW_ALLOWED_ROLES.includes(userRole))
      return "Only students, professors, staff, and TAs can leave reviews.";
    if (!hasEventPassed(reviewsEvent))
      return "You can only review an event after it has ended.";
    if (
      requiresAttendanceForRating(reviewsEvent) &&
      !hasUserRegisteredForEvent(reviewsEvent)
    ) {
      return "Only attendees who registered for this event can leave a review.";
    }
    return "";
  })();

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Calendar className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Available Events
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Discover, register, and manage campus events and activities.
            </p>
          </div>
          {isEventOffice && (
            <button
              onClick={() => {
                setPendingTypeChoice("bazaar");
                setShowTypePicker(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-6 py-3 font-bold text-gray-900 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Event Type Statistics Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {(() => {
          const eventTypeCounts = events.reduce((acc, ev) => {
            const type = ev.type || ev.eventType || ev.category || "Other";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});

          const typeConfigs = [
            {
              type: "Bazaar",
              iconBg: "bg-emerald-500/10",
              iconBorder: "border-emerald-500/20",
              iconColor: "text-emerald-400",
              IconComponent: Globe,
            },
            {
              type: "Trip",
              iconBg: "bg-sky-500/10",
              iconBorder: "border-sky-500/20",
              iconColor: "text-sky-400",
              IconComponent: TrendingUp,
            },
            {
              type: "Conference",
              iconBg: "bg-amber-500/10",
              iconBorder: "border-amber-500/20",
              iconColor: "text-amber-400",
              IconComponent: Users,
            },
            {
              type: "Workshop",
              iconBg: "bg-purple-500/10",
              iconBorder: "border-purple-500/20",
              iconColor: "text-purple-400",
              IconComponent: FileText,
            },
          ];

          return typeConfigs.map(
            ({ type, iconBg, iconBorder, iconColor, IconComponent }) => (
              <div
                key={type}
                className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} border ${iconBorder} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <IconComponent className={`h-7 w-7 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                      {type}
                    </p>
                    <p className="text-3xl font-bold text-white mb-1">
                      {eventTypeCounts[type] || 0}
                    </p>
                    <p className="text-sm text-gray-400">
                      {eventTypeCounts[type] === 1 ? "event" : "events"}
                    </p>
                  </div>
                </div>
              </div>
            )
          );
        })()}
      </div>

      {/* Enhanced Search and Filter Bar */}
      <div className="mb-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5 shadow-lg">
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by event name, location, or professor..."
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {canUseFavorites && (
              <button
                onClick={() => setShowFavoritesOnly((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  showFavoritesOnly
                    ? "bg-pink-600 text-white shadow-lg shadow-pink-500/25 hover:bg-pink-500"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                }`}
              >
                <Heart
                  className="h-3.5 w-3.5"
                  fill={showFavoritesOnly ? "currentColor" : "none"}
                />
                My Favorites
                {showFavoritesOnly && favoriteEvents.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {favoriteEvents.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setShowFilterModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
            >
              <Filter className="h-3.5 w-3.5" />
              Advanced Filters
            </button>
            <button
              onClick={() => setSortApplied(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Sort by Date
            </button>
            <button
              onClick={() => setShowPastEvents((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                showPastEvents
                  ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/25"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
              }`}
            >
              <Clock3 className="h-3.5 w-3.5" />
              {showPastEvents ? "Upcoming Events" : "Past Events"}
              {!showPastEvents && pastEvents.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {pastEvents.length}
                </span>
              )}
            </button>
            {canSeeRecommendations && (
              <button
                onClick={handleToggleRecommended}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  showRecommendedOnly
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {showRecommendedOnly ? "All Events" : "Recommended Events"}
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/25 hover:bg-yellow-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {showRecommendedOnly && recommendedError && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          {recommendedError}
        </div>
      )}

      {/* Advanced Filters Modal (existing code remains the same) */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Advanced Filters
              </h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-400 hover:text-white text-xl leading-none px-1"
                aria-label="Close filters"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleApplyAdvancedFilters}
              className="p-6 space-y-4 text-white"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block mb-1 text-sm text-gray-300">
                    Name
                  </label>
                  <input
                    type="text"
                    value={advFilters.name}
                    onChange={(e) =>
                      setAdvFilters((f) => ({
                        ...f,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Event name, professor, organizer..."
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-300">
                    Type
                  </label>
                  <select
                    value={advFilters.type}
                    onChange={(e) =>
                      setAdvFilters((f) => ({
                        ...f,
                        type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t === "All"
                          ? "All Types"
                          : t === "other"
                          ? "Other"
                          : t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-300">
                    Location
                  </label>
                  <select
                    value={advFilters.location}
                    onChange={(e) =>
                      setAdvFilters((f) => ({
                        ...f,
                        location: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc === "All" ? "All Locations" : loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={advFilters.startDate}
                    onChange={(e) =>
                      setAdvFilters((f) => ({
                        ...f,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={advFilters.endDate}
                    onChange={(e) =>
                      setAdvFilters((f) => ({
                        ...f,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdvFilters({
                      type: "All",
                      location: "All",
                      startDate: "",
                      endDate: "",
                      name: "",
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
                >
                  Clear
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Cards */}
      <div className="space-y-10">
        {eventsLoading && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
              <p className="text-gray-400 font-medium">Loading events...</p>
            </div>
          </div>
        )}
        {!eventsLoading && Object.keys(grouped).length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                <Calendar className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Events Found
                </h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  {showRecommendedOnly
                    ? "No recommendations yet. Register for or attend events so we can tailor suggestions for you."
                    : filter ||
                      advFilters.type !== "All" ||
                      advFilters.location !== "All" ||
                      advFilters.name
                    ? "Try adjusting your filters to see more events."
                    : "There are no events available at this time. Check back later!"}
                </p>
              </div>
            </div>
          </div>
        )}
        {Object.entries(displayedGroups).map(([type, list]) => (
          <section key={type}>
            <h3 className="text-2xl font-bold text-yellow-400 mb-5 capitalize flex items-center gap-2">
              {type}
              <span className="text-sm font-normal text-gray-400">
                ({list.length} {list.length === 1 ? "event" : "events"})
              </span>
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((ev) =>
                renderEventCard(ev, type, { isPast: showPastEvents })
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Details Modal */}
      {showDetailsModal &&
        detailsEvent &&
        (() => {
          const typeKey = getEventTypeKey(detailsEvent);
          const readableType =
            typeKey === "default"
              ? getNormalizedType(detailsEvent) || "Event"
              : humanizeType(typeKey);
          const scheduleLabel = formatDateTimeRange(
            detailsEvent.startDate,
            detailsEvent.endDate
          );
          const registrationLabel = detailsEvent.registrationDeadline
            ? formatRegistrationDeadlineLabel(detailsEvent)
            : "Not set";
          const vendorCount = countAcceptedVendors(detailsEvent);
          const attendeeCount = detailsEvent.registrants?.length || 0;
          const capacityLabel =
            detailsEvent.capacity != null
              ? typeKey === "bazaar"
                ? `${vendorCount} / ${detailsEvent.capacity} vendors`
                : `${attendeeCount} / ${detailsEvent.capacity} attendees`
              : "Not shared";
          const description =
            detailsEvent.description || detailsEvent.shortDescription || "";
          const fullDescription = detailsEvent.longDescription;
          const websiteLink = detailsEvent.website || detailsEvent.link || "";

          return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="relative border-b border-gray-700/50 px-8 py-6 bg-gradient-to-r from-gray-800 to-gray-900">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
                          {readableType}
                        </span>
                      </div>
                      <h3 className="text-3xl font-bold text-white leading-tight">
                        {detailsEvent.name ||
                          detailsEvent.title ||
                          "Event Details"}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setDetailsEvent(null);
                        setFeedback({ average: 0, count: 0, items: [] });
                        setFeedbackError("");
                        setAcceptedVendors([]);
                      }}
                      className="flex-shrink-0 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600 p-2 text-gray-400 hover:text-white transition-all duration-200"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <div className="space-y-6">
                    {detailsEvent.recommendationReason && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3 items-start">
                        <div className="mt-0.5">
                          <Sparkles className="h-5 w-5 text-blue-300" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-blue-200/80 font-semibold">
                            Why you see this
                          </p>
                          <p className="text-sm text-blue-50 mt-1">
                            {detailsEvent.recommendationReason}
                          </p>
                        </div>
                      </div>
                    )}

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
                              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                                Capacity
                              </p>
                              <p className="text-base text-white font-medium">
                                {capacityLabel}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {description && (
                      <div className="bg-gray-800/40 backdrop-blur border border-gray-700/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-5 w-5 text-yellow-400" />
                          <p className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                            Description
                          </p>
                        </div>
                        <p className="text-base text-gray-300 leading-relaxed">
                          {description}
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
                                const dateStr = date.toLocaleDateString(
                                  "en-EG",
                                  {
                                    timeZone: "Africa/Cairo",
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                );
                                const timeStr = detailsEvent.startTime
                                  ? (() => {
                                      const [hours, minutes] =
                                        detailsEvent.startTime.split(":");
                                      const hour = parseInt(hours, 10);
                                      const period = hour >= 12 ? "PM" : "AM";
                                      const displayHour =
                                        hour === 0
                                          ? 12
                                          : hour > 12
                                          ? hour - 12
                                          : hour;
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
                                const dateStr = date.toLocaleDateString(
                                  "en-EG",
                                  {
                                    timeZone: "Africa/Cairo",
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                );
                                const timeStr = detailsEvent.endTime
                                  ? (() => {
                                      const [hours, minutes] =
                                        detailsEvent.endTime.split(":");
                                      const hour = parseInt(hours, 10);
                                      const period = hour >= 12 ? "PM" : "AM";
                                      const displayHour =
                                        hour === 0
                                          ? 12
                                          : hour > 12
                                          ? hour - 12
                                          : hour;
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
                              {registrationLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Website Link */}
                    {websiteLink && (
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
                              href={websiteLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base text-blue-400 hover:text-blue-300 font-medium underline break-all"
                            >
                              {websiteLink}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-700/50 px-8 py-5 bg-gray-900/50">
                  <div className="flex items-center justify-end gap-3">
                    {isEventOffice && (
                      <button
                        onClick={() => generateEventQR(detailsEvent)}
                        className="flex items-center gap-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 px-5 py-2.5 text-sm font-semibold text-yellow-400 transition-all duration-200"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                        Generate QR Code
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setDetailsEvent(null);
                        setFeedback({ average: 0, count: 0, items: [] });
                        setFeedbackError("");
                        setAcceptedVendors([]);
                      }}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Vendors Modal */}
      {showVendorsModal && vendorsEvent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative border-b border-gray-700/50 px-8 py-6 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                    Participating Vendors
                  </p>
                  <h3 className="text-2xl font-semibold text-white">
                    {vendorsEvent.name || vendorsEvent.title || "Bazaar"}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {acceptedVendors.length} confirmed vendor
                    {acceptedVendors.length === 1 ? "" : "s"}
                    {vendorsEvent.capacity
                      ? ` • Capacity ${vendorsEvent.capacity}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={closeVendorsModal}
                  className="rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600 p-2 text-gray-400 hover:text-white transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {vendorsModalLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <p>Loading vendors...</p>
                </div>
              )}
              {!vendorsModalLoading && vendorsModalError && (
                <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-6 text-center text-gray-300">
                  {vendorsModalError}
                </div>
              )}
              {!vendorsModalLoading &&
                !vendorsModalError &&
                acceptedVendors.length > 0 && (
                  <div className="space-y-4">
                    {acceptedVendors.map((vendor, index) => (
                      <div
                        key={vendor.vendorId || `${vendor.email}-${index}`}
                        className="border border-gray-800 rounded-2xl bg-gray-900/60 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-lg font-semibold text-white">
                              {vendor.companyName || "Vendor"}
                            </p>
                            {vendor.email && (
                              <p className="text-sm text-gray-400">
                                {vendor.email}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${
                              vendor.status === "awaiting_payment"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            }`}
                          >
                            {vendor.status?.replace("_", " ") || "Accepted"}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-gray-300">
                          {vendor.boothSize && (
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-emerald-300" />
                              <span className="text-gray-400">Booth size:</span>
                              <span className="text-white font-medium">
                                {vendor.boothSize}
                              </span>
                            </div>
                          )}
                          {vendor.boothPrice != null && (
                            <div className="flex items-center gap-2">
                              <BadgeDollarSign className="h-4 w-4 text-yellow-300" />
                              <span className="text-gray-400">
                                Booth price:
                              </span>
                              <span className="text-white font-medium">
                                {vendor.boothPrice} EGP
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            <div className="border-t border-gray-700/50 px-8 py-4 bg-gray-900/60 flex justify-end">
              <button
                onClick={closeVendorsModal}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ratings & Comments Modal */}
      {showRatingsModal && ratingsEvent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="relative border-b border-gray-700/50 px-8 py-6 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                      <span className="text-xl">⭐</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      Ratings & Reviews
                    </h3>
                  </div>
                  <p className="text-base text-gray-400">
                    {ratingsEvent.name || ratingsEvent.title || "Event"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRatingsModal(false);
                    setRatingsEvent(null);
                    setFeedback({ average: 0, count: 0, items: [] });
                    setFeedbackError("");
                  }}
                  className="flex-shrink-0 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600 p-2 text-gray-400 hover:text-white transition-all duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-6">
                {/* Rating Summary */}
                {!feedbackLoading && feedback.count > 0 && (
                  <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700/50 rounded-xl px-6 py-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {Number(feedback.average || 0).toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-400">out of 5</div>
                    </div>
                    <div className="text-yellow-400 text-3xl">
                      {renderStars(feedback.average)}
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-lg font-semibold text-white">
                        {feedback.count} review{feedback.count === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {feedbackLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-gray-700 border-t-yellow-500 rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-400">
                        Loading reviews...
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {feedbackError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <p className="text-sm text-red-400">{feedbackError}</p>
                  </div>
                )}

                {/* Empty State */}
                {!feedbackLoading &&
                  !feedbackError &&
                  (feedback.items || []).length === 0 && (
                    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-600" />
                        </div>
                        <p className="text-gray-400">
                          No reviews yet for this event.
                        </p>
                        <p className="text-sm text-gray-500">
                          Be the first to share your experience!
                        </p>
                      </div>
                    </div>
                  )}

                {/* Reviews List */}
                {!feedbackLoading &&
                  !feedbackError &&
                  (feedback.items || []).length > 0 && (
                    <div className="space-y-4">
                      {(feedback.items || []).map((c) => {
                        const canDelete = isAdmin;
                        return (
                          <div
                            key={
                              c._id ||
                              c.commentId ||
                              `${c.by?.email || c.userName || "user"}-${
                                c.createdAt
                              }`
                            }
                            className="bg-gray-800/40 backdrop-blur border border-gray-700/50 rounded-xl p-5 hover:border-gray-600/50 transition-all duration-200"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 text-white font-bold text-sm">
                                  {(c.by?.name || c.userName || "A")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-base font-semibold text-white">
                                    {c.by?.name || c.userName || "Anonymous"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {c.createdAt
                                      ? new Date(c.createdAt).toLocaleString(
                                          "en-EG",
                                          {
                                            timeZone: "Africa/Cairo",
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }
                                        )
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-yellow-400 text-lg">
                                {renderStars(c.rating)}
                              </div>
                            </div>

                            {c.comment && (
                              <p className="text-sm text-gray-300 leading-relaxed mb-3">
                                {c.comment}
                              </p>
                            )}

                            {canDelete && (
                              <button
                                onClick={() =>
                                  handleDeleteFeedback(c._id || c.commentId)
                                }
                                disabled={
                                  deletingCommentId === (c._id || c.commentId)
                                }
                                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 font-medium transition-colors"
                              >
                                {deletingCommentId === (c._id || c.commentId)
                                  ? "Deleting…"
                                  : "Delete review"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-700/50 px-8 py-5 bg-gray-900/50">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setShowRatingsModal(false);
                    setRatingsEvent(null);
                    setFeedback({ average: 0, count: 0, items: [] });
                    setFeedbackError("");
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

      {/* Event Type Picker */}
      {showTypePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">
                  Choose a template
                </p>
                <h3 className="text-2xl font-semibold text-white">
                  What kind of event do you want to create?
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  We’ll pre-fill relevant fields and automations based on your
                  selection.
                </p>
              </div>
              <button
                onClick={() => setShowTypePicker(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {eventTypeOptions.map((option) => {
                const active = pendingTypeChoice === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPendingTypeChoice(option.value)}
                    className={`rounded-2xl border px-4 py-5 text-left transition hover:border-yellow-400/60 ${
                      active
                        ? "border-yellow-400/80 bg-gray-800 shadow-lg shadow-yellow-500/10"
                        : "border-gray-800 bg-gray-900/60"
                    }`}
                  >
                    <p
                      className={`text-lg font-semibold text-white ${option.accent}`}
                    >
                      {option.title}
                    </p>
                    <p className="mt-2 text-sm text-gray-400">{option.blurb}</p>
                    {active && (
                      <p className="mt-3 text-xs uppercase text-yellow-300">
                        Selected
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowTypePicker(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCreateForm({
                    ...createInitialState,
                    eventType: pendingTypeChoice || "bazaar",
                  });
                  setShowTypePicker(false);
                  setShowCreateModal(true);
                }}
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-400"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Registration Modal */}
      {showRegistrationModal && selectedEvent && (
        <DynamicModal
          isOpen={showRegistrationModal}
          onClose={() => {
            setShowRegistrationModal(false);
            setSelectedEvent(null);
            setForm({ name: "", email: "", UniId: "" });
          }}
          title={`Register for ${selectedEvent.name || "this event"}`}
          description="Confirm your details to reserve a spot."
          onSubmit={handleSubmit}
          fields={[
            {
              name: "name",
              label: "Full Name",
              placeholder: "John Doe",
              required: true,
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              placeholder: "john.doe@example.com",
              required: true,
            },
            {
              name: "UniId",
              label: "University ID",
              placeholder: "20XX-XXXXX",
              required: true,
            },
          ]}
          formState={form}
          setFormState={setForm}
          submitLabel="Confirm Registration"
          size="sm"
        />
      )}
      {showAccessModal && accessTarget && (
        <DynamicModal
          isOpen={showAccessModal}
          onClose={closeAccessModal}
          title="Manage Workshop Access"
          description="Choose who can view and register for this workshop."
          onSubmit={handleSaveAccess}
          fields={[
            {
              name: "allowedRoles",
              type: "checkbox-group",
              label: "Allowed Roles",
              options: ROLE_OPTIONS,
              required: true,
            },
          ]}
          formState={accessForm}
          setFormState={setAccessForm}
          submitLabel={savingAccess ? "Saving..." : "Save Access"}
          size="sm"
        />
      )}
      {/* Create Event Modal */}
      {showCreateModal && (
        <DynamicModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCreateForm(createInitialState);
          }}
          title={"Create New Event"}
          description={createModalDescription}
          onSubmit={handleCreate}
          fields={buildFields(createForm.eventType || "")}
          formState={createForm}
          setFormState={setCreateForm}
          submitLabel="Create"
          size="xl"
        >
          {createScheduleSection}
        </DynamicModal>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && eventToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Delete event?
                </h3>
                <p className="mt-1 text-sm text-gray-300">
                  You’re about to delete the event “{eventToDelete.name}”. This
                  action cannot be undone.
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">
                  Type: {eventToDelete.type || "N/A"}
                  {eventToDelete.location
                    ? ` · Location: ${eventToDelete.location}`
                    : ""}
                </p>
              </div>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-white text-base leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal &&
        selectedEvent &&
        editFields.length > 0 &&
        !showDetailsModal && (
          <DynamicModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setEditFields([]);
              setEditForm({});
              setEditMeta({ typeLabel: "", description: "" });
              setEditSummary([]);
              setSelectedEvent(null);
            }}
            title={`Edit ${
              editMeta.typeLabel ||
              humanizeType(getNormalizedType(selectedEvent))
            }`}
            description={editMeta.description}
            onSubmit={handleEditSubmit}
            fields={editFields}
            formState={editForm}
            setFormState={setEditForm}
            submitLabel="Save Changes"
            size="lg"
          >
            {editSummary.length > 0 && (
              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-sm text-gray-300">
                <p className="font-medium text-gray-200">Current snapshot</p>
                <ul className="mt-2 space-y-1">
                  {editSummary.map((item) => (
                    <li key={item.label}>
                      <span className="text-gray-400">{item.label}:</span>{" "}
                      <span className="text-gray-100">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DynamicModal>
        )}
      {/* QR Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setQrDataUrl("");
          setQrShareUrl("");
        }}
        qrDataUrl={qrDataUrl}
        shareUrl={qrShareUrl}
      />

      {/* Confirm delete comment modal */}
      {showDeleteCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">
                  Confirm deletion
                </p>
                <h3 className="text-xl font-semibold text-white">
                  Delete this comment?
                </h3>
                <p className="mt-2 text-sm text-gray-300">
                  The comment will be removed permanently. An email will be sent
                  to the author notifying them it was flagged and deleted.
                </p>
              </div>
              <button
                onClick={cancelDeleteFeedback}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDeleteFeedback}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFeedback}
                disabled={!!deletingCommentId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {deletingCommentId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
