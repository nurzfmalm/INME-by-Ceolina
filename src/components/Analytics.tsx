import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Brain, TrendingUp, Palette, Heart, Activity, Calendar, Target, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { CeolinaFeedback } from "./CeolinaFeedback";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AnalyticsProps {
  onBack: () => void;
  childName: string;
}

interface Artwork {
  id: string;
  created_at: string;
  emotions_used: Record<string, number>;
  colors_used: string[];
  metadata: {
    session_duration?: number;
  };
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
  recommendations?: string[]; // legacy support
  ceolina_feedback?: string;
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

export const Analytics = ({ onBack, childName }: AnalyticsProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all');

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
      console.log("Starting AI analysis with", artworks.length, "artworks");
      
      const { data, error } = await supabase.functions.invoke("analyze-artworks", {
        body: { artworks },
      });

      console.log("AI analysis response:", data, error);

      if (error) {
        console.error("Edge function error:", error);
        // Generate local fallback analysis
        const fallbackAnalysis = generateLocalAnalysis(artworks);
        setAiAnalysis(fallbackAnalysis);
        toast.success("Анализ завершён (локальный режим) 🧠");
        return;
      }

      setAiAnalysis(data.analysis);
      toast.success("Анализ завершён! 🧠");
    } catch (error) {
      console.error("Error analyzing artworks:", error);
      // Generate local fallback analysis on error
      const fallbackAnalysis = generateLocalAnalysis(artworks);
      setAiAnalysis(fallbackAnalysis);
      toast.success("Анализ завершён (локальный режим) 🧠");
    } finally {
      setAnalyzing(false);
    }
  };

  const generateLocalAnalysis = (artworks: Artwork[]): AIAnalysis => {
    // Calculate emotion distribution
    const emotionTotals: Record<string, number> = {};
    let totalEmotions = 0;
    
    artworks.forEach(art => {
      Object.entries(art.emotions_used || {}).forEach(([emotion, count]) => {
        emotionTotals[emotion] = (emotionTotals[emotion] || 0) + count;
        totalEmotions += count;
      });
    });

    const primaryEmotion = Object.entries(emotionTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "calm";
    const emotionCount = Object.keys(emotionTotals).length;

    // Calculate color diversity
    const allColors = new Set<string>();
    artworks.forEach(art => {
      art.colors_used?.forEach(color => allColors.add(color));
    });
    const colorDiversity = allColors.size;

    // Calculate stability (based on emotion consistency)
    const emotionVariance = emotionCount > 0 
      ? Math.min(100, Math.round((1 - (emotionCount / (totalEmotions || 1))) * 100 + 50))
      : 50;

    // Determine balance
    const emotionBalance = emotionVariance > 70 ? "balanced" : 
                          emotionVariance > 50 ? "improving" : "needs_attention";

    // Generate insights
    const avgDuration = artworks.length > 0 
      ? artworks.reduce((sum, art) => sum + (art.metadata?.session_duration || 0), 0) / artworks.length 
      : 0;

    return {
      emotional_summary: `За ${artworks.length} сессий наблюдается ${emotionCount > 3 ? 'богатое' : 'стабильное'} эмоциональное выражение. Преобладает эмоция "${EMOTION_NAMES[primaryEmotion] || primaryEmotion}".`,
      
      color_insights: `Ребенок использовал ${colorDiversity} различных цветов, что ${colorDiversity > 10 ? 'показывает широкий эмоциональный диапазон и творческое разнообразие' : 'говорит о предпочтении определенной цветовой палитры'}. ${colorDiversity > 15 ? 'Высокая вариативность цветов указывает на эмоциональную гибкость.' : ''}`,
      
      line_analysis: avgDuration > 120 
        ? "Длительные сессии рисования говорят о хорошей концентрации и вовлеченности в процесс. Ребенок глубоко погружается в творчество."
        : "Сессии имеют умеренную продолжительность, что нормально для детей. Рекомендуется поддерживать интерес через разнообразие заданий.",
      
      composition_insights: emotionCount > 4 
        ? "Разнообразие эмоций в рисунках показывает способность к эмоциональной дифференциации - важный навык для развития."
        : "Устойчивость в выборе эмоций может указывать на комфортную эмоциональную зону ребенка.",
      
      behavioral_patterns: `Средняя продолжительность сессии составляет ${Math.round(avgDuration)} секунд. ${avgDuration > 180 ? 'Отличная усидчивость!' : 'Нормальная активность для возраста.'}`,
      
      progress_notes: artworks.length > 5 
        ? "С увеличением количества сессий наблюдается развитие эмоциональной осознанности. Продолжайте регулярные занятия для закрепления прогресса."
        : "Начальная фаза терапии. Для выявления устойчивых паттернов рекомендуется продолжать занятия.",
      
      recommendations_parents: [
        emotionBalance === "needs_attention" 
          ? "Попробуйте обсуждать с ребенком эмоции во время рисования" 
          : "Поддерживайте текущий режим занятий - они приносят пользу",
        colorDiversity < 8 
          ? "Предложите ребенку новые цвета - расширение палитры помогает эмоциональному развитию" 
          : "Отлично! Ребенок активно исследует цветовую палитру",
        avgDuration < 60 
          ? "Создайте спокойную обстановку для более длительных сессий" 
          : "Прекрасная концентрация! Продолжайте создавать комфортные условия для творчества"
      ],
      
      recommendations_therapists: [
        `Основная эмоция "${EMOTION_NAMES[primaryEmotion]}" - рекомендуется работа над расширением эмоционального диапазона`,
        emotionVariance < 50 
          ? "Использовать упражнения для развития эмоциональной гибкости" 
          : "Продолжать текущую стратегию - показывает хорошие результаты",
        "Интегрировать арт-терапию с другими методами для комплексного подхода"
      ],
      
      ceolina_feedback: colorDiversity > 12 
        ? "Вау! Ты используешь так много цветов! Твои рисунки полны жизни и эмоций! 🌈✨" 
        : avgDuration > 120 
        ? "Я вижу, как ты увлечённо рисуешь! Твоё терпение и старание замечательны! 🎨💫"
        : "Каждый твой рисунок особенный! Продолжай выражать свои эмоции через искусство! ✨🎨",
      
      primary_emotion: primaryEmotion,
      emotion_balance: emotionBalance,
      stability_score: emotionVariance,
      therapeutic_focus: emotionBalance === "needs_attention" 
        ? "Развитие эмоциональной регуляции и расширение диапазона"
        : emotionBalance === "improving"
        ? "Поддержка текущего прогресса"
        : "Поддержание эмоционального баланса"
    };
  };

  // Prepare emotion timeline data
  const emotionTimeline = artworks.map((art, idx) => {
    const primaryEmotion = Object.keys(art.emotions_used).sort(
      (a, b) => art.emotions_used[b] - art.emotions_used[a]
    )[0] || "neutral";

    return {
      date: format(new Date(art.created_at), "dd MMM", { locale: ru }),
      index: idx + 1,
      ...art.emotions_used,
    };
  });

  // Prepare emotion distribution
  const emotionDistribution = Object.entries(
    artworks.reduce((acc, art) => {
      Object.entries(art.emotions_used).forEach(([emotion, count]) => {
        acc[emotion] = (acc[emotion] || 0) + count;
      });
      return acc;
    }, {} as Record<string, number>)
  ).map(([emotion, value]) => ({
    name: EMOTION_NAMES[emotion] || emotion,
    value,
    color: EMOTION_COLORS[emotion] || "#999",
  }));

  // Prepare color usage data
  const colorUsage = Object.entries(
    artworks.reduce((acc, art) => {
      art.colors_used?.forEach((color) => {
        acc[color] = (acc[color] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>)
  ).map(([color, count]) => ({ color, count }));

  // Filter artworks by time range
  const getFilteredArtworks = () => {
    if (timeRange === 'all') return artworks;
    
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      cutoff.setMonth(now.getMonth() - 1);
    }
    
    return artworks.filter(art => new Date(art.created_at) >= cutoff);
  };

  const filteredArtworks = getFilteredArtworks();

  // Prepare radar chart data for emotional profile
  const emotionTotals = filteredArtworks.reduce((acc, art) => {
    Object.entries(art.emotions_used).forEach(([emotion, count]) => {
      acc[emotion] = (acc[emotion] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  const maxEmotionValue = Math.max(...Object.values(emotionTotals), 1);
  
  const emotionalProfile = Object.entries(emotionTotals).map(([emotion, value]) => ({
    emotion: EMOTION_NAMES[emotion] || emotion,
    value: Math.round(value),
    percentage: Math.round((value / maxEmotionValue) * 100),
    fullMark: 100,
    color: EMOTION_COLORS[emotion] || "#999"
  }));

  // Sort by value descending
  emotionalProfile.sort((a, b) => b.value - a.value);

  // Activity heatmap by day of week
  const activityByDay = filteredArtworks.reduce((acc, art) => {
    const day = format(new Date(art.created_at), 'EEEE', { locale: ru });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const weekdayData = [
    { day: 'Понедельник', count: activityByDay['понедельник'] || 0 },
    { day: 'Вторник', count: activityByDay['вторник'] || 0 },
    { day: 'Среда', count: activityByDay['среда'] || 0 },
    { day: 'Четверг', count: activityByDay['четверг'] || 0 },
    { day: 'Пятница', count: activityByDay['пятница'] || 0 },
    { day: 'Суббота', count: activityByDay['суббота'] || 0 },
    { day: 'Воскресенье', count: activityByDay['воскресенье'] || 0 },
  ];

  // Engagement metrics
  const avgSessionDuration = filteredArtworks.length > 0
    ? filteredArtworks.reduce((sum, art) => sum + (art.metadata?.session_duration || 0), 0) / filteredArtworks.length
    : 0;

  const totalColors = new Set(filteredArtworks.flatMap(art => art.colors_used || [])).size;
  
  const emotionDiversity = Object.keys(
    filteredArtworks.reduce((acc, art) => {
      Object.keys(art.emotions_used).forEach(e => acc[e] = true);
      return acc;
    }, {} as Record<string, boolean>)
  ).length;

  // Progress trend (comparing first half vs second half)
  const halfPoint = Math.floor(filteredArtworks.length / 2);
  const firstHalf = filteredArtworks.slice(0, halfPoint);
  const secondHalf = filteredArtworks.slice(halfPoint);

  const getAvgDuration = (arts: Artwork[]) => 
    arts.length > 0 ? arts.reduce((sum, a) => sum + (a.metadata?.session_duration || 0), 0) / arts.length : 0;

  const durationTrend = getAvgDuration(secondHalf) - getAvgDuration(firstHalf);
  const progressTrend = durationTrend > 10 ? 'improving' : durationTrend < -10 ? 'declining' : 'stable';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-soft border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-calm rounded-full flex items-center justify-center">
                <Brain className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Аналитика</h1>
                <p className="text-sm text-muted-foreground">
                  Прогресс и инсайты для {childName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Time Range Filter */}
        <Card className="p-4 border-0 bg-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Период анализа</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={timeRange === 'week' ? 'default' : 'outline'}
                onClick={() => setTimeRange('week')}
              >
                Неделя
              </Button>
              <Button
                size="sm"
                variant={timeRange === 'month' ? 'default' : 'outline'}
                onClick={() => setTimeRange('month')}
              >
                Месяц
              </Button>
              <Button
                size="sm"
                variant={timeRange === 'all' ? 'default' : 'outline'}
                onClick={() => setTimeRange('all')}
              >
                Всё время
              </Button>
            </div>
          </div>
        </Card>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-0 bg-gradient-warm">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="text-white" size={20} />
              <h3 className="text-sm text-white/80">Рисунков</h3>
            </div>
            <p className="text-3xl font-bold text-white">{filteredArtworks.length}</p>
            <p className="text-xs text-white/70 mt-1">
              {timeRange === 'week' ? 'за неделю' : timeRange === 'month' ? 'за месяц' : 'всего'}
            </p>
          </Card>

          <Card className="p-4 border-0 bg-gradient-calm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="text-white" size={20} />
              <h3 className="text-sm text-white/80">Вовлечённость</h3>
            </div>
            <p className="text-3xl font-bold text-white">{Math.round(avgSessionDuration)}с</p>
            <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
              {progressTrend === 'improving' && <TrendingUp size={12} />}
              {progressTrend === 'improving' ? 'Растёт' : progressTrend === 'declining' ? 'Снижается' : 'Стабильно'}
            </p>
          </Card>

          <Card className="p-4 border-0 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-primary" size={20} />
              <h3 className="text-sm text-muted-foreground">Эмоций</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{emotionDiversity}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {emotionDiversity > 4 ? 'Отлично!' : 'Хорошо'}
            </p>
          </Card>

          <Card className="p-4 border-0 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-primary" size={20} />
              <h3 className="text-sm text-muted-foreground">Цветов</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{totalColors}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalColors > 10 ? 'Разнообразие!' : 'Стабильность'}
            </p>
          </Card>
        </div>

        {/* Ceolina Feedback */}
        {aiAnalysis?.ceolina_feedback && (
          <CeolinaFeedback message={aiAnalysis.ceolina_feedback} />
        )}
        
        {/* AI Analysis Section */}
        <Card className="p-6 border-0 bg-gradient-calm shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="text-white" size={28} />
              <h2 className="text-xl font-bold text-white">
                AI-анализ творчества
              </h2>
            </div>
            <Button
              variant="secondary"
              onClick={runAIAnalysis}
              disabled={analyzing || artworks.length === 0}
            >
              {analyzing ? "Анализируем..." : "Запустить анализ"}
            </Button>
          </div>

          {aiAnalysis && (
            <div className="space-y-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Heart size={18} />
                  Эмоциональное состояние
                </h3>
                <p className="text-white/90">{aiAnalysis.emotional_summary}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    Стабильность:
                  </span>
                  <div className="flex-1 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all"
                      style={{ width: `${aiAnalysis.stability_score}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {aiAnalysis.stability_score}%
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Palette size={18} />
                  Анализ цветов
                </h3>
                <p className="text-white/90">{aiAnalysis.color_insights}</p>
              </div>

              {aiAnalysis.line_analysis && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-2">✏️ Анализ линий и штрихов</h3>
                  <p className="text-white/90">{aiAnalysis.line_analysis}</p>
                </div>
              )}

              {aiAnalysis.composition_insights && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-2">🧩 Композиция и формы</h3>
                  <p className="text-white/90">{aiAnalysis.composition_insights}</p>
                </div>
              )}

              {aiAnalysis.behavioral_patterns && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-2">💬 Поведенческие паттерны</h3>
                  <p className="text-white/90">{aiAnalysis.behavioral_patterns}</p>
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <TrendingUp size={18} />
                  Прогресс и динамика
                </h3>
                <p className="text-white/90">{aiAnalysis.progress_notes}</p>
                {aiAnalysis.emotion_balance && (
                  <div className="mt-2 inline-block bg-white/20 px-3 py-1 rounded-full text-sm">
                    Баланс: {aiAnalysis.emotion_balance === 'balanced' ? '✓ Сбалансирован' : 
                             aiAnalysis.emotion_balance === 'improving' ? '↗️ Улучшается' : '⚠️ Требует внимания'}
                  </div>
                )}
              </div>

              {aiAnalysis.ceolina_feedback && (
                <CeolinaFeedback message={aiAnalysis.ceolina_feedback} />
              )}

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3">📋 Рекомендации для родителей</h3>
                <ul className="space-y-2">
                  {(aiAnalysis.recommendations_parents || aiAnalysis.recommendations || []).map((rec, idx) => (
                    <li key={idx} className="text-white/90 flex items-start gap-2">
                      <span className="text-white font-bold">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {aiAnalysis.recommendations_therapists && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-3">🩺 Рекомендации для терапевтов</h3>
                  <ul className="space-y-2">
                    {aiAnalysis.recommendations_therapists.map((rec, idx) => (
                      <li key={idx} className="text-white/90 flex items-start gap-2">
                        <span className="text-white font-bold">★</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.therapeutic_focus && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-2">🎯 Терапевтический фокус</h3>
                  <p className="text-white/90">{aiAnalysis.therapeutic_focus}</p>
                </div>
              )}
            </div>
          )}

          {!aiAnalysis && artworks.length > 0 && (
            <p className="text-white/80 text-center mt-4">
              Нажмите "Запустить анализ" для получения AI-инсайтов
            </p>
          )}

          {artworks.length === 0 && (
            <p className="text-white/80 text-center mt-4">
              Создайте несколько рисунков для анализа
            </p>
          )}
        </Card>

        {/* Emotional Profile Radar Chart */}
        {emotionalProfile.length > 0 && (
          <Card className="p-6 border-0 bg-card">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Brain size={24} className="text-primary" />
              Эмоциональный профиль
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={emotionalProfile}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis 
                      dataKey="emotion" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Radar
                      name="Интенсивность (%)"
                      dataKey="percentage"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.5}
                      strokeWidth={2}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px'
                      }}
                      formatter={(value: any) => [`${value}%`, 'Интенсивность']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg mb-4">Детализация эмоций</h3>
                {emotionalProfile.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.emotion}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {item.value} раз
                      </span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute h-full rounded-full transition-all"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Доминирующая эмоция:</strong> {emotionalProfile[0]?.emotion}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong className="text-foreground">Эмоциональный баланс:</strong> {
                      emotionalProfile.length >= 4 
                        ? '✓ Хорошее разнообразие эмоций' 
                        : emotionalProfile.length >= 2
                        ? '○ Умеренное разнообразие'
                        : '⚠ Ограниченный диапазон'
                    }
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Activity Heatmap */}
        {weekdayData.some(d => d.count > 0) && (
          <Card className="p-6 border-0 bg-card">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar size={24} />
              Активность по дням недели
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground text-center mt-3">
              Самый активный день: {weekdayData.reduce((max, d) => d.count > max.count ? d : max, weekdayData[0]).day}
            </p>
          </Card>
        )}

        {/* Emotion Timeline Chart with Area */}
        {emotionTimeline.length > 0 && (
          <Card className="p-6 border-0 bg-card">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={24} />
              Динамика эмоций во времени
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={emotionTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(EMOTION_COLORS).map((emotion) => (
                  <Area
                    key={emotion}
                    type="monotone"
                    dataKey={emotion}
                    stackId="1"
                    stroke={EMOTION_COLORS[emotion]}
                    fill={EMOTION_COLORS[emotion]}
                    name={EMOTION_NAMES[emotion]}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Emotion Distribution */}
        {emotionDistribution.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-0 bg-card">
              <h2 className="text-xl font-bold mb-4">Распределение эмоций</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={emotionDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {emotionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 border-0 bg-card">
              <h2 className="text-xl font-bold mb-4">Использование цветов</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={colorUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="color" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {colorUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};
