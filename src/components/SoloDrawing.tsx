import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Palette, Save, Trash2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";

interface SoloDrawingProps {
  onBack: () => void;
  childName: string;
  taskId?: string | null;
  taskPrompt?: string | null;
}

import { EMOTION_COLOR_PALETTE } from "@/lib/emotion-colors";

const COLORS = EMOTION_COLOR_PALETTE.map(c => ({
  name: c.name,
  color: c.hex,
  emotion: c.emotion,
  category: c.emotionCategory,
  note: c.therapeuticNote
}));

export const SoloDrawing = ({ onBack, childName, taskId, taskPrompt }: SoloDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[0].color);
  const [lineWidth, setLineWidth] = useState(5);
  const [emotionStats, setEmotionStats] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [taskAnalysis, setTaskAnalysis] = useState<any>(null);
  const [showTaskResult, setShowTaskResult] = useState(false);

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

  const generateAnalysis = async () => {
    const colorsUsed = COLORS
      .filter((c) => emotionStats[c.emotion])
      .map((c) => c.name);
    
    const dominantEmotion = Object.keys(emotionStats).sort(
      (a, b) => emotionStats[b] - emotionStats[a]
    )[0];

    setAnalysis({
      colorsUsed,
      dominantEmotion,
      sessionDuration: Math.floor((Date.now() - sessionStart) / 1000),
      totalStrokes: Object.values(emotionStats).reduce((a, b) => a + b, 0),
      insights: [
        `Сегодня ты использовал(а) ${colorsUsed.length} разных цветов`,
        `Твоя основная эмоция: ${dominantEmotion}`,
        `Ты рисовал(а) ${Math.floor((Date.now() - sessionStart) / 60000)} минут`,
      ],
    });
    setShowAnalysis(true);
  };

  const analyzeTaskCompletion = async () => {
    if (!taskId || !taskPrompt) return null;

    try {
      const colorsUsed = COLORS
        .filter((c) => emotionStats[c.emotion])
        .map((c) => c.color);

      const { data, error } = await supabase.functions.invoke('analyze-task-drawing', {
        body: {
          imageData: canvasRef.current?.toDataURL(),
          taskPrompt,
          emotionStats,
          colorsUsed
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error analyzing task:", error);
      return {
        taskCompleted: true,
        score: 70,
        feedback: "Отличная работа! Продолжай рисовать!",
        tokensAwarded: 10
      };
    }
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
        const artworks = JSON.parse(localStorage.getItem('ceolinaArtworks') || '[]');
        
        const colorsUsed = COLORS
          .filter((c) => emotionStats[c.emotion])
          .map((c) => c.color);
        
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
        
        localStorage.setItem('ceolinaArtworks', JSON.stringify(artworks));
        
        // Analyze task for demo mode
        if (taskId && taskPrompt) {
          const analysis = await analyzeTaskCompletion();
          setTaskAnalysis(analysis);
          setShowTaskResult(true);
          
          if (analysis?.taskCompleted) {
            const completed = JSON.parse(
              localStorage.getItem("ceolinaCompletedTasks") || "[]"
            );
            completed.push(taskId);
            localStorage.setItem("ceolinaCompletedTasks", JSON.stringify(completed));

            const currentTokens = parseInt(localStorage.getItem("ceolinaTokens") || "0");
            localStorage.setItem("ceolinaTokens", (currentTokens + analysis.tokensAwarded).toString());
            toast.success(`Задание выполнено! Получено ${analysis.tokensAwarded} токенов! 🎉`);
          } else {
            toast.info("Попробуй ещё раз! " + analysis?.feedback);
          }
        } else {
          toast.success("Рисунок сохранён в галерею! 🎨");
        }
        clearCanvas();
        return;
      }

      const fileName = `${userId}/${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(fileName, blob, {
          contentType: "image/png",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("artworks")
        .getPublicUrl(fileName);

      const colorsUsed = COLORS
        .filter((c) => emotionStats[c.emotion])
        .map((c) => c.color);

      const { error: dbError } = await supabase
        .from("artworks")
        .insert({
          user_id: userId,
          image_url: publicUrl,
          storage_path: fileName,
          emotions_used: emotionStats,
          colors_used: colorsUsed,
          task_id: taskId || null,
          metadata: {
            line_width: lineWidth,
            session_duration: Math.floor((Date.now() - sessionStart) / 1000),
          },
        });

      if (dbError) throw dbError;

      // Analyze task completion with AI
      if (taskId && taskPrompt) {
        const analysis = await analyzeTaskCompletion();
        setTaskAnalysis(analysis);
        setShowTaskResult(true);

        if (analysis?.taskCompleted) {
          const { error: taskError } = await supabase
            .from("user_tasks")
            .insert({
              user_id: userId,
              task_id: taskId,
            });

          if (!taskError) {
            await supabase.from("emotion_tokens").insert({
              user_id: userId,
              amount: analysis.tokensAwarded,
              reason: `Task completed: ${taskPrompt}`,
            });
            toast.success(`Задание выполнено! Получено ${analysis.tokensAwarded} токенов! 🎉`);
          }
        } else {
          toast.info("Попробуй ещё раз! " + analysis?.feedback);
        }
      }

      await supabase.from("progress_sessions").insert({
        user_id: userId,
        session_type: "art_therapy",
        duration_seconds: Math.floor((Date.now() - sessionStart) / 1000),
        emotional_analysis: emotionStats,
        behavioral_metrics: {
          colors_count: colorsUsed.length,
          primary_emotion: Object.keys(emotionStats).sort(
            (a, b) => emotionStats[b] - emotionStats[a]
          )[0],
        },
      });

      if (!taskId) {
        toast.success("Рисунок сохранён в галерею! 🎨");
      }
      clearCanvas();
    } catch (error) {
      console.error("Error saving artwork:", error);
      toast.error("Ошибка при сохранении рисунка");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Рисовать одному</h1>
              <p className="text-sm text-muted-foreground">
                {taskPrompt || `Рисуй и выражай свои эмоции, ${childName}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-4 border-0 bg-card shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette className="text-primary" size={20} />
              <h3 className="font-semibold">Палитра эмоций ({COLORS.length} цветов)</h3>
            </div>
          </div>
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-2 max-h-48 overflow-y-auto p-2">
            {COLORS.map((item) => (
              <button
                key={item.color}
                onClick={() => setCurrentColor(item.color)}
                className={`relative group transition-all hover:scale-125 ${
                  currentColor === item.color ? "scale-125 z-10" : ""
                }`}
                title={`${item.name} - ${item.note}`}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-soft"
                  style={{ backgroundColor: item.color }}
                />
                {currentColor === item.color && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
          {currentColor && (
            <div className="mt-3 text-center">
              <p className="text-sm font-semibold">
                {COLORS.find(c => c.color === currentColor)?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {COLORS.find(c => c.color === currentColor)?.note}
              </p>
            </div>
          )}
        </Card>

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

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={clearCanvas} disabled={isSaving}>
            <Trash2 size={18} className="mr-2" />
            Очистить
          </Button>
          <Button variant="default" onClick={saveDrawing} disabled={isSaving}>
            <Save size={18} className="mr-2" />
            {isSaving ? "Сохранение..." : "Сохранить в галерею"}
          </Button>
          <Button variant="secondary" onClick={generateAnalysis}>
            <BarChart3 size={18} className="mr-2" />
            Посмотреть анализ
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

        {showTaskResult && taskAnalysis && (
          <Card className={`p-6 border-0 shadow-soft ${
            taskAnalysis.taskCompleted ? 'bg-gradient-calm' : 'bg-gradient-warm'
          }`}>
            <h3 className="font-semibold text-primary-foreground mb-4 text-xl">
              {taskAnalysis.taskCompleted ? '✅ Задание выполнено!' : '🎨 Результат анализа'}
            </h3>
            <div className="space-y-3 text-primary-foreground/90">
              <p className="text-lg font-semibold">Оценка: {taskAnalysis.score}/100</p>
              <p className="text-sm">{taskAnalysis.feedback}</p>
              {taskAnalysis.taskCompleted && (
                <p className="text-lg font-bold mt-4">
                  🎉 Получено токенов: {taskAnalysis.tokensAwarded}
                </p>
              )}
            </div>
          </Card>
        )}

        {showAnalysis && analysis && (
          <Card className="p-6 border-0 bg-gradient-calm shadow-soft">
            <h3 className="font-semibold text-primary-foreground mb-4 text-xl">
              Анализ твоего рисунка
            </h3>
            <div className="space-y-3 text-primary-foreground/90">
              {analysis.insights.map((insight: string, idx: number) => (
                <p key={idx} className="text-sm">✨ {insight}</p>
              ))}
            </div>
          </Card>
        )}

        {Object.keys(emotionStats).length > 0 && (
          <Card className="p-4 border-0 bg-gradient-warm shadow-soft">
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