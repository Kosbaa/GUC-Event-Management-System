import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { X, Send, MessageCircle, Loader } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ChatModal({ isOpen, onClose, otherUserId, otherUserName, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isFetchingRef = useRef(false);
  const { user } = useAuth();

  const currentUserId = useMemo(
    () => String(user?._id || user?.id || user?.userId || ""),
    [user]
  );
  const isChattingWithSelf =
    Boolean(currentUserId) && String(otherUserId || "") === currentUserId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && otherUserId && !isChattingWithSelf) {
      fetchMessages(true);
    }
  }, [isOpen, otherUserId, isChattingWithSelf]);

  // Poll for new messages while the chat is open
  useEffect(() => {
    if (isOpen && otherUserId && !isChattingWithSelf) {
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages(false);
      }, 4000);
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, otherUserId, isChattingWithSelf]);

  useEffect(() => {
    if (isChattingWithSelf) {
      setMessages([]);
    }
  }, [isChattingWithSelf]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessageInternal = async (messageContent) => {
    if (isChattingWithSelf) {
      toast.error("You can't send messages to yourself");
      return false;
    }
    if (!messageContent || sending) {
      return false;
    }

    setNewMessage("");
    setSending(true);

    // Optimistically add message to UI
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      senderId: "me",
      isFromMe: true,
      read: false,
      createdAt: new Date(),
      isPending: true,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await api.post(`/chat/${otherUserId}`, {
        content: messageContent,
      });
      
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id ? response.data.message : msg
        )
      );
      
      // Notify parent component that a message was sent (for refreshing conversations list)
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      // Remove failed message
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
    return false;
  };

  const handleSendMessage = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isChattingWithSelf) {
      toast.error("You can't send messages to yourself");
      return false;
    }
    if (!newMessage.trim() || sending) {
      return false;
    }
    const messageContent = newMessage.trim();
    return handleSendMessageInternal(messageContent);
  };

  const fetchMessages = async (showSpinner = false) => {
    if (!otherUserId || isChattingWithSelf) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (showSpinner) setLoading(true);
      const response = await api.get(`/chat/${otherUserId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      if (showSpinner) setLoading(false);
      isFetchingRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[700px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between bg-gray-900/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
              <MessageCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{otherUserName || "Chat"}</h3>
              <p className="text-xs text-gray-400">Direct message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900/30"
        >
          {isChattingWithSelf ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 mb-4">
                <MessageCircle className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-sm text-gray-300 font-semibold">
                You can't start a chat with yourself.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Choose another user to start messaging.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-3">
                <Loader className="h-8 w-8 text-blue-400 animate-spin" />
                <p className="text-sm text-gray-400">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 mb-4">
                <MessageCircle className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-sm text-gray-400 text-center">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    message.isFromMe
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-100 border border-gray-700"
                  } ${message.isPending ? "opacity-60" : ""}`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.isFromMe ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-700 px-6 py-4 bg-gray-900/70">
          <div
            role="form"
            aria-label="Send message"
            className="flex items-center gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isChattingWithSelf
                  ? "You can't message yourself"
                  : "Type a message..."
              }
              className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={sending || isChattingWithSelf}
              maxLength={2000}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="button"
              onClick={(e) => handleSendMessage(e)}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              disabled={!newMessage.trim() || sending || isChattingWithSelf}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-right">
            {newMessage.length}/2000
          </p>
        </div>
      </div>
    </div>
  );
}
