import Faculty from "../models/faculty.model.js";
import Student from "../models/student.model.js";
import Vendor from "../models/vendor.model.js";
import EventOffice from "../models/eventOffice.model.js";

const findUserAcrossCollections = async (userId) => {
  const collections = [
    { model: Faculty, type: 'faculty' },
    { model: Student, type: 'student' },
    { model: Vendor, type: 'vendor' },
    { model: EventOffice, type: 'eventOffice' }
  ];

  for (const { model, type } of collections) {
    const user = await model.findById(userId);
    if (user) {
      return { user, type, Model: model };
    }
  }
  return { user: null, type: null, Model: null };
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { user, type } = await findUserAcrossCollections(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user status to blocked
    user.status = "blocked";
    await user.save();

    res.status(200).json({ 
      message: "User blocked successfully",
      userType: type
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Failed to block user" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { user, type } = await findUserAcrossCollections(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user status to active
    user.status = "active";
    await user.save();

    res.status(200).json({ 
      message: "User unblocked successfully",
      userType: type
    });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Failed to unblock user" });
  }
};