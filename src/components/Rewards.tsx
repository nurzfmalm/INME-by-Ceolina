import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingBag, Star, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { supabase } from "@/integrations/supabase/client";

interface RewardsProps {
  onBack: () => void;
  childName: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: "brush" | "color" | "texture" | "background" | "character";
  unlocked: boolean;
  preview?: string;
}

export const Rewards = ({ onBack, childName }: RewardsProps) => {
  const [totalTokens, setTotalTokens] = useState(0);
  const [unlockedRewards, setUnlockedRewards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const rewards: Reward[] = [
    {
      id: "brush-sparkle",
      name: "Блестящая кисть",
      description: "Рисуй с волшебными искорками",
      cost: 50,
      type: "brush",
      unlocked: false,
    },
    {
      id: "brush-rainbow",
      name: "Радужная кисть",
      description: "Кисть с переливающимися цветами",
      cost: 75,
      type: "brush",
      unlocked: false,
    },
    {
      id: "color-gold",
      name: "Золотой цвет",
      description: "Роскошный золотистый оттенок",
      cost: 30,
      type: "color",
      unlocked: false,
    },
    {
      id: "color-silver",
      name: "Серебряный цвет",
      description: "Сияющий серебристый оттенок",
      cost: 30,
      type: "color",
      unlocked: false,
    },
    {
      id: "texture-stars",
      name: "Текстура звёзд",
      description: "Добавляй звёздочки в рисунки",
      cost: 40,
      type: "texture",
      unlocked: false,
    },
    {
      id: "texture-hearts",
      name: "Текстура сердец",
      description: "Рисуй милыми сердечками",
      cost: 40,
      type: "texture",
      unlocked: false,
    },
    {
      id: "bg-galaxy",
      name: "Фон \"Галактика\"",
      description: "Космический фон для творчества",
      cost: 60,
      type: "background",
      unlocked: false,
    },
    {
      id: "bg-garden",
      name: "Фон \"Сад\"",
      description: "Прекрасный цветочный фон",
      cost: 60,
      type: "background",
      unlocked: false,
    },
    {
      id: "char-bunny",
      name: "Персонаж Зайчик",
      description: "Милый помощник для рисования",
      cost: 100,
      type: "character",
      unlocked: false,
    },
    {
      id: "char-dragon",
      name: "Персонаж Дракон",
      description: "Добрый дракон-помощник",
      cost: 100,
      type: "character",
      unlocked: false,
    },
  ];

  useEffect(() => {
    loadTokens();
    loadUnlockedRewards();
  }, []);

  const loadTokens = async () => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        const stored = localStorage.getItem("starTokens");
        setTotalTokens(stored ? parseInt(stored) : 0);
        setLoading(false);
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("emotion_tokens")
        .select("amount")
        .eq("user_id", userId);

      if (error) throw error;

      const total = data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      setTotalTokens(total);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Ошибка при загрузке токенов");
    } finally {
      setLoading(false);
    }
  };

  const loadUnlockedRewards = async () => {
    try {
      const stored = localStorage.getItem("starUnlockedRewards");
      if (stored) {
        setUnlockedRewards(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error("Error loading unlocked rewards:", error);
    }
  };

  const unlockReward = async (reward: Reward) => {
    if (totalTokens < reward.cost) {
      toast.error("Недостаточно токенов!");
      return;
    }

    try {
      const newTotal = totalTokens - reward.cost;
      const newUnlocked = new Set(unlockedRewards);
      newUnlocked.add(reward.id);

      // Update localStorage
      localStorage.setItem("starTokens", newTotal.toString());
      localStorage.setItem(
        "starUnlockedRewards",
        JSON.stringify(Array.from(newUnlocked))
      );

      setTotalTokens(newTotal);
      setUnlockedRewards(newUnlocked);

      // If authenticated, also save to database
      const isAuth = await isUserAuthenticated();
      if (isAuth) {
        const userId = await getCurrentUserId();
        if (userId) {
          await supabase.from("emotion_tokens").insert({
            user_id: userId,
            amount: -reward.cost,
            reason: `Unlocked: ${reward.name}`,
          });
        }
      }

      toast.success(`${reward.name} разблокирован! 🎉`);
    } catch (error) {
      console.error("Error unlocking reward:", error);
      toast.error("Ошибка при разблокировке");
    }
  };

  const rewardsWithStatus = rewards.map((r) => ({
    ...r,
    unlocked: unlockedRewards.has(r.id),
  }));

  const groupedRewards = {
    brush: rewardsWithStatus.filter((r) => r.type === "brush"),
    color: rewardsWithStatus.filter((r) => r.type === "color"),
    texture: rewardsWithStatus.filter((r) => r.type === "texture"),
    background: rewardsWithStatus.filter((r) => r.type === "background"),
    character: rewardsWithStatus.filter((r) => r.type === "character"),
  };

  const categoryNames = {
    brush: "Кисти",
    color: "Цвета",
    texture: "Текстуры",
    background: "Фоны",
    character: "Персонажи",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-soft border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft size={24} />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-warm rounded-full flex items-center justify-center">
                  <ShoppingBag className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Награды</h1>
                  <p className="text-sm text-muted-foreground">
                    Используй токены для разблокировки, {childName}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gradient-warm px-4 py-2 rounded-full">
              <Star className="text-white" size={20} />
              <span className="font-bold text-white">{totalTokens}</span>
              <span className="text-xs text-white/80">токенов</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {Object.entries(groupedRewards).map(([category, items]) => (
          <section key={category}>
            <h2 className="text-2xl font-bold mb-4">
              {categoryNames[category as keyof typeof categoryNames]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((reward) => (
                <Card
                  key={reward.id}
                  className={`p-6 border-0 transition-all ${
                    reward.unlocked
                      ? "bg-gradient-calm"
                      : "bg-card hover:shadow-float"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {reward.unlocked ? (
                        <Check className="text-white" size={24} />
                      ) : (
                        <Lock className="text-muted-foreground" size={24} />
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        reward.unlocked ? "text-white" : "text-primary"
                      }`}
                    >
                      <Star size={16} />
                      {reward.cost}
                    </div>
                  </div>

                  <h3
                    className={`text-lg font-bold mb-2 ${
                      reward.unlocked ? "text-white" : ""
                    }`}
                  >
                    {reward.name}
                  </h3>
                  <p
                    className={`text-sm mb-4 ${
                      reward.unlocked ? "text-white/90" : "text-muted-foreground"
                    }`}
                  >
                    {reward.description}
                  </p>

                  {reward.unlocked ? (
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                      <span className="text-white font-semibold">
                        Разблокировано ✓
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => unlockReward(reward)}
                      disabled={totalTokens < reward.cost}
                      className="w-full"
                      variant={totalTokens >= reward.cost ? "default" : "outline"}
                    >
                      {totalTokens >= reward.cost
                        ? "Разблокировать"
                        : "Недостаточно токенов"}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};
