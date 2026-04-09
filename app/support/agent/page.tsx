import { AccessGate } from "../../components/AccessGate";
import { AgentConsole } from "../../components/AgentConsole";

export default function AgentPage() {
  return (
    <AccessGate
      allowedRole="agent"
      title="Agent access required"
      description="This queue is only available to learner support representatives in the skl8 workspace."
    >
      <AgentConsole />
    </AccessGate>
  );
}

