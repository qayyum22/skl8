export type AppRole = "customer" | "agent" | "admin";
export type MessageRole = "user" | "assistant" | "system";
export type AgentSeverity = "low" | "medium" | "high" | "urgent";
export type AgentCaseStatus = "new" | "working" | "waiting" | "resolved";
export type CustomerSentiment = "calm" | "concerned" | "frustrated";
export type SupportCategory =
  | "login_access"
  | "course_access"
  | "schedule"
  | "fees"
  | "certificate"
  | "enrollment"
  | "general";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

export type PaymentIssueType = "failed_payment" | "duplicate_charge" | "payment_not_reflected" | "receipt_request";

export interface PaymentHelpFormData {
  issueType: PaymentIssueType;
  learnerId: string;
  invoiceId: string;
  paymentReference: string;
  amount?: string;
  paymentDate?: string;
  receiptEmail?: string;
  note?: string;
}

export interface PaymentVerificationResult {
  issueLabel: string;
  learnerId: string;
  learnerName: string;
  programName: string;
  invoiceId: string;
  paymentReference: string;
  amount: string;
  paymentDate: string;
  status: string;
  nextStep: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  status: "success" | "error" | "pending";
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export interface AgentCase {
  category: SupportCategory;
  severity: AgentSeverity;
  status: AgentCaseStatus;
  summary: string;
  assignedTo?: string;
  resolutionNotes?: string;
  requiresHuman: boolean;
  escalated: boolean;
  customerSentiment: CustomerSentiment;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  lastUpdated: Date;
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

export type StreamEvent =
  | { type: "tool_start"; toolName: string; toolCallId: string; input: Record<string, unknown> }
  | { type: "tool_done"; toolCallId: string; name: string; result: unknown; status: "success" | "error" }
  | { type: "text_delta"; delta: string }
  | { type: "done"; toolResults: ToolResult[] }
  | { type: "error"; message: string };

export interface ChatRequest {
  messages: { role: MessageRole; content: string }[];
}

export interface ChatResponse {
  message: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export type ToolName =
  | "get_student_profile"
  | "check_enrollment_status"
  | "check_fee_status"
  | "report_payment_issue"
  | "troubleshoot_lms_access"
  | "get_schedule_details"
  | "request_certificate_or_completion_letter"
  | "connect_human_agent";

export interface GetStudentProfileInput {
  student_id?: string;
  email?: string;
}

export interface CheckEnrollmentStatusInput {
  application_id?: string;
  student_id?: string;
  program_name?: string;
}

export interface CheckFeeStatusInput {
  student_id?: string;
  invoice_id?: string;
}

export interface ReportPaymentIssueInput {
  student_id?: string;
  invoice_id?: string;
  issue_type: PaymentIssueType;
  details: string;
}

export interface TroubleshootLmsAccessInput {
  student_id?: string;
  course_name?: string;
  issue_type: "login_failure" | "course_not_visible" | "live_class_link" | "password_reset";
}

export interface GetScheduleDetailsInput {
  student_id?: string;
  batch_id?: string;
  program_name?: string;
}

export interface RequestCertificateInput {
  student_id?: string;
  certificate_type: "completion" | "bonafide" | "internship" | "grade_report";
  delivery_method: "email" | "portal_download";
}

export interface ConnectHumanInput {
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  summary: string;
}
