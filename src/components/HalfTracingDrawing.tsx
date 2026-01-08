import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, RotateCcw, Save, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { SimpleColorPalette, THERAPEUTIC_COLORS } from "./drawing";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface HalfTracingDrawingProps {
  onBack: () => void;
  childId?: string;
}

// Simple symmetrical templates (SVG paths for left half)
const TEMPLATES = [
  {
    id: "butterfly",
    name: "Бабочка",
    path: "M 0,50 Q 20,20 40,30 Q 60,10 50,50 Q 60,90 40,70 Q 20,80 0,50",
    color: "#FF6B9D",
  },
  {
    id: "heart",
    name: "Сердце",
    path: "M 0,40 Q 0,10 25,10 Q 50,10 50,40 L 50,50 Q 50,80 25,100 L 0,75",
    color: "#FF6B6B",
  },
  {
    id: "tree",
    name: "Дерево",
    path: "M 0,100 L 0,70 Q 10,60 5,50 Q 20,40 10,30 Q 30,20 15,10 Q 40,0 50,20 L 50,100",
    color: "#4ADE80",
  },
  {
    id: "star",
    name: "Звезда",
    path: "M 0,35 L 15,40 L 25,25 L 35,40 L 50,35 L 40,50 L 50,65 L 35,60 L 25,75 L 15,60 L 0,65 L 10,50 Z",
    color: "#FBBF24",
  },
  {
    id: "flower",
    name: "Цветок",
    path: "M 0,50 Q 15,30 25,35 Q 35,15 50,30 Q 50,50 50,70 Q 35,85 25,65 Q 15,70 0,50",
    color: "#F472B6",
  },
  {
    id: "fish",
    name: "Рыбка",
    path: "M 0,50 Q 10,30 30,35 Q 45,25 50,40 L 50,60 Q 45,75 30,65 Q 10,70 0,50",
    color: "#60A5FA",
  },
];

const HalfTracingDrawing: React.FC<HalfTracingDrawingProps> = ({ onBack, childId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#F5B7B1");
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const brushSize = 6;

  const currentTemplate = TEMPLATES[currentTemplateIndex];

  const drawTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, width, height);

    // Draw center dividing line
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.restore();

    // Calculate template scale and position
    const templateSize = Math.min(width / 2, height) * 0.7;
    const offsetX = (width / 4) - (templateSize / 2);
    const offsetY = (height / 2) - (templateSize / 2);

    // Draw left half (template)
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(templateSize / 50, templateSize / 50);

    const path = new Path2D(currentTemplate.path);
    ctx.fillStyle = currentTemplate.color;
    ctx.fill(path);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke(path);
    ctx.restore();

    // Draw dotted outline on the right side as guide
    ctx.save();
    ctx.translate(width - offsetX, offsetY);
    ctx.scale(-templateSize / 50, templateSize / 50);

    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke(path);
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawTemplate(ctx, canvas.width, canvas.height);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [currentTemplateIndex]);

  const getCanvasPoint = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Only allow drawing on the right half
    if (point.x < canvas.width / 2) {
      return;
    }

    setIsDrawing(true);
    setLastPoint(point);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    // Only draw on right half
    if (point.x < canvas.width / 2) {
      return;
    }

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setLastPoint(point);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    drawTemplate(ctx, canvas.width, canvas.height);
  };

  const nextTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev + 1) % TEMPLATES.length);
  };

  const prevTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev - 1 + TEMPLATES.length) % TEMPLATES.length);
  };

  const saveArtwork = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Войди в аккаунт для сохранения");
        return;
      }

      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `half_tracing_${currentTemplate.id}_${Date.now()}.png`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("artworks")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("artworks").insert({
        user_id: user.id,
        child_id: childId,
        image_url: publicUrl,
        storage_path: filePath,
        metadata: { type: "half_tracing", template: currentTemplate.id },
      });

      if (dbError) throw dbError;

      toast.success("Рисунок сохранён! ✨");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Не удалось сохранить");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-card/80 backdrop-blur-sm border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-12 w-12">
          <ArrowLeft className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevTemplate} className="h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            {currentTemplate.name}
          </span>
          <Button variant="ghost" size="icon" onClick={nextTemplate} className="h-10 w-10">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={clearCanvas} className="h-12 w-12">
            <RotateCcw className="h-6 w-6" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={saveArtwork}
            disabled={isSaving}
            className="h-12 w-12 bg-primary"
          >
            {isSaving ? <Sparkles className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Canvas Area - 75% of screen */}
      <div className="flex-1 relative min-h-0" style={{ height: "calc(100vh - 180px)" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Color Palette */}
      <div className="shrink-0 bg-card/80 backdrop-blur-sm border-t p-3">
        <SimpleColorPalette
          colors={THERAPEUTIC_COLORS}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
        />
      </div>
    </div>
  );
};

export default HalfTracingDrawing;
