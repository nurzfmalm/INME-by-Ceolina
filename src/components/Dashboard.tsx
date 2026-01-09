import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Palette,
  Brain,
  Image,
  BarChart3,
  Settings,
  Heart,
  Target,
  ShoppingBag,
  Users,
  Camera,
  LogOut,
  Sparkles,
  Trophy,
  Flame,
  Star,
  Menu,
  X,
  PenTool,
  FlipHorizontal2,
  SplitSquareHorizontal
} from "lucide-react";
import { OnboardingData } from "./Onboarding";
import { FloatingAssistant } from "./FloatingAssistant";
import type { UserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { responsiveText, responsiveGrid, mobileSpacing, touchSizes } from "@/lib/responsive";

interface DashboardProps {
  childData: OnboardingData;
  onNavigate: (section: string) => void;
  userRole?: UserRole;
  selectedChildId?: string | null;
  onChangeChild?: () => void;
}

export const Dashboard = ({ childData, onNavigate, userRole, selectedChildId, onChangeChild }: DashboardProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [stats, setStats] = useState({
    artworks: 0,
    tasksCompleted: 0,
    streak: 0,
  });
  const [weeklyProgress, setWeeklyProgress] = useState(0);

  useEffect(() => {
    loadUserStats();
  }, []);

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
    
    // If last activity is not today or yesterday, streak is 0
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

  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get artworks count
      const { count: artworksCount } = await supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get completed tasks count
      const { count: tasksCount } = await supabase
        .from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      // Get total emotion tokens
      const { data: tokens } = await supabase
        .from('emotion_tokens')
        .select('amount')
        .eq('user_id', user.id);

      const totalTokens = tokens?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Calculate streak from activity dates
      const activityDates: string[] = [];
      
      const { data: artworks } = await supabase
        .from('artworks')
        .select('created_at')
        .eq('user_id', user.id);
      
      const { data: sessions } = await supabase
        .from('session_analytics')
        .select('created_at')
        .eq('user_id', user.id);
      
      const { data: completedTasks } = await supabase
        .from('user_tasks')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('completed', true);
      
      artworks?.forEach(a => a.created_at && activityDates.push(a.created_at));
      sessions?.forEach(s => s.created_at && activityDates.push(s.created_at));
      completedTasks?.forEach(t => t.completed_at && activityDates.push(t.completed_at));
      
      const streak = calculateStreak(activityDates);

      // Calculate weekly progress (activities this week vs target of 7)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const thisWeekActivities = activityDates.filter(d => new Date(d) >= weekStart);
      const uniqueWeekDays = new Set(thisWeekActivities.map(d => new Date(d).toDateString())).size;
      const progress = Math.min(100, Math.round((uniqueWeekDays / 7) * 100));
      
      setWeeklyProgress(progress);
      setStats({
        artworks: artworksCount || 0,
        tasksCompleted: tasksCount || 0,
        streak,
      });
      setTokenCount(totalTokens);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Ошибка при выходе");
      console.error("Logout error:", error);
    } else {
      toast.success("Вы вышли из аккаунта");
      window.location.reload();
    }
  };

  // Kid-friendly colorful menu items with solid background colors
  const allMenuItems = [
    {
      id: "art-therapy",
      title: "Рисование",
      icon: Palette,
      bgColor: "bg-purple-400",
      hoverColor: "hover:bg-purple-500",
      description: "Рисуй и выражай эмоции",
    },
    {
      id: "learning-path",
      title: "Программа",
      icon: Brain,
      bgColor: "bg-blue-400",
      hoverColor: "hover:bg-blue-500",
      description: "Персональный план",
    },
    {
      id: "tracing",
      title: "Трафареты",
      icon: PenTool,
      bgColor: "bg-cyan-400",
      hoverColor: "hover:bg-cyan-500",
      description: "Учись рисовать фигуры",
    },
    {
      id: "dual-drawing",
      title: "Вместе",
      icon: Users,
      bgColor: "bg-orange-400",
      hoverColor: "hover:bg-orange-500",
      description: "Рисуй с друзьями",
    },
    {
      id: "symmetry-drawing",
      title: "Симметрия",
      icon: FlipHorizontal2,
      bgColor: "bg-indigo-400",
      hoverColor: "hover:bg-indigo-500",
      description: "Зеркальное рисование",
    },
    {
      id: "half-tracing",
      title: "Половинки",
      icon: SplitSquareHorizontal,
      bgColor: "bg-teal-400",
      hoverColor: "hover:bg-teal-500",
      description: "Дорисуй вторую часть",
    },
    {
      id: "gallery",
      title: "Галерея",
      icon: Image,
      bgColor: "bg-green-400",
      hoverColor: "hover:bg-green-500",
      description: "Твои творения",
    },
    {
      id: "analytics",
      title: "Прогресс",
      icon: BarChart3,
      bgColor: "bg-violet-400",
      hoverColor: "hover:bg-violet-500",
      description: "Отслеживай успехи",
    },
    {
      id: "photo-analysis",
      title: "Фото AI",
      icon: Camera,
      bgColor: "bg-amber-400",
      hoverColor: "hover:bg-amber-500",
      description: "Анализ с AI",
    },
    {
      id: "tasks",
      title: "Задания",
      icon: Target,
      bgColor: "bg-rose-400",
      hoverColor: "hover:bg-rose-500",
      description: "Получай награды",
    },
    {
      id: "rewards",
      title: "Награды",
      icon: ShoppingBag,
      bgColor: "bg-pink-400",
      hoverColor: "hover:bg-pink-500",
      description: "Разблокируй новое",
    },
    {
      id: "parent-dashboard",
      title: "Аналитика",
      icon: Heart,
      bgColor: "bg-red-400",
      hoverColor: "hover:bg-red-500",
      description: "Детальная аналитика",
    },
    {
      id: "children",
      title: "Профили",
      icon: Users,
      bgColor: "bg-sky-400",
      hoverColor: "hover:bg-sky-500",
      description: "Управление профилями",
    },
  ];

  const menuItems = userRole === "child"
    ? allMenuItems.filter(item => !["analytics", "parent-dashboard", "learning-path", "photo-analysis", "children"].includes(item.id))
    : userRole === "parent"
    ? allMenuItems.filter(item => !["dual-drawing"].includes(item.id))
    : allMenuItems;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Friendly Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className={`${mobileSpacing.screenPadding} py-4`}>
          <div className="flex items-center justify-between">
            {/* Welcome & Avatar */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">👋</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Привет!</p>
                {userRole === "parent" ? (
                  <button 
                    onClick={onChangeChild}
                    className="font-bold text-lg text-foreground flex items-center gap-1"
                  >
                    {childData.childName || "Ребёнок"}
                    <Users size={14} className="text-primary" />
                  </button>
                ) : (
                  <p className="font-bold text-lg text-foreground">
                    {childData.childName || "Друг"}
                  </p>
                )}
              </div>
            </div>

            {/* Tokens & Settings */}
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-white px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md">
                <Star className="w-4 h-4" fill="currentColor" />
                <span className="font-bold">{tokenCount}</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-primary/10"
                onClick={() => onNavigate("settings")}
              >
                <Settings size={20} className="text-primary" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 bg-muted rounded-full px-4 py-3 flex items-center gap-2">
              <span className="text-muted-foreground">🔍</span>
              <span className="text-muted-foreground text-sm">Поиск занятий...</span>
            </div>
            <Button
              size="icon"
              className="w-12 h-12 rounded-full bg-primary shadow-lg"
            >
              <Sparkles size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`${mobileSpacing.screenPadding} py-6 space-y-6`}>
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 border-0 bg-white dark:bg-slate-800 shadow-lg rounded-2xl">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <Palette className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-500">{stats.artworks}</p>
              <p className="text-xs text-muted-foreground">Рисунков</p>
            </div>
          </Card>

          <Card className="p-4 border-0 bg-white dark:bg-slate-800 shadow-lg rounded-2xl">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-500">{stats.tasksCompleted}</p>
              <p className="text-xs text-muted-foreground">Заданий</p>
            </div>
          </Card>

          <Card className="p-4 border-0 bg-white dark:bg-slate-800 shadow-lg rounded-2xl">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-500">{stats.streak}</p>
              <p className="text-xs text-muted-foreground">Дней подряд</p>
            </div>
          </Card>
        </div>

        {/* Weekly Progress Card */}
        <Card className="p-5 border-0 bg-gradient-to-r from-primary to-blue-500 text-white shadow-xl rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">Недельный прогресс</h3>
            <span className="text-white/80 text-sm">{weeklyProgress}%</span>
          </div>
          <Progress value={weeklyProgress} className="h-3 bg-white/30" />
          <p className="mt-3 text-white/90 text-sm">
            Продолжай в том же духе! 🌟
          </p>
        </Card>

        {/* Menu Grid - Colorful Cards like reference */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`${responsiveText.h3} text-slate-700 dark:text-slate-200`}>
              Занятия
            </h3>
            <span className="text-sm text-primary font-medium">Ещё →</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`${item.bgColor} ${item.hoverColor} rounded-3xl p-5 text-left transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl`}
                >
                  <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                    <Icon className="text-white" size={28} />
                  </div>
                  <h4 className="font-bold text-white text-base mb-1">
                    {item.title}
                  </h4>
                  <p className="text-white/80 text-xs leading-tight">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-white dark:bg-slate-800 rounded-full shadow-2xl px-4 py-3 flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => {}}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg"
          >
            <Sparkles size={22} className="text-white" />
          </button>
          
          <button
            onClick={() => onNavigate("gallery")}
            className="w-12 h-12 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Heart size={22} className="text-muted-foreground" />
          </button>
          
          <button
            onClick={() => onNavigate("art-therapy")}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-blue-500 flex items-center justify-center shadow-xl -mt-4"
          >
            <Palette size={26} className="text-white" />
          </button>
          
          <button
            onClick={() => onNavigate("rewards")}
            className="w-12 h-12 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ShoppingBag size={22} className="text-muted-foreground" />
          </button>
          
          <button
            onClick={handleLogout}
            className="w-12 h-12 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <LogOut size={22} className="text-muted-foreground" />
          </button>
        </div>
      </nav>

      <FloatingAssistant contextType="task" />
    </div>
  );
};
