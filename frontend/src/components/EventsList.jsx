import React, { useEffect, useState } from "react";
import "../stylesheets/EventsList.css";

const EventsList = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const dummyData = [
      {
        _id: "1",
        title: "Tech Bazaar",
        description: "Showcase of student and startup projects.",
        date: "2025-11-15T10:00:00Z",
        location: "C Building Plaza",
        type: "bazaar",
        vendors: [
          {
            _id: "v1",
            name: "Ali Hassan",
            company: "SmartTech",
            description: "Smart home gadgets and electronics.",
          },
          {
            _id: "v2",
            name: "Lina Mostafa",
            company: "EcoCrafts",
            description: "Handmade sustainable products.",
          },
        ],
      },
      {
        _id: "2",
        title: "AI Workshop",
        description: "Deep learning fundamentals and applications.",
        date: "2025-11-18T14:00:00Z",
        location: "B2 Lecture Hall",
        type: "workshop",
        vendors: [],
      },
      {
        _id: "3",
        title: "Career Fair",
        description: "Meet top companies hiring interns and graduates.",
        date: "2025-11-22T09:00:00Z",
        location: "Main Auditorium",
        type: "booth",
        vendors: [
          {
            _id: "v3",
            name: "Ahmed Youssef",
            company: "TechLink",
            description: "Software & AI jobs.",
          },
        ],
      },
      {
        _id: "4",
        title: "Tech Bazaar",
        description: "Showcase of student and startup projects.",
        date: "2025-11-15T10:00:00Z",
        location: "C Building Plaza",
        type: "bazaar",
        vendors: [
          {
            _id: "v1",
            name: "Ali Hassan",
            company: "SmartTech",
            description: "Smart home gadgets and electronics.",
          },
          {
            _id: "v2",
            name: "Lina Mostafa",
            company: "EcoCrafts",
            description: "Handmade sustainable products.",
          },
        ],
      },
    ];

    setEvents(dummyData);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "20px",
        height: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "50%" }} className="event-list-container">
        <h2 className="event-list-title">🎉 Upcoming Events</h2>
        <div className="event-grid">
          {events.map((event) => (
            <div key={event._id} className="event-card">
              <h3 className="event-title">{event.title}</h3>
              <p>
                <strong>Date:</strong> {new Date(event.date).toLocaleString()}
              </p>
              <p>
                <strong>Location:</strong> {event.location}
              </p>
              <p>
                <strong>Description:</strong> {event.description}
              </p>
              <p>
                <strong>Type:</strong> {event.type}
              </p>

              {(event.type === "bazaar" || event.type === "booth") &&
                event.vendors.length > 0 && (
                  <div className="vendors-section">
                    <h4>🛍 Vendors:</h4>
                    <ul className="vendor-list">
                      {event.vendors.map((vendor) => (
                        <li key={vendor._id}>
                          <strong>{vendor.name}</strong> ({vendor.company}) —{" "}
                          {vendor.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventsList;
