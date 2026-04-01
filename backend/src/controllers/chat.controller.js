import Message from "../models/message.model.js";
import Student from "../models/student.model.js";
import Professor from "../models/faculty.model.js";
import Vendor from "../models/vendor.model.js";
import Admin from "../models/admin.model.js";

// Helper to resolve user role from request
const resolveUserRole = (req) => {
  return req.user?.role || "Student";
};

// Helper to get user name
const getUserName = async (userId, userType) => {
  let user = null;
  switch (userType) {
    case "Student":
      user = await Student.findById(userId).select("firstName lastName");
      if (user) {
        return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Student";
      }
      break;
    case "Professor":
      user = await Professor.findById(userId).select("firstName lastName");
      if (user) {
        return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Professor";
      }
      break;
    case "Vendor":
      user = await Vendor.findById(userId).select("companyName");
      if (user) {
        return user.companyName || "Vendor";
      }
      break;
    case "Admin":
    case "Event Office":
      user = await Admin.findById(userId).select("firstName lastName");
      if (user) {
        return `${user.firstName || ""} ${user.lastName || ""}`.trim() || userType;
      }
      break;
  }
  return "User";
};

// Get conversation between current user and another user
export const getConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = resolveUserRole(req);
    const { userId: otherUserId } = req.params;

    if (!otherUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Get all messages between the two users (in both directions)
    const messages = await Message.find({
      $or: [
        {
          sender: currentUserId,
          recipient: otherUserId,
        },
        {
          sender: otherUserId,
          recipient: currentUserId,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages as read where current user is the recipient
    await Message.updateMany(
      {
        sender: otherUserId,
        recipient: currentUserId,
        read: false,
      },
      { read: true }
    );

    // Get the other user's name
    const otherUserName = await getUserName(otherUserId, "Student"); // Default to Student, can be enhanced

    // Format messages for frontend
    const formattedMessages = messages.map((msg) => ({
      id: msg._id,
      content: msg.content,
      senderId: msg.sender.toString(),
      recipientId: msg.recipient.toString(),
      isFromMe: msg.sender.toString() === currentUserId,
      read: msg.read,
      createdAt: msg.createdAt,
    }));

    return res.json({
      messages: formattedMessages,
      otherUser: {
        id: otherUserId,
        name: otherUserName,
      },
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = resolveUserRole(req);
    const { userId: recipientId } = req.params;
    const { content } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ message: "Message is too long (max 2000 characters)" });
    }

    // Create the message
    const message = new Message({
      sender: currentUserId,
      senderType: currentUserRole,
      recipient: recipientId,
      recipientType: "Student", // Default, can be enhanced to detect recipient type
      content: content.trim(),
      read: false,
    });

    await message.save();

    // Get recipient name for response
    const recipientName = await getUserName(recipientId, "Student");

    return res.status(201).json({
      message: {
        id: message._id,
        content: message.content,
        senderId: message.sender.toString(),
        recipientId: message.recipient.toString(),
        isFromMe: true,
        read: false,
        createdAt: message.createdAt,
      },
      recipient: {
        id: recipientId,
        name: recipientName,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all conversations for current user (list of people they've chatted with)
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = resolveUserRole(req);

    // Get distinct conversation partners
    const sentMessages = await Message.find({ sender: currentUserId })
      .select("recipient recipientType createdAt content")
      .sort({ createdAt: -1 })
      .lean();

    const receivedMessages = await Message.find({ recipient: currentUserId })
      .select("sender senderType createdAt content read")
      .sort({ createdAt: -1 })
      .lean();

    // Combine and get unique conversation partners
    const conversationMap = new Map();

    // Process sent messages
    sentMessages.forEach((msg) => {
      const partnerId = msg.recipient.toString();
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          userId: partnerId,
          userType: msg.recipientType,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      } else {
        const conv = conversationMap.get(partnerId);
        if (msg.createdAt > conv.lastMessageAt) {
          conv.lastMessage = msg.content;
          conv.lastMessageAt = msg.createdAt;
        }
      }
    });

    // Process received messages
    receivedMessages.forEach((msg) => {
      const partnerId = msg.sender.toString();
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          userId: partnerId,
          userType: msg.senderType,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: msg.read === false ? 1 : 0,
        });
      } else {
        const conv = conversationMap.get(partnerId);
        if (msg.createdAt > conv.lastMessageAt) {
          conv.lastMessage = msg.content;
          conv.lastMessageAt = msg.createdAt;
        }
        if (msg.read === false) {
          conv.unreadCount += 1;
        }
      }
    });

    // Get names for all conversation partners
    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const name = await getUserName(conv.userId, conv.userType);
        return {
          ...conv,
          userName: name,
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return res.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

