import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Calendar({
  sportName,
  events = [],
  currentDate,
  onPrevMonth,
  onNextMonth,
  onSelectEvent,
  onSelectDay,
  onStudentDateClick,
  selectedDate,
}) {
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventForDate = (day) => {
    const dateToCheck = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    dateToCheck.setHours(0, 0, 0, 0);

    return events.find((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === dateToCheck.getTime();
    });
  };

  const getEventsForDate = (day) => {
    const dateToCheck = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    dateToCheck.setHours(0, 0, 0, 0);

    return events.filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === dateToCheck.getTime();
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const days = [];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Empty cells before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(
      <div
        key={`empty-${i}`}
        className="h-20 border border-gray-700 bg-gray-800"
      />
    );
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateEvents = getEventsForDate(day);
    // Check if there's an Event Office booking (full day) - for courts
    const eventOfficeBooking = dateEvents.find(
      (e) => e.reservedBy === "Event Office"
    );
    const isEventOfficeBooking = !!eventOfficeBooking;
    // Check if there are student reservations (time slots) - for courts
    // Student reservations have reservedBy in "name-Id" format (not "Event Office")
    const studentReservations = dateEvents.filter(
      (e) => e.reservedBy && e.reservedBy !== "Event Office" && e.time
    );
    const hasStudentReservations = studentReservations.length > 0;
    // For gym sessions and other events without reservedBy, check if eventName exists
    const regularEvents = dateEvents.filter(
      (e) => !e.reservedBy && e.eventName
    );
    const hasRegularEvents = regularEvents.length > 0;
    const isBooked = isEventOfficeBooking || hasStudentReservations || hasRegularEvents;
    const event = eventOfficeBooking || regularEvents[0] || dateEvents[0]; // Use Event Office booking for display if exists, otherwise regular event

    const dateToCheck = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    dateToCheck.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDay = dateToCheck < today;

    const isSelected =
      selectedDate &&
      selectedDate.getFullYear() === dateToCheck.getFullYear() &&
      selectedDate.getMonth() === dateToCheck.getMonth() &&
      selectedDate.getDate() === dateToCheck.getDate();

    const handleClick = () => {
      // If student date click handler exists and date is not booked by Event Office, use it
      if (onStudentDateClick && !isEventOfficeBooking) {
        onStudentDateClick(dateToCheck);
      } else {
        // Default behavior for Event Office or viewing
        if (onSelectDay) onSelectDay(dateToCheck);
        if (isBooked && onSelectEvent) onSelectEvent(event);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    };

    days.push(
      <div
        key={day}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`h-20 border border-gray-700 p-1.5 flex flex-col justify-between focus:outline-none ${
          isEventOfficeBooking || hasRegularEvents
            ? "bg-red-900 bg-opacity-30 hover:bg-opacity-40 cursor-pointer"
            : hasStudentReservations
            ? "bg-yellow-900 bg-opacity-20 hover:bg-opacity-30 cursor-pointer"
            : "bg-green-900 bg-opacity-10 hover:bg-opacity-20 cursor-pointer"
        } ${isSelected ? "ring-2 ring-blue-600" : ""} ${
          isPastDay ? "opacity-50 grayscale" : ""
        }`}
        aria-pressed={isSelected}
        aria-label={`Day ${day}${isBooked ? `, booked: ${event.eventName}` : ""}`}
      >
        <div className="flex items-center justify-between">
          <div
            className={`font-semibold text-sm ${
              isPastDay ? "text-gray-400" : "text-white"
            }`}
          >
            {day}
          </div>
        </div>

        <div className="text-xs leading-tight">
          {isEventOfficeBooking ? (
            <div className="text-left">
              <div className="text-sm font-medium text-red-400 truncate">{event.eventName}</div>
              <div className="text-[11px] text-gray-300 truncate">Full Day</div>
            </div>
          ) : hasStudentReservations ? (
            <div className="text-left">
              <div className="text-sm font-medium text-yellow-400 truncate">
                {studentReservations.length} Time Slot{studentReservations.length > 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-gray-300 truncate">Click to view/add</div>
            </div>
          ) : hasRegularEvents ? (
            <div className="text-left">
              <div className="text-sm font-medium text-red-400 truncate">{event.eventName}</div>
              <div className="text-[11px] text-gray-300 truncate">Booked</div>
            </div>
          ) : (
            <div className="text-left text-green-400 text-xs">Available</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>

        <button
          onClick={onNextMonth}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 mb-1.5">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-gray-400 text-xs py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">{days}</div>
    </div>
  );
}
