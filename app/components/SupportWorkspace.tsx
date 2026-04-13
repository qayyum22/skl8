"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  GraduationCap,
  Loader2,
  PanelLeftOpen,
  Send,
  ShieldQuestion,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { Message, PaymentHelpFormData, PaymentIssueType, PaymentVerificationResult, SupportCategory, ToolResult, StreamEvent } from "@/types";
import type { LiveTool } from "./LiveToolActivity";
import { AuthStatus } from "./AuthStatus";
import { MessageBubble } from "./MessageBubble";
import { HistorySidebar } from "./HistorySidebar";
import { PaymentHelpCard } from "./PaymentHelpCard";
import { useSessions } from "@/hooks/useSessions";

interface Props {
  mode: "page" | "widget";
  onClose?: () => void;
}

type GuideAction = {
  label: string;
  prompt?: string;
  tone?: "primary" | "secondary";
  behavior?: "send" | "resolve";
  confirmation?: string;
};

type QuickAction = {
  label: string;
  description: string;
  prompt: string;
  category: SupportCategory;
  icon: React.ElementType;
  guide?: {
    title: string;
    context?: string;
    steps: string[];
    checks?: string[];
    actions: GuideAction[];
  };
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Login Help",
    description: "Portal sign-in, password reset, and LMS access support.",
    prompt: "I need help with my learner portal login.",
    category: "login_access",
    icon: ShieldQuestion,
    guide: {
      title: "Login and LMS access checklist",
      context: "Use these steps before we escalate your access issue to learner support.",
      steps: [
        "Confirm you are using your registered learner email, not a personal backup address.",
        "Open the learner portal in a private/incognito window to clear stale sessions.",
        "Use password reset once, then wait a few minutes before trying the new password.",
      ],
      checks: [
        "Student ID or registered email ready",
        "Exact error message or screenshot if the issue continues",
      ],
      actions: [
        { label: "This fixed my login", tone: "primary", behavior: "resolve", confirmation: "Glad that resolved your login issue. If anything else comes up, I am here to help." },
        { label: "Still blocked", prompt: "I still cannot access my learner portal after trying the login troubleshooting steps. Please escalate it." },
      ],
    },
  },
  {
    label: "Course Access",
    description: "Missing modules, class links, or course visibility issues.",
    prompt: "My course or class link is not visible in the LMS.",
    category: "course_access",
    icon: BookOpen,
    guide: {
      title: "Course visibility troubleshooting",
      context: "These checks usually solve delayed LMS sync and missing class-link problems.",
      steps: [
        "Log out of the LMS and sign back in from the learner portal dashboard.",
        "Wait 15 minutes if your enrollment, batch assignment, or payment was updated recently.",
        "Check whether your batch start date has begun and whether the class link has been published for the day.",
      ],
      checks: [
        "Course or batch name ready",
        "Date/time of the missing class or module ready",
      ],
      actions: [
        { label: "Course is visible now", tone: "primary", behavior: "resolve", confirmation: "Great, your course access is back. You can continue here any time if something else is missing." },
        { label: "Still missing", prompt: "I still cannot see my course or class link after troubleshooting. Please help further." },
      ],
    },
  },
  {
    label: "Schedule",
    description: "Batch timings, upcoming sessions, and mentor schedules.",
    prompt: "I need my batch schedule and next class details.",
    category: "schedule",
    icon: CalendarDays,
    guide: {
      title: "Schedule readiness check",
      context: "We can fetch your timetable faster if you have the right batch details handy.",
      steps: [
        "Confirm your program name and whether you are in a weekday or weekend batch.",
        "Check if you need only the next session or the full weekly timetable.",
        "If your batch was recently changed, mention both the old and new batch names.",
      ],
      checks: [
        "Batch ID or program name ready",
        "Whether you need mentor contact or only timings",
      ],
      actions: [
        { label: "Share my schedule", prompt: "I am ready. Please share my current batch schedule and next class details.", tone: "primary" },
        { label: "My batch changed", prompt: "My batch may have changed recently and I need the latest schedule confirmation." },
      ],
    },
  },
  {
    label: "Fees & Payments",
    description: "Receipts, pending dues, payment failures, and fee issues.",
    prompt: "I have a payment or fee issue with my training program.",
    category: "fees",
    icon: CreditCard,
    guide: {
      title: "Payment issue checklist",
      context: "Fee issues are resolved fastest when the right transaction details are included up front.",
      steps: [
        "Keep your invoice ID, payment reference, or transaction screenshot ready.",
        "Confirm whether the amount was deducted, partially processed, or only missing from the portal.",
        "If you need a receipt, confirm the email address where it should be delivered.",
      ],
      checks: [
        "Invoice or transaction reference available",
        "Date and amount of the payment available",
      ],
      actions: [
        { label: "I only need a receipt", prompt: "I reviewed the payment checklist and only need a receipt copy now.", tone: "primary" },
        { label: "Payment still not reflected", prompt: "My payment issue is still unresolved after reviewing the checklist. Please investigate it." },
      ],
    },
  },
  {
    label: "Certificates",
    description: "Completion letter, bonafide, internship, or grade report requests.",
    prompt: "I need help getting my completion certificate or learner letter.",
    category: "certificate",
    icon: GraduationCap,
    guide: {
      title: "Certificate request prep",
      context: "We can process document requests faster if you tell us the exact document type and deadline.",
      steps: [
        "Confirm whether you need a completion certificate, bonafide letter, internship letter, or grade report.",
        "Mention your submission deadline if this is for an employer, university, or visa application.",
        "Decide whether email delivery is enough or if you need a portal download copy too.",
      ],
      checks: [
        "Document type ready",
        "Deadline or submission purpose ready",
      ],
      actions: [
        { label: "Request my document", prompt: "I am ready. Please help me request my learner certificate or official letter.", tone: "primary" },
        { label: "Need urgent certificate help", prompt: "I need an urgent learner certificate or official letter before my deadline. Please escalate it." },
      ],
    },
  },
  {
    label: "Talk to Support",
    description: "Connect to a human learner support specialist.",
    prompt: "I want to talk to a human support specialist.",
    category: "general",
    icon: UserRoundCheck,
  },
];

const PAYMENT_ISSUE_LABELS: Record<PaymentIssueType, string> = {
  failed_payment: "Failed payment",
  duplicate_charge: "Duplicate charge",
  payment_not_reflected: "Payment not reflected",
  receipt_request: "Receipt request",
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I am **Nova**, your training-center support assistant. I can help with login access, course visibility, schedules, enrollment, fees, and certificates.\n\nTell me what you need, or choose one of the quick help topics below.",
  timestamp: new Date(),
};

function generateId() {
  return Math.random().toString(36).slice(2);
}

function isGreeting(text: string) {
  return /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(text.trim());
}

function isDesktopViewport() {
  return typeof window !== "undefined" && window.innerWidth >= 1024;
}

function isWelcomeMessageRecord(message: Message) {
  return message.role === "assistant" && message.content === WELCOME_MESSAGE.content;
}

function formatGuideMessage(guide: NonNullable<QuickAction["guide"]>) {
  const steps = guide.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const checks = guide.checks?.length
    ? `\n\nHave these ready:\n${guide.checks.map((check) => `- ${check}`).join("\n")}`
    : "";

  return `**${guide.title}**${guide.context ? `\n\n${guide.context}` : ""}\n\n${steps}${checks}`;
}

function formatPaymentSupportMessage(payload: PaymentHelpFormData, verification?: PaymentVerificationResult) {
  const details = [
    `Payment support flow started.`,
    `- Issue type: ${PAYMENT_ISSUE_LABELS[payload.issueType]}`,
    `- Learner ID: ${payload.learnerId}`,
    `- Invoice ID: ${payload.invoiceId}`,
    `- Payment reference: ${payload.paymentReference}`,
  ];

  if (verification) {
    details.push(`- Verified status: ${verification.status}`);
    details.push(`- Verified amount: INR ${verification.amount}`);
  }

  return details.join("\n");
}

export function SupportWorkspace({ mode, onClose }: Props) {
  const { sessions, activeSession, activeId, createSession, updateSession, switchSession, rateMessage } = useSessions();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveTools, setLiveTools] = useState<LiveTool[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(mode === "page");
  const [activeGuide, setActiveGuide] = useState<QuickAction["guide"] | null>(null);
  const [showPaymentHelp, setShowPaymentHelp] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncedSessionIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([WELCOME_MESSAGE]);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const appendTranscriptMessages = useCallback(
    (newMessages: Message[]) => {
      if (newMessages.length === 0) return null;

      const currentActiveId = activeIdRef.current;
      if (!currentActiveId) {
        const initialMessages = [WELCOME_MESSAGE, ...newMessages];
        const session = createSession(initialMessages);
        syncedSessionIdRef.current = session.id;
        activeIdRef.current = session.id;
        messagesRef.current = initialMessages;
        setMessages(initialMessages);
        return session.id;
      }

      const nextMessages = [...messagesRef.current, ...newMessages];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      updateSession(currentActiveId, nextMessages);
      return currentActiveId;
    },
    [createSession, updateSession]
  );


  useEffect(() => {
    if (!activeId) {
      syncedSessionIdRef.current = null;
      activeIdRef.current = null;
      messagesRef.current = [WELCOME_MESSAGE];
      setMessages([WELCOME_MESSAGE]);
      return;
    }

    if (!activeSession || syncedSessionIdRef.current === activeId) {
      return;
    }

    syncedSessionIdRef.current = activeId;
    activeIdRef.current = activeId;
    const nextMessages = activeSession.messages.length > 0 ? activeSession.messages : [WELCOME_MESSAGE];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
  }, [activeId, activeSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTools, activeGuide, showPaymentHelp]);

  const startNewSession = useCallback(() => {
    const initialMessages = [WELCOME_MESSAGE];
    const session = createSession(initialMessages);
    syncedSessionIdRef.current = session.id;
    activeIdRef.current = session.id;
    messagesRef.current = initialMessages;
    setMessages(initialMessages);
    setInput("");
    setLiveTools([]);
    setStreamingId(null);
    setActiveGuide(null);
    setShowPaymentHelp(false);
    setShowHistory((current) => (mode === "page" ? (isDesktopViewport() ? current : false) : current));
    return session;
  }, [createSession, mode]);

  const handleSwitchSession = (id: string) => {
    switchSession(id);
    setShowHistory((current) => (isDesktopViewport() ? current : false));
    setLiveTools([]);
    setStreamingId(null);
    setIsLoading(false);
    setActiveGuide(null);
    setShowPaymentHelp(false);
  };

  const sendMessage = useCallback(
    async (text: string, sessionOverrideId?: string, baseMessagesOverride?: Message[]) => {
      if (!text.trim() || isLoading) return;

      let sessionId = sessionOverrideId ?? activeIdRef.current;
      let baseMessages = baseMessagesOverride ?? messagesRef.current;

      if (!sessionId) {
        const initialMessages = baseMessages.length > 0 ? baseMessages : [WELCOME_MESSAGE];
        const session = createSession(initialMessages);
        sessionId = session.id;
        syncedSessionIdRef.current = session.id;
        activeIdRef.current = session.id;
        messagesRef.current = initialMessages;
        setMessages(initialMessages);
        baseMessages = initialMessages;
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };
      const assistantId = generateId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      const pendingMessages = [...baseMessages, userMsg, assistantMsg];
      messagesRef.current = pendingMessages;
      setMessages(pendingMessages);
      updateSession(sessionId, pendingMessages);
      setStreamingId(assistantId);
      setInput("");
      setIsLoading(true);
      setLiveTools([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      const history = pendingMessages
        .filter((message) => !message.isStreaming && !isWelcomeMessageRecord(message) && message.role !== "system")
        .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!response.ok) throw new Error("Request failed");
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        let finalToolResults: ToolResult[] = [];
        let finalSources = undefined as Message["sources"] | undefined;
        let finalGrounded = undefined as Message["grounded"] | undefined;
        let finalConfidence = undefined as Message["confidence"] | undefined;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as StreamEvent;
              if (event.type === "text_delta") {
                accumulatedText += event.delta;
                setMessages((prev) => {
                  const nextMessages = prev.map((message) =>
                    message.id === assistantId ? { ...message, content: accumulatedText } : message
                  );
                  messagesRef.current = nextMessages;
                  return nextMessages;
                });
              } else if (event.type === "tool_start") {
                setLiveTools((prev) => [...prev, { toolCallId: event.toolCallId, name: event.toolName, status: "running" }]);
              } else if (event.type === "tool_done") {
                setLiveTools((prev) => prev.map((tool) => (tool.toolCallId === event.toolCallId ? { ...tool, status: event.status } : tool)));
              } else if (event.type === "done") {
                finalToolResults = event.toolResults as ToolResult[];
                finalSources = event.sources;
                finalGrounded = event.grounded;
                finalConfidence = event.confidence;
              } else if (event.type === "error") {
                throw new Error(event.message);
              }
            } catch {
              // Ignore malformed event chunks and continue streaming.
            }
          }
        }

        setMessages((prev) => {
          const nextMessages = prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: accumulatedText || "I am sorry, I could not process that request.",
                  toolResults: finalToolResults,
                  sources: finalSources,
                  grounded: finalGrounded,
                  confidence: finalConfidence,
                  isStreaming: false,
                }
              : message
          );
          messagesRef.current = nextMessages;
          updateSession(sessionId, nextMessages);
          return nextMessages;
        });
        setTimeout(() => setLiveTools([]), 1200);
      } catch {
        setMessages((prev) => {
          const nextMessages = prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: "I am having trouble connecting right now. Please try again in a moment.",
                  isStreaming: false,
                }
              : message
          );
          messagesRef.current = nextMessages;
          updateSession(sessionId, nextMessages);
          return nextMessages;
        });
        setLiveTools([]);
      } finally {
        setIsLoading(false);
        setStreamingId(null);
      }
    },
    [createSession, isLoading, updateSession]
  );

  const showFaqChips = useMemo(() => {
    const firstUserMessage = messages.find((message) => message.role === "user")?.content;
    return !firstUserMessage || isGreeting(firstUserMessage);
  }, [messages]);

  const handleAction = (action: QuickAction) => {
    const selectedTopicMessage: Message = {
      id: generateId(),
      role: "user",
      content: `Selected popular help topic: ${action.label}`,
      timestamp: new Date(),
    };

    const guideMessage = action.guide
      ? {
          id: generateId(),
          role: "assistant" as const,
          content: formatGuideMessage(action.guide),
          timestamp: new Date(),
        }
      : null;

    const currentActiveId = activeIdRef.current;
    const currentMessages = messagesRef.current;
    const nextMessages = guideMessage
      ? [...currentMessages, selectedTopicMessage, guideMessage]
      : [...currentMessages, selectedTopicMessage];

    let sessionIdForFollowup = currentActiveId;
    if (!currentActiveId) {
      const session = createSession(nextMessages);
      sessionIdForFollowup = session.id;
      syncedSessionIdRef.current = session.id;
      activeIdRef.current = session.id;
    } else {
      updateSession(currentActiveId, nextMessages);
    }

    messagesRef.current = nextMessages;
    setMessages(nextMessages);

    if (action.guide) {
      setActiveGuide(action.guide);
    } else {
      setActiveGuide(null);
    }

    if (action.category === "fees") {
      setShowPaymentHelp(true);
      return;
    }

    setShowPaymentHelp(false);
    if (!action.guide) {
      void sendMessage(action.prompt, sessionIdForFollowup ?? undefined, nextMessages);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };
  const handleGuideAction = (action: GuideAction) => {
    const actionMessage: Message = {
      id: generateId(),
      role: "user",
      content: `Selected guide action: ${action.label}`,
      timestamp: new Date(),
    };

    if (action.behavior === "resolve") {
      const confirmationMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: action.confirmation ?? "Happy to hear that solved it.",
        timestamp: new Date(),
      };
      appendTranscriptMessages([actionMessage, confirmationMessage]);
      setActiveGuide(null);
      return;
    }

    if (action.prompt) {
      const sessionId = appendTranscriptMessages([actionMessage]);
      const baseMessages = [...messagesRef.current];
      setActiveGuide(null);
      void sendMessage(action.prompt, sessionId ?? undefined, baseMessages);
    }
  };

  const handlePaymentHelpVerify = async (payload: PaymentHelpFormData) => {
    appendTranscriptMessages([
      {
        id: generateId(),
        role: "user",
        content: formatPaymentSupportMessage(payload),
        timestamp: new Date(),
      },
      {
        id: generateId(),
        role: "assistant",
        content: "I am verifying the payment details you entered now.",
        timestamp: new Date(),
      },
    ]);

    const response = await fetch("/api/payment-help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", payload }),
    });

    const result = (await response.json()) as { verification?: PaymentVerificationResult; error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "Payment verification failed");
    }

    if (!result.verification) {
      throw new Error("Missing verification result");
    }

    appendTranscriptMessages([
      {
        id: generateId(),
        role: "assistant",
        content: formatPaymentSupportMessage(payload, result.verification),
        timestamp: new Date(),
      },
    ]);

    return result.verification;
  };

  const handlePaymentHelpSubmit = async (payload: PaymentHelpFormData, verification: PaymentVerificationResult) => {
    const issueLabel = PAYMENT_ISSUE_LABELS[payload.issueType];
    const userSummary = [
      `I need help with a payment issue.`,
      `- Issue type: ${issueLabel}`,
      `- Learner ID: ${verification.learnerId}`,
      `- Invoice ID: ${verification.invoiceId}`,
      `- Payment reference: ${verification.paymentReference}`,
      `- Verified amount: INR ${verification.amount}`,
      `- Verified payment date: ${verification.paymentDate}`,
      `- Verification status: ${verification.status}`,
    ].join("\n");

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: userSummary,
      timestamp: new Date(),
    };

    let sessionId = activeIdRef.current;
    if (!sessionId) {
      const sessionMessages = [WELCOME_MESSAGE, userMessage];
      const session = createSession(sessionMessages);
      sessionId = session.id;
      syncedSessionIdRef.current = session.id;
      activeIdRef.current = session.id;
      messagesRef.current = sessionMessages;
      setMessages(sessionMessages);
    } else {
      const nextMessages = [...messagesRef.current, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      updateSession(sessionId, nextMessages);
    }

    setShowPaymentHelp(false);
    setIsSubmittingPayment(true);

    try {
      const response = await fetch("/api/payment-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", sessionId, payload, verification }),
      });

      if (!response.ok) {
        throw new Error("Payment request failed");
      }

      const result = (await response.json()) as { message?: string; warning?: string };
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: result.warning
          ? `${result.message ?? "Your payment request has been logged."}

Note: I saved this in demo mode because live payment storage is not available right now.`
          : (result.message ?? "Your payment request has been logged and shared with learner finance support."),
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const nextMessages = [...prev, assistantMessage];
        messagesRef.current = nextMessages;
        if (sessionId) {
          updateSession(sessionId, nextMessages);
        }
        return nextMessages;
      });
    } catch {
      const fallbackMessage: Message = {
        id: generateId(),
        role: "assistant",
        content:
          "I logged your payment request in the demo support flow. A finance specialist should review the verified invoice and payment reference shortly.",
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const nextMessages = [...prev, fallbackMessage];
        messagesRef.current = nextMessages;
        if (sessionId) {
          updateSession(sessionId, nextMessages);
        }
        return nextMessages;
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const containerClass = mode === "page" ? "flex h-full min-h-0 overflow-hidden bg-ink text-text" : "flex h-full min-h-0 flex-col overflow-hidden rounded-[inherit] bg-card text-text";

  return (
    <div className={containerClass}>
      {mode === "page" && (
        <>
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            aria-label="Close history sidebar"
            className={`fixed inset-0 z-30 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${showHistory ? "opacity-100" : "pointer-events-none opacity-0"}`}
          />
          <div
            className={`fixed inset-y-0 left-0 z-40 w-[min(88vw,320px)] overflow-hidden transition-[transform,width,opacity] duration-300 ${showHistory ? "translate-x-0" : "-translate-x-full"} lg:relative lg:inset-auto lg:translate-x-0 lg:flex-shrink-0 ${showHistory ? "lg:w-[320px] lg:opacity-100" : "lg:w-0 lg:opacity-0 lg:pointer-events-none"}`}
          >
            <div className="h-full lg:w-full">
              <HistorySidebar
                sessions={sessions}
                activeId={activeId}
                onSwitch={handleSwitchSession}
                onNew={startNewSession}
              />
            </div>
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-surface/80 px-3 py-3 backdrop-blur-sm sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {mode === "page" && (
                <button
                  type="button"
                  onClick={() => setShowHistory((value) => !value)}
                  className="rounded-lg border border-border bg-card p-2 text-subtle transition-all hover:border-accent/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  {showHistory ? <X size={14} /> : <PanelLeftOpen size={14} />}
                </button>
              )}
              <div className="glow-accent flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
                <GraduationCap size={17} className="text-accent-light" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xs font-bold tracking-[0.16em] text-text sm:text-sm">SKL8</h1>
                <p className="text-xs text-subtle">Training-center learner support</p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
              {isLoading && (
                <div className="flex items-center gap-1.5 text-xs text-accent-light sm:mr-1">
                  <Loader2 size={11} className="animate-spin" />
                  <span className="hidden sm:block">Helping learner...</span>
                </div>
              )}
              
              <button
                type="button"
                onClick={startNewSession}
                className="flex-1 rounded-xl border border-border cursor-pointer bg-card px-3 py-2 text-xs text-subtle transition-all hover:border-accent/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:flex-none"
              >
                New request
              </button>
              <AuthStatus compact />
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border bg-card p-2 text-subtle cursor-pointer transition-all hover:border-accent/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </header>


        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 md:px-6 md:py-6">
              <div className={`mx-auto space-y-4 sm:space-y-5 ${mode === "page" ? "max-w-4xl" : "max-w-none"}`}>
                {messages.map((message, index) => (
                  <div key={message.id} className="space-y-4 sm:space-y-5">
                    <MessageBubble
                      message={message}
                      liveTools={message.id === streamingId ? liveTools : []}
                      onRate={
                        message.role === "assistant" && !message.isStreaming && message.id !== "welcome"
                          ? (rating) => rateMessage(activeId ?? "", message.id, rating)
                          : undefined
                      }
                    />

                    {index === 0 && showFaqChips && (
                      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-subtle">Popular help topics</p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_ACTIONS.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              onClick={() => handleAction(action)}
                              className="rounded-full border border-border bg-card px-3 py-2 text-xs text-subtle transition-all hover:border-accent/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {index === 0 && showPaymentHelp && (
                      <PaymentHelpCard
                        isSubmitting={isSubmittingPayment}
                        onCancel={() => setShowPaymentHelp(false)}
                        onVerify={handlePaymentHelpVerify}
                        onSubmit={(payload, verification) => void handlePaymentHelpSubmit(payload, verification)}
                      />
                    )}

                    {index === 0 && activeGuide && !showPaymentHelp && (
                      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text sm:text-base">{activeGuide.title}</p>
                            {activeGuide.context && <p className="mt-2 text-sm leading-relaxed text-subtle">{activeGuide.context}</p>}
                            <ol className="mt-3 space-y-2 text-sm text-subtle">
                              {activeGuide.steps.map((step, index) => (
                                <li key={step} className="flex gap-2">
                                  <span className="text-accent-light">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                            {activeGuide.checks && activeGuide.checks.length > 0 && (
                              <div className="mt-4 rounded-xl border border-border/60 bg-card/70 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">Have these ready</p>
                                <ul className="mt-2 space-y-1 text-sm text-subtle">
                                  {activeGuide.checks.map((check) => (
                                    <li key={check} className="flex gap-2">
                                      <span className="text-accent-light">-</span>
                                      <span>{check}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveGuide(null)}
                            className="rounded-lg p-1 text-subtle transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {activeGuide.actions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              onClick={() => handleGuideAction(action)}
                              className={action.tone === "primary"
                                ? "w-full rounded-xl bg-success px-4 py-2 text-sm text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/60 sm:w-auto"
                                : "w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-text transition-all hover:border-accent/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:w-auto"
                              }
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t border-border bg-surface/85 px-3 py-3 backdrop-blur-sm sm:px-4 md:px-6 md:py-4">
              {mode === "widget" && (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {QUICK_ACTIONS.slice(0, 5).map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleAction(action)}
                      className="flex-shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-subtle transition-all hover:border-accent/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit} className={`mx-auto flex items-end gap-2 sm:gap-3 ${mode === "page" ? "max-w-4xl" : "max-w-none"}`}>
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      const element = event.target;
                      element.style.height = "auto";
                      element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage(input);
                      }
                    }}
                    placeholder="Type your support request..."
                    rows={1}
                    disabled={isLoading}
                    className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                    style={{ minHeight: "48px", maxHeight: "160px" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="glow-accent flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:scale-105 hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




