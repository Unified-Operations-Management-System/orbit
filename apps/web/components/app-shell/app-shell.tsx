import { RoleGate } from "./role-gate";
import { Sidebar } from "./sidebar";

// Chrome shared by every signed-in page: black sidebar with the functional areas.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <div className="flex min-h-full flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col px-8 py-8">{children}</div>
      </div>
    </RoleGate>
  );
}
