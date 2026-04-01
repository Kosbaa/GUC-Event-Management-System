import React, { useEffect, useRef, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { MessageCircle, Loader, Clock } from "lucide-react";
import ChatModal from "./ChatModal";

export default function Chats() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const pollingIntervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchConversations(true);

    pollingIntervalRef.current = setInterval(() => {
      fetchConversations(false);
    }, 4000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const fetchConversations = async (showSpinner = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (showSpinner) setLoading(true);
      const response = await api.get("/chat/conversations");
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      if (showSpinner) setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleOpenChat = (userId, userName) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setShowChatModal(true);
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
    setSelectedUserId(null);
    setSelectedUserName("");
    // Refresh conversations after closing chat to update unread counts
    fetchConversations();
  };

  const handleMessageSent = () => {
    // Refresh conversations when a message is sent to update the list
    fetchConversations();
  };

  const formatLastMessage = (message) => {
    if (!message) return "No messages";
    if (message.length > 50) {
      return message.substring(0, 50) + "...";
    }
    return message;
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <MessageCircle className="h-6 w-6 text-blue-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                Chats
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Your conversations with other users.
            </p>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <MessageCircle className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Conversations Yet
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Start chatting with other users by clicking the Chat button in
                trip participants or other sections.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <button
              key={conversation.userId}
              onClick={() =>
                handleOpenChat(conversation.userId, conversation.userName)
              }
              className="w-full group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300 text-left"
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/30 text-lg font-semibold text-blue-100 flex-shrink-0">
                    {(conversation.userName || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h3 className="text-lg font-bold text-white truncate">
                        {conversation.userName || "Unknown User"}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate mb-2">
                      {formatLastMessage(conversation.lastMessage)}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatLastMessageTime(conversation.lastMessageAt)}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0 text-gray-600 group-hover:text-blue-400 transition-colors">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={handleCloseChat}
        otherUserId={selectedUserId}
        otherUserName={selectedUserName}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
