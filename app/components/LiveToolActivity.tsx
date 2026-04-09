"use client";

import {
  Package,
  User,
  CreditCard,
  RefreshCw,
  UserCheck,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const TOOL_META: Record<string, { label: string; icon: React.ElementType; verb: string }> = {
  check_order_status: { label: "Order Status", icon: Package, verb: "Looking up order..." },
  get_account_info: { label: "Account Info", icon: User, verb: "Fetching account..." },
  process_refund: { label: "Process Refund", icon: CreditCard, verb: "Processing refund..." },
  update_request: { label: "Apply Update", icon: RefreshCw, verb: "Applying changes..." },
  connect_human_agent: { label: "Human Agent", icon: UserCheck, verb: "Connecting to agent..." },
};

export type LiveTool = {
  toolCallId: string;
  name: string;
  status: "running" | "success" | "error";
};

interface Props {
  tools: LiveTool[];
}

export function LiveToolActivity({ tools }: Props) {
  if (tools.length === 0) return null;

  return (
    <div className="my-1 flex flex-col gap-1.5">
      {tools.map((tool) => {
        const meta = TOOL_META[tool.name] ?? {
          label: tool.name,
          icon: Loader2,
          verb: "Running...",
        };
        const Icon = meta.icon;

        return (
          <div
            key={tool.toolCallId}
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${
              tool.status === "running"
                ? "border-accent/30 bg-accent/5 text-accent-light"
                : tool.status === "success"
                ? "border-success/20 bg-success/5 text-success"
                : "border-danger/20 bg-danger/5 text-danger"
            }`}
          >
            <Icon size={12} className={tool.status === "running" ? "animate-pulse" : ""} />
            <span className="font-medium">{meta.label}</span>
            <span className="ml-auto text-subtle">
              {tool.status === "running" ? meta.verb : tool.status === "success" ? "Done" : "Failed"}
            </span>
            {tool.status === "running" && <Loader2 size={10} className="animate-spin text-accent-light" />}
            {tool.status === "success" && <CheckCircle2 size={10} className="text-success" />}
            {tool.status === "error" && <XCircle size={10} className="text-danger" />}
          </div>
        );
      })}
    </div>
  );
}
