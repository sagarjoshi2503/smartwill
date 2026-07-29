import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { chatbotUrl } from "../../utils/chatbotBase";
import { getAuthToken } from "../../utils/auth";
import { CHATBOT_CHAT, ROLE_ADMIN, ROLE_TESTATOR } from "../../constants";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Whichever role's token is currently stored determines what the assistant
// can look up on the user's behalf (see chatbot/tools.py's role whitelist) —
// a signed-in user is never both at once in this app, so admin takes
// precedence only because it's checked first, not because both could exist.
const currentAuth = (): { token: string | null; role: "admin" | "testator" | null } => {
  const adminToken = getAuthToken(ROLE_ADMIN);
  if (adminToken) return { token: adminToken, role: "admin" };
  const testatorToken = getAuthToken(ROLE_TESTATOR);
  if (testatorToken) return { token: testatorToken, role: "testator" };
  return { token: null, role: null };
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError("");

    try {
      const { token, role } = currentAuth();
      const res = await fetch(chatbotUrl(CHATBOT_CHAT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, token, role }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if (!res.ok) throw new Error(data?.error || `Could not reach the assistant (server returned ${res.status}).`);
      setMessages(m => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the assistant.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      {open && (
        <div className="mb-3 w-[340px] max-w-[calc(100vw-2.5rem)] h-[460px] apv-card flex flex-col overflow-hidden shadow-2xl">
          <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/95">
            <span className="text-slate-900 font-semibold text-sm serif">SmartWill Assistant</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-slate-50">
            {messages.length === 0 && (
              <p className="text-slate-500 text-xs">Ask me a question about SmartWill, or about your own Wills if you're signed in.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#d09d61] text-[#020617] font-medium"
                      : "bg-white border border-slate-200 text-slate-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && <p className="text-slate-500 text-xs">Thinking…</p>}
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>

          <div className="flex-none flex items-center gap-2 px-3 py-3 border-t border-slate-200 bg-white/95">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              placeholder="Ask a question…"
              className="flex-1 apv-input rounded-full px-3.5 py-2 text-slate-900 placeholder:text-slate-500 text-xs focus:outline-none transition"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="w-8 h-8 shrink-0 rounded-full bg-[#d09d61] hover:bg-[#d7a46a] disabled:opacity-50 disabled:cursor-not-allowed text-[#020617] flex items-center justify-center transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full bg-[#d09d61] hover:bg-[#d7a46a] text-[#020617] shadow-lg shadow-[#d09d61]/30 flex items-center justify-center transition-colors"
        aria-label="Open chat assistant"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>
    </div>
  );
}
