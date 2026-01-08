import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, RotateCcw, Save, Sparkles } from "lucide-react";
import { MinimalToolbar, SimpleColorPalette, THERAPEUTIC_COLORS } from "./drawing";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SymmetryDrawingProps {
  onBack: () => void;
  childId?: string;
}

type SymmetryAxis = "vertical" | "horizontal" | "both";

const SymmetryDrawing: React.FC<SymmetryDrawingProps> = ({ onBack, childId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#F5B7B1");
  const [symmetryAxis, setSymmetryAxis] = useState<SymmetryAxis>("vertical");
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const brushSize = 8;

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
        ctx.fillStyle = "#FFFEF7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawAxisGuide(ctx, canvas.width, canvas.height);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [symmetryAxis]);

  const drawAxisGuide = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
    ctx.lineWidth = 2;

    if (symmetryAxis === "vertical" || symmetryAxis === "both") {
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
    }

    if (symmetryAxis === "horizontal" || symmetryAxis === "both") {
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    ctx.restore();
  };

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

  const drawMirroredLine = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Original line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Mirrored lines based on axis
    if (symmetryAxis === "vertical" || symmetryAxis === "both") {
      const mirrorX1 = width - fromX;
      const mirrorX2 = width - toX;
      ctx.beginPath();
      ctx.moveTo(mirrorX1, fromY);
      ctx.lineTo(mirrorX2, toY);
      ctx.stroke();
    }

    if (symmetryAxis === "horizontal" || symmetryAxis === "both") {
      const mirrorY1 = height - fromY;
      const mirrorY2 = height - toY;
      ctx.beginPath();
      ctx.moveTo(fromX, mirrorY1);
      ctx.lineTo(toX, mirrorY2);
      ctx.stroke();
    }

    if (symmetryAxis === "both") {
      const mirrorX1 = width - fromX;
      const mirrorX2 = width - toX;
      const mirrorY1 = height - fromY;
      const mirrorY2 = height - toY;
      ctx.beginPath();
      ctx.moveTo(mirrorX1, mirrorY1);
      ctx.lineTo(mirrorX2, mirrorY2);
      ctx.stroke();
    }
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
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

    drawMirroredLine(ctx, lastPoint.x, lastPoint.y, point.x, point.y, canvas.width, canvas.height);
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

    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawAxisGuide(ctx, canvas.width, canvas.height);
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
      const fileName = `symmetry_${Date.now()}.png`;
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
        metadata: { type: "symmetry", axis: symmetryAxis },
      });

      if (dbError) throw dbError;

      toast.success("Симметричный рисунок сохранён! ✨");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Не удалось сохранить");
    } finally {
      setIsSaving(false);
    }
  };

  const cycleSymmetryAxis = () => {
    const axes: SymmetryAxis[] = ["vertical", "horizontal", "both"];
    const currentIndex = axes.indexOf(symmetryAxis);
    const nextIndex = (currentIndex + 1) % axes.length;
    setSymmetryAxis(axes[nextIndex]);
    clearCanvas();
  };

  const getAxisLabel = () => {
    switch (symmetryAxis) {
      case "vertical": return "↔️";
      case "horizontal": return "↕️";
      case "both": return "✛";
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-card/80 backdrop-blur-sm border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-12 w-12">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={cycleSymmetryAxis}
            className="h-12 w-12 text-xl"
            title="Сменить ось симметрии"
          >
            {getAxisLabel()}
          </Button>
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

export default SymmetryDrawing;
