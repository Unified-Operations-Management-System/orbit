import { DesignSystemSite } from "@/features/design-system";

// Component site for the team: open /design (no sign-in needed).
export const metadata = { title: "Orbit UI components" };

export default function DesignPage() {
  return <DesignSystemSite />;
}
