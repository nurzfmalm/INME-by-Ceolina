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
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-foreground/50 hover:text-foreground/70 px-2">
          <ArrowLeft size={20} />
          <span className="text-base font-normal">Домой</span>
        </Button>
      </div>

      <div className="px-6 pb-8">
        <h1 className="text-[26px] font-medium mb-6 text-foreground/60">Рисование</h1>

        {/* 4 cards in a row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
          
          {/* Трафареты */}
          <button
            onClick={() => setMode("tracing")}
            className="rounded-3xl overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div className="relative" style={{ backgroundColor: "#C2E0BF", paddingBottom: "80%" }}>
              <img src={cardDuck} alt="" style={{
                position: "absolute", left: "8%", top: "12%", width: "52%",
                transform: "rotate(-6deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
              }} />
              <img src={cardCat} alt="" style={{
                position: "absolute", right: "6%", bottom: "8%", width: "48%",
                transform: "rotate(4deg)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white/80">
              <span className="text-[14px] font-medium text-foreground/70">Трафареты</span>
            </div>
          </button>

          {/* Симметрия */}
          <button
            onClick={() => setMode("symmetry")}
            className="rounded-3xl overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#A8D8E4", paddingBottom: "80%" }}>
              <img src={cardSymmetry} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "76%", objectFit: "contain",
                borderRadius: "4px",
                background: "white",
                padding: "4%",
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white/80">
              <span className="text-[14px] font-medium text-foreground/70">Симметрия</span>
            </div>
          </button>

          {/* Половинки */}
          <button
            onClick={() => setMode("half")}
            className="rounded-3xl overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#EBBCBC", paddingBottom: "80%" }}>
              <img src={cardHalves} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%) rotate(2deg)",
                width: "72%", objectFit: "contain",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white/80">
              <span className="text-[14px] font-medium text-foreground/70">Половинки</span>
            </div>
          </button>

          {/* Свободное рисование */}
          <button
            onClick={() => setMode("solo")}
            className="rounded-3xl overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#EDCFAD", paddingBottom: "80%" }}>
              <img src={cardEasel} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "56%", objectFit: "contain",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white/80">
              <span className="text-[14px] font-medium text-foreground/70">Свободное рисование</span>
            </div>
          </button>
        </div>

        {/* Dual drawing */}
        <button
          onClick={() => setMode("dual")}
          className="w-full rounded-3xl text-left transition-all active:scale-[0.98] flex items-center gap-4 p-4 bg-white/80"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#C4D4EC" }}>
            <Users size={28} className="text-white" />
          </div>
          <div>
            <span className="text-[15px] font-medium text-foreground/70 block">Рисовать вместе</span>
            <span className="text-sm text-foreground/40">Совместное рисование с другом или родителем</span>
          </div>
        </button>
      </div>
    </div>
  );
};
