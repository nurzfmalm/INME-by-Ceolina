import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Palette, Save, Trash2, Users, Copy, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { CeolinaGuidance } from "./CeolinaGuidance";
import { EMOTION_COLOR_PALETTE } from "@/lib/emotion-colors";

interface DualDrawingProps {
  onBack: () => void;
  childName: string;
}

const COLORS = EMOTION_COLOR_PALETTE.slice(0, 24).map(c => ({
  name: c.name,
  color: c.hex,
  emotion: c.emotion
}));

interface Stroke {
  id: string;
  user_id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  timestamp: number;
}

interface DrawingSession {
  id: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
}

export const DualDrawing = ({ onBack, childName }: DualDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[0].color);
  const [lineWidth, setLineWidth] = useState(5);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<number>(1);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [partnerActivity, setPartnerActivity] = useState<Date | null>(null);
  const [showCeolinaMessage, setShowCeolinaMessage] = useState(false);
  const [ceolinaMessage, setCeolinaMessage] = useState("");
  const [taskProgress, setTaskProgress] = useState({ user1: 0, user2: 0 });
  const [cooperativeTask, setCooperativeTask] = useState<any>(null);
  const [sessionStartTime] = useState(Date.now());
  const [myStrokeCount, setMyStrokeCount] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to drawing strokes
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
            drawStroke(stroke);
            setPartnerActivity(new Date());
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_activity",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const activity = payload.new as any;
          const userId = await getCurrentUserId();
          
          if (activity.user_id !== userId) {
            setPartnerActivity(new Date(activity.last_active));
          }
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setConnectedUsers(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const userId = await getCurrentUserId();
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Monitor partner inactivity
  useEffect(() => {
    if (!partnerActivity || connectedUsers < 2) return;

    const checkInactivity = setInterval(() => {
      const timeSinceActivity = Date.now() - partnerActivity.getTime();
      
      if (timeSinceActivity > 15000) { // 15 seconds
        setCeolinaMessage("Давайте подождём вашего партнёра! Может быть, он думает над следующим штрихом 😊");
        setShowCeolinaMessage(true);
      } else {
        setShowCeolinaMessage(false);
      }
    }, 5000);

    return () => clearInterval(checkInactivity);
  }, [partnerActivity, connectedUsers]);

  // Update activity tracker
  useEffect(() => {
    if (!sessionId) return;

    const updateActivity = setInterval(async () => {
      const userId = await getCurrentUserId();
      if (!userId) return;

      await supabase
        .from("session_activity")
        .upsert({
          session_id: sessionId,
          user_id: userId,
          last_active: new Date().toISOString(),
          stroke_count: myStrokeCount,
        });
    }, 3000);

    return () => clearInterval(updateActivity);
  }, [sessionId, myStrokeCount]);

  const createSession = async () => {
    try {
      const authed = await isUserAuthenticated();
      if (!authed) {
        toast.error("Войдите, чтобы создать совместную сессию");
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("Не удалось определить пользователя");
        return;
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from("drawing_sessions")
        .insert({
          session_code: code,
          created_by: userId,
          is_active: true,
        })
        .select()
        .maybeSingle();

      if (error || !data) throw error || new Error("Сессия не создана");

      setSessionId(data.id);
      setSessionCode(code);
      setIsHost(true);
      toast.success(`Сессия создана! Код: ${code}`);
    } catch (error) {
      console.error("Error creating session:", error);
      const msg = error instanceof Error ? error.message : "Ошибка при создании сессии";
      toast.error(msg.includes("row level security") ? "Требуется вход в систему для совместной сессии" : msg);
    }
  };

  const joinSession = async () => {
    if (!joinCode.trim()) {
      toast.error("Введите код сессии");
      return;
    }

    try {
      const authed = await isUserAuthenticated();
      if (!authed) {
        toast.error("Войдите, чтобы присоединиться к совместной сессии");
        return;
      }

      const { data, error } = await supabase
        .from("drawing_sessions")
        .select("*")
        .eq("session_code", joinCode.toUpperCase())
        .eq("is_active", true)
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
      console.error("Error joining session:", error);
      toast.error("Ошибка при подключении");
    }
  };

  const drawStroke = (stroke: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    
    if (stroke.is_start) {
      ctx.beginPath();
      ctx.moveTo(stroke.x, stroke.y);
    } else {
      ctx.lineTo(stroke.x, stroke.y);
      ctx.stroke();
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !sessionId) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastPoint({ x, y });

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    saveStroke(x, y, true);
    setMyStrokeCount(c => c + 1);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !sessionId) return;

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

    setLastPoint({ x, y });
    saveStroke(x, y, false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const saveStroke = async (x: number, y: number, isStart: boolean) => {
    if (!sessionId) return;

    try {
      const authed = await isUserAuthenticated();
      if (!authed) return; // Avoid RLS/FK errors in demo mode

      const userId = await getCurrentUserId();
      if (!userId) return;

      await supabase.from("drawing_strokes").insert({
        session_id: sessionId,
        user_id: userId,
        x,
        y,
        color: currentColor,
        size: lineWidth,
        is_start: isStart,
      });
    } catch (error) {
      console.error("Error saving stroke:", error);
    }
  };

  const clearCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !sessionId) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear strokes from database
    if (isHost) {
      await supabase
        .from("drawing_strokes")
        .delete()
        .eq("session_id", sessionId);
    }
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      // Analyze collaboration before saving
      await analyzeCollaboration();

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      const fileName = `${userId}/${Date.now()}-collab.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("artworks")
        .getPublicUrl(fileName);

      await supabase.from("artworks").insert({
        user_id: userId,
        image_url: publicUrl,
        storage_path: fileName,
        emotions_used: {},
        colors_used: [currentColor],
        metadata: {
          session_id: sessionId,
          session_type: "collaborative",
          participants: connectedUsers,
        },
      });

      // Track collaboration session
      await supabase.from("progress_sessions").insert({
        user_id: userId,
        session_type: "dual_drawing",
        emotional_analysis: {},
        behavioral_metrics: {
          collaboration_level: connectedUsers,
          synchronicity: "high",
        },
      });

      toast.success("Совместный рисунок сохранён! 🎨");
    } catch (error) {
      console.error("Error saving drawing:", error);
      toast.error("Ошибка при сохранении");
    }
  };

  const analyzeCollaboration = async () => {
    if (!sessionId || connectedUsers < 2) return;

    try {
      const userId = await getCurrentUserId();
      
      // Get session activity data
      const { data: activities, error } = await supabase
        .from("session_activity")
        .select("*")
        .eq("session_id", sessionId);

      if (error) throw error;

      if (!activities || activities.length < 2) return;

      const user1Data = activities[0];
      const user2Data = activities[1];

      const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);

      const sessionData = {
        duration: sessionDuration,
        participants: connectedUsers,
        taskType: "collaborative_drawing"
      };

      const participantData = {
        user1: {
          strokeCount: user1Data.stroke_count,
          activityRate: Math.round((user1Data.stroke_count / sessionDuration) * 100),
          colors: [currentColor],
          inactivePeriods: 0
        },
        user2: {
          strokeCount: user2Data.stroke_count,
          activityRate: Math.round((user2Data.stroke_count / sessionDuration) * 100),
          colors: [currentColor],
          inactivePeriods: 0
        }
      };

      const { data, error: analyzeError } = await supabase.functions.invoke(
        "analyze-collaboration",
        {
          body: { sessionData, participantData }
        }
      );

      if (analyzeError) throw analyzeError;

      setAnalysisResult(data.analysis);
      
      if (data.analysis.encouragement) {
        setCeolinaMessage(data.analysis.encouragement);
        setShowCeolinaMessage(true);
      }

      toast.success("Анализ сотрудничества завершён! 🤝");
    } catch (error) {
      console.error("Error analyzing collaboration:", error);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success("Код скопирован!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <CeolinaGuidance
        message={ceolinaMessage}
        visible={showCeolinaMessage}
        onClose={() => setShowCeolinaMessage(false)}
      />
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft size={24} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Совместное рисование</h1>
                <p className="text-sm text-muted-foreground">
                  Рисуйте вместе в реальном времени, {childName}
                </p>
              </div>
            </div>
            {sessionId && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gradient-calm px-3 py-1 rounded-full">
                  <Users className="text-white" size={16} />
                  <span className="text-sm font-semibold text-white">
                    {connectedUsers} участник{connectedUsers > 1 ? "а" : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {!sessionId ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-8 border-0 bg-card shadow-soft">
              <h2 className="text-xl font-bold mb-4">Создать новую сессию</h2>
              <p className="text-muted-foreground mb-4">
                Создайте сессию и поделитесь кодом с другом
              </p>
              <Button onClick={createSession} className="w-full" size="lg">
                <Users className="mr-2" size={20} />
                Создать сессию
              </Button>
            </Card>

            <Card className="p-8 border-0 bg-card shadow-soft">
              <h2 className="text-xl font-bold mb-4">Присоединиться к сессии</h2>
              <p className="text-muted-foreground mb-4">
                Введите код сессии для подключения
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Введите код"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="uppercase"
                  maxLength={6}
                />
                <Button onClick={joinSession}>Подключиться</Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Session Info */}
            <Card className="p-4 border-0 bg-gradient-calm shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">Код сессии</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">{sessionCode}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyCode}
                      className="text-white hover:bg-white/20"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/80">Роль</p>
                  <p className="text-lg font-semibold text-white">
                    {isHost ? "Организатор" : "Участник"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Color Palette */}
            <Card className="p-4 border-0 bg-card shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="text-primary" size={20} />
                <h3 className="font-semibold">Выбери цвет</h3>
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

            {/* Collaboration Analysis */}
            {analysisResult && (
              <Card className="p-6 border-0 bg-gradient-calm shadow-soft">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-white" size={20} />
                    <h3 className="font-bold text-white text-lg">Анализ сотрудничества</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-white/70 mb-1">Сотрудничество</p>
                      <p className="text-2xl font-bold text-white">{analysisResult.collaboration_score}%</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-white/70 mb-1">Синхронность</p>
                      <p className="text-2xl font-bold text-white">{analysisResult.emotional_sync}%</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-white/70 mb-1">Баланс</p>
                      <p className="text-2xl font-bold text-white">{analysisResult.balance_score}%</p>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-sm font-semibold text-white mb-2">Сильные стороны:</p>
                    <ul className="space-y-1">
                      {analysisResult.strengths?.map((strength: string, i: number) => (
                        <li key={i} className="text-sm text-white/90">✓ {strength}</li>
                      ))}
                    </ul>
                  </div>

                  {analysisResult.therapist_notes && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                      <p className="text-sm font-semibold text-white mb-2">Для терапевта:</p>
                      <p className="text-sm text-white/90">{analysisResult.therapist_notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Tools */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={clearCanvas} disabled={!isHost}>
                <Trash2 size={18} className="mr-2" />
                {isHost ? "Очистить" : "Только организатор"}
              </Button>
              <Button variant="default" onClick={saveDrawing}>
                <Save size={18} className="mr-2" />
                Сохранить
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">Размер:</span>
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
          </>
        )}
      </main>
    </div>
  );
};
