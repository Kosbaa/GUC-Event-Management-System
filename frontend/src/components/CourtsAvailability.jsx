import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parseISO } from "date-fns";
import moment from "moment";
import api from "../lib/axios";

const localizer = momentLocalizer(moment);

const CourtSchedule = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get("/courts");
        const data = await res.json();

        // Convert backend data to calendar format
        const formatted = data.map((e) => ({
          title: `${e.eventName} (${e.court})`,
          start: new Date(e.date),
          end: new Date(e.date), // same day event
          court: e.court,
        }));

        setEvents(formatted);
        console.log("Fetched court events:", formatted);
      } catch (error) {
        console.error("Error fetching court events:", error);
      }
    };

    fetchEvents();
  }, []);

  // Optional: color-code events by court
  const eventStyleGetter = (event) => {
    const colors = {
      Basketball: "#f87171", // red
      Tennis: "#60a5fa", // blue
      Volleyball: "#34d399", // green
      Football: "#fbbf24", // yellow
    };
    const backgroundColor = colors[event.court] || "#9ca3af";
    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        color: "white",
        border: "none",
        padding: "4px",
      },
    };
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Court Schedule
      </h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        eventPropGetter={eventStyleGetter}
      />
    </div>
  );
};

export default CourtSchedule;
