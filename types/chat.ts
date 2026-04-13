import { AppRole, MessageRole } from './base';
import { ChatConfidence } from './chat-confidence';
import { AgentCase } from './agent';
import { ToolCall, ToolResult } from './tools';
import { SourceReference } from './source-reference';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  sources?: SourceReference[];
  grounded?: boolean;
  confidence?: ChatConfidence;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  satisfaction?: number;
  ownerUserId?: string;
  ownerRole?: AppRole;
  agentCase?: AgentCase;
}

export interface PersistedSessionRecord {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: unknown[];
  satisfaction?: number | null;
  owner_user_id?: string | null;
  owner_role?: AppRole | null;
  agent_case?: Record<string, unknown> | null;
}