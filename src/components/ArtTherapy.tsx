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

interface CardItem {
  id: DrawingMode;
  label: string;
  color: string;
  images: { src: string; style: React.CSSProperties }[];
}

const CARDS: CardItem[] = [
  {
    id: "tracing",
    label: "Трафареты",
    color: "#A8D5A2",
    images: [
      { src: cardDuck, style: { position: "absolute", left: "8%", top: "8%", width: "52%", transform: "rotate(-8deg)" } },
      { src: cardCat, style: { position: "absolute", right: "6%", bottom: "8%", width: "48%", transform: "rotate(6deg)" } },
    ],
  },
  {
    id: "symmetry",
    label: "Симметрия",
    color: "#7EC8D9",
    images: [
      { src: cardSymmetry, style: { position: "absolute", inset: "8%", width: "84%", height: "84%", objectFit: "contain" } },
    ],
  },
  {
    id: "half",
    label: "Половинки",
    color: "#E8A0A0",
    images: [
      { src: cardHalves, style: { position: "absolute", inset: "6%", width: "88%", height: "88%", objectFit: "contain" } },
    ],
  },
  {
    id: "solo",
    label: "Свободное рисование",
    color: "#E8C49A",
    images: [
      { src: cardEasel, style: { position: "absolute", inset: "12%", width: "76%", height: "76%", objectFit: "contain" } },
    ],
  },
];

export const ArtTherapy = ({ onBack, childName, childId, taskId, taskPrompt }: ArtTherapyProps) => {
  const [mode, setMode] = useState<DrawingMode>("select");

  if (mode === "solo") return <SoloDrawing onBack={() => setMode("select")} childName={childName} childId={childId} taskId={taskId} taskPrompt={taskPrompt} />;
  if (mode === "dual") return <DualDrawing onBack={() => setMode("select")} childName={childName} />;
  if (mode === "tracing") return <TracingDrawing onBack={() => setMode("select")} childName={childName} childId={childId || undefined} />;
  if (mode === "symmetry") return <SymmetryDrawing onBack={() => setMode("select")} childId={childId || undefined} />;
  if (mode === "half") return <HalfTracingDrawing onBack={() => setMode("select")} childId={childId || undefined} />;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#E8EEF6" }}>
      <div className="flex items-center gap-2 px-5 pt-5 pb-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-foreground/70 hover:text-foreground px-2">
          <ArrowLeft size={20} />
          <span className="text-base">Домой</span>
        </Button>
      </div>

      <div className="px-5 pb-6">
        <h1 className="text-3xl font-bold mb-5">Рисование</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => setMode(card.id)}
              className="rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.97] hover:shadow-lg"
              style={{ backgroundColor: "#fff" }}
            >
              <div
                className="relative"
                style={{ backgroundColor: card.color, paddingBottom: "75%" }}
              >
                {card.images.map((img, i) => (
                  <img key={i} src={img.src} alt="" className="pointer-events-none" style={img.style} />
                ))}
              </div>
              <div className="px-3 py-2.5">
                <span className="text-sm font-medium text-foreground">{card.label}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setMode("dual")}
          className="w-full rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.97] hover:shadow-lg flex items-center gap-4 p-4"
          style={{ backgroundColor: "#fff" }}
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
