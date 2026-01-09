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

// Extended color palette in grid format
const COLOR_GRID = [
  "#E74C3C", "#E67E22", "#F1C40F", "#2ECC71", "#1ABC9C",
  "#3498DB", "#9B59B6", "#8E44AD", "#34495E", "#95A5A6",
  "#D35400", "#C0392B", "#16A085", "#27AE60", "#2980B9",
  "#FF69B4", "#DDA0DD", "#D2B48C", "#FFF5EE", "#000000",
];

// Brush sizes
const BRUSH_SIZES = [4, 8, 14, 22];

// Teardrop character colors for spiral binding
const TEARDROP_COLORS = [
  "#9B59B6", "#8B4513", "#E74C3C", "#E67E22", "#F1C40F",
  "#2ECC71", "#3498DB", "#9B59B6", "#E74C3C", "#F1C40F",
  "#2ECC71", "#E67E22",
];

export const SoloDrawing = ({ onBack, childName, taskId, taskPrompt }: SoloDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLOR_GRID[0]);
  const [lineWidth, setLineWidth] = useState(8);
  const [brushType, setBrushType] = useState<BrushType>("normal");
  const [availableColors, setAvailableColors] = useState(BASE_COLORS);
  const [emotionStats, setEmotionStats] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const unlocked = getUnlockedRewards();
    const colors = [...BASE_COLORS];
    REWARD_COLORS.forEach(rewardColor => {
      if (unlocked.includes(rewardColor.id)) {
        colors.push({ hex: rewardColor.color, name: rewardColor.name });
      }
    });
    setAvailableColors(colors);
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

      {/* Right sidebar with tools */}
      <div 
        className="w-36 flex flex-col gap-4 p-3 overflow-y-auto"
        style={{ backgroundColor: "#F5F3EE" }}
      >
        {/* Color palette grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {COLOR_GRID.map((color, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentColor(color);
                setIsEraser(false);
              }}
              className={`w-6 h-6 rounded-lg transition-all ${
                currentColor === color && !isEraser
                  ? "ring-2 ring-offset-1 ring-gray-800 scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Brush size selector */}
        <div className="flex flex-col gap-2 p-2 bg-white rounded-lg">
          {BRUSH_SIZES.map((size, i) => (
            <button
              key={i}
              onClick={() => setLineWidth(size)}
              className={`w-full h-8 flex items-center justify-center rounded-md transition-all ${
                lineWidth === size
                  ? "bg-gray-100 ring-1 ring-gray-300"
                  : "hover:bg-gray-50"
              }`}
            >
              <div 
                className="bg-gray-800 rounded-full"
                style={{ 
                  width: `${Math.min(size * 2, 40)}px`, 
                  height: `${size}px`,
                  borderRadius: "50%"
                }}
              />
            </button>
          ))}
        </div>

        {/* Tool buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={historyStep <= 0}
            className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 border-0"
          >
            <Undo size={20} className="text-white" />
          </Button>
          
          <Button
            variant={isEraser ? "default" : "outline"}
            size="icon"
            onClick={() => setIsEraser(!isEraser)}
            className={`w-10 h-10 rounded-xl border-0 ${
              isEraser 
                ? "bg-pink-400 hover:bg-pink-500" 
                : "bg-pink-300 hover:bg-pink-400"
            }`}
          >
            <Eraser size={20} className="text-white" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={clearCanvas}
            className="w-10 h-10 rounded-xl bg-gray-300 hover:bg-gray-400 border-0"
          >
            <Trash2 size={20} className="text-gray-700" />
          </Button>
        </div>

        {/* Save button */}
        <Button
          onClick={saveDrawing}
          disabled={isSaving}
          className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium"
        >
          <Save size={20} className="mr-2" />
          {isSaving ? "..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
};
