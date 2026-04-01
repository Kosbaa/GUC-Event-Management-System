import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import DynamicModal from "./DynamicModal";
import { useAuth } from "../context/AuthContext";

const ROLE_OPTIONS = [
  { value: "Student", label: "Students" },
  { value: "Faculty", label: "Faculty" },
  { value: "Staff", label: "Staff" },
  { value: "Professor", label: "Professors" },
  { value: "TA", label: "Teaching Assistants" },
  { value: "Vendor", label: "Vendors" },
  { value: "Event Office", label: "Event Office" },
  { value: "Admin", label: "Admins" },
];

const DEFAULT_ALLOWED_ROLES = ROLE_OPTIONS.filter((option) =>
  ["Student", "Faculty", "Staff", "Professor", "TA"].includes(option.value)
).map((option) => option.value);

const initialFormState = {
  eventType: "",
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
  allowedRoles: DEFAULT_ALLOWED_ROLES,
};

export default function CreateEvent() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorData, setVendorData] = useState([]);

  const getDateTimeValue = (prefix) => {
    const date = form[`${prefix}Date`];
    const time = form[`${prefix}Time`];
    if (!date) return "";
    const safeTime = (time || "09:00").slice(0, 5);
    return `${date}T${safeTime}`;
  };

  const handleDateTimeChange = (prefix, value) => {
    setForm((prev) => {
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

  const handleRegistrationDeadlineChange = (value) => {
    setForm((prev) => ({
      ...prev,
      registrationDeadline: value,
    }));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await api.get("/events/all");
      // flatten grouped responses into a simple list
      let list = [];
      const data = res.data;
      if (Array.isArray(data)) list = data;
      else if (data && typeof data === "object") {
        for (const v of Object.values(data)) {
          if (Array.isArray(v)) list.push(...v);
        }
      }
      // normalize minimal fields for table
      setEvents(
        list.map((e) => ({
          _id: e._id || e.id,
          name: e.name || e.title || e.workshopName || e.tripName || "Untitled",
          type: e.type || e.eventType || e.category || "Other",
          date:
            e.startDate && e.endDate
              ? `${new Date(e.startDate).toLocaleDateString()} - ${new Date(
                  e.endDate
                ).toLocaleDateString()}`
              : e.startDate || e.date || "",
          location: e.location || e.venue || "",
          capacity: e.capacity ?? e.maxParticipants ?? "",
          startDate: e.startDate,
          endDate: e.endDate,
          registrants: e.registrants || [],
          // Store full event data for editing
          fullData: e,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  // table columns
  const columns = [
    { key: "name", label: "Name" },
    { key: "date", label: "Date" },
    { key: "location", label: "Location" },
    { key: "capacity", label: "Capacity" },
  ];

  // dynamic fields builder for modal based on selected event type
  function buildFields(evtType) {
    const basics = [
      {
        type: "section",
        label: "Event Basics",
        description:
          "Set the essential information that appears on listings, invites, and approval workflows.",
      },
    ];
    const common = [
      {
        name: "eventType",
        type: "select",
        label: "Event Type",
        required: true,
        placeholder: "Select an event type",
        options: [
          { value: "", label: "-- Select Event Type --" },
          { value: "bazaar", label: "Bazaar" },
          { value: "trip", label: "Trip" },
          { value: "conference", label: "Conference" },
        ],
        hint: "Different event types unlock specific fields and automations.",
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
        hint: "Keep it concise (160 characters) so it fits everywhere.",
      },
      {
        name: "location",
        type: "text",
        label: "Location / Venue",
        placeholder: "e.g., Arena Hall, Sports Complex, Off-campus",
        required: true,
        hint: "Share the exact venue so attendees know where to show up.",
        placeholder: "Brief description",
      },
      {
        name: "allowedRoles",
        type: "checkbox-group",
        label: "Eligible Roles",
        options: ROLE_OPTIONS,
        hint: "Only the selected roles can view and register.",
      },
    ];

    if (!evtType) {
      return basics;
    }

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
      ];
    }

    return basics;
  }

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
      setShowModal(false);
      setForm(initialFormState);
      fetchEvents();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create event");
    }
  }

  async function handleEdit(eventId) {
    const event = events.find((e) => e._id === eventId);
    if (!event) return;

    // Check if event can be edited based on type and start date
    const now = new Date();
    const startDate = event.startDate ? new Date(event.startDate) : null;

    if (event.type === "bazaar" || event.type === "trip") {
      if (startDate && startDate < now) {
        toast.error("Cannot edit: Event has already started");
        return;
      }
    }

    setEditingEvent(event);

    // Pre-fill form with existing event data
    const eventData = event.fullData;

    // Helper function to format date for input fields
    const formatDateForInput = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    };

    const preFilledForm = {
      eventType: event.type,
      name: eventData.name || "",
      shortDescription: eventData.shortDescription || "",
      location: eventData.location || "",
      registrationDeadline: formatDateForInput(eventData.registrationDeadline),
      startDate: formatDateForInput(eventData.startDate),
      endDate: formatDateForInput(eventData.endDate),
      startTime: eventData.startTime || "",
      endTime: eventData.endTime || "",
      price: eventData.price || "",
      capacity: eventData.capacity || "",
      agenda: eventData.agenda || "",
      website: eventData.website || "",
      budget: eventData.budget || "",
      price2x2: eventData.price2x2 ?? "",
      price4x4: eventData.price4x4 ?? "",
      allowedRoles:
        Array.isArray(eventData.allowedRoles) &&
        eventData.allowedRoles.length > 0
          ? eventData.allowedRoles
          : DEFAULT_ALLOWED_ROLES,
    };

    setForm(preFilledForm);
    setShowModal(true);
  }

  async function handleUpdate(formData) {
    if (!editingEvent) return;
    let endpoint = "/events";
    switch (editingEvent.type) {
      case "bazaar":
        endpoint = `/events/bazaar/${editingEvent._id}`;
        break;
      case "trip":
        endpoint = `/events/trip/${editingEvent._id}`;
        break;
      case "conference":
        endpoint = `/events/conference/${editingEvent._id}`;
        break;
      default:
        toast.error("Unknown event type");
        return;
    }

    try {
      await api.patch(endpoint, formData);
      toast.success("Event updated successfully");
      setShowModal(false);
      setEditingEvent(null);
      setForm(initialFormState);
      fetchEvents();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update event");
    }
  }

  async function handleViewVendors(eventId) {
    const event = events.find((e) => e._id === eventId);
    if (!event || (event.type !== "bazaar" && event.type !== "booth")) {
      toast.error(
        "Vendor participation is only available for bazaars and booths"
      );
      return;
    }

    try {
      let endpoint = "";
      if (event.type === "bazaar") {
        // For bazaars, we might need to get booth applications
        const res = await api.get("/events/booths");
        setVendorData(res.data.booths || []);
      } else {
        // For booths, get booth data directly
        const res = await api.get("/events/booths");
        setVendorData(res.data.booths || []);
      }
      setShowVendorModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load vendor participation data");
    }
  }

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Create Event</h2>
        <div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Create Event
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-300">Loading events...</div>
      ) : (
        <DynamicTable
          title="Existing Events"
          columns={columns}
          data={events}
          onEdit={handleEdit}
          editButtonText="Edit"
          customActions={(row) =>
            (row.type === "bazaar" || row.type === "booth") && (
              <button
                onClick={() => handleViewVendors(row._id)}
                className="text-green-400 hover:underline"
              >
                View Vendors
              </button>
            )
          }
        />
      )}

      {showModal && (
        <DynamicModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingEvent(null);
            setForm(initialFormState);
          }}
          title={
            editingEvent ? `Edit ${editingEvent.name}` : "Create New Event"
          }
          description={modalDescription}
          onSubmit={editingEvent ? handleUpdate : handleCreate}
          fields={buildFields(form.eventType || "")}
          formState={form}
          setFormState={setForm}
          submitLabel={editingEvent ? "Update" : "Create"}
          size="xl"
        >
          {scheduleSection}
        </DynamicModal>
      )}

      {/* Vendor Participation Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                Vendor Participation Requests
              </h3>
              <button
                onClick={() => setShowVendorModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {vendorData.length === 0 ? (
                <p className="text-gray-300">
                  No vendor participation requests found.
                </p>
              ) : (
                vendorData.map((vendor, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-white">
                          {vendor.companyName || vendor.boothName}
                        </h4>
                        <p className="text-gray-300 text-sm">
                          {vendor.boothName}
                        </p>
                        {vendor.location && (
                          <p className="text-gray-300 text-sm">
                            Location: {vendor.location}
                          </p>
                        )}
                        {vendor.size && (
                          <p className="text-gray-300 text-sm">
                            Size: {vendor.size}
                          </p>
                        )}
                        {vendor.duration && (
                          <p className="text-gray-300 text-sm">
                            Duration: {vendor.duration}
                          </p>
                        )}
                      </div>
                      <div>
                        {vendor.startDate && (
                          <p className="text-gray-300 text-sm">
                            Start:{" "}
                            {new Date(vendor.startDate).toLocaleDateString()}
                          </p>
                        )}
                        {vendor.endDate && (
                          <p className="text-gray-300 text-sm">
                            End: {new Date(vendor.endDate).toLocaleDateString()}
                          </p>
                        )}
                        {vendor.attendees && vendor.attendees.length > 0 && (
                          <div className="mt-2">
                            <p className="text-gray-300 text-sm font-medium">
                              Attendees:
                            </p>
                            <ul className="text-gray-300 text-sm ml-2">
                              {vendor.attendees.map((attendee, i) => (
                                <li key={i}>
                                  • {attendee.name} ({attendee.email})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowVendorModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const isEventTypeSelected = Boolean(form.eventType);
  const requiresRegistrationDeadline = ["bazaar", "trip"].includes(
    form.eventType
  );
  const startDateTimeValue = getDateTimeValue("start");
  const endDateTimeValue = getDateTimeValue("end");
  const dateInputClasses =
    "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/60 disabled:opacity-60";
  const scheduleSection = (
    <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-950/70 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-white">Schedule & deadlines</p>
        <p className="text-xs text-gray-400">
          Pick the exact window for this event. Dates are stored in Cairo local
          time.
        </p>
      </div>
      {!isEventTypeSelected && (
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
            value={startDateTimeValue}
            onChange={(e) => handleDateTimeChange("start", e.target.value)}
            className={dateInputClasses}
            disabled={!isEventTypeSelected}
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
            value={endDateTimeValue}
            onChange={(e) => handleDateTimeChange("end", e.target.value)}
            className={dateInputClasses}
            disabled={!isEventTypeSelected}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            When teardown finishes or the trip returns.
          </p>
        </div>
      </div>
      {requiresRegistrationDeadline && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400">
              Registration deadline
            </label>
            <input
              type="date"
              value={form.registrationDeadline || ""}
              onChange={(e) =>
                handleRegistrationDeadlineChange(e.target.value)
              }
              className={dateInputClasses}
              disabled={!isEventTypeSelected}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Vendors and attendees cannot sign up after this date.
            </p>
          </div>
        </div>
      )}
    </div>
  );
  const modalDescription = editingEvent
    ? "Update the essentials, schedule, and pricing before announcing your changes."
    : "Provide the basics, timing, and any pricing info so we can publish a polished event card.";
}
