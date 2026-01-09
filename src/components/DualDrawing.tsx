import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Home, Save, Trash2, Users, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { ColorPaletteNew, DEFAULT_COLORS } from "./drawing/ColorPaletteNew";
import { DrawingCursor } from "./drawing/DrawingCursor";

interface DualDrawingProps {
  onBack: () => void;
  childName: string;
}

interface PartnerCursor {
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

interface StrokeData {
  x: number;
  y: number;
  color: string;
  size: number;
  is_start: boolean;
}

export const DualDrawing = ({ onBack, childName }: DualDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLORS[0].hex);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<number>(1);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [partnerCursor, setPartnerCursor] = useState<PartnerCursor | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lineWidth = 8;

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

  // Подписка на сессию
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`drawing:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drawing_strokes",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const stroke = payload.new as { user_id: string; stroke_data: StrokeData };
          const userId = await getCurrentUserId();
          if (stroke.user_id !== userId) {
            drawStroke(stroke.stroke_data);
          }
        }
      )
      .on(
        "broadcast",
        { event: "cursor_move" },
        (payload) => {
          setPartnerCursor({
            x: payload.payload.x,
            y: payload.payload.y,
            color: payload.payload.color,
            timestamp: Date.now()
          });
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setConnectedUsers(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const userId = await getCurrentUserId();
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId]);

  const drawStroke = useCallback((stroke: StrokeData) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    if (stroke.is_start) {
      ctx.beginPath();
      ctx.moveTo(stroke.x, stroke.y);
    } else {
      ctx.lineTo(stroke.x, stroke.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(stroke.x, stroke.y);
    }
  }, []);

  const createSession = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("Ошибка авторизации");
        return;
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from("drawing_sessions")
        .insert({ session_code: code, host_user_id: userId, status: 'waiting' })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setSessionCode(code);
      setIsHost(true);
      toast.success(`Сессия создана! Код: ${code}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка создания сессии");
    }
  };

  const joinSession = async () => {
    if (!joinCode.trim()) {
      toast.error("Введите код сессии");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("drawing_sessions")
        .select("*")
        .eq("session_code", joinCode.toUpperCase())
        .eq("status", "waiting")
        .maybeSingle();

      if (error || !data) {
        toast.error("Сессия не найдена");
        return;
      }

      setSessionId(data.id);
      setSessionCode(joinCode.toUpperCase());
      setIsHost(false);
      toast.success("Подключено к сессии!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка подключения");
    }
  };

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

  const saveStroke = async (x: number, y: number, isStart: boolean) => {
    const userId = await getCurrentUserId();
    if (!userId || !sessionId) return;

    try {
      await supabase.from("drawing_strokes").insert([{
        session_id: sessionId,
        user_id: userId,
        stroke_data: { x, y, color: currentColor, size: lineWidth, is_start: isStart },
      }]);
    } catch (error) {
      console.error("Error saving stroke:", error);
    }
  };

  const broadcastCursor = useCallback(async (x: number, y: number) => {
    if (!channelRef.current) return;
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { x, y, color: currentColor }
    });
  }, [currentColor]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sessionId) return;
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

    saveStroke(x, y, true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !sessionId) return;
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
    saveStroke(x, y, false);
    broadcastCursor(x, y);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.stroke();
      setIsDrawing(false);
      lastPointRef.current = null;
    }
  };

  const clearCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !isHost) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (sessionId) {
      await supabase.from("drawing_strokes").delete().eq("session_id", sessionId);
    }
    
    toast.success("Холст очищен");
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

      const fileName = `${userId}/${Date.now()}-collab.png`;
      await supabase.storage.from("artworks").upload(fileName, blob);

      const { data: signedData } = await supabase.storage
        .from("artworks")
        .createSignedUrl(fileName, 3600);

      await supabase.from("artworks").insert({
        user_id: userId,
        image_url: signedData?.signedUrl || "",
        storage_path: fileName,
        metadata: { 
          session_id: sessionId, 
          session_type: "collaborative", 
          participants: connectedUsers 
        },
      });

      toast.success("Рисунок сохранён! 🎨");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка сохранения");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success("Код скопирован!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Экран создания/присоединения к сессии
  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F3EE]">
        <header className="flex items-center px-4 py-3 bg-white/90 backdrop-blur-sm shadow-sm">
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
          >
            <Home size={24} className="text-amber-800" />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800">
            Рисуем вместе
          </h1>
          <div className="w-12" />
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-6">
            <Card className="p-6 rounded-3xl border-0 shadow-lg bg-white">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users size={32} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Создать сессию</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Создайте комнату и пригласите друга
                </p>
              </div>
              <Button onClick={createSession} className="w-full h-14 text-lg rounded-2xl">
                Создать
              </Button>
            </Card>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-muted-foreground">или</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Card className="p-6 rounded-3xl border-0 shadow-lg bg-white">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Присоединиться</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Введите код от друга
                </p>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="h-14 text-xl text-center uppercase rounded-2xl font-mono tracking-widest"
                  maxLength={6}
                />
                <Button 
                  onClick={joinSession} 
                  variant="outline"
                  className="w-full h-14 text-lg rounded-2xl"
                >
                  Подключиться
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Экран рисования
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EE]">
      {/* Кастомный курсор */}
      <DrawingCursor
        canvasRef={canvasRef}
        color={currentColor}
        size={lineWidth}
        isEraser={false}
        visible={!isDrawing}
      />

      {/* Шапка */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-sm shadow-sm">
        <button 
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
        >
          <Home size={24} className="text-amber-800" />
        </button>

        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
        >
          <span className="text-lg font-bold font-mono tracking-wider text-primary">
            {sessionCode}
          </span>
          {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-primary" />}
        </button>

        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <Users size={18} className="text-green-700" />
          <span className="font-bold text-green-700">{connectedUsers}</span>
        </div>
      </header>

      {/* Холст */}
      <div className="flex-1 flex flex-col p-3">
        <div 
          ref={containerRef}
          className="flex-1 rounded-3xl overflow-hidden shadow-lg bg-white relative"
          style={{ minHeight: "50vh" }}
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

          {/* Курсор партнёра */}
          {partnerCursor && Date.now() - partnerCursor.timestamp < 2000 && (
            <div
              className="absolute pointer-events-none transition-all duration-75"
              style={{
                left: `${partnerCursor.x}px`,
                top: `${partnerCursor.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div 
                className="w-6 h-6 rounded-full border-3 border-white shadow-lg"
                style={{ backgroundColor: partnerCursor.color }}
              />
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-500 whitespace-nowrap">
                Друг
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Панель управления */}
      <div className="px-4 pb-4 space-y-3">
        <ColorPaletteNew
          colors={DEFAULT_COLORS}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
        />

        <div className="flex justify-center gap-4">
          {isHost && (
            <Button
              variant="outline"
              size="lg"
              onClick={clearCanvas}
              className="w-14 h-14 rounded-2xl p-0"
            >
              <Trash2 size={24} />
            </Button>
          )}
          
          <Button
            size="lg"
            onClick={saveDrawing}
            className="w-14 h-14 rounded-2xl p-0 bg-green-500 hover:bg-green-600"
          >
            <Save size={24} />
          </Button>
        </div>
      </div>
    </div>
  );
};
