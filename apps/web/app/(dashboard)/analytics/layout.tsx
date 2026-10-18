import { AnalyticsNav } from "@/features/analytics";

// Shared frame for every Cost Analytics page: area navigation above the page content.
export default function AnalyticsLayout({ children }: LayoutProps<"/analytics">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <AnalyticsNav />
      {children}
    </main>
  );
}
