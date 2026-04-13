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
import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./supabase/server";

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

type LearnerProfileRow = {
  owner_user_id: string;
  student_id: string;
  email: string;
  learner_name: string;
  program_name: string;
  course_name: string;
  batch_id: string;
  batch_name: string;
  portal_status: string;
  current_term: string;
  mentor_name: string;
  application_id: string;
  enrollment_status: string;
  start_date: string;
  orientation_date: string;
  course_access_status: string;
  live_class_link_status: string;
  next_session: string;
  timings: string;
  certificate_email: string;
};

type PaymentVerificationRow = {
  learner_id: string;
  learner_name: string;
  program_name: string;
  invoice_id: string;
  payment_reference: string;
  amount: number;
  payment_date: string;
  status: string;
  next_step: string;
};

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeId(value?: string | null) {
  return value?.trim().toUpperCase() || undefined;
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || undefined;
}

function buildNotFound(entity: string, fields: Record<string, string | undefined>) {
  const details = Object.entries(fields)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`)
    .join(", ");

  return {
    found: false,
    not_found: true,
    message: details
      ? `No ${entity} exists in Supabase for ${details}.`
      : `No ${entity} exists in Supabase for the provided details.`,
  };
}

function buildInputRequired(message: string) {
  return {
    found: false,
    input_required: true,
    message,
  };
}

async function getSupabaseContext() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { supabase, user };
}

async function findLearnerProfile(params: {
  studentId?: string;
  email?: string;
  applicationId?: string;
  batchId?: string;
  programName?: string;
  courseName?: string;
}) {
  const context = await getSupabaseContext();
  if (!context) return null;

  const { supabase } = context;
  let query = supabase.from("learner_profiles").select(
    "owner_user_id, student_id, email, learner_name, program_name, course_name, batch_id, batch_name, portal_status, current_term, mentor_name, application_id, enrollment_status, start_date, orientation_date, course_access_status, live_class_link_status, next_session, timings, certificate_email"
  );

  if (params.studentId) {
    query = query.eq("student_id", params.studentId);
  } else if (params.email) {
    query = query.eq("email", params.email);
  } else if (params.applicationId) {
    query = query.eq("application_id", params.applicationId);
  } else if (params.batchId) {
    query = query.eq("batch_id", params.batchId);
  } else if (params.programName) {
    query = query.ilike("program_name", params.programName);
  } else {
    return { row: null, error: null };
  }

  if (params.courseName) {
    query = query.ilike("course_name", params.courseName);
  }

  const { data, error } = await query.limit(1).maybeSingle<LearnerProfileRow>();
  return { row: data, error };
}

async function findPaymentRecord(studentId?: string, invoiceId?: string) {
  const context = await getSupabaseContext();
  if (!context) return null;

  const { supabase } = context;
  let query = supabase
    .from("payment_verification_records")
    .select("learner_id, learner_name, program_name, invoice_id, payment_reference, amount, payment_date, status, next_step")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (studentId) {
    query = query.eq("learner_id", studentId);
  }
  if (invoiceId) {
    query = query.eq("invoice_id", invoiceId);
  }

  const { data, error } = await query.maybeSingle<PaymentVerificationRow>();
  return { row: data, error };
}

function fallbackTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "get_student_profile": {
      const { student_id, email } = input as unknown as GetStudentProfileInput;
      return {
        found: true,
        student_id: student_id || "SKL8-1042",
        email: email || "ava.learner@skl8.demo",
        learner_name: "Ava Learner",
        program: "Data Analytics Pro",
        batch: "DA-PRO Weekend Apr 2026",
        portal_status: "Active",
        current_term: "Spring 2026",
        mentor: "Riya Menon",
      };
    }
    case "check_enrollment_status": {
      const { application_id, student_id, program_name } = input as unknown as CheckEnrollmentStatusInput;
      return {
        found: true,
        application_id: application_id || "APP-DA-2026-001",
        student_id: student_id || "SKL8-1042",
        program_name: program_name || "Data Analytics Pro",
        status: "Batch assigned",
        batch_name: "DA-PRO Weekend Apr 2026",
        start_date: "2026-04-22",
        orientation_date: "2026-04-19",
      };
    }
    case "check_fee_status": {
      const { student_id, invoice_id } = input as unknown as CheckFeeStatusInput;
      return {
        found: true,
        student_id: student_id || "SKL8-1042",
        invoice_id: invoice_id || "INV-24018",
        fee_plan: "Installment plan",
        outstanding_balance: 0,
        last_payment_date: "2026-04-02",
        receipt_status: "Available on request",
        next_due_date: "2026-04-28",
      };
    }
    case "report_payment_issue": {
      const { student_id, invoice_id, issue_type, details } = input as unknown as ReportPaymentIssueInput;
      return {
        success: true,
        ticket_id: randomId("PAY"),
        student_id: student_id || "SKL8-1042",
        invoice_id: invoice_id || "INV-24018",
        issue_type,
        details,
        sla: "Finance team will review within 1 business day",
        status: "Submitted",
      };
    }
    case "troubleshoot_lms_access": {
      const { student_id, course_name, issue_type } = input as unknown as TroubleshootLmsAccessInput;
      return {
        found: true,
        student_id: student_id || "SKL8-1042",
        course_name: course_name || "Data Analytics Pro",
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
        found: true,
        student_id: student_id || "SKL8-1042",
        batch_id: batch_id || "BATCH-DA-PRO-04",
        program_name: program_name || "Data Analytics Pro",
        next_session: "2026-04-20 19:00 IST - SQL Foundations",
        timings: "Sat, Sun | 10:00 AM - 1:00 PM",
        live_class_link_status: "Published",
        mentor: "Riya Menon",
      };
    }
    case "request_certificate_or_completion_letter": {
      const { student_id, certificate_type, delivery_method } = input as unknown as RequestCertificateInput;
      return {
        success: true,
        request_id: randomId("DOC"),
        student_id: student_id || "SKL8-1042",
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

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 250));

  const context = await getSupabaseContext();
  if (!context) {
    return fallbackTool(name, input);
  }

  const { supabase, user } = context;

  switch (name) {
    case "get_student_profile": {
      const { student_id, email } = input as unknown as GetStudentProfileInput;
      const studentId = normalizeId(student_id);
      const normalizedEmail = normalizeEmail(email);

      if (!studentId && !normalizedEmail) {
        return buildInputRequired("Please share the learner student ID or registered email to look up the profile.");
      }

      const result = await findLearnerProfile({ studentId, email: normalizedEmail });
      if (!result || result.error) {
        return buildNotFound("learner profile", { student_id: studentId, email: normalizedEmail });
      }
      if (!result.row) {
        return buildNotFound("learner profile", { student_id: studentId, email: normalizedEmail });
      }

      return {
        found: true,
        student_id: result.row.student_id,
        email: result.row.email,
        learner_name: result.row.learner_name,
        program: result.row.program_name,
        course_name: result.row.course_name,
        batch: result.row.batch_name,
        batch_id: result.row.batch_id,
        portal_status: result.row.portal_status,
        current_term: result.row.current_term,
        mentor: result.row.mentor_name,
      };
    }
    case "check_enrollment_status": {
      const { application_id, student_id, program_name } = input as unknown as CheckEnrollmentStatusInput;
      const applicationId = normalizeId(application_id);
      const studentId = normalizeId(student_id);
      const programName = program_name?.trim();

      if (!applicationId && !studentId && !programName) {
        return buildInputRequired("Please share the application ID, learner student ID, or program name to check enrollment.");
      }

      const result = await findLearnerProfile({ applicationId, studentId, programName });
      if (!result || result.error || !result.row) {
        return buildNotFound("enrollment record", {
          application_id: applicationId,
          student_id: studentId,
          program_name: programName,
        });
      }

      return {
        found: true,
        application_id: result.row.application_id,
        student_id: result.row.student_id,
        program_name: result.row.program_name,
        status: result.row.enrollment_status,
        batch_name: result.row.batch_name,
        start_date: result.row.start_date,
        orientation_date: result.row.orientation_date,
      };
    }
    case "check_fee_status": {
      const { student_id, invoice_id } = input as unknown as CheckFeeStatusInput;
      const studentId = normalizeId(student_id);
      const invoiceId = normalizeId(invoice_id);

      if (!studentId && !invoiceId) {
        return buildInputRequired("Please share the learner student ID or invoice ID to check the fee status.");
      }

      const result = await findPaymentRecord(studentId, invoiceId);
      if (!result || result.error || !result.row) {
        return buildNotFound("payment record", { student_id: studentId, invoice_id: invoiceId });
      }

      return {
        found: true,
        student_id: result.row.learner_id,
        invoice_id: result.row.invoice_id,
        fee_plan: "Installment plan",
        outstanding_balance: 0,
        last_payment_date: result.row.payment_date,
        receipt_status: result.row.status,
        next_due_date: "2026-04-28",
        payment_reference: result.row.payment_reference,
      };
    }
    case "report_payment_issue": {
      const { student_id, invoice_id, issue_type, details } = input as unknown as ReportPaymentIssueInput;
      const studentId = normalizeId(student_id);
      const invoiceId = normalizeId(invoice_id);

      if (!studentId || !invoiceId) {
        return buildInputRequired("Please share both the learner student ID and invoice ID before I log the payment issue.");
      }

      const paymentResult = await findPaymentRecord(studentId, invoiceId);
      if (!paymentResult || paymentResult.error || !paymentResult.row) {
        return buildNotFound("payment record", { student_id: studentId, invoice_id: invoiceId });
      }

      const trackingCode = randomId("PAY");
      const insertPayload = {
        session_id: null,
        owner_user_id: user.id,
        learner_id: paymentResult.row.learner_id,
        issue_type,
        issue_label: issue_type.replaceAll("_", " "),
        invoice_id: paymentResult.row.invoice_id,
        payment_reference: paymentResult.row.payment_reference,
        amount: paymentResult.row.amount,
        payment_date: paymentResult.row.payment_date,
        receipt_email: null,
        note: details,
        status: "submitted",
        priority: issue_type === "duplicate_charge" ? "urgent" : "high",
        tracking_code: trackingCode,
        response_summary: details,
      };

      await supabase.from("payment_issue_reports").insert(insertPayload);

      return {
        success: true,
        found: true,
        ticket_id: trackingCode,
        student_id: paymentResult.row.learner_id,
        invoice_id: paymentResult.row.invoice_id,
        issue_type,
        details,
        sla: "Finance team will review within 1 business day",
        status: "Submitted",
      };
    }
    case "troubleshoot_lms_access": {
      const { student_id, course_name, issue_type } = input as unknown as TroubleshootLmsAccessInput;
      const studentId = normalizeId(student_id);
      const courseName = course_name?.trim();

      if (!studentId && !courseName) {
        return buildInputRequired("Please share the learner student ID or course name so I can check the access record.");
      }

      const result = await findLearnerProfile({ studentId, courseName, programName: courseName });
      if (!result || result.error || !result.row) {
        return buildNotFound("LMS access record", { student_id: studentId, course_name: courseName });
      }

      const nextActionMap: Record<string, string> = {
        login_failure: `Portal status is ${result.row.portal_status}. Ask the learner to retry after the standard browser reset steps.`,
        course_not_visible: `Course access is ${result.row.course_access_status}. If content is still missing, escalate with the student ID and course name.`,
        live_class_link: `Live class link status is ${result.row.live_class_link_status}. If the learner still cannot see it, escalate with the batch ID.`,
        password_reset: "Password reset should be retried with the registered learner email, then wait a few minutes for sync.",
      };

      return {
        found: true,
        student_id: result.row.student_id,
        course_name: result.row.course_name,
        issue_type,
        portal_status: result.row.portal_status,
        course_access_status: result.row.course_access_status,
        live_class_link_status: result.row.live_class_link_status,
        recommended_steps: [
          "Sign out of the learner portal and log in again using the registered email.",
          "Open the LMS in an incognito/private window to clear stale sessions.",
          "Wait 15 minutes after any enrollment, payment, or batch update for sync to complete.",
        ],
        next_action: nextActionMap[issue_type],
      };
    }
    case "get_schedule_details": {
      const { student_id, batch_id, program_name } = input as unknown as GetScheduleDetailsInput;
      const studentId = normalizeId(student_id);
      const batchId = normalizeId(batch_id);
      const programName = program_name?.trim();

      if (!studentId && !batchId && !programName) {
        return buildInputRequired("Please share the learner student ID, batch ID, or program name to fetch the schedule.");
      }

      const result = await findLearnerProfile({ studentId, batchId, programName });
      if (!result || result.error || !result.row) {
        return buildNotFound("schedule record", {
          student_id: studentId,
          batch_id: batchId,
          program_name: programName,
        });
      }

      return {
        found: true,
        student_id: result.row.student_id,
        batch_id: result.row.batch_id,
        program_name: result.row.program_name,
        next_session: result.row.next_session,
        timings: result.row.timings,
        live_class_link_status: result.row.live_class_link_status,
        mentor: result.row.mentor_name,
      };
    }
    case "request_certificate_or_completion_letter": {
      const { student_id, certificate_type, delivery_method } = input as unknown as RequestCertificateInput;
      const studentId = normalizeId(student_id);

      if (!studentId) {
        return buildInputRequired("Please share the learner student ID before I submit the certificate request.");
      }

      const result = await findLearnerProfile({ studentId });
      if (!result || result.error || !result.row) {
        return buildNotFound("certificate request profile", { student_id: studentId });
      }

      const insertPayload = {
        owner_user_id: user.id,
        student_id: result.row.student_id,
        learner_name: result.row.learner_name,
        program_name: result.row.program_name,
        certificate_type,
        delivery_method,
        status: "requested",
        turnaround_time: "2 business days",
      };

      const { data } = await supabase
        .from("certificate_request_records")
        .insert(insertPayload)
        .select("id, status, turnaround_time")
        .single();

      return {
        success: true,
        found: true,
        request_id: data?.id ?? randomId("DOC"),
        student_id: result.row.student_id,
        certificate_type,
        delivery_method,
        turnaround_time: data?.turnaround_time ?? "2 business days",
        status: data?.status ?? "requested",
        delivery_email: result.row.certificate_email,
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

      const { data } = await supabase
        .from("support_escalations")
        .insert({
          owner_user_id: user.id,
          reason,
          priority,
          summary,
          assigned_team: priority === "urgent" ? "Senior learner support" : "Learner success desk",
          estimated_wait: waitTimes[priority],
          status: "open",
        })
        .select("id, assigned_team, estimated_wait, status")
        .single();

      return {
        success: true,
        ticket_id: data?.id ?? randomId("SUP"),
        priority,
        estimated_wait: data?.estimated_wait ?? waitTimes[priority],
        assigned_team: data?.assigned_team ?? (priority === "urgent" ? "Senior learner support" : "Learner success desk"),
        reason,
        summary,
        channel: "Support console",
        status: data?.status ?? "open",
        message: "A human support representative has been notified and will continue this case shortly.",
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
