import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/app/lib/env";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { PaymentHelpFormData, PaymentIssueType, PaymentVerificationResult } from "@/types";

const ISSUE_LABELS: Record<PaymentIssueType, string> = {
  failed_payment: "Failed payment",
  duplicate_charge: "Duplicate charge",
  payment_not_reflected: "Payment not reflected",
  receipt_request: "Receipt request",
};

function buildTrackingCode(issueType: PaymentIssueType) {
  const prefixMap: Record<PaymentIssueType, string> = {
    failed_payment: "PAY",
    duplicate_charge: "DUP",
    payment_not_reflected: "REC",
    receipt_request: "RCP",
  };

  return `${prefixMap[issueType]}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildResolution(verification: PaymentVerificationResult, trackingCode: string) {
  return {
    priority: verification.issueLabel === "Duplicate charge" ? "urgent" : verification.issueLabel === "Receipt request" ? "medium" : "high",
    status: verification.issueLabel === "Receipt request" ? "queued" : "reviewing",
    message:
      `I have submitted your **${verification.issueLabel.toLowerCase()}** request under **${trackingCode}** for learner **${verification.learnerId}**. ` +
      `${verification.nextStep} We will use invoice **${verification.invoiceId}** and payment reference **${verification.paymentReference}** for the follow-up.`,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    action?: "verify" | "submit";
    sessionId?: string;
    payload?: PaymentHelpFormData;
    verification?: PaymentVerificationResult;
  };

  if (!body.payload || !body.action) {
    return NextResponse.json({ error: "Payment action and payload are required." }, { status: 400 });
  }

  if (body.action === "verify") {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Live payment verification is unavailable because Supabase is not configured." }, { status: 503 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in to verify payment details." }, { status: 401 });
    }

    const learnerId = body.payload.learnerId.trim().toUpperCase();
    const invoiceId = body.payload.invoiceId.trim().toUpperCase();
    const paymentReference = body.payload.paymentReference.trim().toUpperCase();

    const { data, error } = await supabase
      .from("payment_verification_records")
      .select("learner_id, learner_name, program_name, invoice_id, payment_reference, amount, payment_date, status, next_step")
      .eq("owner_user_id", user.id)
      .eq("learner_id", learnerId)
      .eq("invoice_id", invoiceId)
      .eq("payment_reference", paymentReference)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: `No payment record matched learner ID ${learnerId}, invoice ${invoiceId}, and reference ${paymentReference}. Please check the details and try again.` }, { status: 404 });
    }

    const verification: PaymentVerificationResult = {
      issueLabel: ISSUE_LABELS[body.payload.issueType],
      learnerId: data.learner_id,
      learnerName: data.learner_name,
      programName: data.program_name,
      invoiceId: data.invoice_id,
      paymentReference: data.payment_reference,
      amount: Number(data.amount).toFixed(2),
      paymentDate: data.payment_date,
      status: data.status,
      nextStep: data.next_step,
    };

    return NextResponse.json({ verification });
  }

  const verification = body.verification;
  if (!verification) {
    return NextResponse.json({ error: "Verified payment details are required before submission." }, { status: 400 });
  }
  const trackingCode = buildTrackingCode(body.payload.issueType);
  const resolution = buildResolution(verification, trackingCode);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mode: "demo",
      trackingCode,
      message: resolution.message,
      status: resolution.status,
      priority: resolution.priority,
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      mode: "demo",
      trackingCode,
      message: resolution.message,
      status: resolution.status,
      priority: resolution.priority,
    });
  }

  const amountValue = Number.parseFloat(verification.amount);
  const insertPayload = {
    session_id: body.sessionId ?? null,
    owner_user_id: user.id,
    learner_id: verification.learnerId,
    issue_type: body.payload.issueType,
    issue_label: ISSUE_LABELS[body.payload.issueType],
    invoice_id: verification.invoiceId,
    payment_reference: verification.paymentReference,
    amount: Number.isFinite(amountValue) ? amountValue : null,
    payment_date: verification.paymentDate || null,
    receipt_email: body.payload.receiptEmail?.trim() || null,
    note: verification.nextStep,
    status: resolution.status,
    priority: resolution.priority,
    tracking_code: trackingCode,
    response_summary: resolution.message,
  };

  const { data, error } = await supabase
    .from("payment_issue_reports")
    .insert(insertPayload)
    .select("id, tracking_code, status, priority, created_at")
    .single();

  if (error) {
    return NextResponse.json({
      mode: "demo",
      trackingCode,
      message: resolution.message,
      status: resolution.status,
      priority: resolution.priority,
      warning: error.message,
    });
  }

  return NextResponse.json({
    mode: "supabase",
    trackingCode,
    message: resolution.message,
    status: resolution.status,
    priority: resolution.priority,
    record: data,
  });
}
