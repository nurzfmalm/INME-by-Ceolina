import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Flower2, Sparkles, Sun, Cloud } from "lucide-react";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { supabase } from "@/integrations/supabase/client";

interface GardenProps {
  onBack: () => void;
  childName: string;
}

export const Garden = ({ onBack, childName }: GardenProps) => {
  const [artworkCount, setArtworkCount] = useState(0);
  const [emotionBreakdown, setEmotionBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGardenData();
  }, []);

  const loadGardenData = async () => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        const stored = localStorage.getItem("ceolinaArtworks");
        if (stored) {
          const artworks = JSON.parse(stored);
          setArtworkCount(artworks.length);

          const breakdown: Record<string, number> = {};
          artworks.forEach((art: any) => {
            Object.entries(art.emotions_used || {}).forEach(([emotion, count]) => {
              breakdown[emotion] = (breakdown[emotion] || 0) + (count as number);
            });
          });
          setEmotionBreakdown(breakdown);
        }
        setLoading(false);
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("artworks")
        .select("emotions_used")
        .eq("user_id", userId);

      if (error) throw error;

      setArtworkCount(data?.length || 0);

      const breakdown: Record<string, number> = {};
      data?.forEach((art) => {
        Object.entries(art.emotions_used || {}).forEach(([emotion, count]) => {
          breakdown[emotion] = (breakdown[emotion] || 0) + (count as number);
        });
      });
      setEmotionBreakdown(breakdown);
    } catch (error) {
      console.error("Error loading garden data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFlowerSize = (count: number) => {
    if (count >= 50) return "w-24 h-24";
    if (count >= 20) return "w-20 h-20";
    if (count >= 10) return "w-16 h-16";
    return "w-12 h-12";
  };

  const getFlowerCount = (count: number) => Math.min(Math.floor(count / 5), 20);

  const emotionFlowers: Record<string, { color: string; icon: typeof Flower2; label: string }> = {
    joy: { color: "text-yellow-400", icon: Sun, label: "Радость" },
    calm: { color: "text-green-400", icon: Flower2, label: "Спокойствие" },
    sadness: { color: "text-blue-400", icon: Cloud, label: "Грусть" },
    energy: { color: "text-red-400", icon: Sparkles, label: "Энергия" },
    creative: { color: "text-purple-400", icon: Flower2, label: "Творчество" },
    gentle: { color: "text-pink-400", icon: Flower2, label: "Нежность" },
  };

  const gardenLevel = Math.floor(artworkCount / 5);
  const nextLevelProgress = (artworkCount % 5) * 20;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-100">
      <header className="bg-white/80 backdrop-blur-sm shadow-soft border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center">
                <Flower2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Сад Эмоций</h1>
                <p className="text-sm text-muted-foreground">
                  Твой эмоциональный рост, {childName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Progress Card */}
        <Card className="p-6 border-0 bg-white/90 backdrop-blur-sm shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Уровень сада: {gardenLevel}</h2>
              <p className="text-sm text-muted-foreground">
                {artworkCount} рисунков создано
              </p>
            </div>
            <div className="text-4xl">🌱</div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>До следующего уровня</span>
              <span className="font-semibold">{5 - (artworkCount % 5)} рисунков</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${nextLevelProgress}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Garden Visualization */}
        <Card className="p-8 border-0 bg-white/90 backdrop-blur-sm shadow-soft">
          <h2 className="text-2xl font-bold mb-6 text-center">Твой Сад Эмоций</h2>

          {Object.keys(emotionBreakdown).length === 0 ? (
            <div className="text-center py-12">
              <Flower2 className="mx-auto mb-4 text-muted-foreground" size={64} />
              <p className="text-lg text-muted-foreground">
                Твой сад пока пуст. Создай свой первый рисунок, чтобы вырастить цветы эмоций!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {Object.entries(emotionBreakdown).map(([emotion, count]) => {
                const flower = emotionFlowers[emotion];
                if (!flower) return null;

                const FlowerIcon = flower.icon;
                const flowerCount = getFlowerCount(count);

                return (
                  <div key={emotion} className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: Math.min(flowerCount, 16) }).map((_, i) => (
                          <FlowerIcon
                            key={i}
                            className={`${flower.color} ${getFlowerSize(count)} animate-gentle-float`}
                            style={{
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-center">{flower.label}</p>
                    <p className="text-xs text-muted-foreground">{count} раз</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Emotion Stats */}
        {Object.keys(emotionBreakdown).length > 0 && (
          <Card className="p-6 border-0 bg-white/90 backdrop-blur-sm shadow-soft">
            <h2 className="text-xl font-bold mb-4">Статистика эмоций</h2>
            <div className="space-y-3">
              {Object.entries(emotionBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([emotion, count]) => {
                  const flower = emotionFlowers[emotion];
                  if (!flower) return null;

                  const percentage =
                    (count / Object.values(emotionBreakdown).reduce((a, b) => a + b, 0)) * 100;

                  return (
                    <div key={emotion} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{flower.label}</span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            flower.color.replace("text-", "bg-")
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};
