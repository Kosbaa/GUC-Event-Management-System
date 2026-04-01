import React, { useState, useEffect } from "react";
import api from "../lib/axios";

// Normalize incoming eventType to exact enums
function normalizeEventType(type) {
  if (!type) return "";
  const t = String(type).trim().toLowerCase();
  if (t === "workshop") return "Workshop";
  if (t === "trip") return "Trip";
  if (t === "conference") return "Conference";
  if (t === "bazaar") return "Bazaar";
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

const EventRating = ({ eventId, eventType, onRatingSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [existingRating, setExistingRating] = useState(null);

  const normalizedType = normalizeEventType(eventType);

  useEffect(() => {
    // Reset form when eventId changes
    setRating(0);
    setComment("");
    setSubmitted(false);
    setError("");
    setExistingRating(null);
    
    const fetchExisting = async () => {
      if (!eventId || !normalizedType) return;
      try {
        const res = await api.get(`/events/feedback/me/${eventId}`, {
          params: { eventType: normalizedType },
        });
        const r = res.data?.rating;
        const c = res.data?.comment;
        if (r) {
          setExistingRating(r);
          if (typeof r.value === "number") setRating(r.value);
        }
        if (c?.text) setComment(c.text);
      } catch {
        // silent if none
      }
    };
    fetchExisting();
  }, [eventId, normalizedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rating || rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5.");
      return;
    }
    if (!eventId || !normalizedType) {
      setError("Missing event information. Please re-open this event and try again.");
      return;
    }

    try {
      const res = await api.post("/events/feedback", {
        eventId,
        eventType: normalizedType,
        value: rating,
        comment: comment?.trim() || undefined,
      });
      if (res?.data?.rating) setExistingRating(res.data.rating);
      setSubmitted(true);
      
      // Dispatch custom event to notify other components that ratings were updated
      window.dispatchEvent(new CustomEvent('ratingSubmitted', { 
        detail: { eventId, eventType: normalizedType } 
      }));
      
      // Call the callback to reset parent component after a short delay
      if (onRatingSubmitted) {
        setTimeout(() => {
          onRatingSubmitted();
        }, 2000); // Wait 2 seconds to show success message, then reset
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Failed to submit rating. Please try again.";
      setError(msg);
    }
  };

  if (submitted || existingRating) {
    return (
      <div className="p-4 bg-green-900/30 border border-green-700/40 rounded-lg text-center">
        <h3 className="text-xl font-semibold text-green-400">
          {existingRating ? "You already rated this event!" : "Thanks for your feedback!"}
        </h3>
        <p className="text-gray-300 mt-1">Your rating: ⭐ {rating}/5</p>
        {comment && <p className="text-gray-400 italic mt-2">"{comment}"</p>}
      </div>
    );
  }

  return (
    <div className="p-6 border border-white/10 rounded-lg bg-gray-800/50 shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-yellow-400 text-center">
        Rate this Event
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
        <div className="flex space-x-1" role="radiogroup" aria-label="Star rating">
          {[...Array(5)].map((_, i) => {
            const val = i + 1;
            const active = val <= (hover ?? rating);
            return (
              <button
                key={val}
                type="button"
                onClick={() => setRating(val)}
                onMouseEnter={() => setHover(val)}
                onMouseLeave={() => setHover(null)}
                className="text-4xl focus:outline-none transition-transform hover:scale-110"
                aria-checked={rating === val}
                role="radio"
                aria-label={`${val} star${val > 1 ? "s" : ""}`}
              >
                <span style={{ color: active ? "#facc15" : "#4b5563" }}>★</span>
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment (optional)"
          className="w-full md:w-2/3 p-3 rounded-lg bg-gray-700/50 border border-yellow-400/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          rows={3}
        />

        {error && (
          <p className="text-red-400 text-sm text-center max-w-md">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!rating}
          className="px-5 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition disabled:bg-gray-600 disabled:text-gray-300"
        >
          Submit Rating
        </button>
      </form>
    </div>
  );
};

export default EventRating;
