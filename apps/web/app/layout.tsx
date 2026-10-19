import type { Metadata } from "next";
import { Jost } from "next/font/google";
import { RoleProvider } from "@/lib/role";
import "./globals.css";

const jost = Jost({ subsets: ["latin"], weight: ["400", "500", "700", "800"], variable: "--font-jost" });

export const metadata: Metadata = {
  title: "Orbit",
  description: "Operations management for small food manufacturers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jost.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
