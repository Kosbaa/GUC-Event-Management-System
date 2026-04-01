import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import toast from "react-hot-toast";

const quickReplies = [
  "How do I book a court?",
  "Payment issue or refund",
  "Where are my registrations?",
  "Vendor booth application steps",
  "Loyalty perks and streaks",
];

function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm here 24/7 for quick questions about events, courts, payments, vendors, or loyalty.",
    },
  ]);
  const [dimensions, setDimensions] = useState({
    width: 352, // 22rem
    height: 416, // 26rem
  });
  const minWidth = 288; // 18rem
  const minHeight = 320; // 20rem
  const [dragging, setDragging] = useState(false);

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX; // drag from top-left
      const deltaY = startY - moveEvent.clientY;
      const newWidth = Math.max(minWidth, startWidth + deltaX);
      const newHeight = Math.max(minHeight, startHeight + deltaY);
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const placeholder = useMemo(
    () => (loading ? "Waiting for reply..." : "Ask anything about campus services"),
    [loading]
  );

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/support/chat", { message: trimmed });
      const answer = res?.data?.answer || "Sorry, I could not respond.";
      setMessages((prev) => [...prev, { role: "bot", text: answer }]);
    } catch (err) {
      console.error("Support chat error", err);
      toast.error("Support is unavailable right now.");
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "I couldn't reach support. Please try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading) sendMessage(input);
  };

  useEffect(() => {
    if (open) {
      const panel = document.getElementById("support-chat-panel");
      if (panel) panel.scrollTop = panel.scrollHeight;
    }
  }, [messages, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 transition"
      >
        {open ? "Close Chat" : "Need help?"}
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-6 z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            minWidth: `${minWidth}px`,
            minHeight: `${minHeight}px`,
            userSelect: dragging ? "none" : "auto",
          }}
        >
          <button
            type="button"
            onMouseDown={startResize}
            className="absolute -left-2 -top-2 h-4 w-4 cursor-nwse-resize rounded bg-slate-300 border border-slate-400"
            aria-label="Resize chat"
            title="Resize chat"
          />
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Support</p>
              <p className="text-xs text-slate-200">24/7 assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-slate-200 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div
            id="support-chat-panel"
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3"
          >
            {messages.map((msg, idx) => (
              <div
                key={`${idx}-${msg.role}`}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-800 border border-slate-200"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-slate-500">Assistant is typing…</div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {quickReplies.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => !loading && sendMessage(qr)}
                >
                  {qr}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default SupportChatWidget;
