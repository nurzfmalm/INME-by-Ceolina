import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { SimpleColorPalette, THERAPEUTIC_COLORS } from "./drawing/SimpleColorPalette";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface GuidedDrawingProps {
  onBack: () => void;
  childName: string;
  childId?: string;
}

interface ShapeScenario {
  id: string;
  nameRu: string;
  icon: string;
  getPoints: (w: number, h: number) => Point[];
}

interface Point {
  x: number;
  y: number;
}

type Stage = "watch" | "do";

const CALM_COLORS = THERAPEUTIC_COLORS;

const SCENARIOS: ShapeScenario[] = [
  {
    id: "sun",
    nameRu: "Солнце",
    icon: "☀️",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.20; // Увеличено с 0.12 до 0.20
      const points: Point[] = [];
      for (let i = 0; i <= 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
      }
      const innerR = radius * 1.2;
      const outerR = radius * 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        points.push({ x: cx + Math.cos(angle) * innerR, y: cy + Math.sin(angle) * innerR });
        points.push({ x: cx + Math.cos(angle) * outerR, y: cy + Math.sin(angle) * outerR });
        points.push({ x: cx + Math.cos(angle) * innerR, y: cy + Math.sin(angle) * innerR });
      }
      return points;
    }
  },
  {
    id: "house",
    nameRu: "Домик",
    icon: "🏠",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const size = Math.min(w, h) * 0.35; // Увеличено с 0.25 до 0.35
      return [
        { x: cx - size/2, y: cy - size/4 },
        { x: cx + size/2, y: cy - size/4 },
        { x: cx + size/2, y: cy + size/2 },
        { x: cx - size/2, y: cy + size/2 },
        { x: cx - size/2, y: cy - size/4 },
        { x: cx, y: cy - size/2 - size/4 },
        { x: cx + size/2, y: cy - size/4 },
      ];
    }
  },
  {
    id: "star",
    nameRu: "Звезда",
    icon: "⭐",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) * 0.28; // Увеличено с 0.18 до 0.28
      const innerR = outerR * 0.45;
      const points: Point[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
        points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
      }
      points.push(points[0]);
      return points;
    }
  },
  {
    id: "heart",
    nameRu: "Сердце",
    icon: "❤️",
    getPoints: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const size = Math.min(w, h) * 0.25; // Увеличено с 0.15 до 0.25
      const points: Point[] = [];
      for (let t = 0; t <= 1; t += 0.04) {
        const angle = Math.PI + t * Math.PI;
        const x = cx + Math.cos(angle) * size * 0.5 - size * 0.25;
        const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
        points.push({ x, y });
      }
      points.push({ x: cx, y: cy + size * 0.7 });
      for (let t = 0; t <= 1; t += 0.04) {
        const angle = t * Math.PI;
        const x = cx + Math.cos(angle) * size * 0.5 + size * 0.25;
        const y = cy - size * 0.3 + Math.sin(angle) * size * 0.5;
        points.push({ x, y });
      }
      return points;
    }
  },
];

export const GuidedDrawing = ({ onBack, childName, childId }: GuidedDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentStage, setCurrentStage] = useState<Stage>("watch");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(CALM_COLORS[0].hex);
  const [showNextButton, setShowNextButton] = useState(false);
  const [hasDrawnSomething, setHasDrawnSomething] = useState(false);
  
  const lastPointRef = useRef<Point | null>(null);

  const scenario = SCENARIOS[currentScenarioIndex];

  // Инициализация холста — 75-80% экрана
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      const minHeight = window.innerHeight * 0.65;
      const canvasHeight = Math.max(minHeight, containerRect.height);
      
      canvas.width = containerRect.width;
      canvas.height = canvasHeight;
      
      if (!isAnimating) {
        clearCanvas();
      }
    };
    
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isAnimating]);

  useEffect(() => {
    clearCanvas();
    setShowNextButton(false);
    setHasDrawnSomething(false);
    
    if (currentStage === "watch") {
      setTimeout(() => startWatchAnimation(), 1500);
    } else {
      drawVeryFaintGuide();
    }
  }, [currentStage, currentScenarioIndex]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startWatchAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    clearCanvas();
    setIsAnimating(true);
    const points = scenario.getPoints(canvas.width, canvas.height);
    let currentIndex = 0;

    ctx.strokeStyle = CALM_COLORS[0].hex;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    const animate = () => {
      if (currentIndex >= points.length - 1) {
        setIsAnimating(false);
        setShowNextButton(true);
        drawTemplateAsReference();
        return;
      }

      currentIndex++;
      const point = points[currentIndex];
      
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 150);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [scenario, clearCanvas]);

  const drawTemplateAsReference = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const points = scenario.getPoints(canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(180, 180, 180, 0.5)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario]);

  const drawVeryFaintGuide = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    clearCanvas();
    const points = scenario.getPoints(canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(200, 200, 200, 0.2)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }, [scenario, clearCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
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
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (currentStage === "watch" || isAnimating) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    const point = getCoordinates(e);
    lastPointRef.current = point;

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const point = getCoordinates(e);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);

    lastPointRef.current = point;
    
    if (!hasDrawnSomething) {
      setHasDrawnSomething(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.stroke();
    
    setIsDrawing(false);
    lastPointRef.current = null;

    if (hasDrawnSomething) {
      setShowNextButton(true);
    }
  };

  const handleNextStage = async () => {
    if (currentStage === "watch") {
      setCurrentStage("do");
    } else {
      try {
        const userId = await getCurrentUserId();
        if (userId && await isUserAuthenticated()) {
          await supabase.from("emotion_tokens").insert({
            user_id: userId,
            child_id: childId || null,
            amount: 5,
            source: `Guided: ${scenario.nameRu}`
          });
        }
      } catch (error) {
        console.error("Error:", error);
      }

      toast.success("Готово! ✨", { duration: 1500 });

      setTimeout(() => {
        if (currentScenarioIndex < SCENARIOS.length - 1) {
          setCurrentScenarioIndex(prev => prev + 1);
          setCurrentStage("watch");
        } else {
          onBack();
        }
      }, 1500);
    }
  };

  const handleRepeat = () => {
    setShowNextButton(false);
    setHasDrawnSomething(false);
    
    if (currentStage === "watch") {
      clearCanvas();
      setTimeout(() => startWatchAnimation(), 500);
    } else {
      drawVeryFaintGuide();
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
        
        {/* Индикаторы этапов */}
        <div className="flex gap-3">
          <div
            className="h-3 w-12 rounded-full transition-all"
            style={{ backgroundColor: currentStage === "watch" || currentStage === "do" ? CALM_COLORS[0].hex : "#E5E5E5" }}
          />
          <div
            className="h-3 w-12 rounded-full transition-all"
            style={{ backgroundColor: currentStage === "do" ? CALM_COLORS[0].hex : "#E5E5E5" }}
          />
        </div>
        
        <div className="w-14" />
      </header>

      {/* Выбор фигуры — крупные иконки */}
      <div className="flex justify-center gap-3 py-2">
        {SCENARIOS.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => {
              setCurrentScenarioIndex(idx);
              setCurrentStage("watch");
            }}
            className={`
              w-14 h-14 rounded-2xl text-2xl flex items-center justify-center
              transition-all duration-300
              ${idx === currentScenarioIndex ? "bg-primary/20 scale-110 ring-2 ring-primary" : "bg-white"}
            `}
            aria-label={s.nameRu}
          >
            {s.icon}
          </button>
        ))}
      </div>

      {/* ХОЛСТ — 75-80% экрана */}
      <div 
        ref={containerRef}
        className="flex-1 mx-2 my-2 rounded-3xl overflow-hidden"
        style={{ 
          backgroundColor: "#FFFEF7",
          minHeight: "60vh"
        }}
      >
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
          style={{ cursor: currentStage === "watch" || isAnimating ? "default" : "crosshair" }}
        />
      </div>

      {/* Панель управления */}
      <div className="px-3 pb-4 space-y-3">
        {/* Палитра — только на этапе рисования */}
        {currentStage === "do" && (
          <SimpleColorPalette
            colors={CALM_COLORS}
            currentColor={currentColor}
            onColorChange={setCurrentColor}
          />
        )}

        {/* Кнопки — крупные */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRepeat}
            className="w-16 h-16 rounded-2xl p-0"
            aria-label="Ещё раз"
          >
            <RotateCcw size={28} />
          </Button>
          
          {showNextButton && (
            <Button
              size="lg"
              onClick={handleNextStage}
              className="w-16 h-16 rounded-2xl p-0 animate-scale-in"
              style={{ backgroundColor: CALM_COLORS[0].hex }}
              aria-label="Дальше"
            >
              <ChevronRight size={32} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
