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

// Matryoshka-style symmetrical templates with drawing functions
interface TemplateData {
  id: string;
  name: string;
  draw: (ctx: CanvasRenderingContext2D, size: number, filled: boolean) => void;
}

const TEMPLATES: TemplateData[] = [
  {
    id: "matryoshka",
    name: "Матрёшка",
    draw: (ctx, size, filled) => {
      const s = size / 100;
      
      // Head circle
      ctx.beginPath();
      ctx.arc(50 * s, 25 * s, 20 * s, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = "#FFE4C4";
        ctx.fill();
      }
      ctx.stroke();
      
      // Body (pear shape)
      ctx.beginPath();
      ctx.moveTo(30 * s, 40 * s);
      ctx.quadraticCurveTo(15 * s, 60 * s, 20 * s, 80 * s);
      ctx.quadraticCurveTo(25 * s, 95 * s, 50 * s, 95 * s);
      ctx.quadraticCurveTo(75 * s, 95 * s, 80 * s, 80 * s);
      ctx.quadraticCurveTo(85 * s, 60 * s, 70 * s, 40 * s);
      ctx.quadraticCurveTo(60 * s, 35 * s, 50 * s, 45 * s);
      ctx.quadraticCurveTo(40 * s, 35 * s, 30 * s, 40 * s);
      if (filled) {
        ctx.fillStyle = "#FF6B6B";
        ctx.fill();
      }
      ctx.stroke();
      
      // Face details (only on filled side)
      if (filled) {
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(44 * s, 22 * s, 2 * s, 0, Math.PI * 2);
        ctx.arc(56 * s, 22 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(50 * s, 30 * s, 3 * s, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    }
  },
  {
    id: "ball",
    name: "Мяч",
    draw: (ctx, size, filled) => {
      const s = size / 100;
      
      // Main circle
      ctx.beginPath();
      ctx.arc(50 * s, 50 * s, 40 * s, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = "#87CEEB";
        ctx.fill();
      }
      ctx.stroke();
      
      // Stripe lines
      ctx.beginPath();
      ctx.moveTo(25 * s, 20 * s);
      ctx.lineTo(75 * s, 80 * s);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(20 * s, 50 * s);
      ctx.lineTo(80 * s, 50 * s);
      ctx.stroke();
      
      if (filled) {
        // Color segments
        ctx.fillStyle = "#FF6B6B";
        ctx.beginPath();
        ctx.arc(50 * s, 50 * s, 40 * s, -0.3 * Math.PI, 0.2 * Math.PI);
        ctx.lineTo(50 * s, 50 * s);
        ctx.closePath();
        ctx.fill();
      }
    }
  },
  {
    id: "spider",
    name: "Паучок",
    draw: (ctx, size, filled) => {
      const s = size / 100;
      
      // Body circle
      ctx.beginPath();
      ctx.arc(50 * s, 50 * s, 15 * s, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = "#4A5568";
        ctx.fill();
      }
      ctx.stroke();
      
      // Legs
      const legAngles = [-0.7, -0.4, 0.4, 0.7];
      legAngles.forEach(angle => {
        ctx.beginPath();
        ctx.moveTo(50 * s, 50 * s);
        const endX = 50 * s + Math.cos(angle) * 35 * s;
        const endY = 50 * s + Math.sin(angle) * 35 * s;
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Mirror legs
        ctx.beginPath();
        ctx.moveTo(50 * s, 50 * s);
        const endX2 = 50 * s + Math.cos(Math.PI - angle) * 35 * s;
        const endY2 = 50 * s + Math.sin(Math.PI - angle) * 35 * s;
        ctx.lineTo(endX2, endY2);
        ctx.stroke();
      });
      
      if (filled) {
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(45 * s, 45 * s, 3 * s, 0, Math.PI * 2);
        ctx.arc(55 * s, 45 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: "butterfly",
    name: "Бабочка",
    draw: (ctx, size, filled) => {
      const s = size / 100;
      
      // Head circle
      ctx.beginPath();
      ctx.arc(50 * s, 18 * s, 8 * s, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = "#FFF8DC";
        ctx.fill();
      }
      ctx.stroke();
      
      // Body (elongated oval)
      ctx.beginPath();
      ctx.ellipse(50 * s, 55 * s, 6 * s, 30 * s, 0, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = "#FFF8DC";
        ctx.fill();
      }
      ctx.stroke();
      
      // Upper left wing
      ctx.beginPath();
      ctx.moveTo(44 * s, 30 * s);
      ctx.bezierCurveTo(20 * s, 10 * s, 5 * s, 25 * s, 10 * s, 50 * s);
      ctx.bezierCurveTo(15 * s, 60 * s, 35 * s, 55 * s, 44 * s, 45 * s);
      if (filled) {
        ctx.fillStyle = "#FFE4B5";
        ctx.fill();
      }
      ctx.stroke();
      
      // Upper left wing spiral decoration
      ctx.beginPath();
      ctx.arc(22 * s, 35 * s, 8 * s, 0, Math.PI * 1.5);
      ctx.stroke();
      
      // Upper right wing
      ctx.beginPath();
      ctx.moveTo(56 * s, 30 * s);
      ctx.bezierCurveTo(80 * s, 10 * s, 95 * s, 25 * s, 90 * s, 50 * s);
      ctx.bezierCurveTo(85 * s, 60 * s, 65 * s, 55 * s, 56 * s, 45 * s);
      if (filled) {
        ctx.fillStyle = "#FFE4B5";
        ctx.fill();
      }
      ctx.stroke();
      
      // Upper right wing spiral decoration
      ctx.beginPath();
      ctx.arc(78 * s, 35 * s, 8 * s, Math.PI, Math.PI * 2.5);
      ctx.stroke();
      
      // Lower left wing
      ctx.beginPath();
      ctx.moveTo(44 * s, 55 * s);
      ctx.bezierCurveTo(25 * s, 55 * s, 10 * s, 70 * s, 15 * s, 88 * s);
      ctx.bezierCurveTo(25 * s, 98 * s, 40 * s, 90 * s, 44 * s, 75 * s);
      if (filled) {
        ctx.fillStyle = "#FFE4B5";
        ctx.fill();
      }
      ctx.stroke();
      
      // Lower left wing spiral decoration
      ctx.beginPath();
      ctx.arc(25 * s, 75 * s, 7 * s, 0, Math.PI * 1.5);
      ctx.stroke();
      
      // Lower right wing
      ctx.beginPath();
      ctx.moveTo(56 * s, 55 * s);
      ctx.bezierCurveTo(75 * s, 55 * s, 90 * s, 70 * s, 85 * s, 88 * s);
      ctx.bezierCurveTo(75 * s, 98 * s, 60 * s, 90 * s, 56 * s, 75 * s);
      if (filled) {
        ctx.fillStyle = "#FFE4B5";
        ctx.fill();
      }
      ctx.stroke();
      
      // Lower right wing spiral decoration
      ctx.beginPath();
      ctx.arc(75 * s, 75 * s, 7 * s, Math.PI, Math.PI * 2.5);
      ctx.stroke();
      
      // Antennae with curls
      ctx.beginPath();
      ctx.moveTo(46 * s, 12 * s);
      ctx.quadraticCurveTo(35 * s, 0 * s, 30 * s, 5 * s);
      ctx.arc(32 * s, 5 * s, 3 * s, Math.PI, Math.PI * 2.5);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(54 * s, 12 * s);
      ctx.quadraticCurveTo(65 * s, 0 * s, 70 * s, 5 * s);
      ctx.arc(68 * s, 5 * s, 3 * s, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  },
  {
    id: "flower",
    name: "Цветок",
    draw: (ctx, size, filled) => {
      const s = size / 100;
      const petals = 6;
      const petalRadius = 18 * s;
      
      // Petals
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2;
        const petalX = 50 * s + Math.cos(angle) * 20 * s;
        const petalY = 50 * s + Math.sin(angle) * 20 * s;
        
        ctx.beginPath();
        ctx.arc(petalX, petalY, petalRadius, 0, Math.PI * 2);
        if (filled) {
          ctx.fillStyle = "#FFB6C1";
          ctx.fill();
        }
        ctx.stroke();
      }
      
      // Center
      ctx.beginPath();
      ctx.arc(50 * s, 50 * s, 12 * s, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = "#FFD700";
        ctx.fill();
      }
      ctx.stroke();
    }
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
    // White paper background
    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, width, height);

    // Draw center dividing line (book fold effect)
    ctx.save();
    ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.restore();

    // Calculate template size and position
    const templateSize = Math.min(width / 2, height) * 0.75;
    const centerY = height / 2;
    
    // LEFT SIDE: Draw filled template
    ctx.save();
    ctx.translate(width / 4, centerY);
    ctx.translate(-templateSize / 2, -templateSize / 2);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    currentTemplate.draw(ctx, templateSize, true);
    ctx.restore();

    // RIGHT SIDE: Draw dotted outline for tracing
    ctx.save();
    ctx.translate(width * 3 / 4, centerY);
    ctx.translate(-templateSize / 2, -templateSize / 2);
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
    ctx.lineWidth = 2;
    currentTemplate.draw(ctx, templateSize, false);
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
