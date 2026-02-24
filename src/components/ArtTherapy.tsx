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
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-foreground/40 hover:text-foreground/60 px-2">
          <ArrowLeft size={20} />
          <span className="text-base font-normal">Домой</span>
        </Button>
      </div>

      <div className="px-6 pb-8">
        <h1 className="text-[24px] font-normal mb-7 text-foreground/45">Рисование</h1>

        {/* 4 cards in a row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-7">
          
          {/* Трафареты */}
          <button
            onClick={() => setMode("tracing")}
            className="rounded-[20px] overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
          >
            <div className="relative" style={{ backgroundColor: "#4ADE80", paddingBottom: "85%" }}>
              <img src={cardDuck} alt="" style={{
                position: "absolute", left: "12%", top: "14%", width: "46%",
                transform: "rotate(-3deg)"
              }} />
              <img src={cardCat} alt="" style={{
                position: "absolute", right: "10%", bottom: "12%", width: "42%",
                transform: "rotate(2deg)"
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white">
              <span className="text-[13px] font-medium text-foreground/60">Трафареты</span>
            </div>
          </button>

          {/* Симметрия */}
          <button
            onClick={() => setMode("symmetry")}
            className="rounded-[20px] overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#4ACDDE", paddingBottom: "85%" }}>
              <img src={cardSymmetry} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%) rotate(1deg)",
                width: "62%", objectFit: "contain",
                borderRadius: "4px",
                background: "white",
                padding: "3%",
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white">
              <span className="text-[13px] font-medium text-foreground/60">Симметрия</span>
            </div>
          </button>

          {/* Половинки */}
          <button
            onClick={() => setMode("half")}
            className="rounded-[20px] overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#FB7185", paddingBottom: "85%" }}>
              <img src={cardHalves} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%) rotate(1.5deg)",
                width: "60%", objectFit: "contain",
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white">
              <span className="text-[13px] font-medium text-foreground/60">Половинки</span>
            </div>
          </button>

          {/* Свободное рисование */}
          <button
            onClick={() => setMode("solo")}
            className="rounded-[20px] overflow-hidden text-left transition-all active:scale-[0.97]"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
          >
            <div className="relative flex items-center justify-center" style={{ backgroundColor: "#FAC4A0", paddingBottom: "85%" }}>
              <img src={cardEasel} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "50%", objectFit: "contain",
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white">
              <span className="text-[13px] font-medium text-foreground/60">Свободное рисование</span>
            </div>
          </button>
        </div>

        {/* Dual drawing */}
        <button
          onClick={() => setMode("dual")}
          className="w-full rounded-[20px] text-left transition-all active:scale-[0.98] flex items-center gap-4 p-4 bg-white"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#C4D4EC" }}>
            <Users size={28} className="text-white" />
          </div>
          <div>
            <span className="text-[14px] font-medium text-foreground/60 block">Рисовать вместе</span>
            <span className="text-[13px] text-foreground/35">Совместное рисование с другом или родителем</span>
          </div>
        </button>
      </div>
    </div>
  );
};
