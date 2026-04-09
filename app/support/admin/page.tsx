import { AccessGate } from "../../components/AccessGate";
import { AdminDashboard } from "../../components/AdminDashboard";

export default function AdminPage() {
  return (
    <AccessGate
      allowedRole="admin"
      title="Admin access required"
      description="This dashboard is available only to operations admins responsible for queue health, KPI monitoring, and support performance."
    >
      <AdminDashboard />
    </AccessGate>
  );
}
