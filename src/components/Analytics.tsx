import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Brain, TrendingUp, Palette, Heart, Activity, Calendar, Target, Zap, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { CeolinaFeedback } from "./CeolinaFeedback";
import { format, subDays, startOfDay, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ru } from "date-fns/locale";

interface AnalyticsProps {
  onBack: () => void;
  childName: string;
}

interface Artwork {
  id: string;
  created_at: string;
  emotions_used: any;
  colors_used: any;
  metadata: any;
}

interface AIAnalysis {
  emotional_summary: string;
  color_insights: string;
  line_analysis?: string;
  composition_insights?: string;
  behavioral_patterns?: string;
  progress_notes: string;
  recommendations_parents?: string[];
  recommendations_therapists?: string[];
  recommendations?: string[];
  star_feedback?: string;
  primary_emotion: string;
  emotion_balance?: string;
  stability_score: number;
  therapeutic_focus?: string;
}

const EMOTION_COLORS: Record<string, string> = {
  joy: "#FFD93D",
  calm: "#6BCB77",
  sadness: "#4D96FF",
  energy: "#FF6B6B",
  creative: "#C68FE6",
  gentle: "#FFB4D6",
};

const EMOTION_NAMES: Record<string, string> = {
  joy: "Радость",
  calm: "Спокойствие",
  sadness: "Грусть",
  energy: "Энергия",
  creative: "Творчество",
  gentle: "Нежность",
};

// Progress categories with colors
const PROGRESS_CATEGORIES = [
  { id: 'emotions', name: 'Эмоции', color: '#A78BFA', bgColor: '#DDD6FE' },
  { id: 'colors', name: 'Цвета', color: '#FBBF24', bgColor: '#FEF3C7' },
  { id: 'focus', name: 'Внимание', color: '#F472B6', bgColor: '#FCE7F3' },
  { id: 'creativity', name: 'Творчество', color: '#60A5FA', bgColor: '#DBEAFE' },
];

// Circular progress component
const CircularProgress = ({ 
  percentage, 
  name, 
  color, 
  bgColor,
  size = 140 
}: { 
  percentage: number; 
  name: string; 
  color: string; 
  bgColor: string;
  size?: number;
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="absolute" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </svg>
        
        {/* Progress circle */}
        <svg 
          className="absolute -rotate-90" 
          width={size} 
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        
        {/* Inner colored circle */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center"
          style={{ 
            width: size - strokeWidth * 4, 
            height: size - strokeWidth * 4,
            backgroundColor: color,
          }}
        >
          <span className="text-white text-sm font-medium">{name}</span>
          <span className="text-white text-2xl font-bold">{percentage}%</span>
        </div>
      </div>
    </div>
  );
};

// Activity day component
const ActivityDay = ({ 
  day, 
  isToday, 
  activityLevel, 
  hours,
  minutes 
}: { 
  day: number; 
  isToday: boolean; 
  activityLevel: number;
  hours: number;
  minutes: number;
}) => {
  const getWaveHeight = () => {
    if (activityLevel === 0) return 20;
    if (activityLevel < 30) return 30;
    if (activityLevel < 60) return 40;
    return 50;
  };

  return (
    <div className="flex flex-col items-center relative">
      {isToday && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap">
          {hours > 0 ? `${hours}ч` : ''} {minutes}мин
        </div>
      )}
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
          isToday 
            ? 'bg-primary text-white shadow-lg scale-125' 
            : 'text-muted-foreground'
        }`}
      >
        {day.toString().padStart(2, '0')}
      </div>
      <div className="mt-2 h-12 flex items-end">
        <svg width="24" height={getWaveHeight()} className="text-primary/30">
          <path 
            d={`M0 ${getWaveHeight()} Q6 ${getWaveHeight() - 10} 12 ${getWaveHeight()} Q18 ${getWaveHeight() + 10} 24 ${getWaveHeight()}`}
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
};

export const Analytics = ({ onBack, childName }: AnalyticsProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadArtworks();
  }, []);

  const loadArtworks = async () => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        const stored = localStorage.getItem("ceolinaArtworks");
        if (stored) {
          setArtworks(JSON.parse(stored));
        }
        setLoading(false);
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setArtworks(data || []);
    } catch (error) {
      console.error("Error loading artworks:", error);
      toast.error("Ошибка при загрузке данных");
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    if (artworks.length === 0) {
      toast.error("Нет рисунков для анализа");
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-artworks", {
        body: { artworks },
      });

      if (error) {
        const fallbackAnalysis = generateLocalAnalysis(artworks);
        setAiAnalysis(fallbackAnalysis);
        toast.success("Анализ завершён 🧠");
        return;
      }

      setAiAnalysis(data.analysis);
      toast.success("Анализ завершён! 🧠");
    } catch (error) {
      console.error("Error analyzing artworks:", error);
      const fallbackAnalysis = generateLocalAnalysis(artworks);
      setAiAnalysis(fallbackAnalysis);
      toast.success("Анализ завершён 🧠");
    } finally {
      setAnalyzing(false);
    }
  };

  const generateLocalAnalysis = (artworks: Artwork[]): AIAnalysis => {
    const emotionTotals: Record<string, number> = {};
    let totalEmotions = 0;
    
    artworks.forEach(art => {
      Object.entries(art.emotions_used || {}).forEach(([emotion, count]) => {
        const numCount = Number(count) || 0;
        emotionTotals[emotion] = (emotionTotals[emotion] || 0) + numCount;
        totalEmotions += numCount;
      });
    });

    const primaryEmotion = Object.entries(emotionTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "calm";
    const emotionCount = Object.keys(emotionTotals).length;

    const allColors = new Set<string>();
    artworks.forEach(art => {
      art.colors_used?.forEach((color: string) => allColors.add(color));
    });
    const colorDiversity = allColors.size;

    const emotionVariance = emotionCount > 0 
      ? Math.min(100, Math.round((1 - (emotionCount / (totalEmotions || 1))) * 100 + 50))
      : 50;

    const emotionBalance = emotionVariance > 70 ? "balanced" : 
                          emotionVariance > 50 ? "improving" : "needs_attention";

    const avgDuration = artworks.length > 0 
      ? artworks.reduce((sum, art) => sum + (art.metadata?.session_duration || 0), 0) / artworks.length 
      : 0;

    return {
      emotional_summary: `За ${artworks.length} сессий наблюдается ${emotionCount > 3 ? 'богатое' : 'стабильное'} эмоциональное выражение.`,
      color_insights: `Использовано ${colorDiversity} различных цветов.`,
      progress_notes: artworks.length > 5 
        ? "Наблюдается развитие эмоциональной осознанности."
        : "Начальная фаза терапии.",
      recommendations_parents: [
        emotionBalance === "needs_attention" 
          ? "Обсуждайте эмоции с ребенком во время рисования" 
          : "Поддерживайте текущий режим занятий",
      ],
      star_feedback: colorDiversity > 12 
        ? "Вау! Ты используешь так много цветов! 🌈✨" 
        : "Каждый твой рисунок особенный! ✨🎨",
      primary_emotion: primaryEmotion,
      emotion_balance: emotionBalance,
      stability_score: emotionVariance,
      therapeutic_focus: emotionBalance === "needs_attention" 
        ? "Развитие эмоциональной регуляции"
        : "Поддержание эмоционального баланса"
    };
  };

  // Get filtered artworks based on time range
  const getFilteredArtworks = () => {
    const now = new Date();
    let cutoff = new Date();
    
    if (timeRange === 'daily') {
      cutoff = startOfDay(now);
    } else if (timeRange === 'weekly') {
      cutoff = subDays(now, 7);
    } else {
      cutoff = subDays(now, 30);
    }
    
    return artworks.filter(art => new Date(art.created_at) >= cutoff);
  };

  const filteredArtworks = getFilteredArtworks();

  // Calculate total hours and minutes
  const totalMinutes = filteredArtworks.reduce((sum, art) => 
    sum + Math.round((art.metadata?.session_duration || 0) / 60), 0
  );
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Get week days for activity chart
  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayArtworks = artworks.filter(art => {
        const artDate = startOfDay(new Date(art.created_at));
        return artDate.getTime() === startOfDay(day).getTime();
      });
      
      const dayMinutes = dayArtworks.reduce((sum, art) => 
        sum + Math.round((art.metadata?.session_duration || 0) / 60), 0
      );
      
      return {
        date: day,
        day: day.getDate(),
        isToday: startOfDay(day).getTime() === startOfDay(new Date()).getTime(),
        activityLevel: Math.min(100, dayMinutes * 2),
        hours: Math.floor(dayMinutes / 60),
        minutes: dayMinutes % 60,
      };
    });
  };

  const weekDays = getWeekDays();

  // Calculate progress for each category
  const calculateProgress = () => {
    if (filteredArtworks.length === 0) {
      return PROGRESS_CATEGORIES.map(cat => ({ ...cat, percentage: 0 }));
    }

    const emotionDiversity = new Set(
      filteredArtworks.flatMap(art => Object.keys(art.emotions_used || {}))
    ).size;
    
    const colorDiversity = new Set(
      filteredArtworks.flatMap(art => art.colors_used || [])
    ).size;
    
    const avgDuration = filteredArtworks.reduce((sum, art) => 
      sum + (art.metadata?.session_duration || 0), 0
    ) / filteredArtworks.length;

    return [
      { 
        ...PROGRESS_CATEGORIES[0], 
        percentage: Math.min(100, Math.round((emotionDiversity / 6) * 100)) 
      },
      { 
        ...PROGRESS_CATEGORIES[1], 
        percentage: Math.min(100, Math.round((colorDiversity / 15) * 100)) 
      },
      { 
        ...PROGRESS_CATEGORIES[2], 
        percentage: Math.min(100, Math.round((avgDuration / 300) * 100)) 
      },
      { 
        ...PROGRESS_CATEGORIES[3], 
        percentage: Math.min(100, Math.round((filteredArtworks.length / 10) * 100)) 
      },
    ];
  };

  const progressData = calculateProgress();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Аналитика</h1>
              <p className="text-sm text-muted-foreground">
                Прогресс {childName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Activity Section */}
        <section>
          <h2 className="text-lg font-bold mb-4">Активность</h2>
          
          {/* Time Range Tabs */}
          <div className="inline-flex bg-muted rounded-full p-1 mb-6">
            {[
              { value: 'daily', label: 'День' },
              { value: 'weekly', label: 'Неделя' },
              { value: 'monthly', label: 'Месяц' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTimeRange(tab.value as typeof timeRange)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  timeRange === tab.value
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Total Hours & Date */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-muted-foreground">Всего часов: </span>
              <span className="text-xl font-bold">{totalHours}ч</span>
              <span className="text-lg text-muted-foreground"> {remainingMinutes}мин</span>
            </div>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              {format(selectedDate, 'd MMM yyyy', { locale: ru })}
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Activity Wave Chart */}
          <Card className="p-6 bg-white rounded-3xl border-0 shadow-sm">
            <div className="flex items-end justify-between gap-2 overflow-x-auto pb-10">
              {weekDays.map((day, idx) => (
                <ActivityDay
                  key={idx}
                  day={day.day}
                  isToday={day.isToday}
                  activityLevel={day.activityLevel}
                  hours={day.hours}
                  minutes={day.minutes}
                />
              ))}
            </div>
            
            {/* Wave line */}
            <div className="relative h-16 -mt-6">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <path
                  d={`M0 40 ${weekDays.map((d, i) => {
                    const x = (i / (weekDays.length - 1)) * 100;
                    const y = 40 - (d.activityLevel / 100) * 30;
                    return `Q${x - 3} ${y + 5} ${x} ${y}`;
                  }).join(' ')}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  className="opacity-50"
                />
              </svg>
            </div>
          </Card>
        </section>

        {/* Progress Section */}
        <section>
          <h2 className="text-lg font-bold mb-4">Прогресс</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {progressData.map((item) => (
              <Card 
                key={item.id} 
                className="p-6 bg-white rounded-3xl border-0 shadow-sm flex items-center justify-center"
              >
                <CircularProgress
                  percentage={item.percentage}
                  name={item.name}
                  color={item.color}
                  bgColor={item.bgColor}
                  size={120}
                />
              </Card>
            ))}
          </div>
        </section>

        {/* AI Analysis Button */}
        <Card className="p-6 bg-gradient-to-r from-primary to-blue-500 rounded-3xl border-0 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="text-white" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-white">AI-анализ</h3>
                <p className="text-sm text-white/80">Получить рекомендации</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={runAIAnalysis}
              disabled={analyzing || artworks.length === 0}
              className="rounded-full"
            >
              {analyzing ? "..." : "Анализ"}
            </Button>
          </div>

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="mt-6 space-y-4">
              {/* Stability Score */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm">Стабильность</span>
                  <span className="text-white font-bold">{aiAnalysis.stability_score}%</span>
                </div>
                <div className="bg-white/20 rounded-full h-2">
                  <div
                    className="bg-white rounded-full h-2 transition-all"
                    style={{ width: `${aiAnalysis.stability_score}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/90 text-sm">{aiAnalysis.emotional_summary}</p>
              </div>

              {/* Star Feedback */}
              {aiAnalysis.star_feedback && (
                <CeolinaFeedback message={aiAnalysis.star_feedback} />
              )}
            </div>
          )}
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-white rounded-2xl border-0 shadow-sm text-center">
            <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <Palette className="text-purple-500" size={20} />
            </div>
            <p className="text-2xl font-bold">{filteredArtworks.length}</p>
            <p className="text-xs text-muted-foreground">Рисунков</p>
          </Card>

          <Card className="p-4 bg-white rounded-2xl border-0 shadow-sm text-center">
            <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Heart className="text-green-500" size={20} />
            </div>
            <p className="text-2xl font-bold">
              {new Set(filteredArtworks.flatMap(art => Object.keys(art.emotions_used || {}))).size}
            </p>
            <p className="text-xs text-muted-foreground">Эмоций</p>
          </Card>

          <Card className="p-4 bg-white rounded-2xl border-0 shadow-sm text-center">
            <div className="w-10 h-10 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
              <Zap className="text-orange-500" size={20} />
            </div>
            <p className="text-2xl font-bold">
              {new Set(filteredArtworks.flatMap(art => art.colors_used || [])).size}
            </p>
            <p className="text-xs text-muted-foreground">Цветов</p>
          </Card>
        </div>
      </main>
    </div>
  );
};
