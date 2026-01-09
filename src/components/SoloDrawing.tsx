import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save, Trash2, Eraser, Undo, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { THERAPEUTIC_COLORS } from "./drawing/SimpleColorPalette";
import { 
  getUnlockedRewards, 
  REWARD_COLORS, 
  getBrushType, 
  applyBrushEffect,
  type BrushType,
} from "@/lib/rewards-system";

interface SoloDrawingProps {
  onBack: () => void;
  childName: string;
  taskId?: string | null;
  taskPrompt?: string | null;
}

const BASE_COLORS = THERAPEUTIC_COLORS;

// Autism-friendly color palette - fewer colors, clearly distinct, calming tones
const AUTISM_FRIENDLY_COLORS = [
  { hex: "#E74C3C", name: "Красный", emoji: "🔴" },
  { hex: "#F39C12", name: "Оранжевый", emoji: "🟠" },
  { hex: "#F1C40F", name: "Жёлтый", emoji: "🟡" },
  { hex: "#27AE60", name: "Зелёный", emoji: "🟢" },
  { hex: "#3498DB", name: "Синий", emoji: "🔵" },
  { hex: "#9B59B6", name: "Фиолетовый", emoji: "🟣" },
  { hex: "#E91E8C", name: "Розовый", emoji: "💗" },
  { hex: "#8B4513", name: "Коричневый", emoji: "🟤" },
  { hex: "#2C3E50", name: "Чёрный", emoji: "⚫" },
];

// Clear brush size options with visual labels
const BRUSH_OPTIONS = [
  { size: 6, label: "Тонкая", icon: "─" },
  { size: 12, label: "Средняя", icon: "━" },
  { size: 20, label: "Толстая", icon: "▬" },
];

export const SoloDrawing = ({ onBack, childName, taskId, taskPrompt }: SoloDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(AUTISM_FRIENDLY_COLORS[0].hex);
  const [lineWidth, setLineWidth] = useState(12);
  const [brushType, setBrushType] = useState<BrushType>("normal");
  const [availableColors] = useState(AUTISM_FRIENDLY_COLORS);
  const [emotionStats, setEmotionStats] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setBrushType(getBrushType());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      
      canvas.width = containerRect.width;
      canvas.height = containerRect.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      
      if (history.length === 0) {
        const dataUrl = canvas.toDataURL();
        setHistory([dataUrl]);
        setHistoryStep(0);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const img = new Image();
      img.src = history[historyStep - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistoryStep(historyStep - 1);
      };
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };

    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (!isEraser) {
      const colorItem = availableColors.find((c) => c.hex === currentColor);
      const emotion = colorItem?.name || "other";
      setEmotionStats((prev) => ({
        ...prev,
        [emotion]: (prev[emotion] || 0) + 1,
      }));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = lineWidth * 2;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (!isEraser) {
      applyBrushEffect(ctx, x, y, currentColor, brushType, lineWidth);
    }

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      saveToHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL();
    setHistory([dataUrl]);
    setHistoryStep(0);
    setEmotionStats({});
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    
    try {
      const userId = await getCurrentUserId();
      const isAuth = await isUserAuthenticated();
      
      if (!userId) {
        toast.error("Ошибка получения пользователя");
        return;
      }

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      const colorsUsed = availableColors
        .filter((c) => emotionStats[c.name])
        .map((c) => c.hex);

      if (!isAuth) {
        const dataUrl = canvas.toDataURL("image/png");
        const artworks = JSON.parse(localStorage.getItem('starArtworks') || '[]');
        
        artworks.push({
          id: Date.now().toString(),
          image_url: dataUrl,
          storage_path: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          emotions_used: emotionStats,
          colors_used: colorsUsed,
          metadata: {
            line_width: lineWidth,
            session_duration: Math.floor((Date.now() - sessionStart) / 1000),
          },
        });
        
        localStorage.setItem('starArtworks', JSON.stringify(artworks));
        toast.success("Рисунок сохранён! 🎨");
        clearCanvas();
        return;
      }

      const fileName = `${userId}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(fileName, blob, {
          contentType: "image/png",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("artworks")
        .createSignedUrl(fileName, 3600);

      if (signedError || !signedData?.signedUrl) {
        throw new Error("Failed to create signed URL");
      }

      await supabase.from("artworks").insert({
        user_id: userId,
        image_url: signedData.signedUrl,
        storage_path: fileName,
        emotions_used: emotionStats,
        colors_used: colorsUsed,
        metadata: {
          line_width: lineWidth,
          session_duration: Math.floor((Date.now() - sessionStart) / 1000),
          task_id: taskId || null,
        },
      });

      await supabase.from("progress_sessions").insert({
        user_id: userId,
        session_type: "art_therapy",
        duration_seconds: Math.floor((Date.now() - sessionStart) / 1000),
        metadata: {
          emotional_analysis: emotionStats,
          colors_count: colorsUsed.length,
        },
      });

      toast.success("Рисунок сохранён! 🎨");
      clearCanvas();
    } catch (error) {
      console.error("Error saving artwork:", error);
      toast.error("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  // Render teardrop character SVG
  const renderTeardrop = (color: string, index: number) => (
    <svg key={index} viewBox="0 0 24 36" className="w-6 h-9 -mx-0.5">
      <path
        d="M12 2C12 2 4 14 4 20C4 26 8 32 12 32C16 32 20 26 20 20C20 14 12 2 12 2Z"
        fill={color}
        stroke="#333"
        strokeWidth="0.5"
      />
      {/* Eyes */}
      <circle cx="9" cy="18" r="2" fill="white" />
      <circle cx="15" cy="18" r="2" fill="white" />
      <circle cx="9.5" cy="18.5" r="1" fill="#333" />
      <circle cx="15.5" cy="18.5" r="1" fill="#333" />
    </svg>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#E8E4DC" }}>
      {/* Main drawing area */}
      <div className="flex-1 flex flex-col p-3">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-amber-100 hover:bg-amber-200"
          >
            <Home size={24} className="text-amber-800" />
          </Button>
          {taskPrompt && (
            <p className="flex-1 text-center text-lg font-medium text-amber-800 px-4 truncate">
              {taskPrompt}
            </p>
          )}
        </div>

        {/* Notebook canvas container */}
        <div className="flex-1 flex flex-col">
          {/* Spiral holes */}
          <div 
            className="flex justify-center gap-4 py-2 rounded-t-xl"
            style={{ backgroundColor: "#F5A623" }}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i} 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "#E8E4DC" }}
              />
            ))}
          </div>

          {/* Canvas frame */}
          <div 
            className="flex-1 rounded-b-xl overflow-hidden border-4 border-t-0"
            style={{ 
              borderColor: "#F5A623",
              backgroundColor: "#FFFFFF"
            }}
          >
            <div ref={containerRef} className="w-full h-full relative">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full touch-none"
                style={{ cursor: isEraser ? "cell" : "crosshair" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar with tools - Autism-friendly design */}
      <div 
        className="w-44 flex flex-col gap-3 p-3 overflow-y-auto"
        style={{ backgroundColor: "#F5F3EE" }}
      >
        {/* Section label */}
        <div className="text-center text-sm font-medium text-gray-600 pb-1 border-b border-gray-200">
          🎨 Цвета
        </div>

        {/* Color palette - Large, clearly labeled buttons */}
        <div className="grid grid-cols-3 gap-2">
          {AUTISM_FRIENDLY_COLORS.map((color, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentColor(color.hex);
                setIsEraser(false);
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                currentColor === color.hex && !isEraser
                  ? "ring-3 ring-gray-800 bg-white shadow-md scale-105"
                  : "bg-white/50 hover:bg-white hover:shadow-sm"
              }`}
            >
              <div 
                className="w-8 h-8 rounded-full shadow-inner border-2 border-white"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-[10px] text-gray-600 font-medium leading-tight">
                {color.name}
              </span>
            </button>
          ))}
        </div>

        {/* Section label */}
        <div className="text-center text-sm font-medium text-gray-600 pb-1 border-b border-gray-200 mt-2">
          ✏️ Толщина
        </div>

        {/* Brush size selector - Clear visual difference */}
        <div className="flex flex-col gap-2">
          {BRUSH_OPTIONS.map((option, i) => (
            <button
              key={i}
              onClick={() => setLineWidth(option.size)}
              className={`w-full py-3 px-3 flex items-center gap-3 rounded-xl transition-all ${
                lineWidth === option.size
                  ? "bg-amber-100 ring-2 ring-amber-400 shadow-sm"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div 
                className="rounded-full bg-gray-800"
                style={{ 
                  width: `${option.size * 2}px`, 
                  height: `${option.size}px`,
                }}
              />
              <span className="text-sm font-medium text-gray-700">
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* Section label */}
        <div className="text-center text-sm font-medium text-gray-600 pb-1 border-b border-gray-200 mt-2">
          🛠️ Инструменты
        </div>

        {/* Tool buttons - Large with text labels */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`w-full py-3 px-4 flex items-center gap-3 rounded-xl transition-all ${
              isEraser 
                ? "bg-pink-200 ring-2 ring-pink-400 shadow-sm" 
                : "bg-white hover:bg-pink-50"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-pink-400 flex items-center justify-center">
              <Eraser size={18} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isEraser ? "Ластик ✓" : "Ластик"}
            </span>
          </button>

          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className={`w-full py-3 px-4 flex items-center gap-3 rounded-xl transition-all ${
              historyStep <= 0 
                ? "bg-gray-100 opacity-50 cursor-not-allowed" 
                : "bg-white hover:bg-amber-50"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
              <Undo size={18} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Назад</span>
          </button>

          <button
            onClick={clearCanvas}
            className="w-full py-3 px-4 flex items-center gap-3 rounded-xl bg-white hover:bg-red-50 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-400 flex items-center justify-center">
              <Trash2 size={18} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Очистить</span>
          </button>
        </div>

        {/* Save button - Large and prominent */}
        <button
          onClick={saveDrawing}
          disabled={isSaving}
          className="w-full py-4 px-4 flex items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-600 transition-all shadow-md disabled:opacity-50"
        >
          <Save size={22} className="text-white" />
          <span className="text-base font-bold text-white">
            {isSaving ? "Сохраняю..." : "Сохранить"}
          </span>
        </button>
      </div>
    </div>
  );
};
