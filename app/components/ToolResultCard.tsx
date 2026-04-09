"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { ToolResult } from "@/types";

interface Props {
  result: ToolResult;
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ToolResultCard({ result }: Props) {
  const Icon =
    result.status === "success"
      ? CheckCircle2
      : result.status === "error"
      ? XCircle
      : Clock3;

  const tone =
    result.status === "success"
      ? "border-success/20 bg-success/5 text-success"
      : result.status === "error"
      ? "border-danger/20 bg-danger/5 text-danger"
      : "border-accent/20 bg-accent/5 text-accent-light";

  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium">
        <Icon size={12} />
        <span>{result.name}</span>
        <span className="ml-auto uppercase tracking-wide">{result.status}</span>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-ink/40 p-3 text-[11px] leading-relaxed text-text whitespace-pre-wrap">
        {formatJson(result.result)}
      </pre>
    </div>
  );
}
