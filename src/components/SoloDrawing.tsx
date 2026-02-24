import { useRef, useState, useEffect, useCallback } from "react";
import { Save, Trash2, Undo, ArrowLeft, Pencil, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { DrawingCursor } from "./drawing/DrawingCursor";
import { MediumToolbar } from "./drawing/MediumToolbar";
import { ComplexToolbar } from "./drawing/ComplexToolbar";

// Colors from Figma design
const FIGMA_COLORS = [
  { hex: "#EF4444", name: "красный" },
  { hex: "#F97316", name: "оранжевый" },
  { hex: "#EAB308", name: "жёлтый" },
  { hex: "#22C55E", name: "зелёный" },
  { hex: "#3B82F6", name: "синий" },
  { hex: "#8B5CF6", name: "фиолетовый" },
  { hex: "#EC4899", name: "розовый" },
  { hex: "#92400E", name: "коричневый" },
  { hex: "#1F2937", name: "тёмный" },
];

const BRUSH_SIZES = [
  { size: 20, label: "Толстый" },
  { size: 10, label: "Средний" },
  { size: 4, label: "Тонкий" },
];

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
  const [complexity, setComplexity] = useState<string>("simple");
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Загрузка настройки сложности интерфейса
  useEffect(() => {
    const loadComplexity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("sensory_settings")
          .select("interface_complexity")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.interface_complexity) {
          setComplexity(data.interface_complexity);
        }
      } catch (e) {
        console.error("Error loading complexity:", e);
      }
    };
    loadComplexity();
  }, []);

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

  // Shared canvas element
  const canvasElement = (
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
  );


  // ===== SIMPLE: sidebar on right (current design from рис 1) =====
  if (complexity === "simple") {
    return (
      <div className="min-h-screen flex flex-col bg-[#E8F4FC]">
        <DrawingCursor canvasRef={canvasRef} color={currentColor} size={lineWidth} isEraser={isEraser} visible={!isDrawing} />
        <header className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm">Домой</span>
          </button>
        </header>
        <div className="flex-1 flex gap-4 p-4">
          <div ref={containerRef} className="flex-1 bg-white rounded-3xl shadow-lg overflow-hidden border-4 border-sky-200">
            {canvasElement}
          </div>
          {/* Side toolbar */}
          <div className="w-44 bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-4 overflow-y-auto">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Инструменты</h3>
              <div className="space-y-2">
                <button onClick={() => setIsEraser(true)} className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${isEraser ? "bg-sky-100 text-sky-600" : "hover:bg-gray-50 text-gray-600"}`}>
                  <Eraser size={18} /><span className="text-sm">Ластик</span>
                </button>
                <button onClick={() => setIsEraser(false)} className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${!isEraser ? "bg-sky-100 text-sky-600" : "hover:bg-gray-50 text-gray-600"}`}>
                  <Pencil size={18} /><span className="text-sm">Карандаш</span>
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Цвета</h3>
              <div className="grid grid-cols-3 gap-2">
                {FIGMA_COLORS.map((color) => (
                  <button key={color.hex} onClick={() => { setCurrentColor(color.hex); setIsEraser(false); }}
                    className={`w-9 h-9 rounded-full transition-transform ${currentColor === color.hex && !isEraser ? "scale-110 ring-2 ring-offset-2 ring-sky-400" : "hover:scale-105"}`}
                    style={{ backgroundColor: color.hex }} title={color.name} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Толщина</h3>
              <div className="space-y-2">
                {BRUSH_SIZES.map((brush) => (
                  <button key={brush.size} onClick={() => setLineWidth(brush.size)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${lineWidth === brush.size ? "bg-sky-50" : "hover:bg-gray-50"}`}>
                    <div className="rounded-full bg-sky-400" style={{ width: Math.min(brush.size * 1.2, 24), height: Math.min(brush.size * 1.2, 24) }} />
                    <span className="text-sm text-gray-700">{brush.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-auto space-y-2">
              <button onClick={undo} disabled={historyStep <= 0} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-colors">
                <Undo size={18} /><span className="text-sm">Назад</span>
              </button>
              <button onClick={clearCanvas} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-red-50 text-gray-600 transition-colors">
                <Trash2 size={18} /><span className="text-sm">Очистить</span>
              </button>
              <button onClick={saveDrawing} disabled={isSaving} className="flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50">
                <Save size={18} /><span className="text-sm font-medium">{isSaving ? "..." : "Сохранить"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== MEDIUM: left expandable menu (рис 2) =====
  if (complexity === "medium") {
    return (
      <div className="min-h-screen flex flex-col bg-[#E8F4FC]">
        <DrawingCursor canvasRef={canvasRef} color={currentColor} size={lineWidth} isEraser={isEraser} visible={!isDrawing} />
        <header className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm">Домой</span>
          </button>
        </header>
        <div className="flex-1 flex gap-4 p-4">
          {/* Left expandable toolbar */}
          <div className="flex flex-col justify-between py-2">
            <MediumToolbar
              currentColor={currentColor}
              currentSize={lineWidth}
              isEraser={isEraser}
              onColorChange={setCurrentColor}
              onSizeChange={setLineWidth}
              onEraserToggle={setIsEraser}
              onUndo={undo}
              canUndo={historyStep > 0}
            />
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={clearCanvas} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 text-gray-600 hover:bg-white text-sm" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <Trash2 size={16} /><span>Очистить</span>
              </button>
              <button onClick={saveDrawing} disabled={isSaving} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 text-sm disabled:opacity-50" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <Save size={16} /><span>{isSaving ? "..." : "Сохранить"}</span>
              </button>
            </div>
          </div>
          {/* Canvas */}
          <div ref={containerRef} className="flex-1 bg-white rounded-3xl shadow-lg overflow-hidden border-4 border-sky-200">
            {canvasElement}
          </div>
        </div>
      </div>
    );
  }

  // ===== COMPLEX: bottom floating icons (рис 3) =====
  return (
    <div className="min-h-screen flex flex-col bg-[#E8F4FC]">
      <DrawingCursor canvasRef={canvasRef} color={currentColor} size={lineWidth} isEraser={isEraser} visible={!isDrawing} />
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm">Домой</span>
        </button>
        <div className="flex gap-2">
          <button onClick={clearCanvas} className="p-2 rounded-lg bg-white/80 text-gray-500 hover:bg-white transition-colors">
            <Trash2 size={18} />
          </button>
          <button onClick={saveDrawing} disabled={isSaving} className="px-3 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm disabled:opacity-50">
            <Save size={18} />
          </button>
        </div>
      </header>
      <div className="flex-1 flex flex-col p-4 gap-3">
        {/* Canvas takes most space */}
        <div ref={containerRef} className="flex-1 bg-white rounded-3xl shadow-lg overflow-hidden border-4 border-sky-200">
          {canvasElement}
        </div>
        {/* Bottom floating toolbar */}
        <div className="flex justify-center pb-2">
          <ComplexToolbar
            currentColor={currentColor}
            currentSize={lineWidth}
            isEraser={isEraser}
            onColorChange={setCurrentColor}
            onSizeChange={setLineWidth}
            onEraserToggle={setIsEraser}
            onUndo={undo}
            canUndo={historyStep > 0}
          />
        </div>
      </div>
    </div>
  );
};
