import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import { useAuth } from "../context/AuthContext";

export default function RegisteredEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  // Fetch registered events by current user from all events
  const fetchRegisteredEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/all");

      const allEvents = [
        ...(res.data?.bazaars || []).map((e) => ({ ...e, type: "Bazaar" })),
        ...(res.data?.workshops || []).map((e) => ({ ...e, type: "Workshop" })),
        ...(res.data?.trips || []).map((e) => ({ ...e, type: "Trip" })),
        ...(res.data?.conferences || []).map((e) => ({ ...e, type: "Conference" })),
      ];

      const currentUserId = user?.id;

      const registered = allEvents.filter((event) => {
        const registrants = event?.registrants;
        if (!Array.isArray(registrants) || !currentUserId) return false;

        return registrants.some((r) => {
          // Handle possible shapes: ObjectId string, populated object, or wrapper
          const candidate = r?._id || r?.user?._id || r?.user || r;
          return String(candidate) === String(currentUserId);
        });
      });

      setEvents(registered);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load registered events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchRegisteredEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // Unregister from event
  const handleUnregister = async (id) => {
    const event = events.find((e) => e._id === id);
    if (!event) return;

    if (!window.confirm(`Are you sure you want to unregister from "${event.name || event.title}"?`))
      return;

    try {
      // Since there's no unregister endpoint, we'll show a placeholder
      toast.error("Unregister functionality not implemented yet");
    } catch (err) {
      console.error(err);
      toast.error("Failed to unregister from event");
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleTimeString();
  };

  // Define table columns
  const columns = [
    { key: "name", label: "Event Name" },
    { key: "type", label: "Type" },
    { key: "shortDescription", label: "Description" },
    { key: "location", label: "Location" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
  ];

  // Transform data for table display
  const tableData = events.map((event) => ({
    ...event,
    startDate: formatDate(event.startDate),
    endDate: formatDate(event.endDate),
  }));

  // Auth loading state
  if (authLoading) {
    return (
      <div className="p-8 text-white">
        <p>Loading...</p>
      </div>
    );
  }

  // Require auth to view registered events
  if (!user) {
    return (
      <div className="p-8 text-white">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Authentication Required</h2>
          <p className="text-gray-300">Please log in to view your registered events.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <DynamicTable
          title="My Registered Events"
          columns={columns}
          data={tableData}
          onCreate={null}
          onDelete={handleUnregister}
        />
      )}
    </div>
  );
}
