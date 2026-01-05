import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, RotateCcw, ChevronRight, Palette, Paintbrush } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TracingDrawingProps {
  onBack: () => void;
  childName: string;
  childId?: string;
}

interface Shape {
  id: string;
  name: string;
  nameRu: string;
  difficulty: number;
  drawTemplate: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

const SHAPES: Shape[] = [
  {
    id: "circle",
    name: "circle",
    nameRu: "Круг",
    difficulty: 1,
    drawTemplate: (ctx, w, h) => {
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) * 0.35;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  {
    id: "square",
    name: "square", 
    nameRu: "Квадрат",
    difficulty: 1,
    drawTemplate: (ctx, w, h) => {
      const size = Math.min(w, h) * 0.6;
      const x = (w - size) / 2;
      const y = (h - size) / 2;
      ctx.strokeRect(x, y, size, size);
    }
  },
  {
    id: "triangle",
    name: "triangle",
    nameRu: "Треугольник",
    difficulty: 2,
    drawTemplate: (ctx, w, h) => {
      const size = Math.min(w, h) * 0.6;
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
    name: "star",
    nameRu: "Звезда",
    difficulty: 3,
    drawTemplate: (ctx, w, h) => {
      const centerX = w / 2;
      const centerY = h / 2;
      const outerRadius = Math.min(w, h) * 0.35;
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
    id: "house",
    name: "house",
    nameRu: "Домик",
    difficulty: 3,
    drawTemplate: (ctx, w, h) => {
      const houseWidth = Math.min(w, h) * 0.5;
      const houseHeight = houseWidth * 0.6;
      const roofHeight = houseWidth * 0.4;
      const x = (w - houseWidth) / 2;
      const baseY = h / 2 + roofHeight / 2;
      
      // House body
      ctx.strokeRect(x, baseY, houseWidth, houseHeight);
      
      // Roof
      ctx.beginPath();
      ctx.moveTo(x - houseWidth * 0.1, baseY);
      ctx.lineTo(w / 2, baseY - roofHeight);
      ctx.lineTo(x + houseWidth + houseWidth * 0.1, baseY);
      ctx.stroke();
      
      // Door
      const doorWidth = houseWidth * 0.25;
      const doorHeight = houseHeight * 0.5;
      ctx.strokeRect(w / 2 - doorWidth / 2, baseY + houseHeight - doorHeight, doorWidth, doorHeight);
      
      // Window
      const windowSize = houseWidth * 0.2;
      ctx.strokeRect(x + houseWidth * 0.15, baseY + houseHeight * 0.2, windowSize, windowSize);
    }
  },
  {
    id: "heart",
    name: "heart",
    nameRu: "Сердце",
    difficulty: 2,
    drawTemplate: (ctx, w, h) => {
      const centerX = w / 2;
      const topY = h * 0.35;
      const size = Math.min(w, h) * 0.35;
      
      ctx.beginPath();
      ctx.moveTo(centerX, topY + size * 0.3);
      
      // Left curve
      ctx.bezierCurveTo(
        centerX - size, topY - size * 0.3,
        centerX - size, topY + size * 0.5,
        centerX, topY + size
      );
      
      // Right curve
      ctx.moveTo(centerX, topY + size * 0.3);
      ctx.bezierCurveTo(
        centerX + size, topY - size * 0.3,
        centerX + size, topY + size * 0.5,
        centerX, topY + size
      );
      
      ctx.stroke();
    }
  }
];

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
];

type Mode = "trace" | "draw" | "color";

export const TracingDrawing = ({ onBack, childName, childId }: TracingDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const templateCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape>(SHAPES[0]);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("trace");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(4);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [completedShapes, setCompletedShapes] = useState<string[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pathRef = useRef<Path2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const templateCanvas = templateCanvasRef.current;
    if (!canvas || !templateCanvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    templateCanvas.width = rect.width;
    templateCanvas.height = rect.height;

    clearCanvas();
  }, []);

  // Draw template when shape or mode changes
  useEffect(() => {
    drawTemplate();
  }, [currentShape, mode]);

  const drawTemplate = useCallback(() => {
    const templateCanvas = templateCanvasRef.current;
    if (!templateCanvas) return;

    const ctx = templateCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, templateCanvas.width, templateCanvas.height);

    if (mode === "trace") {
      // Draw dotted template
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 3;
      currentShape.drawTemplate(ctx, templateCanvas.width, templateCanvas.height);
      ctx.setLineDash([]);
    } else if (mode === "draw") {
      // Show small reference in corner
      ctx.save();
      ctx.translate(templateCanvas.width - 100, 20);
      ctx.scale(0.15, 0.15);
      ctx.setLineDash([]);
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 3;
      currentShape.drawTemplate(ctx, 500, 500);
      ctx.restore();
      
      // Add text
      ctx.fillStyle = "#64748B";
      ctx.font = "14px sans-serif";
      ctx.fillText("Образец", templateCanvas.width - 90, 110);
    }
    // In "color" mode, no template
  }, [currentShape, mode]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pathRef.current = new Path2D();
    drawTemplate();
  }, [drawTemplate]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    const lastPoint = lastPointRef.current;

    // Smooth drawing with quadratic curves
    const midX = (lastPoint.x + x) / 2;
    const midY = (lastPoint.y + y) / 2;
    
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();
    
    // Continue the path
    ctx.beginPath();
    ctx.moveTo(midX, midY);

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.stroke();
      }
      setIsDrawing(false);
      lastPointRef.current = null;
    }
  };

  const analyzeDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsAnalyzing(true);

    try {
      const imageData = canvas.toDataURL("image/png");
      
      const { data, error } = await supabase.functions.invoke("analyze-tracing", {
        body: {
          imageData,
          shapeName: currentShape.nameRu,
          shapeId: currentShape.id,
          mode,
          difficulty: currentShape.difficulty
        }
      });

      if (error) throw error;

      setResults(data);

      if (data.passed) {
        setCompletedShapes(prev => [...prev, `${currentShape.id}-${mode}`]);
        toast.success(`Отлично! ${data.feedback}`);
        
        // Award tokens
        const userId = await getCurrentUserId();
        if (userId && await isUserAuthenticated()) {
          await supabase.from("emotion_tokens").insert({
            user_id: userId,
            child_id: childId || null,
            amount: data.tokensAwarded || 5,
            source: `Tracing: ${currentShape.nameRu} (${mode})`
          });
        }
      } else {
        toast.info(data.feedback);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Не удалось проанализировать рисунок");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const nextShape = () => {
    const nextIndex = (currentShapeIndex + 1) % SHAPES.length;
    setCurrentShapeIndex(nextIndex);
    setCurrentShape(SHAPES[nextIndex]);
    setResults(null);
    clearCanvas();
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as Mode);
    setResults(null);
    clearCanvas();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Учимся рисовать</h1>
              <p className="text-sm text-muted-foreground">
                {mode === "trace" ? "Обведи по контуру" : 
                 mode === "draw" ? "Нарисуй сам" : 
                 "Раскрась фигуру"}, {childName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Фигура {currentShapeIndex + 1}/{SHAPES.length}</p>
              <p className="text-xs text-muted-foreground">Сложность: {"⭐".repeat(currentShape.difficulty)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trace" className="gap-2">
              <Paintbrush size={16} />
              Обведи
            </TabsTrigger>
            <TabsTrigger value="draw" className="gap-2">
              <Palette size={16} />
              Нарисуй
            </TabsTrigger>
            <TabsTrigger value="color" className="gap-2">
              <Palette size={16} />
              Раскрась
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Shape selector */}
        <Card className="p-4 border-0 bg-card shadow-soft">
          <h3 className="font-semibold mb-3">Выбери фигуру: {currentShape.nameRu}</h3>
          <div className="flex gap-2 flex-wrap">
            {SHAPES.map((shape, idx) => (
              <Button
                key={shape.id}
                size="sm"
                variant={currentShape.id === shape.id ? "default" : "outline"}
                onClick={() => {
                  setCurrentShapeIndex(idx);
                  setCurrentShape(shape);
                  setResults(null);
                  clearCanvas();
                }}
                className="relative"
              >
                {shape.nameRu}
                {completedShapes.includes(`${shape.id}-${mode}`) && (
                  <Check size={12} className="absolute -top-1 -right-1 text-green-500" />
                )}
              </Button>
            ))}
          </div>
        </Card>

        {/* Color picker for coloring mode */}
        {(mode === "color" || mode === "draw") && (
          <Card className="p-4 border-0 bg-card shadow-soft">
            <h3 className="font-semibold mb-3">Выбери цвет</h3>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    currentColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                onClick={() => setCurrentColor("#000000")}
                className={`w-8 h-8 rounded-full bg-black transition-transform hover:scale-110 ${
                  currentColor === "#000000" ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                }`}
              />
            </div>
          </Card>
        )}

        {/* Canvas area */}
        <Card className="p-4 border-0 bg-card shadow-soft relative">
          <div className="relative">
            {/* Template layer */}
            <canvas
              ref={templateCanvasRef}
              className="absolute inset-0 w-full h-[350px] pointer-events-none"
            />
            {/* Drawing layer */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[350px] bg-white rounded-2xl border-2 border-muted touch-none"
              style={{ 
                cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${lineWidth + 4}" height="${lineWidth + 4}" viewBox="0 0 ${lineWidth + 4} ${lineWidth + 4}"><circle cx="${(lineWidth + 4) / 2}" cy="${(lineWidth + 4) / 2}" r="${lineWidth / 2}" fill="${encodeURIComponent(currentColor)}" stroke="black" stroke-width="1"/></svg>') ${(lineWidth + 4) / 2} ${(lineWidth + 4) / 2}, crosshair`
              }}
            />
          </div>
        </Card>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={clearCanvas}>
            <RotateCcw size={18} className="mr-2" />
            Начать заново
          </Button>
          <Button 
            variant="default" 
            onClick={analyzeDrawing}
            disabled={isAnalyzing}
          >
            <Check size={18} className="mr-2" />
            {isAnalyzing ? "Проверяю..." : "Проверить"}
          </Button>
          <Button variant="secondary" onClick={nextShape}>
            <ChevronRight size={18} className="mr-2" />
            Следующая фигура
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Размер:</span>
            <input
              type="range"
              min="2"
              max="15"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm font-semibold">{lineWidth}px</span>
          </div>
        </div>

        {/* Results */}
        {results && (
          <Card className={`p-6 border-0 shadow-soft ${
            results.passed ? 'bg-gradient-calm' : 'bg-gradient-warm'
          }`}>
            <h3 className="font-semibold text-primary-foreground mb-4 text-xl">
              {results.passed ? '✅ Отлично!' : '🎨 Попробуй ещё!'}
            </h3>
            <div className="space-y-3 text-primary-foreground/90">
              <p className="text-lg">{results.feedback}</p>
              {results.accuracy !== undefined && (
                <p className="text-sm">Точность: {results.accuracy}%</p>
              )}
              {results.passed && results.tokensAwarded && (
                <p className="text-lg font-bold mt-4">
                  🎉 Получено токенов: {results.tokensAwarded}
                </p>
              )}
              {results.tips && results.tips.length > 0 && (
                <div className="mt-4 p-4 bg-white/20 rounded-lg">
                  <p className="font-semibold mb-2">💡 Советы:</p>
                  <ul className="space-y-1">
                    {results.tips.map((tip: string, idx: number) => (
                      <li key={idx} className="text-sm">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Progress */}
        <Card className="p-4 border-0 bg-card shadow-soft">
          <h3 className="font-semibold mb-3">Твой прогресс</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {completedShapes.filter(s => s.endsWith("-trace")).length}
              </p>
              <p className="text-xs text-muted-foreground">Обведено</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {completedShapes.filter(s => s.endsWith("-draw")).length}
              </p>
              <p className="text-xs text-muted-foreground">Нарисовано</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {completedShapes.filter(s => s.endsWith("-color")).length}
              </p>
              <p className="text-xs text-muted-foreground">Раскрашено</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};
