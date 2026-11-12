import { RoleGate } from "./role-gate";
import { Sidebar } from "./sidebar";

// Chrome shared by every signed-in page: black sidebar with the functional areas.
// The shell is exactly one screen tall and never scrolls. Pages render inside
// DashboardPage, which fills the column exactly and scrolls only its body; the
// column's own scroll is a fallback for pages not converted yet. `relative` keeps
// absolutely positioned children (sr-only labels) inside it, not the document.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-8 pb-6 pt-6">{children}</div>
      </div>
    </RoleGate>
  );
}
