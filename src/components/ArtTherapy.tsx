import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Camera } from "lucide-react";
import { SoloDrawing } from "./SoloDrawing";
import { DualDrawing } from "./DualDrawing";
import { TracingDrawing } from "./TracingDrawing";
import SymmetryDrawing from "./SymmetryDrawing";
import HalfTracingDrawing from "./HalfTracingDrawing";
import { PhotoAnalysis } from "./PhotoAnalysis";
import { supabase } from "@/integrations/supabase/client";
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

type DrawingMode = "select" | "tracing" | "symmetry" | "half" | "solo" | "dual" | "photo";

export const ArtTherapy = ({ onBack, childName, childId, taskId, taskPrompt }: ArtTherapyProps) => {
  const [mode, setMode] = useState<DrawingMode>("select");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  if (mode === "solo") return <SoloDrawing onBack={() => setMode("select")} childName={childName} childId={childId} taskId={taskId} taskPrompt={taskPrompt} />;
  if (mode === "dual") return <DualDrawing onBack={() => setMode("select")} childName={childName} />;
  if (mode === "tracing") return <TracingDrawing onBack={() => setMode("select")} childName={childName} childId={childId || undefined} />;
  if (mode === "symmetry") return <SymmetryDrawing onBack={() => setMode("select")} childId={childId || undefined} />;
  if (mode === "half") return <HalfTracingDrawing onBack={() => setMode("select")} childId={childId || undefined} />;
  if (mode === "photo") return <PhotoAnalysis onBack={() => setMode("select")} userId={userId} childName={childName} />;

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
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)", maxWidth: 605 }}
          >
            <div className="relative overflow-hidden" style={{ backgroundColor: "#4ADE80", aspectRatio: "605/352" }}>
              <img src={cardDuck} alt="" style={{
                position: "absolute", left: "5%", top: "12%", width: "38%",
                transform: "rotate(-10deg)",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
              }} />
              <img src={cardCat} alt="" style={{
                position: "absolute", right: "3%", top: "8%", width: "42%",
                transform: "rotate(6deg)",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
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
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)", maxWidth: 605 }}
          >
            <div className="relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#4ACDDE", aspectRatio: "605/352" }}>
              <img src={cardSymmetry} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "70%", objectFit: "contain",
                borderRadius: "4px",
                background: "white",
                padding: "3%",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
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
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)", maxWidth: 605 }}
          >
            <div className="relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#FB7185", aspectRatio: "605/352" }}>
              <img src={cardHalves} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%) rotate(3deg)",
                width: "72%", objectFit: "contain",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
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
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)", maxWidth: 605 }}
          >
            <div className="relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#FAC4A0", aspectRatio: "605/352" }}>
              <img src={cardEasel} alt="" style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "45%", objectFit: "contain",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
              }} />
            </div>
            <div className="px-3.5 py-2.5 bg-white">
              <span className="text-[13px] font-medium text-foreground/60">Свободное рисование</span>
            </div>
          </button>
        </div>

        {/* Bottom row: scan + dual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Сканирование рисунка */}
          <button
            onClick={() => setMode("photo")}
            className="w-full rounded-[20px] text-left transition-all active:scale-[0.98] flex items-center gap-4 p-4 bg-white"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#A78BFA" }}>
              <Camera size={28} className="text-white" />
            </div>
            <div>
              <span className="text-[14px] font-medium text-foreground/60 block">Сканирование рисунка</span>
              <span className="text-[13px] text-foreground/35">Сфотографируй рисунок и получи AI-анализ</span>
            </div>
          </button>

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
    </div>
  );
};
