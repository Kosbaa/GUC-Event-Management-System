import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Plus, Trophy, Calendar, Users, Clock } from "lucide-react";
import api from "../lib/axios";
import CourtCard from "./CourtCard";
import CalendarModal from "./CalendarModal";
import DynamicModal from "./DynamicModal";
import TimeSlotModal from "./TimeSlotModal";
import { useAuth } from "../context/AuthContext";

const CourtsViewer = () => {
  const [selectedSport, setSelectedSport] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isEvent = user?.role === "Event Office";
  const isStudent = user?.role === "Student";

  // Time Slot Modal State
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [selectedDateForTimeSlot, setSelectedDateForTimeSlot] = useState(null);

  // Create Event Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formState, setFormState] = useState({
    eventName: "",
    court: "",
    date: "",
  });

  const courts = [
    {
      name: "Basketball",
      image:
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop",
      icon: "🏀",
      color: "orange",
    },
    {
      name: "Tennis",
      image:
        "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&auto=format&fit=crop",
      icon: "🎾",
      color: "green",
    },
    {
      name: "Volleyball",
      image:
        "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop",
      icon: "🏐",
      color: "blue",
    },
    {
      name: "Football",
      image:
        "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&auto=format&fit=crop",
      icon: "⚽",
      color: "emerald",
    },
  ];

  const formFields = [
    {
      name: "eventName",
      label: "Event Name",
      type: "text",
      placeholder: "Enter event name",
      required: true,
    },
    {
      name: "court",
      label: "Court",
      type: "select",
      placeholder: "Select a court",
      required: true,
      options: [
        { value: "Basketball", label: "Basketball" },
        { value: "Tennis", label: "Tennis" },
        { value: "Volleyball", label: "Volleyball" },
        { value: "Football", label: "Football" },
      ],
    },
    {
      name: "date",
      label: "Date",
      type: "date",
      required: true,
    },
  ];

  useEffect(() => {
    if (selectedSport) {
      fetchEvents();
    }
  }, [selectedSport, currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0).toISOString();

      const response = await api.get(
        `/courts?court=${selectedSport}&start=${start}&end=${end}`
      );
      setEvents(response.data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (sportName) => {
    setSelectedSport(sportName);
    setCurrentDate(new Date());
  };

  const handleCloseModal = () => {
    setSelectedSport(null);
    setEvents([]);
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleCreateEvent = async (data) => {
    try {
      const response = await api.post("/courts", {
        eventName: data.eventName,
        court: data.court,
        date: data.date,
      });

      // Close modal and reset form
      setIsCreateModalOpen(false);
      setFormState({ eventName: "", court: "", date: "" });

      // Refresh events if we're viewing the same court
      if (selectedSport === data.court) {
        fetchEvents();
      }

      // Show success message (optional - you can add toast notification)
    } catch (error) {
      console.error("Error creating court event:", error);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setFormState({ eventName: "", court: "", date: "" });
  };

  // Student date click handler - opens time slot modal
  const handleStudentDateClick = (date) => {
    if (isStudent && selectedSport) {
      setSelectedDateForTimeSlot(date);
      setIsTimeSlotModalOpen(true);
    }
  };

  // Handle successful reservation - refresh events
  const handleReservationSuccess = () => {
    fetchEvents();
  };

  const handleCloseTimeSlotModal = () => {
    setIsTimeSlotModalOpen(false);
    setSelectedDateForTimeSlot(null);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCourts = courts.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    }).length;

    return {
      totalCourts,
      upcomingEvents,
      availableSports: courts.length,
    };
  }, [events, courts]);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Court Schedules
                </h2>
              </div>
              <p className="text-base text-gray-400 ml-15">
                {isStudent 
                  ? "Reserve court time slots and view scheduled events."
                  : "Browse court schedules and manage sporting events."}
              </p>
            </div>
          {isEvent && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-6 py-3 font-bold text-gray-900 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          )}
          </div>
        </div>

        {/* Court Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {courts.map((court) => (
            <CourtCard
              key={court.name}
              sportName={court.name}
              image={court.image}
              onClick={() => handleCardClick(court.name)}
            />
          ))}
        </div>
      </div>

      <CalendarModal
        isOpen={!!selectedSport}
        onClose={handleCloseModal}
        sportName={selectedSport}
        events={events}
        currentDate={currentDate}
        onPrevMonth={previousMonth}
        onNextMonth={nextMonth}
        onStudentDateClick={isStudent ? handleStudentDateClick : undefined}
      />

      <TimeSlotModal
        isOpen={isTimeSlotModalOpen}
        onClose={handleCloseTimeSlotModal}
        court={selectedSport}
        selectedDate={selectedDateForTimeSlot}
        onReservationSuccess={handleReservationSuccess}
      />

      <DynamicModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Create Court Event"
        onSubmit={handleCreateEvent}
        fields={formFields}
        submitLabel="Create"
        formState={formState}
        setFormState={setFormState}
      />
    </div>
  );
};

export default CourtsViewer;
