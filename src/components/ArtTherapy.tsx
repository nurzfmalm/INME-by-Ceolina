import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SoloDrawing } from "./SoloDrawing";
import { DualDrawing } from "./DualDrawing";
import { TracingDrawing } from "./TracingDrawing";
import SymmetryDrawing from "./SymmetryDrawing";
import HalfTracingDrawing from "./HalfTracingDrawing";

import cardTracing from "@/assets/card-tracing.png";
import cardSymmetry from "@/assets/card-symmetry.png";
import cardHalves from "@/assets/card-halves.png";
import cardFreedraw from "@/assets/card-freedraw.png";
import cardDualDrawing from "@/assets/card-drawing.png";

interface ArtTherapyProps {
  onBack: () => void;
  childName: string;
  childId?: string | null;
  taskId?: string | null;
  taskPrompt?: string | null;
}

type DrawingMode = "select" | "tracing" | "symmetry" | "halves" | "solo" | "dual";

const DRAWING_CARDS: { id: DrawingMode; title: string; image: string; bg: string }[] = [
  { id: "tracing", title: "Трафареты", image: cardTracing, bg: "#A8D5A2" },
  { id: "symmetry", title: "Симметрия", image: cardSymmetry, bg: "#7EC8D9" },
  { id: "halves", title: "Половинки", image: cardHalves, bg: "#E8A0B4" },
  { id: "solo", title: "Свободное рисование", image: cardFreedraw, bg: "#E8C49A" },
  { id: "dual", title: "Двойное рисование", image: cardDualDrawing, bg: "#B8A9D4" },
];

export const ArtTherapy = ({ onBack, childName, childId, taskId, taskPrompt }: ArtTherapyProps) => {
  const [selectedMode, setSelectedMode] = useState<DrawingMode>("select");

  if (selectedMode === "solo") {
    return (
      <SoloDrawing
        onBack={() => setSelectedMode("select")}
        childName={childName}
        childId={childId}
        taskId={taskId}
        taskPrompt={taskPrompt}
      />
    );
  }

  if (selectedMode === "dual") {
    return (
      <DualDrawing
        onBack={() => setSelectedMode("select")}
        childName={childName}
      />
    );
  }

  if (selectedMode === "tracing") {
    return (
      <TracingDrawing
        onBack={() => setSelectedMode("select")}
        childName={childName}
        childId={childId || undefined}
      />
    );
  }

  if (selectedMode === "symmetry") {
    return (
      <SymmetryDrawing
        onBack={() => setSelectedMode("select")}
        childId={childId || undefined}
      />
    );
  }

  if (selectedMode === "halves") {
    return (
      <HalfTracingDrawing
        onBack={() => setSelectedMode("select")}
        childId={childId || undefined}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#E8EDF4" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft size={22} />
        </Button>
        <span className="text-lg font-medium text-foreground/80">Домой</span>
      </div>

      {/* Title */}
      <div className="px-6 pb-4">
        <h1 className="text-3xl font-bold text-foreground">Рисование</h1>
      </div>

      {/* Cards grid */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {DRAWING_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedMode(card.id)}
              className="rounded-2xl overflow-hidden text-left transition-transform hover:scale-[1.03] active:scale-[0.98] shadow-sm"
              style={{ backgroundColor: card.bg }}
            >
              <div className="aspect-[4/3] flex items-center justify-center p-3">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "120px" }}
                />
              </div>
              <div className="bg-white px-4 py-3 rounded-b-2xl">
                <p className="text-sm font-medium text-foreground">{card.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
