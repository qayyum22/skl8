"use client";

import { Bot, User, Star } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/types";
import { ToolResultCard } from "./ToolResultCard";
import { LiveToolActivity, type LiveTool } from "./LiveToolActivity";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent-light/60"></span>
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent-light/60"></span>
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent-light/60"></span>
    </div>
  );
}

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      '<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-accent-light">$1</code>'
    )
    .replace(/^### (.+)$/gm, '<p class="mb-1 mt-2 font-semibold text-text">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="mb-1 mt-2 font-semibold text-text">$1</p>')
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-1 space-y-0.5">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, "<br/>");
}

interface Props {
  message: Message;
  liveTools?: LiveTool[];
  onRate?: (rating: 1 | 2 | 3 | 4 | 5) => void;
}

function StarRating({ current, onRate }: { current?: number; onRate: (rating: 1 | 2 | 3 | 4 | 5) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {([1, 2, 3, 4, 5] as const).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="rounded-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          title={`Rate ${star}/5`}
        >
          <Star
            size={12}
            className={star <= (hover || current || 0) ? "fill-warning text-warning" : "text-muted"}
          />
        </button>
      ))}
    </div>
  );
}

export function MessageBubble({ message, liveTools = [], onRate }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="message-appear flex justify-end gap-3">
        <div className="max-w-[82%] sm:max-w-[75%]">
          <div className="rounded-2xl rounded-tr-sm bg-accent px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
            {message.content}
          </div>
          <p className="mt-1 pr-1 text-right text-xs text-subtle">{formatTime(message.timestamp)}</p>
        </div>
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          <User size={14} className="text-subtle" />
        </div>
      </div>
    );
  }

  const showTyping = message.isStreaming && !message.content && liveTools.length === 0;

  return (
    <div className="message-appear flex gap-3">
      <div className="glow-accent mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
        <Bot size={14} className="text-accent-light" />
      </div>
      <div className="max-w-[90%] flex-1 space-y-2 sm:max-w-[80%]">
        {liveTools.length > 0 && <LiveToolActivity tools={liveTools} />}

        {(message.content || showTyping) && (
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm">
            {showTyping ? (
              <TypingIndicator />
            ) : (
              <div
                className="text-sm leading-relaxed text-text"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
              />
            )}
          </div>
        )}

        {message.toolResults && message.toolResults.length > 0 && (
          <div className="space-y-2 pl-1">
            {message.toolResults.map((result) => (
              <ToolResultCard key={result.toolCallId} result={result} />
            ))}
          </div>
        )}

        {!message.isStreaming && (
          <div className="flex items-center gap-3 pl-1">
            <p className="text-xs text-subtle">{formatTime(message.timestamp)}</p>
            {onRate && <StarRating current={message.rating} onRate={onRate} />}
            {message.rating && (
              <span className="text-[10px] text-subtle/60">
                {message.rating === 5 ? "Thanks!" : message.rating >= 3 ? "Noted" : "We will improve"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
