import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { TopNav } from "@/components/TopNav";
import { SimulationProvider } from "@/components/SimulationProvider";

export const metadata: Metadata = {
  title: "DataDaddy — Intelligence for where AI infrastructure belongs",
  description:
    "AI-powered geospatial intelligence for siting data centers in Massachusetts. Model infrastructure, environmental, community, and regulatory consequences.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen flex-col overflow-hidden bg-bg text-content">
        <SimulationProvider>
          <TopNav />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </SimulationProvider>
      </body>
    </html>
  );
}
