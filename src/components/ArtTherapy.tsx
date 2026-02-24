import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { SoloDrawing } from "./SoloDrawing";
import { DualDrawing } from "./DualDrawing";
import { TracingDrawing } from "./TracingDrawing";
import SymmetryDrawing from "./SymmetryDrawing";
import HalfTracingDrawing from "./HalfTracingDrawing";
import cardDuck from "@/assets/card-tracing-duck.png";
import cardCat from "@/assets/card-tracing-cat.png";
import cardSymmetry from "@/assets/card-symmetry.png";
import cardHalves from "@/assets/card-halves.png";
import cardEasel from "@/assets/card-easel.png";

interface ArtTherapyProps {
  onBack: () => void;
  childName: string;
  childId?: string | null;
  taskId?: string | null;
  taskPrompt?: string | null;
}

type DrawingMode = "select" | "tracing" | "symmetry" | "half" | "solo" | "dual";

export const ArtTherapy = ({ onBack, childName, childId, taskId, taskPrompt }: ArtTherapyProps) => {
  const [mode, setMode] = useState<DrawingMode>("select");

  if (mode === "solo") return <SoloDrawing onBack={() => setMode("select")} childName={childName} childId={childId} taskId={taskId} taskPrompt={taskPrompt} />;
  if (mode === "dual") return <DualDrawing onBack={() => setMode("select")} childName={childName} />;
  if (mode === "tracing") return <TracingDrawing onBack={() => setMode("select")} childName={childName} childId={childId || undefined} />;
  if (mode === "symmetry") return <SymmetryDrawing onBack={() => setMode("select")} childId={childId || undefined} />;
  if (mode === "half") return <HalfTracingDrawing onBack={() => setMode("select")} childId={childId || undefined} />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#E3EBF5" }}>
      {/* Header */}
      <div className="flex items-center gap-1 px-6 pt-5 pb-1">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-foreground/60 hover:text-foreground px-2">
          <ArrowLeft size={20} />
          <span className="text-base font-normal">Домой</span>
        </Button>
      </div>

      <div className="px-6 pb-8">
        <h1 className="text-[28px] font-semibold mb-5 text-foreground/90">Рисование</h1>

        {/* 4 cards in a row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          
          {/* Трафареты */}
          <button
            onClick={() => setMode("tracing")}
            className="rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] hover:shadow-lg bg-white"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
          >
            <div className="relative" style={{ backgroundColor: "#A3D4A0", paddingBottom: "80%" }}>
              <img src={cardDuck} alt="" style={{
                position: "absolute", left: "6%", top: "10%", width: "55%",
                transform: "rotate(-12deg)", filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.1))"
              }} />
              <img src={cardCat} alt="" style={{
                position: "absolute", right: "4%", bottom: "6%", width: "52%",
                transform: "rotate(8deg)", filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.1))"
              }} />
            </div>
            <div className="px-3.5 py-3">
              <span className="text-[15px] font-medium text-foreground">Трафареты</span>
            </div>
          </button>

          {/* Симметрия */}
          <button
            onClick={() => setMode("symmetry")}
            className="rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] hover:shadow-lg bg-white"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#6DC0D5", paddingBottom: "80%" }}>
              <img src={cardSymmetry} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "78%", objectFit: "contain",
                borderRadius: "4px",
                background: "white",
                padding: "4%",
              }} />
            </div>
            <div className="px-3.5 py-3">
              <span className="text-[15px] font-medium text-foreground">Симметрия</span>
            </div>
          </button>

          {/* Половинки */}
          <button
            onClick={() => setMode("half")}
            className="rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] hover:shadow-lg bg-white"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#E09B9B", paddingBottom: "80%" }}>
              <img src={cardHalves} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%) rotate(4deg)",
                width: "72%", objectFit: "contain",
                filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.12))"
              }} />
            </div>
            <div className="px-3.5 py-3">
              <span className="text-[15px] font-medium text-foreground">Половинки</span>
            </div>
          </button>

          {/* Свободное рисование */}
          <button
            onClick={() => setMode("solo")}
            className="rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] hover:shadow-lg bg-white"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#E4BF96", paddingBottom: "80%" }}>
              <img src={cardEasel} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "56%", objectFit: "contain",
                filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.1))"
              }} />
            </div>
            <div className="px-3.5 py-3">
              <span className="text-[15px] font-medium text-foreground">Свободное рисование</span>
            </div>
          </button>
        </div>

        {/* Dual drawing */}
        <button
          onClick={() => setMode("dual")}
          className="w-full rounded-2xl text-left transition-all active:scale-[0.98] hover:shadow-lg flex items-center gap-4 p-4 bg-white"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#B8C9E8" }}>
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
