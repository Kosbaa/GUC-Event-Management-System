import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { Mail, AlertCircle, XCircle, Clock, MessageSquare, Inbox } from "lucide-react";

export default function MessagesFromEventOffice() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events/professor/workshops/messages");

      // Strip extra quotes from messages
      const formatted = (response.data || []).map((msg) => ({
        ...msg,
        message: msg.message ? msg.message.replace(/^"|"$/g, "") : "",
      }));
      setMessages(formatted);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const getStatusConfig = (status) => {
    if (status === "needs_edits") {
      return {
        label: "Edits Requested",
        icon: AlertCircle,
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        textColor: "text-orange-400",
        iconColor: "text-orange-400",
      };
    }
    return {
      label: "Rejected",
      icon: XCircle,
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      textColor: "text-red-400",
      iconColor: "text-red-400",
    };
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading messages...</p>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Mail className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Messages from Event Office
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Review feedback and action items for your workshop proposals.
            </p>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Inbox className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Messages</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                You don't have any messages from the Event Office at this time. Check back later for updates on your workshop proposals.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => {
            const statusConfig = getStatusConfig(msg.status);
            const StatusIcon = statusConfig.icon;

            return (
              <article
                key={msg._id}
                className="group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
              >
                {/* Message Header */}
                <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <MessageSquare className="h-5 w-5 text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          {msg.name || "Workshop Feedback"}
                        </h3>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-6">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${statusConfig.bgColor} border ${statusConfig.borderColor} flex-shrink-0 mt-1`}>
                      <Mail className={`h-4 w-4 ${statusConfig.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">
                        Message from Event Office
                      </p>
                      <p className="text-base text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {msg.message || "No message content available."}
                      </p>
                    </div>
                  </div>

                  {/* Timestamp (if available) */}
                  {msg.createdAt && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700/50">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-500">
                        {new Date(msg.createdAt).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
