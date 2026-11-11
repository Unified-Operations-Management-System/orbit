import { RoleGate } from "./role-gate";
import { Sidebar } from "./sidebar";

// Chrome shared by every signed-in page: black sidebar with the functional areas.
// The shell is exactly one screen tall and never scrolls; the content column
// scrolls by default, and pages that pin a header give their own panel overflow.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-8 py-8">{children}</div>
      </div>
    </RoleGate>
  );
}
