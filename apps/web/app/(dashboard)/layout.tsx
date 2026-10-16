import { AppShell } from "@/components/app-shell";

// Layout for every signed-in page. The (dashboard) group doesn't appear in URLs.
// Pages that need no shell (login, invite acceptance) go in a sibling group, e.g. app/(auth)/.
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
