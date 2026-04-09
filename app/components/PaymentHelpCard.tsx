"use client";

import { useMemo, useState } from "react";
import type { PaymentHelpFormData, PaymentIssueType, PaymentVerificationResult } from "@/types";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ReceiptText, ShieldAlert, WalletCards, X } from "lucide-react";

interface Props {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: PaymentHelpFormData, verification: PaymentVerificationResult) => void;
  onVerify: (payload: PaymentHelpFormData) => Promise<PaymentVerificationResult>;
}

const ISSUE_OPTIONS: Array<{
  value: PaymentIssueType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: "payment_not_reflected",
    label: "Payment not reflected",
    description: "Money was deducted but your learner portal still shows dues.",
    icon: WalletCards,
  },
  {
    value: "failed_payment",
    label: "Failed payment",
    description: "The payment attempt failed or showed an error during checkout.",
    icon: ShieldAlert,
  },
  {
    value: "duplicate_charge",
    label: "Duplicate charge",
    description: "You were charged more than once for the same installment or invoice.",
    icon: CreditCard,
  },
  {
    value: "receipt_request",
    label: "Need receipt",
    description: "You only need a receipt or proof of payment sent to your email.",
    icon: ReceiptText,
  },
];

const INITIAL_FORM: PaymentHelpFormData = {
  issueType: "payment_not_reflected",
  learnerId: "",
  invoiceId: "",
  paymentReference: "",
};

export function PaymentHelpCard({ isSubmitting, onCancel, onSubmit, onVerify }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<PaymentHelpFormData>(INITIAL_FORM);
  const [verification, setVerification] = useState<PaymentVerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const selectedIssue = useMemo(
    () => ISSUE_OPTIONS.find((option) => option.value === form.issueType) ?? ISSUE_OPTIONS[0],
    [form.issueType]
  );

  const canVerify =
    form.learnerId.trim().length > 0 &&
    form.invoiceId.trim().length > 0 &&
    form.paymentReference.trim().length > 0;

  const handleVerify = async () => {
    if (!canVerify) return;
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const result = await onVerify(form);
      setVerification(result);
      setStep(3);
    } catch (error) {
      setVerification(null);
      setVerifyError(error instanceof Error ? error.message : "We could not verify those payment details right now. Please check the IDs and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text sm:text-base">Payment support</p>
          <p className="mt-2 text-sm leading-relaxed text-subtle">
            We will take this one step at a time so we only ask for what is needed.
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-subtle">
            Step {step} of 3
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 text-subtle transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label="Close payment support form"
        >
          <X size={14} />
        </button>
      </div>

      {step === 1 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-text">What kind of payment issue are you facing?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ISSUE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = option.value === form.issueType;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, issueType: option.value }))}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${selected ? "border-accent/40 bg-card shadow-sm" : "border-border bg-card/60 hover:border-accent/30 hover:bg-card"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border ${selected ? "border-accent/30 bg-accent/10 text-accent-light" : "border-border bg-surface text-subtle"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">{option.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-subtle">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Continue
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 rounded-2xl border border-border/70 bg-card/80 p-4">
          <p className="text-sm font-medium text-text">Now share the payment identifiers</p>
          <p className="mt-1 text-sm text-subtle">Selected issue: {selectedIssue.label}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-subtle">
              Learner ID
              <input
                value={form.learnerId}
                onChange={(event) => setForm((current) => ({ ...current, learnerId: event.target.value }))}
                placeholder="SKL8-1042"
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-subtle">
              Invoice ID
              <input
                value={form.invoiceId}
                onChange={(event) => setForm((current) => ({ ...current, invoiceId: event.target.value }))}
                placeholder="INV-24018"
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-subtle sm:col-span-2">
              Payment reference
              <input
                value={form.paymentReference}
                onChange={(event) => setForm((current) => ({ ...current, paymentReference: event.target.value }))}
                placeholder="UPI23947290"
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
          </div>

          {verifyError && <p className="mt-3 text-sm text-danger">{verifyError}</p>}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              type="button"
              disabled={!canVerify || isVerifying}
              onClick={() => void handleVerify()}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying ? "Verifying..." : "Verify details"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && verification && (
        <div className="mt-4 rounded-2xl border border-success/25 bg-card/85 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-success/30 bg-success/10 text-success">
              <CheckCircle2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">We found a matching payment record</p>
              <p className="mt-1 text-sm text-subtle">Please confirm these details before we submit your support request.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-surface/80 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Learner</p>
              <p className="mt-1 text-sm font-medium text-text">{verification.learnerName}</p>
              <p className="text-sm text-subtle">{verification.learnerId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Program</p>
              <p className="mt-1 text-sm font-medium text-text">{verification.programName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Invoice</p>
              <p className="mt-1 text-sm font-medium text-text">{verification.invoiceId}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Payment Reference</p>
              <p className="mt-1 text-sm font-medium text-text">{verification.paymentReference}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Amount</p>
              <p className="mt-1 text-sm font-medium text-text">INR {verification.amount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Payment Date</p>
              <p className="mt-1 text-sm font-medium text-text">{verification.paymentDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Backend Status</p>
              <p className="mt-1 text-sm font-medium text-text">{verification.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle">Next Step</p>
              <p className="mt-1 text-sm font-medium text-text">{verification.nextStep}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text transition-all hover:border-accent/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <ArrowLeft size={14} />
              Edit details
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onSubmit(form, verification)}
              className="rounded-xl bg-success px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Confirm and submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
