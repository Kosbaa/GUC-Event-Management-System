import Court from "../models/court.model.js";
import Student from "../models/student.model.js";

export const createCourtEvent = async (req, res) => {
  try {
    const { eventName, court, date } = req.body;

    // Validate input
    if (!eventName || !court || !date) {
      return res
        .status(400)
        .json({ message: "Please provide eventName, court, and date." });
    }

    // For Event Office reservations, check if the court is already booked on that date (full day)
    // Only check Event Office reservations, not student time-slot reservations
    const existingCourt = await Court.findOne({
      court,
      date: new Date(date),
      reservedBy: "Event Office",
    });
    if (existingCourt) {
      return res
        .status(400)
        .json({ message: "Court is already booked for this date." });
    }

    // Create new event for Event Office (no time, full day reservation)
    const newCourtEvent = new Court({
      eventName,
      court,
      date: new Date(date),
      reservedBy: "Event Office",
    });
    await newCourtEvent.save();

    res.status(201).json({
      message: "Court event created successfully",
      courtEvent: newCourtEvent,
    });
  } catch (error) {
    console.error("Error creating court event:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

export const getCourtEvents = async (req, res) => {
  try {
    const { court, start, end } = req.query;
    const query = {};

    // Filter by court if specified
    if (court) {
      query.court = court;
    }

    // Filter by date range
    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = new Date(start);
      if (end) query.date.$lte = new Date(end);
    }

    // Fetch and sort by date ascending, then by time
    const events = await Court.find(query)
      .sort({ date: 1, time: 1 })
      .populate("studentId", "firstName lastName UniId");

    res.json({ events });
  } catch (error) {
    console.error("Error fetching court events:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Student reservation endpoint
export const reserveCourt = async (req, res) => {
  try {
    const { court, date, time } = req.body;
    const studentId = req.user?.id; // From auth middleware - uses 'id' because JWT token has { id: user._id, role: role }

    // Validate input
    if (!court || !date || !time) {
      return res
        .status(400)
        .json({ message: "Please provide court, date, and time." });
    }

    if (!studentId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Please login as a student." });
    }

    // Check if the court is already booked by Event Office on that date (full day)
    const eventOfficeReservation = await Court.findOne({
      court,
      date: new Date(date),
      reservedBy: "Event Office",
    });
    if (eventOfficeReservation) {
      return res
        .status(400)
        .json({
          message: "Court is already booked for this date by Event Office.",
        });
    }

    // Check if the specific time slot is already reserved (any student reservation, not Event Office)
    const existingReservation = await Court.findOne({
      court,
      date: new Date(date),
      time: time,
      reservedBy: { $ne: "Event Office" }, // Any reservation that's not Event Office
    });
    if (existingReservation) {
      return res
        .status(400)
        .json({ message: "This time slot is already reserved." });
    }

    // Fetch student information to create reservedBy string
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // Format: "firstName lastName-UniId"
    const studentName =
      `${student.firstName || ""} ${student.lastName || ""}`.trim();
    const reservedByValue = studentName
      ? `${studentName}-${student.UniId || ""}`
      : student.UniId || "Unknown Student";

    // Create new student reservation
    const newReservation = new Court({
      eventName: `Student Reservation - ${time}`,
      court,
      date: new Date(date),
      time: time,
      studentId: studentId,
      reservedBy: reservedByValue,
    });
    await newReservation.save();

    res.status(201).json({
      message: "Court reserved successfully",
      reservation: newReservation,
    });
  } catch (error) {
    console.error("Error reserving court:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
