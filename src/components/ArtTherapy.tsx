import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eraser, Palette, Save, Trash2 } from "lucide-react";

interface ArtTherapyProps {
  onBack: () => void;
  childName: string;
}

const COLORS = [
  { name: "Радость", color: "#FFD93D", emotion: "joy" },
  { name: "Спокойствие", color: "#6BCB77", emotion: "calm" },
  { name: "Грусть", color: "#4D96FF", emotion: "sadness" },
  { name: "Энергия", color: "#FF6B6B", emotion: "energy" },
  { name: "Творчество", color: "#C68FE6", emotion: "creative" },
  { name: "Нежность", color: "#FFB4D6", emotion: "gentle" },
];

export const ArtTherapy = ({ onBack, childName }: ArtTherapyProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[0].color);
  const [lineWidth, setLineWidth] = useState(5);
  const [emotionStats, setEmotionStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Set initial style
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Track emotion usage
    const emotion = COLORS.find((c) => c.color === currentColor)?.emotion || "other";
    setEmotionStats((prev) => ({
      ...prev,
      [emotion]: (prev[emotion] || 0) + 1,
    }));
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setEmotionStats({});
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `ceolina-art-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">АРТ - Терапия</h1>
              <p className="text-sm text-muted-foreground">
                Рисуй и выражай свои эмоции, {childName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Color Palette */}
        <Card className="p-4 border-0 bg-card shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="text-primary" size={20} />
            <h3 className="font-semibold">Выбери цвет эмоции</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((item) => (
              <button
                key={item.color}
                onClick={() => setCurrentColor(item.color)}
                className={`relative group transition-transform hover:scale-110 ${
                  currentColor === item.color ? "scale-110" : ""
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full shadow-soft"
                  style={{ backgroundColor: item.color }}
                />
                {currentColor === item.color && (
                  <div className="absolute inset-0 rounded-full border-4 border-primary" />
                )}
                <p className="text-xs text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.name}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* Canvas */}
        <Card className="p-4 border-0 bg-card shadow-soft">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-[400px] bg-white rounded-2xl cursor-crosshair border-2 border-muted"
          />
        </Card>

        {/* Tools */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={clearCanvas}>
            <Trash2 size={18} className="mr-2" />
            Очистить
          </Button>
          <Button variant="secondary" onClick={saveDrawing}>
            <Save size={18} className="mr-2" />
            Сохранить
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Размер кисти:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm font-semibold">{lineWidth}px</span>
          </div>
        </div>

        {/* Emotional Insights */}
        {Object.keys(emotionStats).length > 0 && (
          <Card className="p-4 border-0 bg-gradient-calm shadow-soft">
            <h3 className="font-semibold text-primary-foreground mb-2">
              Твои эмоции сегодня
            </h3>
            <p className="text-sm text-primary-foreground/80">
              Сегодня ты выразил{" "}
              {Object.values(emotionStats).reduce((a, b) => a + b, 0)} эмоций через
              рисунок. Продолжай творить!
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};
