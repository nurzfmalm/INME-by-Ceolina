import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Save, RotateCcw, ChevronRight, Users, Palette, Hand } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { ColorPaletteNew, DEFAULT_COLORS } from "./drawing/ColorPaletteNew";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface DualDrawingProps {
  onBack: () => void;
  childName: string;
}

interface DrawingStep {
  id: number;
  instruction: string;
  turn: "therapist" | "child";
  completed: boolean;
}

// Пример пошаговых инструкций для рисования креветки
const SHRIMP_DRAWING_STEPS: DrawingStep[] = [
  { id: 1, instruction: "Нарисуй большой овал - это будет тело креветки 🦐", turn: "child", completed: false },
  { id: 2, instruction: "Теперь моя очередь! Я добавлю хвостик", turn: "therapist", completed: false },
  { id: 3, instruction: "Давай нарисуем усики креветке!", turn: "child", completed: false },
  { id: 4, instruction: "Я добавлю лапки по бокам", turn: "therapist", completed: false },
  { id: 5, instruction: "Нарисуй глазки - два маленьких кружочка", turn: "child", completed: false },
  { id: 6, instruction: "Я добавлю полоски на теле", turn: "therapist", completed: false },
  { id: 7, instruction: "Раскрась креветку красивыми цветами! 🎨", turn: "child", completed: false },
];

export const DualDrawing = ({ onBack, childName }: DualDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLORS[0].hex);
  const [steps, setSteps] = useState<DrawingStep[]>(SHRIMP_DRAWING_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCeolina, setShowCeolina] = useState(true);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lineWidth = 8;

  const currentStep = steps[currentStepIndex];
  const isChildTurn = currentStep?.turn === "child";
  const isComplete = currentStepIndex >= steps.length;

  // Инициализация холста
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      
      // Сохраняем текущее изображение
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }
      
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

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
    if (isComplete) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    lastPointRef.current = { x, y };

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isComplete) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !lastPointRef.current) return;

    const { x, y } = getCoordinates(e);

    // Плавная линия
    const midX = (lastPointRef.current.x + x) / 2;
    const midY = (lastPointRef.current.y + y) / 2;
    
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX, midY);

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

  const handleNextStep = () => {
    if (currentStepIndex < steps.length) {
      // Отметить текущий шаг как выполненный
      setSteps(prev => prev.map((step, idx) => 
        idx === currentStepIndex ? { ...step, completed: true } : step
      ));
      setCurrentStepIndex(prev => prev + 1);
      setShowCeolina(true);
      
      if (currentStepIndex + 1 < steps.length) {
        const nextStep = steps[currentStepIndex + 1];
        if (nextStep.turn === "therapist") {
          toast.info("🎨 Очередь терапевта/родителя!");
        } else {
          toast.success(`✨ Твоя очередь, ${childName}!`);
        }
      } else {
        toast.success("🎉 Рисунок готов! Отличная работа!");
      }
    }
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setSteps(SHRIMP_DRAWING_STEPS.map(s => ({ ...s, completed: false })));
    setCurrentStepIndex(0);
    setShowCeolina(true);
    toast.success("Начинаем заново!");
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      const fileName = `${userId}/${Date.now()}-dual-drawing.png`;
      await supabase.storage.from("artworks").upload(fileName, blob);

      const { data: signedData } = await supabase.storage
        .from("artworks")
        .createSignedUrl(fileName, 3600);

      await supabase.from("artworks").insert({
        user_id: userId,
        image_url: signedData?.signedUrl || "",
        storage_path: fileName,
        metadata: { 
          session_type: "dual_drawing", 
          steps_completed: currentStepIndex,
          total_steps: steps.length
        },
      });

      toast.success("Рисунок сохранён! 🎨");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка сохранения");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EE]">
      {/* Шапка */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-sm shadow-sm">
        <button 
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
        >
          <Home size={24} className="text-amber-800" />
        </button>

        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary" />
          <span className="font-semibold">Рисуем вместе</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Шаг {Math.min(currentStepIndex + 1, steps.length)}/{steps.length}
          </span>
        </div>
      </header>

      {/* Персонаж с инструкцией */}
      {showCeolina && !isComplete && (
        <div 
          className="mx-4 mt-3 p-4 bg-white rounded-2xl shadow-lg flex items-start gap-4 animate-in slide-in-from-top duration-300"
          onClick={() => setShowCeolina(false)}
        >
          <img 
            src={ceolinaCharacter} 
            alt="Ceolina" 
            className="w-16 h-16 animate-gentle-float"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                isChildTurn 
                  ? "bg-green-100 text-green-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isChildTurn ? `Очередь ${childName}` : "Очередь терапевта"}
              </span>
            </div>
            <p className="text-lg font-medium text-gray-800">
              {currentStep?.instruction}
            </p>
          </div>
        </div>
      )}

      {/* Завершение */}
      {isComplete && (
        <div className="mx-4 mt-3 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-xl font-bold text-green-700 mb-2">Отлично, {childName}!</h3>
          <p className="text-green-600">Рисунок готов! Вы отлично поработали вместе!</p>
        </div>
      )}

      {/* Холст */}
      <div className="flex-1 flex flex-col p-3">
        <div 
          ref={containerRef}
          className="flex-1 rounded-3xl overflow-hidden shadow-lg bg-white relative"
          style={{ minHeight: "40vh" }}
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
            style={{ cursor: isComplete ? "default" : "crosshair" }}
          />
          
          {/* Индикатор очереди */}
          {!isComplete && (
            <div className={`absolute top-3 left-3 px-3 py-2 rounded-full text-sm font-medium ${
              isChildTurn 
                ? "bg-green-500 text-white" 
                : "bg-blue-500 text-white"
            }`}>
              <Hand className="w-4 h-4 inline mr-1" />
              {isChildTurn ? "Рисуй!" : "Передай терапевту"}
            </div>
          )}
        </div>
      </div>

      {/* Палитра и кнопки */}
      <div className="px-4 py-3 bg-white/90 backdrop-blur-sm border-t">
        <div className="flex items-center justify-between mb-3">
          <ColorPaletteNew
            colors={DEFAULT_COLORS}
            currentColor={currentColor}
            onColorChange={setCurrentColor}
          />
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-2xl"
            onClick={handleReset}
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Заново
          </Button>
          
          {!isComplete ? (
            <Button
              className="flex-1 h-14 rounded-2xl bg-primary"
              onClick={handleNextStep}
            >
              <ChevronRight className="w-5 h-5 mr-2" />
              Готово, дальше!
            </Button>
          ) : (
            <Button
              className="flex-1 h-14 rounded-2xl bg-green-500 hover:bg-green-600"
              onClick={saveDrawing}
            >
              <Save className="w-5 h-5 mr-2" />
              Сохранить
            </Button>
          )}
        </div>
      </div>

      {/* Прогресс шагов */}
      <div className="px-4 pb-4 bg-white/90">
        <div className="flex gap-1">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex-1 h-2 rounded-full transition-colors ${
                idx < currentStepIndex 
                  ? "bg-green-500" 
                  : idx === currentStepIndex 
                    ? "bg-primary" 
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};