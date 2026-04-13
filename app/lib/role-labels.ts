import type { AppRole } from "@/types";

export function getRoleLabel(role: AppRole) {
  switch (role) {
    case "customer":
      return "Student";
    case "agent":
      return "Human Agent";
    case "admin":
      return "Admin";
    default:
      return role;
  }
}
