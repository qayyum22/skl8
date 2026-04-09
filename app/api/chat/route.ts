import { NextRequest } from "next/server";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { rateLimit } from "@/app/lib/rate-limit";
import { executeTool } from "../../lib/tools";

const SYSTEM_PROMPT = `You are Nova, an AI support assistant for skl8, a training center that supports learners across enrollment, course access, schedules, certificates, and fee issues.

## Primary responsibilities
- Help learners solve common issues quickly with accurate, student-friendly guidance.
- Prefer self-service fixes first for LMS/login/course-access problems.
- Use tools proactively when learner data, payment status, schedules, certificates, or enrollment details are needed.
- Escalate to a human support specialist when policy judgment, finance review, exceptions, or repeated failed troubleshooting are involved.

## Supported issue categories
- Login or LMS access
- Course access or missing content
- Batch schedule and session timings
- Fees, invoices, receipts, and payment issues
- Enrollment or admission status
- Certificates and completion letters

## Response style
- Be warm, concise, and reassuring.
- After a simple greeting, suggest likely help topics naturally.
- Ask for student ID, registered email, batch, invoice ID, or application ID only when truly needed.
- Explain what you are checking before using a tool.
- Summarize outcomes clearly and mention next steps.
- For payment and certificate issues, confirm the relevant reference details before acting.
- Escalate if the learner is frustrated, blocked after guided troubleshooting, facing a deadline, or requests a human.

Today's date: April 9, 2026.`;

function encode(event: object): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function runTool(name: string, input: Record<string, unknown>, send: (event: object) => void) {
  const toolCallId = crypto.randomUUID();

  send({ type: "tool_start", toolName: name, toolCallId, input });

  try {
    const result = await executeTool(name, input);
    send({ type: "tool_done", toolCallId, name, result, status: "success" });
    return { toolCallId, result };
  } catch (error) {
    const errorResult = { error: String(error) };
    send({ type: "tool_done", toolCallId, name, result: errorResult, status: "error" });
    throw error;
  }
}

function createTools(send: (event: object) => void) {
  return {
    get_student_profile: tool({
      description: "Look up a learner profile by student ID or email to confirm program, batch, and portal status.",
      inputSchema: z.object({
        student_id: z.string().optional().describe("Learner student ID"),
        email: z.string().optional().describe("Learner email address"),
      }),
      execute: async (input) => (await runTool("get_student_profile", input, send)).result,
    }),
    check_enrollment_status: tool({
      description: "Check admission, enrollment, or batch assignment status for a learner.",
      inputSchema: z.object({
        application_id: z.string().optional().describe("Application or enrollment reference ID"),
        student_id: z.string().optional().describe("Learner student ID"),
        program_name: z.string().optional().describe("Training program name"),
      }),
      execute: async (input) => (await runTool("check_enrollment_status", input, send)).result,
    }),
    check_fee_status: tool({
      description: "Retrieve learner fee balance, invoice details, payment state, and receipt status.",
      inputSchema: z.object({
        student_id: z.string().optional().describe("Learner student ID"),
        invoice_id: z.string().optional().describe("Invoice or fee receipt ID"),
      }),
      execute: async (input) => (await runTool("check_fee_status", input, send)).result,
    }),
    report_payment_issue: tool({
      description: "Log a learner payment issue such as failed payment, duplicate charge, or missing receipt.",
      inputSchema: z.object({
        student_id: z.string().optional().describe("Learner student ID"),
        invoice_id: z.string().optional().describe("Invoice or fee receipt ID"),
        issue_type: z.enum(["failed_payment", "duplicate_charge", "payment_not_reflected", "receipt_request"]),
        details: z.string().describe("Additional issue details from the learner"),
      }),
      execute: async (input) => (await runTool("report_payment_issue", input, send)).result,
    }),
    troubleshoot_lms_access: tool({
      description: "Guide LMS troubleshooting for login failure, missing course access, live class links, or password reset.",
      inputSchema: z.object({
        student_id: z.string().optional().describe("Learner student ID"),
        course_name: z.string().optional().describe("Course or cohort name"),
        issue_type: z.enum(["login_failure", "course_not_visible", "live_class_link", "password_reset"]),
      }),
      execute: async (input) => (await runTool("troubleshoot_lms_access", input, send)).result,
    }),
    get_schedule_details: tool({
      description: "Retrieve learner batch schedule, upcoming sessions, mentors, and class timings.",
      inputSchema: z.object({
        student_id: z.string().optional().describe("Learner student ID"),
        batch_id: z.string().optional().describe("Batch or cohort ID"),
        program_name: z.string().optional().describe("Training program name"),
      }),
      execute: async (input) => (await runTool("get_schedule_details", input, send)).result,
    }),
    request_certificate_or_completion_letter: tool({
      description: "Submit a request for a completion certificate, bonafide letter, internship letter, or grade report.",
      inputSchema: z.object({
        student_id: z.string().optional().describe("Learner student ID"),
        certificate_type: z.enum(["completion", "bonafide", "internship", "grade_report"]),
        delivery_method: z.enum(["email", "portal_download"]),
      }),
      execute: async (input) => (await runTool("request_certificate_or_completion_letter", input, send)).result,
    }),
    connect_human_agent: tool({
      description: "Escalate the conversation to a human skl8 support representative.",
      inputSchema: z.object({
        reason: z.string().describe("Why human intervention is needed"),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        summary: z.string().describe("Brief learner issue summary for the assigned human agent"),
      }),
      execute: async (input) => (await runTool("connect_human_agent", input, send)).result,
    }),
  };
}

function toModelMessages(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): ModelMessage[] {
  return messages.map((message) => ({ role: message.role, content: message.content }));
}

function getClientAddress(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export async function POST(req: NextRequest) {
  const limiter = await rateLimit(`chat:${getClientAddress(req)}`, 30, 60);
  if (!limiter.allowed) {
    return new Response(JSON.stringify({ error: "Too many chat requests. Please wait a moment and try again." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(limiter.resetInSeconds),
      },
    });
  }

  const { messages } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(new TextEncoder().encode(encode(event)));
      };

      try {
        const allToolResults: Array<{
          toolCallId: string;
          name: string;
          result: unknown;
          status: "success" | "error";
        }> = [];

        await generateText({
          model: openai("gpt-4.1"),
          system: SYSTEM_PROMPT,
          messages: toModelMessages(messages),
          tools: createTools(send),
          stopWhen: stepCountIs(10),
          onStepFinish: async ({ text, toolResults }) => {
            if (text) {
              const words = text.split(/(\s+)/);
              for (let index = 0; index < words.length; index++) {
                send({ type: "text_delta", delta: words[index] });
                if (index < words.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 18));
                }
              }
            }

            for (const result of toolResults) {
              allToolResults.push({
                toolCallId: result.toolCallId,
                name: result.toolName,
                result: result.output,
                status: "success",
              });
            }
          },
        });

        send({ type: "done", toolResults: allToolResults });
      } catch (error) {
        send({ type: "error", message: String(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-RateLimit-Remaining": String(limiter.remaining),
      "X-RateLimit-Reset": String(limiter.resetInSeconds),
    },
  });
}
