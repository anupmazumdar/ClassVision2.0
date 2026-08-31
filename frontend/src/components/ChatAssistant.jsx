import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ChevronDown,
  RefreshCw,
  Volume2,
  VolumeX,
  ExternalLink,
  HelpCircle,
  BookOpen,
  MapPin,
  Smartphone,
  ShieldCheck,
  GraduationCap,
  Loader2,
  Minimize2,
} from "lucide-react";
import { askAssistant, getAssistantFaqs, getErrorMessage } from "../api/client";

const QUICK_PROMPTS = [
  "How to self check-in on phone?",
  "How does 100m geofence work?",
  "How to post notes & assignments in Classroom?",
  "What is the UEM 75% attendance rule?",
  "How to fix camera or GPS permission error?",
];

export default function ChatAssistant() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState("chat"); // chat | faqs
  const [messages, setMessages] = useState([
    {
      sender: "assistant",
      text: "👋 Hi there! I'm your **UEM ClassVision AI Assistant**.\n\nI can help you with student attendance, 100m geofenced self check-in, Google Classroom study hub, WhatsApp sharing, and university rules.\n\nFeel free to ask any question or tap a suggestion below!",
      suggestions: QUICK_PROMPTS,
      action: null,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Load FAQs when switching to FAQs tab
  useEffect(() => {
    if (activeView === "faqs" && faqs.length === 0) {
      setFaqsLoading(true);
      getAssistantFaqs()
        .then(setFaqs)
        .catch(() => {})
        .finally(() => setFaqsLoading(false));
    }
  }, [activeView, faqs.length]);

  const speakText = (text) => {
    if (!ttsEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`•]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput("");
    const userMsg = {
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.sender === "user" || m.sender === "assistant")
        .slice(-6)
        .map((m) => ({ role: m.sender, content: m.text }));

      const res = await askAssistant(query, history);

      const botMsg = {
        sender: "assistant",
        text: res.reply,
        suggestions: res.suggestions || [],
        action: res.action || null,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(res.reply);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    } catch (err) {
      const errorMsg = {
        sender: "assistant",
        text: "⚠️ Sorry, I encountered an issue reaching the AI service. Please check your network connection and try again.",
        suggestions: ["How to self check-in on phone?", "How does 100m geofence work?"],
        action: null,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (link) => {
    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
      setIsOpen(false);
    }
  };

  const handleResetChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages([
      {
        sender: "assistant",
        text: "👋 Conversation reset. How else can I assist you with **UEM ClassVision 2.0** today?",
        suggestions: QUICK_PROMPTS,
        action: null,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // XSS-Safe Markdown-like renderer: Strictly escapes HTML special characters FIRST
  const escapeHtml = (str) => {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const renderFormattedText = (text) => {
    const lines = (text || "").split("\n");
    return lines.map((line, idx) => {
      // 1. First escape all raw HTML so <script>, <img onerror>, etc. become harmless text
      let formatted = escapeHtml(line);

      // 2. Safely transform whitelisted markdown tags
      // Bold **text**
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
      // Italic *text*
      formatted = formatted.replace(/\*([^\*]+)\*/g, '<em class="text-indigo-200">$1</em>');
      // Inline Code `text`
      formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-indigo-300 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');
      // Safe Links [text](url) - only allows relative paths or https:// links
      formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
        const isSafeUrl = url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://");
        const safeHref = isSafeUrl ? url : "#";
        return `<a href="${safeHref}" target="${url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer" class="text-indigo-400 underline font-semibold hover:text-indigo-300">${linkText}</a>`;
      });

      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-gray-300 my-0.5 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatted.replace(/^[•\-]\s*/, "") }}
          />
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p
          key={idx}
          className="text-gray-200 leading-relaxed my-0.5"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <aside aria-label="AI Assistant" className="fixed bottom-5 right-5 z-50 select-none">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-indigo-400/40 shadow-indigo-600/40"
          aria-label="Open UEM ClassVision AI Assistant"
        >
          <div className="relative">
            <Bot size={22} className="text-white group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />
          </div>
          <span className="hidden sm:inline font-semibold text-xs tracking-wide">
            UEM Assistant
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-gray-900 shadow">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Expandable Chat Drawer Window */}
      {isOpen && (
        <div className="card w-[92vw] sm:w-[410px] h-[560px] max-h-[85vh] bg-gray-900 border-indigo-500/40 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 border p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-950/90 via-gray-900 to-purple-950/90 border-b border-gray-800 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/60 flex items-center justify-center text-indigo-300 shrink-0">
                <Sparkles size={16} className="text-indigo-300 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
                    UEM ClassVision AI
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-gray-400">Smart Help & Navigation</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Voice Read Aloud Toggle */}
              <button
                onClick={() => {
                  setTtsEnabled(!ttsEnabled);
                  if (ttsEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  ttsEnabled ? "text-indigo-400 bg-indigo-950/80" : "text-gray-400 hover:text-gray-200"
                }`}
                title={ttsEnabled ? "Disable Voice Read-Aloud" : "Enable Voice Read-Aloud"}
                aria-label="Toggle Voice"
              >
                {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>

              {/* Reset Chat */}
              <button
                onClick={handleResetChat}
                className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
                title="Reset Conversation"
                aria-label="Reset Chat"
              >
                <RefreshCw size={14} />
              </button>

              {/* Minimize / Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                title="Minimize Assistant"
                aria-label="Close Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Navigation Sub-header (Chat vs FAQs) */}
          <div className="flex border-b border-gray-800 bg-gray-950/60 text-xs font-medium">
            <button
              onClick={() => setActiveView("chat")}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeView === "chat"
                  ? "text-indigo-400 border-b-2 border-indigo-500 bg-gray-900/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Bot size={13} />
              <span>Interactive Chat</span>
            </button>
            <button
              onClick={() => setActiveView("faqs")}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                activeView === "faqs"
                  ? "text-indigo-400 border-b-2 border-indigo-500 bg-gray-900/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <HelpCircle size={13} />
              <span>Browse FAQs</span>
            </button>
          </div>

          {/* Body Content */}
          {activeView === "chat" ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                      m.sender === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none"
                        : "bg-gray-800/90 text-gray-200 border border-gray-700/60 rounded-tl-none"
                    }`}
                  >
                    <div className="space-y-1">{renderFormattedText(m.text)}</div>

                    {/* Direct Action Trigger */}
                    {m.action && (
                      <div className="pt-2 mt-2 border-t border-gray-700/60">
                        <button
                          onClick={() => handleActionClick(m.action.link)}
                          className="w-full btn-primary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500"
                        >
                          <span>{m.action.label}</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-gray-500 mt-1 px-1">{m.time}</span>

                  {/* Follow-up Suggestion Chips */}
                  {m.suggestions && m.suggestions.length > 0 && idx === messages.length - 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                      {m.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(sug)}
                          className="text-[11px] bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/60 hover:border-indigo-600 rounded-full px-2.5 py-1 transition-all text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center gap-2 text-gray-400 bg-gray-800/60 border border-gray-700/50 p-2.5 rounded-2xl rounded-tl-none w-24">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* FAQs View */
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
              {faqsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                </div>
              ) : (
                faqs.map((cat, cIdx) => (
                  <div key={cIdx} className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                      {cat.category}
                    </h4>
                    <div className="space-y-1.5">
                      {cat.items.map((item, iIdx) => (
                        <details
                          key={iIdx}
                          className="group bg-gray-950/60 border border-gray-800 rounded-xl overflow-hidden transition-all text-xs"
                        >
                          <summary className="p-2.5 font-medium text-gray-200 cursor-pointer hover:text-indigo-300 list-none flex items-center justify-between gap-2">
                            <span>{item.question}</span>
                            <ChevronDown
                              size={14}
                              className="text-gray-500 group-open:rotate-180 transition-transform shrink-0"
                            />
                          </summary>
                          <div className="p-3 pt-1 text-gray-400 border-t border-gray-800/60 bg-gray-900/40 text-[11px] leading-relaxed">
                            {renderFormattedText(item.answer)}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Input Bar */}
          {activeView === "chat" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 bg-gray-950 border-t border-gray-800 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask ClassVision AI..."
                className="input text-xs py-2 bg-gray-900 flex-1 border-gray-700/80 focus:border-indigo-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shrink-0"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          )}
        </div>
      )}
    </aside>
  );
}
