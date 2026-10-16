import { HealthBadge } from "@/components/health-badge";
import { MainNav } from "./main-nav";

// Chrome shared by every signed-in page: brand, domain navigation, API status.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3">
          <span className="font-semibold">Orbit</span>
          <MainNav />
          <div className="ml-auto">
            <HealthBadge />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
