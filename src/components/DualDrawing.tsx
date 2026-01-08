import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Home, Save, Trash2, Users, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { SimpleColorPalette, THERAPEUTIC_COLORS } from "./drawing/SimpleColorPalette";

interface DualDrawingProps {
  onBack: () => void;
  childName: string;
}

const COLORS = THERAPEUTIC_COLORS;

interface PartnerCursor {
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export const DualDrawing = ({ onBack, childName }: DualDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[0].hex);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<number>(1);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [partnerCursor, setPartnerCursor] = useState<PartnerCursor | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Инициализация холста — 75% экрана
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const minHeight = window.innerHeight * 0.6;
      const canvasHeight = Math.max(minHeight, rect.height);
      
      canvas.width = rect.width;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFEF7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

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
          const stroke = payload.new as any;
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const createSession = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("Ошибка");
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
      toast.success(`Код: ${code}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка");
    }
  };

  const joinSession = async () => {
    if (!joinCode.trim()) {
      toast.error("Введите код");
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
        toast.error("Не найдено");
        return;
      }

      setSessionId(data.id);
      setSessionCode(joinCode.toUpperCase());
      setIsHost(false);
      toast.success("Подключено!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка");
    }
  };

  const drawStroke = (stroke: any) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 8;
    
    if (stroke.is_start) {
      ctx.beginPath();
      ctx.moveTo(stroke.x, stroke.y);
    } else {
      ctx.lineTo(stroke.x, stroke.y);
      ctx.stroke();
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sessionId) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    lastPointRef.current = { x, y };

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);

    saveStroke(x, y, true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !sessionId) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    lastPointRef.current = { x, y };
    saveStroke(x, y, false);
    broadcastCursor(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const saveStroke = async (x: number, y: number, isStart: boolean) => {
    const userId = await getCurrentUserId();
    if (!userId || !sessionId) return;

    try {
      await supabase.from("drawing_strokes").insert([{
        session_id: sessionId,
        user_id: userId,
        stroke_data: { x, y, color: currentColor, size: 8, is_start: isStart },
      }]);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const broadcastCursor = async (x: number, y: number) => {
    if (!sessionId) return;
    const channel = supabase.channel(`drawing:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { x, y, color: currentColor }
    });
  };

  const clearCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !isHost) return;

    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (sessionId) {
      await supabase.from("drawing_strokes").delete().eq("session_id", sessionId);
    }
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
        metadata: { session_id: sessionId, session_type: "collaborative", participants: connectedUsers },
      });

      toast.success("Сохранено! 🎨");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success("Скопировано!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F0" }}>
        <header className="flex items-center px-3 py-2" style={{ backgroundColor: "#FFFEF7" }}>
          <Button variant="ghost" size="icon" onClick={onBack} className="w-14 h-14 rounded-2xl">
            <Home size={28} />
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-6">
            <Card className="p-6 rounded-3xl border-0 shadow-lg">
              <div className="text-center mb-4">
                <Users size={48} className="mx-auto text-primary mb-2" />
                <h2 className="text-xl font-bold">Создать сессию</h2>
              </div>
              <Button onClick={createSession} className="w-full h-14 text-lg rounded-2xl">
                Создать
              </Button>
            </Card>

            <Card className="p-6 rounded-3xl border-0 shadow-lg">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">Присоединиться</h2>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Код сессии"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="h-14 text-lg text-center uppercase rounded-2xl"
                  maxLength={6}
                />
                <Button onClick={joinSession} className="w-full h-14 text-lg rounded-2xl">
                  Подключиться
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F6F0" }}>
      {/* Шапка с кодом сессии */}
      <header className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: "#FFFEF7" }}>
        <Button variant="ghost" size="icon" onClick={onBack} className="w-14 h-14 rounded-2xl">
          <Home size={28} />
        </Button>

        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl"
        >
          <span className="text-lg font-bold">{sessionCode}</span>
          {copied ? <Check size={20} /> : <Copy size={20} />}
        </button>

        <div className="flex items-center gap-2 px-3 py-2 bg-primary/20 rounded-2xl">
          <Users size={20} />
          <span className="font-bold">{connectedUsers}</span>
        </div>
      </header>

      {/* ХОЛСТ */}
      <div 
        ref={containerRef}
        className="flex-1 mx-2 my-2 rounded-3xl overflow-hidden relative"
        style={{ backgroundColor: "#FFFEF7", minHeight: "55vh" }}
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

        {partnerCursor && Date.now() - partnerCursor.timestamp < 2000 && (
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none"
            style={{
              backgroundColor: partnerCursor.color,
              left: `${partnerCursor.x}px`,
              top: `${partnerCursor.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </div>

      {/* Панель управления */}
      <div className="px-3 pb-4 space-y-3">
        <SimpleColorPalette
          colors={COLORS}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
        />

        <div className="flex justify-center gap-4">
          {isHost && (
            <Button
              variant="outline"
              size="lg"
              onClick={clearCanvas}
              className="w-16 h-16 rounded-2xl p-0"
              aria-label="Очистить"
            >
              <Trash2 size={28} />
            </Button>
          )}
          
          <Button
            variant="default"
            size="lg"
            onClick={saveDrawing}
            className="w-16 h-16 rounded-2xl p-0"
            aria-label="Сохранить"
          >
            <Save size={28} />
          </Button>
        </div>
      </div>
    </div>
  );
};
