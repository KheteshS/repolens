"use client";

import { useState, useRef, useEffect } from "react";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingContent = useRef("");

  // Connect WebSocket on mount
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000/ws/chat");
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "start":
          // Start collecting streaming response
          streamingContent.current = "";
          setIsStreaming(true);
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "assistant", content: "" },
          ]);
          break;

        case "chunk":
          // Append chunk to last message
          streamingContent.current += data.content;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: streamingContent.current,
              };
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
            {
              id: Date.now().toString(),
              role: "assistant",
              content: `Error: ${data.content}`,
            },
          ]);
          break;
      }
    };

    ws.onclose = () => {
      // Reconnect after 3s if closed unexpectedly
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Send to WebSocket
    wsRef.current?.send(
      JSON.stringify({ type: "message", analysisId, content: input.trim() }),
    );

    setInput("");
  }

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-lg overflow-hidden">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <h3 className="text-sm font-medium text-foreground">
          Ask about this codebase
        </h3>
        <p className="text-xs text-muted-foreground">
          AI knows the full repo context
        </p>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            <p className="mb-2">Ask anything about the codebase:</p>
            <div className="flex flex-col gap-1.5 text-xs">
              <span className="italic">"How does authentication work?"</span>
              <span className="italic">"What's the entry point?"</span>
              <span className="italic">"Explain the data flow"</span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Thinking...
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-border bg-card flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the codebase..."
          disabled={isStreaming}
          className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground
  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90
  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
