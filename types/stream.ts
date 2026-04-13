import { MessageRole } from './base';
import { ToolCall, ToolResult } from './tools';
import { SourceReference } from './source-reference';
import { ChatConfidence } from './chat-confidence';

export type StreamEvent =
  | { type: "tool_start"; toolName: string; toolCallId: string; input: Record<string, unknown> }
  | { type: "tool_done"; toolCallId: string; name: string; result: unknown; status: "success" | "error" }
  | { type: "text_delta"; delta: string }
  | { type: "done"; toolResults: ToolResult[]; sources?: SourceReference[]; grounded?: boolean; confidence?: ChatConfidence }
  | { type: "error"; message: string };

export interface ChatRequest {
  messages: { role: MessageRole; content: string }[];
}

export interface ChatResponse {
  message: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  sources?: SourceReference[];
  grounded?: boolean;
  confidence?: ChatConfidence;
}