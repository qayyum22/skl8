import type {
  AgentCase,
  AgentSeverity,
  ChatSession,
  Message,
  PersistedSessionRecord,
  SupportCategory,
} from "@/types";

export const MAX_SESSIONS = 30;

export function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function makeTitle(messages: Message[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "New Support Request";
  const text = firstUser.content.trim();
  return text.length > 52 ? `${text.slice(0, 49)}...` : text;
}

export function computeSatisfaction(messages: Message[]): number | undefined {
  const rated = messages.filter((message) => message.rating !== undefined);
  if (rated.length === 0) return undefined;
  return rated.reduce((sum, message) => sum + (message.rating ?? 0), 0) / rated.length;
}

export function deriveSentiment(messages: Message[]) {
  const transcript = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase())
    .join(" ");

  if (/(angry|frustrated|urgent|ridiculous|unacceptable|escalate now|complaint)/.test(transcript)) {
    return "frustrated" as const;
  }

  if (/(fee|payment|certificate|not working|login|unable|issue|problem|help)/.test(transcript)) {
    return "concerned" as const;
  }

  return "calm" as const;
}

export function deriveCategory(messages: Message[]): SupportCategory {
  const transcript = messages.map((message) => message.content.toLowerCase()).join(" ");

  if (/(login|password|portal|lms|course access|course visible|access)/.test(transcript)) return "login_access";
  if (/(course|module|class link|content|recording|session)/.test(transcript)) return "course_access";
  if (/(schedule|batch|timetable|timing|calendar)/.test(transcript)) return "schedule";
  if (/(fee|payment|invoice|receipt|charged|billing)/.test(transcript)) return "fees";
  if (/(certificate|completion|bonafide|grade report|letter)/.test(transcript)) return "certificate";
  if (/(enrollment|admission|application|registration)/.test(transcript)) return "enrollment";
  return "general";
}

export function deriveSeverity(messages: Message[], category: SupportCategory): AgentSeverity {
  const transcript = messages.map((message) => message.content.toLowerCase()).join(" ");
  const escalated = messages.some((message) =>
    message.toolResults?.some((result) => result.name === "connect_human_agent")
  );

  if (/(urgent|asap|payment deducted|fraud|legal|certificate deadline|exam today)/.test(transcript)) {
    return "urgent";
  }

  if (escalated || category === "fees" || category === "certificate") {
    return "high";
  }

  if (category === "login_access" || category === "course_access" || category === "enrollment") {
    return "medium";
  }

  return "low";
}

export function deriveRequiresHuman(messages: Message[]) {
  const transcript = messages.map((message) => message.content.toLowerCase()).join(" ");

  return (
    messages.some((message) =>
      message.toolResults?.some((result) => result.name === "connect_human_agent")
    ) || /(human agent|representative|supervisor|complaint|escalate)/.test(transcript)
  );
}

export function buildAgentCase(messages: Message[], existing?: AgentCase): AgentCase {
  const firstUser = messages.find((message) => message.role === "user");
  const category = existing?.category ?? deriveCategory(messages);
  const hasAgentReply = messages.some((message) => message.role === "assistant" && !message.isStreaming);
  const summary = firstUser?.content.trim() || "Learner follow-up needed";

  return {
    category,
    severity: existing?.severity ?? deriveSeverity(messages, category),
    status: existing?.status ?? "new",
    summary: summary.length > 140 ? `${summary.slice(0, 137)}...` : summary,
    assignedTo: existing?.assignedTo,
    resolutionNotes: existing?.resolutionNotes,
    requiresHuman: deriveRequiresHuman(messages),
    escalated: existing?.escalated ?? deriveRequiresHuman(messages),
    customerSentiment: deriveSentiment(messages),
    firstResponseAt: existing?.firstResponseAt ?? (hasAgentReply ? new Date() : undefined),
    resolvedAt: existing?.resolvedAt,
    lastUpdated: existing?.lastUpdated ? new Date(existing.lastUpdated) : new Date(),
  };
}

export function reviveSession(session: ChatSession | PersistedSessionRecord): ChatSession {
  const source = session as PersistedSessionRecord;
  const messages = (Array.isArray(source.messages) ? source.messages : (session as ChatSession).messages) as Message[];
  const createdAt = "created_at" in source ? new Date(source.created_at) : new Date((session as ChatSession).createdAt);
  const updatedAt = "updated_at" in source ? new Date(source.updated_at) : new Date((session as ChatSession).updatedAt);
  const rawAgentCase = ("agent_case" in source ? source.agent_case : (session as ChatSession).agentCase) as AgentCase | undefined;

  return {
    id: source.id,
    title: source.title,
    createdAt,
    updatedAt,
    messages: messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    })),
    satisfaction:
      typeof source.satisfaction === "number"
        ? source.satisfaction
        : typeof (session as ChatSession).satisfaction === "number"
          ? (session as ChatSession).satisfaction
          : undefined,
    ownerUserId: ("owner_user_id" in source ? source.owner_user_id : (session as ChatSession).ownerUserId) ?? undefined,
    ownerRole: ("owner_role" in source ? source.owner_role : (session as ChatSession).ownerRole) ?? undefined,
    agentCase: rawAgentCase
      ? {
          ...rawAgentCase,
          firstResponseAt: rawAgentCase.firstResponseAt ? new Date(rawAgentCase.firstResponseAt) : undefined,
          resolvedAt: rawAgentCase.resolvedAt ? new Date(rawAgentCase.resolvedAt) : undefined,
          lastUpdated: new Date(rawAgentCase.lastUpdated),
        }
      : undefined,
  };
}

export function serializeSession(session: ChatSession): PersistedSessionRecord {
  return {
    id: session.id,
    title: session.title,
    created_at: session.createdAt.toISOString(),
    updated_at: session.updatedAt.toISOString(),
    messages: session.messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    })),
    satisfaction: session.satisfaction ?? null,
    owner_user_id: session.ownerUserId ?? null,
    owner_role: session.ownerRole ?? null,
    agent_case: session.agentCase
      ? {
          ...session.agentCase,
          firstResponseAt: session.agentCase.firstResponseAt?.toISOString(),
          resolvedAt: session.agentCase.resolvedAt?.toISOString(),
          lastUpdated: session.agentCase.lastUpdated.toISOString(),
        }
      : null,
  };
}

function createSeedMessage(id: string, role: Message["role"], content: string, minutesAgo: number, rating?: 1 | 2 | 3 | 4 | 5): Message {
  return {
    id,
    role,
    content,
    timestamp: new Date(Date.now() - minutesAgo * 60_000),
    ...(rating ? { rating } : {}),
  };
}

export function createSeedSessions(): ChatSession[] {
  const seeds: ChatSession[] = [
    {
      id: "seed-login",
      title: "Cannot access learner portal after password reset",
      createdAt: new Date(Date.now() - 180 * 60_000),
      updatedAt: new Date(Date.now() - 35 * 60_000),
      ownerRole: "customer",
      messages: [
        createSeedMessage("m1", "assistant", "Hello! I can help with portal and LMS issues. What seems to be happening?", 180),
        createSeedMessage("m2", "user", "I reset my password but I still cannot access my learner portal for the Data Analytics bootcamp.", 177),
        createSeedMessage("m3", "assistant", "I am checking your access profile and LMS troubleshooting options now.", 175),
        createSeedMessage("m4", "assistant", "I can confirm your enrollment is active. Please try signing in again in an incognito window. If it still fails, I can escalate it.", 170),
        createSeedMessage("m5", "user", "It still fails and class starts tonight.", 165),
      ],
      satisfaction: 3,
      agentCase: {
        category: "login_access",
        severity: "urgent",
        status: "working",
        summary: "Learner locked out of portal after password reset before class start.",
        assignedTo: "Jordan Support",
        resolutionNotes: "Waiting on LMS admin to unlock SSO account before 7 PM class.",
        requiresHuman: true,
        escalated: true,
        customerSentiment: "frustrated",
        firstResponseAt: new Date(Date.now() - 175 * 60_000),
        lastUpdated: new Date(Date.now() - 35 * 60_000),
      },
    },
    {
      id: "seed-fee",
      title: "Payment deducted but fee not reflected",
      createdAt: new Date(Date.now() - 420 * 60_000),
      updatedAt: new Date(Date.now() - 90 * 60_000),
      ownerRole: "customer",
      messages: [
        createSeedMessage("f1", "assistant", "Hello! I can help with fee receipts and payment issues.", 420),
        createSeedMessage("f2", "user", "My installment payment was deducted but it is still showing unpaid in the portal.", 415),
        createSeedMessage("f3", "assistant", "I have logged your payment issue with finance and shared the expected review window.", 405),
        createSeedMessage("f4", "assistant", "Finance confirmed the payment and updated your invoice status. Your receipt is now available.", 110, 5),
      ],
      satisfaction: 5,
      agentCase: {
        category: "fees",
        severity: "high",
        status: "resolved",
        summary: "Payment deducted but installment remained unpaid until finance reconciliation.",
        assignedTo: "Priya Support",
        resolutionNotes: "Resolved after finance mapped UPI reference to invoice INV-401.",
        requiresHuman: true,
        escalated: true,
        customerSentiment: "concerned",
        firstResponseAt: new Date(Date.now() - 405 * 60_000),
        resolvedAt: new Date(Date.now() - 110 * 60_000),
        lastUpdated: new Date(Date.now() - 110 * 60_000),
      },
    },
    {
      id: "seed-certificate",
      title: "Need internship letter before employer deadline",
      createdAt: new Date(Date.now() - 260 * 60_000),
      updatedAt: new Date(Date.now() - 50 * 60_000),
      ownerRole: "customer",
      messages: [
        createSeedMessage("c1", "assistant", "Hello! I can help with completion letters and certificate requests.", 260),
        createSeedMessage("c2", "user", "I need my internship letter emailed today for an employer submission deadline.", 255),
        createSeedMessage("c3", "assistant", "I have prepared the request and escalated it with urgent priority for the learner success desk.", 250),
      ],
      agentCase: {
        category: "certificate",
        severity: "urgent",
        status: "waiting",
        summary: "Urgent internship letter requested for same-day employer submission.",
        assignedTo: "Omar Support",
        resolutionNotes: "Awaiting program lead approval for internship letter wording.",
        requiresHuman: true,
        escalated: true,
        customerSentiment: "concerned",
        firstResponseAt: new Date(Date.now() - 250 * 60_000),
        lastUpdated: new Date(Date.now() - 50 * 60_000),
      },
    },
    {
      id: "seed-schedule",
      title: "Need weekend batch timetable",
      createdAt: new Date(Date.now() - 80 * 60_000),
      updatedAt: new Date(Date.now() - 22 * 60_000),
      ownerRole: "customer",
      messages: [
        createSeedMessage("s1", "assistant", "Hello! I can help with your batch schedule and upcoming sessions.", 80),
        createSeedMessage("s2", "user", "Please share the weekend batch timetable for Full Stack Development.", 75),
        createSeedMessage("s3", "assistant", "I found your batch schedule and next live session timing.", 72, 4),
      ],
      satisfaction: 4,
      agentCase: {
        category: "schedule",
        severity: "low",
        status: "resolved",
        summary: "Learner requested weekend batch timetable and next live session timing.",
        assignedTo: "You",
        resolutionNotes: "Shared Sat-Sun 10 AM to 1 PM schedule and mentor contact.",
        requiresHuman: false,
        escalated: false,
        customerSentiment: "calm",
        firstResponseAt: new Date(Date.now() - 72 * 60_000),
        resolvedAt: new Date(Date.now() - 72 * 60_000),
        lastUpdated: new Date(Date.now() - 22 * 60_000),
      },
    },
  ];

  return seeds.map((session) => ({
    ...session,
    title: makeTitle(session.messages),
    satisfaction: session.satisfaction ?? computeSatisfaction(session.messages),
    agentCase: buildAgentCase(session.messages, session.agentCase),
  }));
}
