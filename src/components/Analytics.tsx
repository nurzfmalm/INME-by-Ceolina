import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Brain, TrendingUp, Palette, Heart } from "lucide-react";
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

      if (error) throw error;
      setAiAnalysis(data.analysis);
      toast.success("Анализ завершён! 🧠");
    } catch (error) {
      console.error("Error analyzing artworks:", error);
      toast.error("Ошибка при анализе");
    } finally {
      setAnalyzing(false);
    }
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-0 bg-card">
            <h3 className="text-sm text-muted-foreground mb-1">
              Всего рисунков
            </h3>
            <p className="text-3xl font-bold text-primary">{artworks.length}</p>
          </Card>
          <Card className="p-4 border-0 bg-card">
            <h3 className="text-sm text-muted-foreground mb-1">
              Основная эмоция
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-secondary">
                {aiAnalysis?.primary_emotion
                  ? EMOTION_NAMES[aiAnalysis.primary_emotion] || aiAnalysis.primary_emotion
                  : "—"}
              </p>
              {aiAnalysis?.emotion_balance && (
                <span className="text-xs bg-secondary/20 px-2 py-1 rounded">
                  {aiAnalysis.emotion_balance === 'balanced' ? '✓' : 
                   aiAnalysis.emotion_balance === 'improving' ? '↗️' : '⚠️'}
                </span>
              )}
            </div>
          </Card>
          <Card className="p-4 border-0 bg-card">
            <h3 className="text-sm text-muted-foreground mb-1">
              Среднее время сессии
            </h3>
            <p className="text-3xl font-bold text-success">
              {artworks.length > 0
                ? Math.round(
                    artworks.reduce(
                      (sum, art) => sum + (art.metadata?.session_duration || 0),
                      0
                    ) / artworks.length
                  )
                : 0}
              <span className="text-lg"> сек</span>
            </p>
          </Card>
        </div>

        {/* Emotion Timeline Chart */}
        {emotionTimeline.length > 0 && (
          <Card className="p-6 border-0 bg-card">
            <h2 className="text-xl font-bold mb-4">Динамика эмоций</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emotionTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(EMOTION_COLORS).map((emotion) => (
                  <Line
                    key={emotion}
                    type="monotone"
                    dataKey={emotion}
                    stroke={EMOTION_COLORS[emotion]}
                    name={EMOTION_NAMES[emotion]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
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
