import type { Metadata } from "next";
import "@fontsource-variable/jost";
import { RoleProvider } from "@/lib/role";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit",
  description: "Operations management for small food manufacturers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
