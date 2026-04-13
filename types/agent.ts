import { SupportCategory, AgentSeverity, AgentCaseStatus, CustomerSentiment } from './base';

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