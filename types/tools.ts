import { PaymentIssueType } from './payment';

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