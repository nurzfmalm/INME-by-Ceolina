import { useState, useEffect } from "react";
import { Palette, Sparkles, Gift, Users, LogOut } from "lucide-react";
import { OnboardingData } from "./Onboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import card images
import cardDrawing from "@/assets/card-drawing.png";

interface ChildDashboardProps {
  childData: OnboardingData;
  onNavigate: (section: string) => void;
}

export const ChildDashboard = ({ childData, onNavigate }: ChildDashboardProps) => {
  const [stats, setStats] = useState({
    artworks: 0,
    tokens: 0,
    streak: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Count artworks
      const { count: artworksCount } = await supabase
        .from("artworks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Sum tokens
      const { data: tokensData } = await supabase
        .from("emotion_tokens")
        .select("amount")
        .eq("user_id", user.id);

      const totalTokens = tokensData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Calculate streak
      const { data: activities } = await supabase
        .from("artworks")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const streak = calculateStreak(activities?.map(a => a.created_at) || []);

      setStats({
        artworks: artworksCount || 0,
        tokens: totalTokens,
        streak,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const calculateStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;

    const uniqueDays = [...new Set(dates.map(d => new Date(d).toDateString()))];
    uniqueDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastActivity = new Date(uniqueDays[0]);
    lastActivity.setHours(0, 0, 0, 0);

    if (lastActivity < yesterday) return 0;

    let streak = 0;
    let checkDate = lastActivity.getTime() === today.getTime() ? today : yesterday;

    for (const dayStr of uniqueDays) {
      const day = new Date(dayStr);
      day.setHours(0, 0, 0, 0);

      if (day.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (day < checkDate) {
        break;
      }
    }

    return streak;
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Ошибка при выходе");
    } else {
      toast.success("До встречи! 👋");
      window.location.reload();
    }
  };

  const menuItems = [
    {
      id: "art-therapy",
      icon: <Palette className="w-8 h-8" />,
      title: "Рисовать",
      subtitle: "Свободное рисование",
      color: "bg-[#FFE4B5]",
      iconColor: "text-orange-500",
    },
    {
      id: "tasks",
      icon: <Sparkles className="w-8 h-8" />,
      title: "Задания",
      subtitle: "Интересные челленджи",
      color: "bg-[#B5DEF5]",
      iconColor: "text-blue-500",
    },
    {
      id: "rewards",
      icon: <Gift className="w-8 h-8" />,
      title: "Награды",
      subtitle: `${stats.tokens} звёздочек`,
      color: "bg-[#D4F5D4]",
      iconColor: "text-green-500",
    },
    {
      id: "dual-drawing",
      icon: <Users className="w-8 h-8" />,
      title: "Вместе",
      subtitle: "Рисуем с другом",
      color: "bg-[#F5D4F5]",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4FC] to-[#F0F8FF] safe-area-inset">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          {/* Avatar and Greeting */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#7CB9E8] to-[#5B8DEF] rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">😊</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Привет!</p>
              <h1 className="text-2xl font-bold text-gray-800">
                {childData.childName || "Друг"}
              </h1>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#5B8DEF]">{stats.artworks}</p>
            <p className="text-xs text-gray-500">Рисунков</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-[#FFB347]">{stats.tokens}</p>
            <p className="text-xs text-gray-500">Звёздочек</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-[#77DD77]">{stats.streak}</p>
            <p className="text-xs text-gray-500">Дней подряд</p>
          </div>
        </div>
      </div>

      {/* Main Menu Grid */}
      <main className="px-6 pb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Что будем делать?</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
            >
              <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mb-3 ${item.iconColor}`}>
                {item.icon}
              </div>
              <h3 className="font-semibold text-gray-800 text-lg">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Drawing Types Section */}
        <h2 className="text-lg font-semibold text-gray-700 mt-8 mb-4">Виды рисования</h2>
        
        <div className="space-y-3">
          <button
            onClick={() => onNavigate("tracing")}
            className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-[#FFE4B5] rounded-xl flex items-center justify-center text-2xl">
              ✏️
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">По контуру</h3>
              <p className="text-gray-500 text-sm">Обводи и раскрашивай</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate("symmetry-drawing")}
            className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-[#B5DEF5] rounded-xl flex items-center justify-center text-2xl">
              🦋
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">Симметрия</h3>
              <p className="text-gray-500 text-sm">Рисуй — отражается!</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate("half-tracing")}
            className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-[#D4F5D4] rounded-xl flex items-center justify-center text-2xl">
              🎭
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">Дорисуй половину</h3>
              <p className="text-gray-500 text-sm">Заверши картинку</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};
