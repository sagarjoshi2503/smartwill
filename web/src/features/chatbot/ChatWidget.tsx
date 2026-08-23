import { useState } from "react";
import { MessageCircle, X, Send, LifeBuoy, Trash2 } from "lucide-react";
import { chatbotUrl } from "../../utils/chatbotBase";
import { getAuthToken } from "../../utils/auth";
import {
  ARIA_CLEAR_CHAT, ARIA_OPEN_CHAT, BTN_CONTACT_SUPPORT, CHATBOT_CHAT, CONTENT_TYPE_JSON, HEADER_CONTENT_TYPE,
  LBL_CHAT_ASSISTANT_TITLE, LBL_RETRIEVAL_MODE_MCP, LBL_RETRIEVAL_MODE_RAG, MSG_CHAT_EMPTY_STATE,
  MSG_CHAT_THINKING, MSG_CHAT_UNAVAILABLE, PH_CHAT_QUESTION, RETRIEVAL_MODE_RAG, ROLE_ADMIN, ROLE_TESTATOR,
} from "../../constants";

type ChatMessage = { role: "user" | "assistant"; content: string; retrievalMode?: string };

// Whichever role's token is currently stored determines what the assistant
// can look up on the user's behalf (see chatbot/tools.py's role whitelist) —
// a signed-in user is never both at once in this app, so admin takes
// precedence only because it's checked first, not because both could exist.
// Before sign-in, both are null: no token is sent, so the backend only ever
// offers the anonymous whitelist (health_check/get_contact_info) — no Will
// data is fetched, because there's no tool available that could fetch it.
const currentAuth = (): { token: string | null; role: "admin" | "testator" | null } => {
  const adminToken = getAuthToken(ROLE_ADMIN);
  if (adminToken) return { token: adminToken, role: "admin" };
  const testatorToken = getAuthToken(ROLE_TESTATOR);
  if (testatorToken) return { token: testatorToken, role: "testator" };
  return { token: null, role: null };
};

export default function ChatWidget({ onContactSupport }: { onContactSupport: () => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setUnavailable(false);

    try {
      const { token, role } = currentAuth();
      const res = await fetch(chatbotUrl(CHATBOT_CHAT), {
        method: "POST",
        headers: { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON },
        body: JSON.stringify({ messages: nextMessages, token, role }),
      });
      const isJson = res.headers.get(HEADER_CONTENT_TYPE)?.includes(CONTENT_TYPE_JSON);
      const data = isJson ? await res.json() : null;
      if (!res.ok) {
        // A non-2xx here means the chatbot service itself is unreachable
        // (network error, bad gateway, etc.) — same "not available" UX as a
        // 200 response that explicitly reports unavailable:true.
        setUnavailable(true);
        return;
      }
      setUnavailable(!!data.unavailable);
      setMessages(m => [...m, { role: "assistant", content: data.reply, retrievalMode: data.retrieval_mode }]);
    } catch {
      setUnavailable(true);
    } finally {
      setSending(false);
    }
  };

  const handleContactSupport = () => {
    setOpen(false);
    onContactSupport();
  };

  const handleClearChat = () => {
    setMessages([]);
    setUnavailable(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      {open && (
        <div className="mb-3 w-[340px] max-w-[calc(100vw-2.5rem)] h-[460px] apv-card flex flex-col overflow-hidden shadow-2xl">
          <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/95">
            <span className="text-slate-900 font-semibold text-sm serif">{LBL_CHAT_ASSISTANT_TITLE}</span>
            <div className="flex items-center gap-2.5">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="text-slate-500 hover:text-slate-900 transition-colors"
                  aria-label={ARIA_CLEAR_CHAT}
                  title={ARIA_CLEAR_CHAT}
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-slate-50">
            {messages.length === 0 && (
              <p className="text-slate-500 text-xs">{MSG_CHAT_EMPTY_STATE}</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-brand text-[#ffffff] font-medium"
                      : "bg-white border border-slate-200 text-slate-900"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && m.retrievalMode && (
                  <span className="mt-1 text-[10px] text-slate-400">
                    {m.retrievalMode === RETRIEVAL_MODE_RAG ? LBL_RETRIEVAL_MODE_RAG : LBL_RETRIEVAL_MODE_MCP}
                  </span>
                )}
              </div>
            ))}
            {sending && <p className="text-slate-500 text-xs">{MSG_CHAT_THINKING}</p>}
            {unavailable && (
              <div className="flex flex-col items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-3 py-2.5">
                <p className="text-red-600 text-xs">{MSG_CHAT_UNAVAILABLE}</p>
                <button
                  onClick={handleContactSupport}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors"
                >
                  <LifeBuoy size={13} />{BTN_CONTACT_SUPPORT}
                </button>
              </div>
            )}
          </div>

          <div className="flex-none flex items-center gap-2 px-3 py-3 border-t border-slate-200 bg-white/95">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              placeholder={PH_CHAT_QUESTION}
              className="flex-1 apv-input rounded-full px-3.5 py-2 text-slate-900 placeholder:text-slate-500 text-xs focus:outline-none transition"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="w-8 h-8 shrink-0 rounded-full bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-[#ffffff] flex items-center justify-center transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full bg-brand hover:bg-brand-dark text-[#ffffff] shadow-lg shadow-[#4F9D33]/30 flex items-center justify-center transition-colors"
        aria-label={ARIA_OPEN_CHAT}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>
    </div>
  );
}
