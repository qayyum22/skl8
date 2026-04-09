import type {
  CheckEnrollmentStatusInput,
  CheckFeeStatusInput,
  ConnectHumanInput,
  GetScheduleDetailsInput,
  GetStudentProfileInput,
  ReportPaymentIssueInput,
  RequestCertificateInput,
  TroubleshootLmsAccessInput,
} from "@/types";

export const TOOL_DEFINITIONS = [
  {
    name: "get_student_profile",
    description: "Look up a learner profile by student ID or email to confirm program, batch, and portal status.",
    input_schema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "Learner student ID" },
        email: { type: "string", description: "Learner email address" },
      },
    },
  },
  {
    name: "check_enrollment_status",
    description: "Check admission, enrollment, or batch assignment status for a learner.",
    input_schema: {
      type: "object",
      properties: {
        application_id: { type: "string", description: "Application or enrollment reference ID" },
        student_id: { type: "string", description: "Learner student ID" },
        program_name: { type: "string", description: "Training program name" },
      },
    },
  },
  {
    name: "check_fee_status",
    description: "Retrieve learner fee balance, invoice details, payment state, and receipt status.",
    input_schema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "Learner student ID" },
        invoice_id: { type: "string", description: "Invoice or fee receipt ID" },
      },
    },
  },
  {
    name: "report_payment_issue",
    description: "Log a learner payment issue such as failed payment, duplicate charge, or missing receipt.",
    input_schema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "Learner student ID" },
        invoice_id: { type: "string", description: "Invoice or fee receipt ID" },
        issue_type: {
          type: "string",
          enum: ["failed_payment", "duplicate_charge", "payment_not_reflected", "receipt_request"],
          description: "Type of payment issue",
        },
        details: { type: "string", description: "Additional issue details from the learner" },
      },
      required: ["issue_type", "details"],
    },
  },
  {
    name: "troubleshoot_lms_access",
    description: "Guide LMS troubleshooting for login failure, missing course access, live class links, or password reset.",
    input_schema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "Learner student ID" },
        course_name: { type: "string", description: "Course or cohort name" },
        issue_type: {
          type: "string",
          enum: ["login_failure", "course_not_visible", "live_class_link", "password_reset"],
          description: "Type of LMS issue",
        },
      },
      required: ["issue_type"],
    },
  },
  {
    name: "get_schedule_details",
    description: "Retrieve learner batch schedule, upcoming sessions, mentors, and class timings.",
    input_schema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "Learner student ID" },
        batch_id: { type: "string", description: "Batch or cohort ID" },
        program_name: { type: "string", description: "Training program name" },
      },
    },
  },
  {
    name: "request_certificate_or_completion_letter",
    description: "Submit a request for a completion certificate, bonafide letter, internship letter, or grade report.",
    input_schema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "Learner student ID" },
        certificate_type: {
          type: "string",
          enum: ["completion", "bonafide", "internship", "grade_report"],
          description: "Type of certificate or letter requested",
        },
        delivery_method: {
          type: "string",
          enum: ["email", "portal_download"],
          description: "Preferred delivery method",
        },
      },
      required: ["certificate_type", "delivery_method"],
    },
  },
  {
    name: "connect_human_agent",
    description: "Escalate the conversation to a human skl8 support representative.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why human intervention is needed" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Priority level for the escalation",
        },
        summary: { type: "string", description: "Brief learner issue summary for the assigned human agent" },
      },
      required: ["reason", "priority", "summary"],
    },
  },
] as const;

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 450));

  switch (name) {
    case "get_student_profile": {
      const { student_id, email } = input as unknown as GetStudentProfileInput;
      return {
        student_id: student_id || "STU-20481",
        email: email || "learner@demo.edu",
        learner_name: "Ava Sharma",
        program: "Data Analytics Bootcamp",
        batch: "DA-B12 Evening",
        portal_status: "Active",
        current_term: "Spring 2026",
        mentor: "Riya Menon",
      };
    }
    case "check_enrollment_status": {
      const { application_id, student_id, program_name } = input as unknown as CheckEnrollmentStatusInput;
      return {
        application_id: application_id || randomId("APP"),
        student_id: student_id || "STU-20481",
        program_name: program_name || "Data Analytics Bootcamp",
        status: "Batch assigned",
        batch_name: "DA-B12 Evening",
        start_date: "April 22, 2026",
        orientation_date: "April 19, 2026",
      };
    }
    case "check_fee_status": {
      const { student_id, invoice_id } = input as unknown as CheckFeeStatusInput;
      return {
        student_id: student_id || "STU-20481",
        invoice_id: invoice_id || randomId("INV"),
        fee_plan: "Installment plan",
        outstanding_balance: 240,
        last_payment_date: "April 4, 2026",
        receipt_status: "Available in portal",
        next_due_date: "April 28, 2026",
      };
    }
    case "report_payment_issue": {
      const { student_id, invoice_id, issue_type, details } = input as unknown as ReportPaymentIssueInput;
      return {
        success: true,
        ticket_id: randomId("PAY"),
        student_id: student_id || "STU-20481",
        invoice_id: invoice_id || randomId("INV"),
        issue_type,
        details,
        sla: "Finance team will review within 1 business day",
        status: "Submitted",
      };
    }
    case "troubleshoot_lms_access": {
      const { student_id, course_name, issue_type } = input as unknown as TroubleshootLmsAccessInput;
      return {
        student_id: student_id || "STU-20481",
        course_name: course_name || "Data Analytics Bootcamp",
        issue_type,
        recommended_steps: [
          "Sign out of the learner portal and log in again using your registered email.",
          "Open the LMS in an incognito/private window to rule out stale session issues.",
          "Wait 15 minutes after enrollment/payment updates for access sync to complete.",
        ],
        next_action: issue_type === "password_reset" ? "Reset email sent" : "Escalate if still blocked after retry",
      };
    }
    case "get_schedule_details": {
      const { student_id, batch_id, program_name } = input as unknown as GetScheduleDetailsInput;
      return {
        student_id: student_id || "STU-20481",
        batch_id: batch_id || "BATCH-DA-B12",
        program_name: program_name || "Data Analytics Bootcamp",
        next_session: "April 12, 2026 - SQL Foundations",
        timings: "Mon, Wed, Fri | 7:00 PM - 9:00 PM",
        live_class_link_status: "Published",
        mentor: "Riya Menon",
      };
    }
    case "request_certificate_or_completion_letter": {
      const { student_id, certificate_type, delivery_method } = input as unknown as RequestCertificateInput;
      return {
        success: true,
        request_id: randomId("DOC"),
        student_id: student_id || "STU-20481",
        certificate_type,
        delivery_method,
        turnaround_time: "2 business days",
        status: "Request accepted",
      };
    }
    case "connect_human_agent": {
      const { reason, priority, summary } = input as unknown as ConnectHumanInput;
      const waitTimes: Record<string, string> = {
        urgent: "< 10 minutes",
        high: "20 minutes",
        medium: "45 minutes",
        low: "2 hours",
      };
      return {
        success: true,
        ticket_id: randomId("SUP"),
        priority,
        estimated_wait: waitTimes[priority],
        assigned_team: priority === "urgent" ? "Senior learner support" : "Learner success desk",
        reason,
        summary,
        channel: "Support console",
        message: "A human support representative has been notified and will continue this case shortly.",
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}


