import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Home, Check, RotateCcw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { SimpleColorPalette, THERAPEUTIC_COLORS } from "./drawing/SimpleColorPalette";

interface TracingDrawingProps {
  onBack: () => void;
  childName: string;
  childId?: string;
}

interface Shape {
  id: string;
  icon: string;
  nameRu: string;
  difficulty: number;
  drawTemplate: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

const SHAPES: Shape[] = [
  {
    id: "circle",
    icon: "⭕",
    nameRu: "Круг",
    difficulty: 1,
    drawTemplate: (ctx, w, h) => {
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) * 0.3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  {
    id: "square",
    icon: "⬜",
    nameRu: "Квадрат",
    difficulty: 1,
    drawTemplate: (ctx, w, h) => {
      const size = Math.min(w, h) * 0.5;
      const x = (w - size) / 2;
      const y = (h - size) / 2;
      ctx.strokeRect(x, y, size, size);
    }
  },
  {
    id: "triangle",
    icon: "🔺",
    nameRu: "Треугольник",
    difficulty: 2,
    drawTemplate: (ctx, w, h) => {
      const size = Math.min(w, h) * 0.5;
      const centerX = w / 2;
      const topY = (h - size) / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, topY);
      ctx.lineTo(centerX - size / 2, topY + size);
      ctx.lineTo(centerX + size / 2, topY + size);
      ctx.closePath();
      ctx.stroke();
    }
  },
  {
    id: "star",
    icon: "⭐",
    nameRu: "Звезда",
    difficulty: 3,
    drawTemplate: (ctx, w, h) => {
      const centerX = w / 2;
      const centerY = h / 2;
      const outerRadius = Math.min(w, h) * 0.3;
      const innerRadius = outerRadius * 0.4;
      const spikes = 5;
      
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  },
  {
    id: "heart",
    icon: "❤️",
    nameRu: "Сердце",
    difficulty: 2,
    drawTemplate: (ctx, w, h) => {
      const centerX = w / 2;
      const topY = h * 0.35;
      const size = Math.min(w, h) * 0.3;
      
      ctx.beginPath();
      ctx.moveTo(centerX, topY + size * 0.3);
      ctx.bezierCurveTo(centerX - size, topY - size * 0.3, centerX - size, topY + size * 0.5, centerX, topY + size);
      ctx.moveTo(centerX, topY + size * 0.3);
      ctx.bezierCurveTo(centerX + size, topY - size * 0.3, centerX + size, topY + size * 0.5, centerX, topY + size);
      ctx.stroke();
    }
  }
];

const COLORS = THERAPEUTIC_COLORS;

export const TracingDrawing = ({ onBack, childName, childId }: TracingDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const templateCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape>(SHAPES[0]);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [currentColor, setCurrentColor] = useState(COLORS[0].hex);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedShapes, setCompletedShapes] = useState<string[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Инициализация холста — 75% экрана
  useEffect(() => {
    const canvas = canvasRef.current;
    const templateCanvas = templateCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !templateCanvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const minHeight = window.innerHeight * 0.65;
      const canvasHeight = Math.max(minHeight, rect.height);
      
      canvas.width = rect.width;
      canvas.height = canvasHeight;
      templateCanvas.width = rect.width;
      templateCanvas.height = canvasHeight;

      clearCanvas();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    drawTemplate();
  }, [currentShape]);

  const drawTemplate = useCallback(() => {
    const templateCanvas = templateCanvasRef.current;
    if (!templateCanvas) return;

    const ctx = templateCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, templateCanvas.width, templateCanvas.height);
    ctx.setLineDash([15, 15]);
    ctx.strokeStyle = "#B0B0B0";
    ctx.lineWidth = 4;
    currentShape.drawTemplate(ctx, templateCanvas.width, templateCanvas.height);
    ctx.setLineDash([]);
  }, [currentShape]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawTemplate();
  }, [drawTemplate]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    if ('clientX' in e) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.stroke();
      setIsDrawing(false);
      lastPointRef.current = null;
    }
  };

  const handleCheck = async () => {
    setIsAnalyzing(true);

    try {
      setCompletedShapes(prev => [...prev, currentShape.id]);
      
      const userId = await getCurrentUserId();
      if (userId && await isUserAuthenticated()) {
        await supabase.from("emotion_tokens").insert({
          user_id: userId,
          child_id: childId || null,
          amount: 5,
          source: `Tracing: ${currentShape.nameRu}`
        });
      }

      toast.success("Готово! ✨");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const nextShape = () => {
    const nextIndex = (currentShapeIndex + 1) % SHAPES.length;
    setCurrentShapeIndex(nextIndex);
    setCurrentShape(SHAPES[nextIndex]);
    clearCanvas();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F0" }}>
      {/* Минимальная шапка */}
      <header className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: "#FFFEF7" }}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="w-14 h-14 rounded-2xl"
        >
          <Home size={28} />
        </Button>
        
        {/* Прогресс */}
        <div className="flex gap-1">
          {SHAPES.map((s) => (
            <div
              key={s.id}
              className={`w-3 h-3 rounded-full ${
                completedShapes.includes(s.id) ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        
        <div className="w-14" />
      </header>

      {/* Выбор фигуры — крупные иконки */}
      <div className="flex justify-center gap-3 py-2">
        {SHAPES.map((shape, idx) => (
          <button
            key={shape.id}
            onClick={() => {
              setCurrentShapeIndex(idx);
              setCurrentShape(shape);
              clearCanvas();
            }}
            className={`
              w-14 h-14 rounded-2xl text-2xl flex items-center justify-center
              transition-all duration-300 relative
              ${currentShape.id === shape.id ? "bg-primary/20 scale-110 ring-2 ring-primary" : "bg-white"}
            `}
            aria-label={shape.nameRu}
          >
            {shape.icon}
            {completedShapes.includes(shape.id) && (
              <Check size={14} className="absolute -top-1 -right-1 text-primary bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ХОЛСТ — 75% экрана */}
      <div 
        ref={containerRef}
        className="flex-1 mx-2 my-2 rounded-3xl overflow-hidden relative"
        style={{ 
          backgroundColor: "#FFFEF7",
          minHeight: "60vh"
        }}
      >
        <canvas
          ref={templateCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none"
          style={{ cursor: "crosshair" }}
        />
      </div>

      {/* Панель управления */}
      <div className="px-3 pb-4 space-y-3">
        {/* Палитра */}
        <SimpleColorPalette
          colors={COLORS}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
        />

        {/* Кнопки — крупные */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={clearCanvas}
            className="w-16 h-16 rounded-2xl p-0"
            aria-label="Начать заново"
          >
            <RotateCcw size={28} />
          </Button>
          
          <Button
            variant="default"
            size="lg"
            onClick={handleCheck}
            disabled={isAnalyzing}
            className="w-16 h-16 rounded-2xl p-0"
            aria-label="Проверить"
          >
            <Check size={32} />
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            onClick={nextShape}
            className="w-16 h-16 rounded-2xl p-0"
            aria-label="Следующая"
          >
            <ChevronRight size={32} />
          </Button>
        </div>
      </div>
    </div>
  );
};
