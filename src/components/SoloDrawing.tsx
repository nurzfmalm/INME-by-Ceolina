import { useRef, useState, useEffect, useCallback } from "react";
import { Save, Trash2, Eraser, Undo, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { FigmaToolbar, FIGMA_COLORS } from "./drawing/FigmaToolbar";
import { DrawingCursor } from "./drawing/DrawingCursor";

interface SoloDrawingProps {
  onBack: () => void;
  childName: string;
  childId?: string | null;
  taskId?: string | null;
  taskPrompt?: string | null;
}

export const SoloDrawing = ({ onBack, childName, childId, taskId, taskPrompt }: SoloDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(FIGMA_COLORS[0].hex);
  const [lineWidth, setLineWidth] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Инициализация холста
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      
      // Сохраняем текущее изображение перед resize
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }
      
      canvas.width = containerRect.width;
      canvas.height = containerRect.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        // Восстанавливаем изображение
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
          ctx.drawImage(tempCanvas, 0, 0);
        }
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

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    // Ограничиваем историю 20 шагами
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  const undo = useCallback(() => {
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
  }, [history, historyStep]);

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
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };

    ctx.lineWidth = isEraser ? lineWidth * 2 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();

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

    // Плавная линия с использованием квадратичных кривых
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
      saveToHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL();
    setHistory([dataUrl]);
    setHistoryStep(0);
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

      if (!isAuth) {
        const dataUrl = canvas.toDataURL("image/png");
        const artworks = JSON.parse(localStorage.getItem('starArtworks') || '[]');
        
        artworks.push({
          id: Date.now().toString(),
          image_url: dataUrl,
          storage_path: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
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
        child_id: childId || null,
        image_url: signedData.signedUrl,
        storage_path: fileName,
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
    <div className="min-h-screen flex flex-col bg-[#E8F4FC]">
      {/* Кастомный курсор */}
      <DrawingCursor
        canvasRef={canvasRef}
        color={currentColor}
        size={lineWidth}
        isEraser={isEraser}
        visible={!isDrawing}
      />

      {/* Шапка минималистичная */}
      <header className="flex items-center gap-3 px-4 py-3">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={24} />
          <span className="font-medium">Домой</span>
        </button>
        
        {taskPrompt && (
          <p className="flex-1 text-center text-lg font-medium text-gray-700 truncate px-4">
            {taskPrompt}
          </p>
        )}
      </header>

      {/* Основная область рисования */}
      <div className="flex-1 flex flex-col p-4 pb-24">
        {/* Холст */}
        <div 
          ref={containerRef} 
          className="flex-1 bg-white rounded-3xl shadow-lg overflow-hidden"
          style={{ minHeight: "60vh" }}
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
            style={{ cursor: "none" }}
          />
        </div>

        {/* Мини-панель действий сверху справа */}
        <div className="fixed top-4 right-4 flex gap-2 z-40">
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center disabled:opacity-50 hover:bg-gray-50 transition-colors"
            title="Отменить"
          >
            <Undo size={18} className="text-gray-600" />
          </button>
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-colors ${
              isEraser ? "bg-sky-100" : "bg-white hover:bg-gray-50"
            }`}
            title="Ластик"
          >
            <Eraser size={18} className={isEraser ? "text-sky-600" : "text-gray-600"} />
          </button>
          <button
            onClick={clearCanvas}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
            title="Очистить"
          >
            <Trash2 size={18} className="text-gray-600" />
          </button>
          <button
            onClick={saveDrawing}
            disabled={isSaving}
            className="w-10 h-10 rounded-full bg-green-500 shadow-md flex items-center justify-center hover:bg-green-600 transition-colors disabled:opacity-50"
            title="Сохранить"
          >
            <Save size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Figma-style Toolbar */}
      <FigmaToolbar
        currentColor={currentColor}
        currentSize={lineWidth}
        onColorChange={(color) => {
          setCurrentColor(color);
          setIsEraser(false);
        }}
        onSizeChange={setLineWidth}
        onBack={onBack}
      />
    </div>
  );
};
