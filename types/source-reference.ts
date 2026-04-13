import { KnowledgeSourceType } from './knowledge';

export interface SourceReference {
  id: string;
  title: string;
  label: string;
  href?: string;
  sourceType: KnowledgeSourceType | "faq";
}