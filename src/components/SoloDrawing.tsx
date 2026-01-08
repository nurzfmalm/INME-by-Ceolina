import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Trash2, BarChart3, Eraser, Undo, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { SimpleColorPalette, THERAPEUTIC_COLORS } from "./drawing/SimpleColorPalette";
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

export const SoloDrawing = ({ onBack, childName, taskId, taskPrompt }: SoloDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(BASE_COLORS[0].hex);
  const [lineWidth] = useState(8);
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

  // Инициализация холста — 75-80% экрана
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      const minHeight = window.innerHeight * 0.7;
      const canvasHeight = Math.max(minHeight, containerRect.height);
      
      canvas.width = containerRect.width;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFEF7";
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
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
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

    ctx.fillStyle = "#FFFEF7";
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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F0" }}>
      {/* Минимальная шапка — только кнопка назад */}
      <header className="flex items-center px-3 py-2" style={{ backgroundColor: "#FFFEF7" }}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="w-14 h-14 rounded-2xl"
        >
          <Home size={28} />
        </Button>
        {taskPrompt && (
          <p className="flex-1 text-center text-lg font-medium text-muted-foreground px-4 truncate">
            {taskPrompt}
          </p>
        )}
      </header>

      {/* ХОЛСТ — 75-80% экрана */}
      <div 
        ref={containerRef}
        className="flex-1 mx-2 my-2 rounded-3xl overflow-hidden"
        style={{ 
          backgroundColor: "#FFFEF7",
          minHeight: "70vh"
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
          style={{ cursor: "crosshair" }}
        />
      </div>

      {/* Панель управления — минимум элементов */}
      <div className="px-3 pb-4 space-y-3">
        {/* Палитра цветов — структурированная */}
        <SimpleColorPalette
          colors={availableColors}
          currentColor={currentColor}
          onColorChange={(color) => {
            setCurrentColor(color);
            setIsEraser(false);
          }}
        />

        {/* Инструменты — крупные кнопки без текста */}
        <div className="flex justify-center gap-3">
          <Button
            variant={isEraser ? "default" : "outline"}
            size="lg"
            onClick={() => setIsEraser(!isEraser)}
            className="w-14 h-14 rounded-2xl p-0"
            aria-label="Ластик"
          >
            <Eraser size={26} />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={undo}
            disabled={historyStep <= 0}
            className="w-14 h-14 rounded-2xl p-0"
            aria-label="Отменить"
          >
            <Undo size={26} />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={clearCanvas}
            className="w-14 h-14 rounded-2xl p-0"
            aria-label="Очистить"
          >
            <Trash2 size={26} />
          </Button>
          
          <Button
            variant="default"
            size="lg"
            onClick={saveDrawing}
            disabled={isSaving}
            className="w-14 h-14 rounded-2xl p-0 bg-primary"
            aria-label="Сохранить"
          >
            <Save size={26} />
          </Button>
        </div>
      </div>
    </div>
  );
};
