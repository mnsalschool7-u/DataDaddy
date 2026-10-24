"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { LeftSidebar } from "@/components/panels/LeftSidebar";
import { RightSidebar } from "@/components/panels/RightSidebar";
import { BottomPanel } from "@/components/panels/BottomPanel";
import { DEFAULT_TOGGLES, type LayerToggles } from "@/components/map/types";
import { Loader2 } from "lucide-react";

const MapCanvas = dynamic(
  () => import("@/components/map/MapCanvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="animate-spin" size={16} /> Loading Massachusetts map…
        </div>
      </div>
    ),
  },
);

export default function ExplorePage() {
  const [toggles, setToggles] = useState<LayerToggles>(DEFAULT_TOGGLES);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <LeftSidebar toggles={toggles} setToggles={setToggles} />
        <div className="relative min-w-0 flex-1 grid-texture">
          <MapCanvas toggles={toggles} />
        </div>
        <RightSidebar />
      </div>
      <BottomPanel />
    </div>
  );
}
