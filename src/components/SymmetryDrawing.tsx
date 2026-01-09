import React, { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, RotateCcw, Save, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { SimpleColorPalette, THERAPEUTIC_COLORS } from "./drawing";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SymmetryDrawingProps {
  onBack: () => void;
  childId?: string;
}

// Bilateral coordination templates - symmetrical patterns to trace with both hands
interface SymmetryTemplate {
  id: string;
  name: string;
  drawPattern: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

const SYMMETRY_TEMPLATES: SymmetryTemplate[] = [
  {
    id: "zigzag",
    name: "Зигзаг",
    drawPattern: (ctx, width, height) => {
      const centerX = width / 2;
      const startY = height * 0.15;
      const endY = height * 0.85;
      const amplitude = width * 0.15;
      const segments = 5;
      const segmentHeight = (endY - startY) / segments;

      // Left side - yellow/orange zigzag
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      
      // Draw left zigzag
      ctx.strokeStyle = "#F59E0B";
      ctx.beginPath();
      ctx.moveTo(centerX - 20, startY);
      for (let i = 0; i <= segments; i++) {
        const y = startY + i * segmentHeight;
        const x = i % 2 === 0 ? centerX - 20 : centerX - 20 - amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw right zigzag (mirror)
      ctx.strokeStyle = "#DC2626";
      ctx.beginPath();
      ctx.moveTo(centerX + 20, startY);
      for (let i = 0; i <= segments; i++) {
        const y = startY + i * segmentHeight;
        const x = i % 2 === 0 ? centerX + 20 : centerX + 20 + amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw start/end dots
      ctx.setLineDash([]);
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(centerX - 20, startY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FCD34D";
      ctx.beginPath();
      ctx.arc(centerX - 20, endY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#DC2626";
      ctx.beginPath();
      ctx.arc(centerX + 20, startY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F87171";
      ctx.beginPath();
      ctx.arc(centerX + 20, endY, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "spirals",
    name: "Спирали",
    drawPattern: (ctx, width, height) => {
      const leftCenterX = width * 0.3;
      const rightCenterX = width * 0.7;
      const centerY = height * 0.5;
      const maxRadius = Math.min(width * 0.22, height * 0.35);

      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;

      // Left spiral (clockwise from outside)
      ctx.strokeStyle = "#0EA5E9";
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 6; angle += 0.1) {
        const radius = maxRadius - (angle / (Math.PI * 6)) * (maxRadius - 15);
        const x = leftCenterX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Right spiral (counter-clockwise from outside - mirrored)
      ctx.strokeStyle = "#F97316";
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 6; angle += 0.1) {
        const radius = maxRadius - (angle / (Math.PI * 6)) * (maxRadius - 15);
        const x = rightCenterX - Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Start dots (outer)
      ctx.setLineDash([]);
      ctx.fillStyle = "#0EA5E9";
      ctx.beginPath();
      ctx.arc(leftCenterX + maxRadius, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#F97316";
      ctx.beginPath();
      ctx.arc(rightCenterX - maxRadius, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Center dots
      ctx.fillStyle = "#06B6D4";
      ctx.beginPath();
      ctx.arc(leftCenterX, centerY, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FB923C";
      ctx.beginPath();
      ctx.arc(rightCenterX, centerY, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "loops",
    name: "Петли",
    drawPattern: (ctx, width, height) => {
      const centerX = width / 2;
      const startY = height * 0.12;
      const endY = height * 0.88;
      const loopRadius = height * 0.12;
      const spacing = (endY - startY) / 3;

      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;

      // Left loops
      ctx.strokeStyle = "#4A5568";
      ctx.beginPath();
      ctx.moveTo(centerX - 15, startY);
      for (let i = 0; i < 3; i++) {
        const baseY = startY + spacing * (i + 0.5);
        // Draw loop going left
        ctx.bezierCurveTo(
          centerX - 15, baseY - loopRadius,
          centerX - 15 - loopRadius * 2, baseY - loopRadius,
          centerX - 15 - loopRadius * 2, baseY
        );
        ctx.bezierCurveTo(
          centerX - 15 - loopRadius * 2, baseY + loopRadius,
          centerX - 15, baseY + loopRadius,
          centerX - 15, baseY + spacing * 0.5
        );
      }
      ctx.stroke();

      // Right loops (mirrored)
      ctx.strokeStyle = "#4A5568";
      ctx.beginPath();
      ctx.moveTo(centerX + 15, startY);
      for (let i = 0; i < 3; i++) {
        const baseY = startY + spacing * (i + 0.5);
        // Draw loop going right
        ctx.bezierCurveTo(
          centerX + 15, baseY - loopRadius,
          centerX + 15 + loopRadius * 2, baseY - loopRadius,
          centerX + 15 + loopRadius * 2, baseY
        );
        ctx.bezierCurveTo(
          centerX + 15 + loopRadius * 2, baseY + loopRadius,
          centerX + 15, baseY + loopRadius,
          centerX + 15, baseY + spacing * 0.5
        );
      }
      ctx.stroke();

      // Start/end dots
      ctx.setLineDash([]);
      ctx.fillStyle = "#0EA5E9";
      ctx.beginPath();
      ctx.arc(centerX - 15, startY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.arc(centerX + 15, startY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#F97316";
      ctx.beginPath();
      ctx.arc(centerX - 15, endY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.arc(centerX + 15, endY, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "figure8",
    name: "Восьмёрка",
    drawPattern: (ctx, width, height) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const loopWidth = width * 0.18;
      const loopHeight = height * 0.3;

      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;

      // Left figure-8
      ctx.strokeStyle = "#DC2626";
      ctx.beginPath();
      // Top loop
      ctx.moveTo(centerX - loopWidth, centerY);
      ctx.bezierCurveTo(
        centerX - loopWidth, centerY - loopHeight,
        centerX - loopWidth * 3, centerY - loopHeight,
        centerX - loopWidth * 2, centerY
      );
      // Bottom loop
      ctx.bezierCurveTo(
        centerX - loopWidth * 3, centerY + loopHeight,
        centerX - loopWidth, centerY + loopHeight,
        centerX - loopWidth, centerY
      );
      ctx.stroke();

      // Right figure-8 (mirrored)
      ctx.strokeStyle = "#0EA5E9";
      ctx.beginPath();
      // Top loop
      ctx.moveTo(centerX + loopWidth, centerY);
      ctx.bezierCurveTo(
        centerX + loopWidth, centerY - loopHeight,
        centerX + loopWidth * 3, centerY - loopHeight,
        centerX + loopWidth * 2, centerY
      );
      // Bottom loop
      ctx.bezierCurveTo(
        centerX + loopWidth * 3, centerY + loopHeight,
        centerX + loopWidth, centerY + loopHeight,
        centerX + loopWidth, centerY
      );
      ctx.stroke();

      // Center crossing dots
      ctx.setLineDash([]);
      ctx.fillStyle = "#DC2626";
      ctx.beginPath();
      ctx.arc(centerX - loopWidth, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0EA5E9";
      ctx.beginPath();
      ctx.arc(centerX + loopWidth, centerY, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "waves",
    name: "Волны",
    drawPattern: (ctx, width, height) => {
      const centerX = width / 2;
      const startY = height * 0.15;
      const endY = height * 0.85;
      const amplitude = width * 0.12;
      const wavelength = (endY - startY) / 4;

      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;

      // Left wave
      ctx.strokeStyle = "#10B981";
      ctx.beginPath();
      ctx.moveTo(centerX - 20, startY);
      for (let y = startY; y <= endY; y += 2) {
        const progress = (y - startY) / (endY - startY);
        const x = centerX - 20 - Math.sin(progress * Math.PI * 4) * amplitude;
        if (y === startY) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Right wave (mirrored)
      ctx.strokeStyle = "#8B5CF6";
      ctx.beginPath();
      ctx.moveTo(centerX + 20, startY);
      for (let y = startY; y <= endY; y += 2) {
        const progress = (y - startY) / (endY - startY);
        const x = centerX + 20 + Math.sin(progress * Math.PI * 4) * amplitude;
        if (y === startY) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Start/end dots
      ctx.setLineDash([]);
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(centerX - 20, startY, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#8B5CF6";
      ctx.beginPath();
      ctx.arc(centerX + 20, startY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#34D399";
      ctx.beginPath();
      ctx.arc(centerX - 20, endY, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#A78BFA";
      ctx.beginPath();
      ctx.arc(centerX + 20, endY, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "hearts",
    name: "Сердечки",
    drawPattern: (ctx, width, height) => {
      const leftCenterX = width * 0.3;
      const rightCenterX = width * 0.7;
      const centerY = height * 0.5;
      const size = Math.min(width * 0.2, height * 0.3);

      const drawHeart = (cx: number, cy: number, s: number) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.3);
        // Left curve
        ctx.bezierCurveTo(
          cx - s * 0.5, cy - s * 0.3,
          cx - s, cy + s * 0.1,
          cx, cy + s * 0.7
        );
        // Right curve
        ctx.moveTo(cx, cy + s * 0.3);
        ctx.bezierCurveTo(
          cx + s * 0.5, cy - s * 0.3,
          cx + s, cy + s * 0.1,
          cx, cy + s * 0.7
        );
        ctx.stroke();
      };

      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;

      ctx.strokeStyle = "#EC4899";
      drawHeart(leftCenterX, centerY, size);

      ctx.strokeStyle = "#F43F5E";
      drawHeart(rightCenterX, centerY, size);

      // Top dots
      ctx.setLineDash([]);
      ctx.fillStyle = "#EC4899";
      ctx.beginPath();
      ctx.arc(leftCenterX, centerY + size * 0.3, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#F43F5E";
      ctx.beginPath();
      ctx.arc(rightCenterX, centerY + size * 0.3, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
];

const SymmetryDrawing: React.FC<SymmetryDrawingProps> = ({ onBack, childId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#F5B7B1");
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const brushSize = 6;

  const currentTemplate = SYMMETRY_TEMPLATES[currentTemplateIndex];

  const drawTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // White background
    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, width, height);

    // Center dividing line
    ctx.save();
    ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.restore();

    // Draw the pattern template
    currentTemplate.drawPattern(ctx, width, height);
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

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);

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
    setCurrentTemplateIndex((prev) => (prev + 1) % SYMMETRY_TEMPLATES.length);
  };

  const prevTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev - 1 + SYMMETRY_TEMPLATES.length) % SYMMETRY_TEMPLATES.length);
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
      const fileName = `symmetry_${currentTemplate.id}_${Date.now()}.png`;
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
        metadata: { type: "symmetry_tracing", template: currentTemplate.id },
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

      {/* Instruction */}
      <div className="text-center py-2 text-sm text-muted-foreground bg-muted/30">
        Проведи линии двумя руками одновременно 🖐️🖐️
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative min-h-0" style={{ height: "calc(100vh - 200px)" }}>
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
