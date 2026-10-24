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
  const [mapExpanded, setMapExpanded] = useState(false);
  const [toggles, setToggles] = useState<LayerToggles>(DEFAULT_TOGGLES);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <button onClick={() => setMapExpanded(v => !v)} className="absolute right-14 top-2 z-20 rounded border border-border bg-panel px-2 py-1 text-[10px] text-accent">{mapExpanded ? "Show controls & impact" : "Expand map"}</button>
      <div className="flex min-h-0 flex-1">
        {!mapExpanded && <LeftSidebar toggles={toggles} setToggles={setToggles} />}
        <div className="relative min-w-0 flex-1 grid-texture">
          <MapCanvas toggles={toggles} />
        </div>
        {!mapExpanded && <RightSidebar />}
      </div>
      {!mapExpanded && <BottomPanel />}
    </div>
  );
}
