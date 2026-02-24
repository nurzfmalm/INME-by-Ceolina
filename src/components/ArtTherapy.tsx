import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { SoloDrawing } from "./SoloDrawing";
import { DualDrawing } from "./DualDrawing";
import { TracingDrawing } from "./TracingDrawing";
import SymmetryDrawing from "./SymmetryDrawing";
import HalfTracingDrawing from "./HalfTracingDrawing";
import cardDrawing from "@/assets/card-drawing.png";

interface ArtTherapyProps {
  onBack: () => void;
  childName: string;
  childId?: string | null;
  taskId?: string | null;
  taskPrompt?: string | null;
}

type DrawingMode = "select" | "tracing" | "symmetry" | "half" | "solo" | "dual";

interface CardItem {
  id: DrawingMode;
  label: string;
  color: string;
}

const CARDS: CardItem[] = [
  { id: "tracing", label: "Трафареты", color: "#A8D5A2" },
  { id: "symmetry", label: "Симметрия", color: "#7EC8D9" },
  { id: "half", label: "Половинки", color: "#E8A0A0" },
  { id: "solo", label: "Свободное рисование", color: "#E8C49A" },
];

export const ArtTherapy = ({ onBack, childName, childId, taskId, taskPrompt }: ArtTherapyProps) => {
  const [mode, setMode] = useState<DrawingMode>("select");

  if (mode === "solo") {
    return <SoloDrawing onBack={() => setMode("select")} childName={childName} childId={childId} taskId={taskId} taskPrompt={taskPrompt} />;
  }
  if (mode === "dual") {
    return <DualDrawing onBack={() => setMode("select")} childName={childName} />;
  }
  if (mode === "tracing") {
    return <TracingDrawing onBack={() => setMode("select")} childName={childName} childId={childId || undefined} />;
  }
  if (mode === "symmetry") {
    return <SymmetryDrawing onBack={() => setMode("select")} childId={childId || undefined} />;
  }
  if (mode === "half") {
    return <HalfTracingDrawing onBack={() => setMode("select")} childId={childId || undefined} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#E8EEF6" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-foreground/70 hover:text-foreground px-2">
          <ArrowLeft size={20} />
          <span className="text-base">Домой</span>
        </Button>
      </div>

      <div className="px-5 pb-6">
        <h1 className="text-3xl font-bold mb-5">Рисование</h1>

        {/* Drawing mode cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => setMode(card.id)}
              className="rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.97] hover:shadow-lg"
              style={{ backgroundColor: "#fff" }}
            >
              <div
                className="h-28 md:h-32 flex items-center justify-center p-4"
                style={{ backgroundColor: card.color }}
              >
                <img
                  src={cardDrawing}
                  alt={card.label}
                  className="h-full object-contain opacity-80"
                  style={{ maxHeight: "90px", filter: "grayscale(0.15)" }}
                />
              </div>
              <div className="px-3 py-2.5">
                <span className="text-sm font-medium text-foreground">{card.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Dual drawing card */}
        <button
          onClick={() => setMode("dual")}
          className="w-full rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.97] hover:shadow-lg flex items-center gap-4 p-4"
          style={{ backgroundColor: "#fff" }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#B8C9E8" }}
          >
            <Users size={28} className="text-white" />
          </div>
          <div>
            <span className="text-base font-semibold text-foreground block">Рисовать вместе</span>
            <span className="text-sm text-muted-foreground">Совместное рисование с другом или родителем</span>
          </div>
        </button>
      </div>
    </div>
  );
};
