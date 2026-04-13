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