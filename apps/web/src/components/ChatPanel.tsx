"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  analysisId: string;
}

export default function ChatPanel({ analysisId }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamingContent = useRef("");

  // Connect WebSocket on mount
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000/ws/chat");
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "start":
          streamingContent.current = "";
          setIsStreaming(true);
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "assistant", content: "" },
          ]);
          break;

        case "chunk":
          streamingContent.current += data.content;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: streamingContent.current };
            }
            return updated;
          });
          break;

        case "end":
          setIsStreaming(false);
          break;

        case "error":
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "assistant", content: `Error: ${data.content}` },
          ]);
          break;
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          wsRef.current = new WebSocket("ws://localhost:4000/ws/chat");
        }
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() === "" || isStreaming) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }]);
    setInput("");

    wsRef.current?.send(
      JSON.stringify({ type: "message", analysisId, content: userMessage })
    );
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl overflow-hidden shadow-2xl border border-indigo-500/20">
      {/* Header */}
      <div className="bg-indigo-600/30 backdrop-blur-sm p-4 border-b border-indigo-500/30 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Sparkles className="text-indigo-300 h-5 w-5" />
          <h2 className="text-white font-medium">AI Assistant</h2>
          <span className="text-indigo-300/60 text-xs">— knows your entire codebase</span>
        </div>
        <button
          onClick={clearChat}
          className="text-indigo-200 hover:text-white transition-colors"
          title="Clear chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages container */}
      <div className="p-4 h-[calc(100%-132px)] overflow-y-auto bg-slate-900/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-12 w-12 text-indigo-400 mb-4" />
            <h3 className="text-indigo-200 text-xl mb-2">Ask about this codebase</h3>
            <p className="text-slate-400 text-sm max-w-xs mb-6">
              I have full context of the repository. Ask me anything!
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {[
                "How does auth work?",
                "What's the entry point?",
                "Explain the data flow",
                "What patterns are used?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-700/60 text-slate-100 rounded-tl-none border border-slate-600/50"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-slate-800 [&_pre]:p-3 [&_pre]:rounded-lg">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || "..."}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-2xl bg-slate-700/60 text-slate-100 rounded-tl-none border border-slate-600/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className={`p-4 border-t ${isFocused ? "border-indigo-500/70 bg-slate-800/80" : "border-slate-700/50 bg-slate-800/30"} transition-colors duration-200`}
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask about the codebase..."
            disabled={isStreaming}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-full py-3 pl-4 pr-12 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={input.trim() === "" || isStreaming}
            className={`absolute right-1 rounded-full p-2 ${
              input.trim() === "" || isStreaming
                ? "text-slate-500 bg-slate-700/50 cursor-not-allowed"
                : "text-white bg-indigo-600 hover:bg-indigo-500"
            } transition-colors`}
          >
            {isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
