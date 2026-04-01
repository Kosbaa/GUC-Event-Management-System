import React, { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";
import api from "../lib/axios";

export default function TimeSlotModal({
  isOpen,
  onClose,
  court,
  selectedDate,
  onReservationSuccess,
}) {
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [reservedTimes, setReservedTimes] = useState([]); // Array of objects: { time, studentName }
  const [loading, setLoading] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [reservationDetails, setReservationDetails] = useState(null);

  // Generate time slots from 8:00 AM to 10:00 PM (hourly)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      const timeString = `${hour.toString().padStart(2, "0")}:00`;
      slots.push(timeString);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Fetch reserved times for the selected date
  useEffect(() => {
    if (isOpen && selectedDate && court) {
      fetchReservedTimes();
    } else if (!isOpen) {
      setSelectedTimes([]);
      setShowConfirmationModal(false);
      setReservationDetails(null);
    }
  }, [isOpen, selectedDate, court]);

  const fetchReservedTimes = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await api.get(
        `/courts?court=${court}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );

      // Get all reserved times for this date with student information
      // reservedBy now contains "name-Id" format for students
      const reserved = (response.data.events || [])
        .filter((event) => {
          const eventDate = new Date(event.date);
          return (
            eventDate.toDateString() === selectedDate.toDateString() &&
            event.time &&
            event.reservedBy &&
            event.reservedBy !== "Event Office"
          );
        })
        .map((event) => {
          // reservedBy is in format "firstName lastName-UniId"
          const reservedByValue = event.reservedBy || "Unknown Student";
          return {
            time: event.time,
            studentName: reservedByValue,
          };
        });

      setReservedTimes(reserved);
    } catch (error) {
      console.error("Error fetching reserved times:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTimeSlot = (time) => {
    setSelectedTimes((prev) => {
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      } else {
        return [...prev, time].sort();
      }
    });
  };

  const handleTimeSlotClick = (time) => {
    const reservedInfo = reservedTimes.find((r) => r.time === time);
    if (reservedInfo) {
      setReservationDetails(reservedInfo);
      return;
    }
    toggleTimeSlot(time);
  };

  const startReservation = () => {
    if (selectedTimes.length === 0 || reserving) return;
    setShowConfirmationModal(true);
  };

  const confirmReservation = async () => {
    if (selectedTimes.length === 0) return;
    setReserving(true);
    try {
      // Reserve each selected time slot
      const promises = selectedTimes.map((time) =>
        api.post("/courts/reserve", {
          court,
          date: selectedDate.toISOString(),
          time,
        })
      );

      await Promise.all(promises);

      // Clear selections and refresh
      setSelectedTimes([]);
      await fetchReservedTimes();
      
      if (onReservationSuccess) {
        onReservationSuccess();
      }

      // Close modal after successful reservation
      onClose();
    } catch (error) {
      console.error("Error reserving court:", error);
      alert(
        error.response?.data?.message ||
          "Failed to reserve court. Please try again."
      );
    } finally {
      setReserving(false);
      setShowConfirmationModal(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Select Time Slots
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {court} - {formatDate(selectedDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading available times...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
              {timeSlots.map((time) => {
                const reservedInfo = reservedTimes.find((r) => r.time === time);
                const isReserved = !!reservedInfo;
                const isSelected = selectedTimes.includes(time);

                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSlotClick(time)}
                    className={`
                      p-3 rounded-lg border-2 transition-all
                      ${
                        isReserved
                          ? "bg-gray-800 border-gray-700 text-gray-500 cursor-pointer"
                          : isSelected
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-500 hover:bg-gray-750"
                      }
                    `}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{time}</span>
                    </div>
                    {isReserved && (
                      <div className="text-xs text-red-400 mt-1 text-center">
                        Booked (tap for details)
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedTimes.length > 0 && (
              <div className="mb-4 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
                <p className="text-sm text-blue-300 mb-2">
                  Selected times ({selectedTimes.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTimes.map((time) => (
                    <span
                      key={time}
                      className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={startReservation}
                disabled={selectedTimes.length === 0 || reserving}
                className={`
                  flex-1 px-4 py-2 rounded-lg transition
                  ${
                    selectedTimes.length === 0 || reserving
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }
                `}
              >
                {reserving ? "Reserving..." : "Reserve Selected Times"}
              </button>
            </div>
          </>
        )}
        </div>
      </div>

      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] px-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-2">
              Confirm Reservation
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {court} &bull; {formatDate(selectedDate)}
            </p>
            <div className="bg-gray-800/60 rounded-xl p-3 mb-4">
              <p className="text-sm text-gray-300 mb-2">
                Time slots selected:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTimes.map((time) => (
                  <span
                    key={time}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                  >
                    {time}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="px-4 py-2 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 transition"
                disabled={reserving}
              >
                Back
              </button>
              <button
                onClick={confirmReservation}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-60"
                disabled={reserving}
              >
                {reserving ? "Reserving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reservationDetails && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] px-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h3 className="text-lg font-semibold text-white">
              Reservation Details
            </h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>
                <span className="text-gray-400">Court:</span> {court}
              </p>
              <p>
                <span className="text-gray-400">Date:</span> {formatDate(selectedDate)}
              </p>
              <p>
                <span className="text-gray-400">Time:</span>{" "}
                {reservationDetails.time}
              </p>
              <p>
                <span className="text-gray-400">Booked by:</span>{" "}
                {reservationDetails.studentName || "Unknown"}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setReservationDetails(null)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

