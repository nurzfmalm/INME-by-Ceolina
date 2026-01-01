import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Palette,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ChildStateCardProps {
  childId: string;
  childName: string;
  showDetails?: boolean;
}

interface ChildState {
  emotionalState: string;
  emotionalTrend: "up" | "down" | "stable";
  recentEmotions: string[];
  totalArtworks: number;
  weeklyArtworks: number;
  avgSessionDuration: number;
  dominantColors: string[];
  lastAnalysis: any;
}

const EMOTIONAL_STATES = {
  excellent: { label: "Отличное", color: "bg-green-500", emoji: "😊" },
  good: { label: "Хорошее", color: "bg-blue-500", emoji: "🙂" },
  neutral: { label: "Нейтральное", color: "bg-gray-500", emoji: "😐" },
  concerned: { label: "Требует внимания", color: "bg-yellow-500", emoji: "😟" },
  needs_support: { label: "Нужна поддержка", color: "bg-red-500", emoji: "😢" },
};

export const ChildStateCard = ({
  childId,
  childName,
  showDetails = false,
}: ChildStateCardProps) => {
  const [state, setState] = useState<ChildState | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(showDetails);

  useEffect(() => {
    loadChildState();
  }, [childId]);

  const loadChildState = async () => {
    try {
      // Load child data
      const { data: child } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .single();

      // Load recent artworks
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: artworks } = await supabase
        .from("artworks")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(20);

      const weeklyArtworks = artworks?.filter(
        (a) => new Date(a.created_at) > weekAgo
      ).length || 0;

      // Extract emotions from artworks
      const recentEmotions: string[] = [];
      const allColors: string[] = [];
      
      artworks?.forEach((artwork) => {
        if (artwork.emotions_used && typeof artwork.emotions_used === 'object') {
          Object.keys(artwork.emotions_used as Record<string, unknown>).forEach((emotion) => {
            recentEmotions.push(emotion);
          });
        }
        if (artwork.colors_used && Array.isArray(artwork.colors_used)) {
          artwork.colors_used.forEach((color) => {
            if (typeof color === 'string') {
              allColors.push(color);
            }
          });
        }
      });

      // Calculate dominant colors
      const colorCounts: Record<string, number> = {};
      allColors.forEach((color) => {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      });
      const dominantColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

      // Calculate average session duration
      let totalDuration = 0;
      let sessionCount = 0;
      artworks?.forEach((artwork) => {
        const metadata = artwork.metadata as Record<string, unknown> | null;
        if (metadata && typeof metadata.session_duration === 'number') {
          totalDuration += metadata.session_duration;
          sessionCount++;
        }
      });
      const avgSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;

      // Determine emotional trend
      const emotionalTrend: "up" | "down" | "stable" = "stable"; // Simplified for now

      // Get last emotional analysis
      const lastAnalysis = artworks?.[0]?.emotional_analysis || null;

      setState({
        emotionalState: child?.emotional_state || "neutral",
        emotionalTrend,
        recentEmotions: [...new Set(recentEmotions)].slice(0, 5),
        totalArtworks: artworks?.length || 0,
        weeklyArtworks,
        avgSessionDuration,
        dominantColors,
        lastAnalysis,
      });
    } catch (error) {
      console.error("Error loading child state:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-secondary rounded"></div>
      </Card>
    );
  }

  if (!state) return null;

  const emotionalInfo = EMOTIONAL_STATES[state.emotionalState as keyof typeof EMOTIONAL_STATES] || EMOTIONAL_STATES.neutral;

  const TrendIcon = state.emotionalTrend === "up" 
    ? TrendingUp 
    : state.emotionalTrend === "down" 
    ? TrendingDown 
    : Minus;

  return (
    <Card className="overflow-hidden">
      {/* Main State Display */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${emotionalInfo.color} flex items-center justify-center text-2xl`}>
              {emotionalInfo.emoji}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{childName}</h3>
              <div className="flex items-center gap-2">
                <Badge className={`${emotionalInfo.color} text-white`}>
                  {emotionalInfo.label}
                </Badge>
                <TrendIcon className={`w-4 h-4 ${
                  state.emotionalTrend === "up" ? "text-green-500" :
                  state.emotionalTrend === "down" ? "text-red-500" : "text-gray-500"
                }`} />
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 text-center border-b">
        <div>
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
            <Palette className="w-4 h-4" />
            Работ
          </div>
          <p className="font-bold text-lg">{state.totalArtworks}</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
            <BarChart3 className="w-4 h-4" />
            За неделю
          </div>
          <p className="font-bold text-lg">{state.weeklyArtworks}</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            Сессия
          </div>
          <p className="font-bold text-lg">{Math.round(state.avgSessionDuration / 60)}м</p>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Dominant Colors */}
          {state.dominantColors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Преобладающие цвета
              </h4>
              <div className="flex gap-2">
                {state.dominantColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Emotions */}
          {state.recentEmotions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Выражаемые эмоции
              </h4>
              <div className="flex flex-wrap gap-2">
                {state.recentEmotions.map((emotion, i) => (
                  <Badge key={i} variant="outline">
                    {emotion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Development Insights */}
          {state.lastAnalysis && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Последний анализ
              </h4>
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                {state.lastAnalysis.summary || "Анализ в процессе..."}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
