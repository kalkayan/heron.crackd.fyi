import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/utils";

export function ChatPanel({ sessionId, reviewId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const bottomRef = useRef(null);

  // Load existing chat history on mount / reviewId change
  useEffect(() => {
    if (!reviewId) return;
    setMessages([]);
    fetchChat();
  }, [reviewId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function fetchChat(schedulePolling = false) {
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}/code-review/${reviewId}/chat`);
      const data = await resp?.json();
      if (!data) return;
      setMessages(data.messages || []);
      if (schedulePolling && data.has_pending) {
        startPolling();
      } else if (!data.has_pending) {
        stopPolling();
      }
    } catch {}
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}/code-review/${reviewId}/chat`).catch(() => null);
      const data = await resp?.json().catch(() => null);
      if (!data) return;
      setMessages(data.messages || []);
      if (!data.has_pending) stopPolling();
    }, 2000);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleSend(e) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;

    setSending(true);
    setError("");
    setInput("");

    // Optimistic user bubble
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: "user", content: msg, status: "done" }]);

    try {
      const resp = await apiFetch(
        `/api/user/sessions/${sessionId}/code-review/${reviewId}/chat`,
        { method: "POST", body: JSON.stringify({ message: msg }) }
      );
      const data = await resp?.json();
      if (!resp?.ok) {
        setError(resp?.status === 429 ? "Weekly AI limit reached. Resets on Monday." : (data?.error || "Failed to send."));
        return;
      }

      // Replace optimistic bubble with real message + add pending AI turn placeholder
      await fetchChat(true);
      startPolling();
    } catch {
      setError("Could not send message.");
    } finally {
      setSending(false);
    }
  }

  if (!reviewId) return null;

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E2D8",
      borderRadius: 14,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
      minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px 12px",
        borderBottom: "1px solid #F4F1EA",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#9A9A98", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Ask the interviewer
        </span>
      </div>

      {/* Messages */}
      <div style={{
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
      }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 12, color: "#B0ADA4", fontStyle: "italic", margin: 0 }}>
            Ask a follow-up question about the review…
          </p>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isPending = m.status === "pending";
          return (
            <div key={m.id || i} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isUser ? "flex-end" : "flex-start",
              gap: 2,
            }}>
              <div style={{
                maxWidth: "85%",
                padding: "9px 13px",
                borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: isUser ? "#1A1A1A" : "#F6F4ED",
                color: isUser ? "#FFFFFF" : "#1A1A1A",
                fontSize: 13,
                lineHeight: 1.55,
                fontStyle: isPending ? "italic" : "normal",
                opacity: isPending ? 0.6 : 1,
              }}>
                {isPending && m.role === "user" ? m.content : null}
                {!isPending ? m.content : null}
                {isPending && m.role !== "user" ? (
                  <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                    <span style={{ animation: "dot-flash 1.2s infinite 0s",    width: 4, height: 4, borderRadius: "50%", background: "#9A9A98", display: "inline-block" }} />
                    <span style={{ animation: "dot-flash 1.2s infinite 0.3s",  width: 4, height: 4, borderRadius: "50%", background: "#9A9A98", display: "inline-block" }} />
                    <span style={{ animation: "dot-flash 1.2s infinite 0.6s",  width: 4, height: 4, borderRadius: "50%", background: "#9A9A98", display: "inline-block" }} />
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: "10px 14px",
        borderTop: "1px solid #F4F1EA",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a follow-up…"
          disabled={sending}
          style={{
            flex: 1,
            background: "#F6F4ED",
            border: "1px solid #E5E2D8",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 13,
            color: "#1A1A1A",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            background: input.trim() && !sending ? "#1A1A1A" : "#E5E2D8",
            color: input.trim() && !sending ? "#FFFFFF" : "#9A9A98",
            border: "none",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </form>

      {error && (
        <p style={{ fontSize: 11, color: "#A82828", padding: "4px 18px 10px", margin: 0 }}>{error}</p>
      )}

      <style>{`
        @keyframes dot-flash {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
