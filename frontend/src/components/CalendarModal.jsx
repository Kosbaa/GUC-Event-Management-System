import Calendar from "./Calendar";
import { X } from "lucide-react";

export default function CalendarModal({
  isOpen,
  onClose,
  sportName,
  events,
  currentDate,
  onPrevMonth,
  onNextMonth,
  onStudentDateClick,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 p-6 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {sportName} Schedule
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <Calendar
            sportName={sportName}
            events={events}
            currentDate={currentDate}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onStudentDateClick={onStudentDateClick}
          />
        </div>
      </div>
    </div>
  );
}
