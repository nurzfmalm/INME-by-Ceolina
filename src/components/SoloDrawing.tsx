import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Palette, Save, Trash2, BarChart3, Sparkles, Eraser, Undo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { FloatingAssistant } from "./FloatingAssistant";

interface SoloDrawingProps {
  onBack: () => void;
  childName: string;
  taskId?: string | null;
  taskPrompt?: string | null;
}

import { EMOTION_COLOR_PALETTE } from "@/lib/emotion-colors";
import { 
  getUnlockedRewards, 
  REWARD_COLORS, 
  getBrushType, 
  getAvailableTextures, 
  getAvailableBackgrounds,
  applyBrushEffect,
  applyTexture,
  type BrushType,
  type TextureType,
  type Background
} from "@/lib/rewards-system";

const BASE_COLORS = EMOTION_COLOR_PALETTE.map(c => ({
  name: c.name,
  color: c.hex,
  emotion: c.emotion,
  category: c.emotionCategory,
  note: c.therapeuticNote
}));

export const SoloDrawing = ({ onBack, childName, taskId, taskPrompt }: SoloDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(BASE_COLORS[0].color);
  const [lineWidth, setLineWidth] = useState(5);
  const [brushType, setBrushType] = useState<BrushType>("normal");
  const [currentTexture, setCurrentTexture] = useState<TextureType>("none");
  const [currentBackground, setCurrentBackground] = useState<Background>(getAvailableBackgrounds()[0]);
  const [availableColors, setAvailableColors] = useState(BASE_COLORS);
  const [emotionStats, setEmotionStats] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [taskAnalysis, setTaskAnalysis] = useState<any>(null);
  const [showTaskResult, setShowTaskResult] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Загружаем разблокированные награды
    const unlocked = getUnlockedRewards();
    
    // Добавляем цвета наград если разблокированы
    const colors = [...BASE_COLORS];
    REWARD_COLORS.forEach(rewardColor => {
      if (unlocked.includes(rewardColor.id)) {
        colors.push(rewardColor);
      }
    });
    setAvailableColors(colors);
    
    // Устанавливаем тип кисти
    setBrushType(getBrushType());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Применяем фон
    if (currentBackground.gradient.startsWith('linear-gradient')) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        const gradient = tempCtx.createLinearGradient(0, 0, canvas.width, canvas.height);
        // Парсим градиент (упрощенно)
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    } else {
      ctx.fillStyle = currentBackground.gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Сохраняем начальное состояние в историю
    if (history.length === 0) {
      const dataUrl = canvas.toDataURL();
      setHistory([dataUrl]);
      setHistoryStep(0);
    }
  }, [currentBackground]);

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
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    
    lastPointRef.current = { x, y };

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (!isEraser) {
      const emotion = availableColors.find((c) => c.color === currentColor)?.emotion || "other";
      setEmotionStats((prev) => ({
        ...prev,
        [emotion]: (prev[emotion] || 0) + 1,
      }));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    const lastPoint = lastPointRef.current;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
    }

    // Плавное рисование с использованием квадратичных кривых Безье
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    
    const midX = (lastPoint.x + x) / 2;
    const midY = (lastPoint.y + y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();

    if (!isEraser) {
      // Применяем эффект кисти
      applyBrushEffect(ctx, x, y, currentColor, brushType, lineWidth);
      
      // Применяем текстуру если активна
      if (currentTexture !== "none") {
        applyTexture(ctx, x, y, currentTexture, currentColor);
      }
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
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = currentBackground.gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Сохраняем очищенное состояние в историю
    const dataUrl = canvas.toDataURL();
    setHistory([dataUrl]);
    setHistoryStep(0);
    setEmotionStats({});
  };

  const generateAnalysis = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsAnalyzing(true);
    setShowAnalysis(false);

    try {
      const imageData = canvas.toDataURL('image/png');
      const durationSeconds = Math.floor((Date.now() - sessionStart) / 1000);
      const colorsUsed = availableColors.filter((c) => emotionStats[c.emotion]);
      const strokeCount = Object.values(emotionStats).reduce((a, b) => a + b, 0);

      // Get user profile for age
      const userId = await getCurrentUserId();
      let childAge = 7;
      
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('child_age')
          .eq('id', userId)
          .maybeSingle();
        if (profile?.child_age) childAge = profile.child_age;
      }

      // Create observation data from session
      const observation = {
        child_id: userId || 'anonymous',
        child_age: childAge,
        session_date: new Date().toISOString(),
        task_type: taskPrompt ? 'custom' : 'free_drawing',
        task_description: taskPrompt || undefined,
        emotional_states: ['neutral'], // Default for now
        behaviors: strokeCount > 50 ? ['focused'] : ['slow_drawing'],
        materials_used: colorsUsed.length > 5 ? ['many_colors'] : colorsUsed.length === 1 ? ['one_color'] : [],
        colors_count: colorsUsed.length,
        drawing_duration_seconds: durationSeconds,
        pause_frequency: 'low' as const,
        stroke_count: strokeCount,
        average_pressure: lineWidth / 2, // Approximate from line width
        eraser_usage: 0
      };

      // Call deep analysis
      const { data: analysisData, error } = await supabase.functions.invoke('analyze-drawing-deep', {
        body: {
          imageData,
          observation
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw error;
      }

      if (analysisData?.report) {
        setAnalysis(analysisData.report);
        setShowAnalysis(true);
      } else {
        throw new Error('No report returned');
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast.error('Не удалось провести анализ. Попробуйте позже.');
      
      // Fallback to simple analysis
      const colorsUsed = availableColors
        .filter((c) => emotionStats[c.emotion])
        .map((c) => c.name);
      
      setAnalysis({
        simple: true,
        colorsUsed,
        sessionDuration: Math.floor((Date.now() - sessionStart) / 1000),
        totalStrokes: Object.values(emotionStats).reduce((a, b) => a + b, 0),
      });
      setShowAnalysis(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeTaskCompletion = async () => {
    if (!taskId || !taskPrompt) return null;

    try {
      const colorsUsed = availableColors
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
        tokensAwarded: 10,
        suggestions: []
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
        
        const colorsUsed = availableColors
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

      const colorsUsed = availableColors
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
          metadata: {
            line_width: lineWidth,
            session_duration: Math.floor((Date.now() - sessionStart) / 1000),
            task_id: taskId || null,
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
              source: `Task completed: ${taskPrompt}`,
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
        metadata: {
          emotional_analysis: emotionStats,
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
              <h3 className="font-semibold">Палитра эмоций ({availableColors.length} цветов)</h3>
            </div>
          </div>
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-2 max-h-48 overflow-y-auto p-2">
            {availableColors.map((item) => (
              <button
                key={item.color}
                onClick={() => {
                  setCurrentColor(item.color);
                  setIsEraser(false);
                }}
                className={`relative group transition-all hover:scale-125 ${
                  currentColor === item.color && !isEraser ? "scale-125 z-10" : ""
                }`}
                title={`${item.name} - ${item.note}`}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-soft"
                  style={{ backgroundColor: item.color }}
                />
                {currentColor === item.color && !isEraser && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
          {currentColor && !isEraser && (
            <div className="mt-3 text-center">
              <p className="text-sm font-semibold">
                {availableColors.find(c => c.color === currentColor)?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {availableColors.find(c => c.color === currentColor)?.note}
              </p>
            </div>
          )}
        </Card>

        {/* Панель инструментов наград */}
        {(getBrushType() !== "normal" || getAvailableTextures().length > 1 || getAvailableBackgrounds().length > 1) && (
          <Card className="p-4 border-0 bg-card shadow-soft">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              Награды
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Кисти */}
              {getBrushType() !== "normal" && (
                <div>
                  <p className="text-sm font-medium mb-2">Кисть: {
                    brushType === "sparkle" ? "✨ Блестящая" :
                    brushType === "rainbow" ? "🌈 Радужная" : "Обычная"
                  }</p>
                </div>
              )}
              
              {/* Текстуры */}
              {getAvailableTextures().length > 1 && (
                <div>
                  <p className="text-sm font-medium mb-2">Текстура:</p>
                  <div className="flex gap-2">
                    {getAvailableTextures().map(texture => (
                      <Button
                        key={texture}
                        size="sm"
                        variant={currentTexture === texture ? "default" : "outline"}
                        onClick={() => setCurrentTexture(texture)}
                      >
                        {texture === "none" ? "Нет" : 
                         texture === "stars" ? "⭐ Звёзды" : "❤️ Сердца"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Фоны */}
              {getAvailableBackgrounds().length > 1 && (
                <div>
                  <p className="text-sm font-medium mb-2">Фон:</p>
                  <div className="flex gap-2 flex-wrap">
                    {getAvailableBackgrounds().map(bg => (
                      <Button
                        key={bg.id}
                        size="sm"
                        variant={currentBackground.id === bg.id ? "default" : "outline"}
                        onClick={() => setCurrentBackground(bg)}
                      >
                        {bg.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className="p-4 border-0 bg-card shadow-soft">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[400px] bg-white rounded-2xl border-2 border-muted touch-none"
            style={{
              cursor: isEraser
                ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${lineWidth + 4}" height="${lineWidth + 4}" viewBox="0 0 ${lineWidth + 4} ${lineWidth + 4}"><rect x="2" y="2" width="${lineWidth}" height="${lineWidth}" fill="white" stroke="gray" stroke-width="1"/></svg>') ${(lineWidth + 4) / 2} ${(lineWidth + 4) / 2}, crosshair`
                : `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${lineWidth + 4}" height="${lineWidth + 4}" viewBox="0 0 ${lineWidth + 4} ${lineWidth + 4}"><circle cx="${(lineWidth + 4) / 2}" cy="${(lineWidth + 4) / 2}" r="${lineWidth / 2}" fill="${encodeURIComponent(currentColor)}" stroke="black" stroke-width="1"/></svg>') ${(lineWidth + 4) / 2} ${(lineWidth + 4) / 2}, crosshair`
            }}
          />
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button 
            variant={isEraser ? "default" : "outline"} 
            onClick={() => setIsEraser(!isEraser)}
            disabled={isSaving}
          >
            <Eraser size={18} className="mr-2" />
            {isEraser ? "Режим ластика" : "Ластик"}
          </Button>
          <Button 
            variant="outline" 
            onClick={undo} 
            disabled={isSaving || historyStep <= 0}
          >
            <Undo size={18} className="mr-2" />
            Отменить
          </Button>
          <Button variant="outline" onClick={clearCanvas} disabled={isSaving}>
            <Trash2 size={18} className="mr-2" />
            Очистить
          </Button>
          <Button variant="default" onClick={saveDrawing} disabled={isSaving}>
            <Save size={18} className="mr-2" />
            {isSaving ? "Сохранение..." : "Сохранить в галерею"}
          </Button>
          <Button variant="secondary" onClick={generateAnalysis} disabled={isAnalyzing}>
            <BarChart3 size={18} className="mr-2" />
            {isAnalyzing ? "Анализирую..." : "Посмотреть анализ"}
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Размер {isEraser ? "ластика" : "кисти"}:</span>
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
              {taskAnalysis.taskCompleted ? '✅ Задание выполнено!' : '🎨 Попробуй ещё раз!'}
            </h3>
            <div className="space-y-3 text-primary-foreground/90">
              <p className="text-lg font-semibold">Оценка: {taskAnalysis.score}/100</p>
              <p className="text-sm mb-3">{taskAnalysis.feedback}</p>
              
              {!taskAnalysis.taskCompleted && taskAnalysis.suggestions?.length > 0 && (
                <div className="mt-4 p-4 bg-white/20 rounded-lg">
                  <p className="font-semibold mb-2">💡 Подсказки от Ceolina:</p>
                  <ul className="space-y-2">
                    {taskAnalysis.suggestions.map((suggestion: string, idx: number) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {taskAnalysis.taskCompleted ? (
                <p className="text-lg font-bold mt-4">
                  🎉 Получено токенов: {taskAnalysis.tokensAwarded}
                </p>
              ) : (
                <p className="text-sm mt-4 opacity-90">
                  Получено за старание: {taskAnalysis.tokensAwarded} токенов
                </p>
              )}
            </div>
          </Card>
        )}

        {isAnalyzing && (
          <Card className="p-6 border-0 bg-gradient-calm shadow-soft">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-primary-foreground">Анализирую рисунок...</span>
            </div>
          </Card>
        )}

        {showAnalysis && analysis && (
          <Card className="p-6 border-0 bg-gradient-calm shadow-soft">
            <h3 className="font-semibold text-primary-foreground mb-4 text-xl">
              Анализ твоего рисунка
            </h3>
            
            {analysis.simple ? (
              // Fallback simple analysis
              <div className="space-y-3 text-primary-foreground/90">
                <p className="text-sm">✨ Использовано цветов: {analysis.colorsUsed?.length || 0}</p>
                <p className="text-sm">✨ Время рисования: {Math.floor((analysis.sessionDuration || 0) / 60)} мин</p>
                <p className="text-sm">✨ Количество штрихов: {analysis.totalStrokes || 0}</p>
              </div>
            ) : (
              // Deep analysis
              <div className="space-y-4 text-primary-foreground/90">
                {/* What's on the drawing */}
                {analysis.visual_description?.objects_identified?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">🎨 Что изображено:</h4>
                    <p className="text-sm">{analysis.visual_description.objects_identified.join(', ')}</p>
                  </div>
                )}

                {/* Composition */}
                {analysis.visual_description?.composition_analysis && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">📐 Композиция:</h4>
                    <p className="text-sm">{analysis.visual_description.composition_analysis}</p>
                  </div>
                )}

                {/* Emotional themes */}
                {analysis.interpretation?.emotional_themes?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">💭 Эмоциональные темы:</h4>
                    {analysis.interpretation.emotional_themes.map((theme: any, idx: number) => (
                      <div key={idx} className="mb-2">
                        <p className="text-sm font-medium">{theme.theme}</p>
                        {theme.supporting_evidence?.length > 0 && (
                          <ul className="text-xs opacity-80 ml-4">
                            {theme.supporting_evidence.map((e: string, i: number) => (
                              <li key={i}>• {e}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations?.for_parents?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">💡 Рекомендации:</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.recommendations.for_parents.slice(0, 3).map((rec: string, idx: number) => (
                        <li key={idx}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confidence indicator */}
                {analysis.analysis_metadata?.confidence_score && (
                  <div className="pt-2 border-t border-primary-foreground/20">
                    <p className="text-xs opacity-70">
                      Уверенность анализа: {analysis.analysis_metadata.confidence_score}%
                    </p>
                  </div>
                )}
              </div>
            )}
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
      
      <FloatingAssistant taskPrompt={taskPrompt} contextType="drawing" />
    </div>
  );
};
