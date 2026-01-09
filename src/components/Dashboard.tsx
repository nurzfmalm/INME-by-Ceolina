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

  // Autism-friendly menu items with muted pastel colors and clear icons
  const allMenuItems = [
    {
      id: "art-therapy",
      title: "Рисование",
      icon: Palette,
      bgClass: "bg-[hsl(260,35%,75%)]",
      hoverClass: "hover:bg-[hsl(260,35%,70%)]",
      description: "Рисуй и выражай эмоции",
      emoji: "🎨",
    },
    {
      id: "learning-path",
      title: "Программа",
      icon: Brain,
      bgClass: "bg-[hsl(200,50%,75%)]",
      hoverClass: "hover:bg-[hsl(200,50%,70%)]",
      description: "Персональный план",
      emoji: "📚",
    },
    {
      id: "tracing",
      title: "Трафареты",
      icon: PenTool,
      bgClass: "bg-[hsl(180,35%,70%)]",
      hoverClass: "hover:bg-[hsl(180,35%,65%)]",
      description: "Учись рисовать фигуры",
      emoji: "✏️",
    },
    {
      id: "dual-drawing",
      title: "Вместе",
      icon: Users,
      bgClass: "bg-[hsl(25,45%,75%)]",
      hoverClass: "hover:bg-[hsl(25,45%,70%)]",
      description: "Рисуй с друзьями",
      emoji: "👥",
    },
    {
      id: "symmetry-drawing",
      title: "Симметрия",
      icon: FlipHorizontal2,
      bgClass: "bg-[hsl(220,40%,75%)]",
      hoverClass: "hover:bg-[hsl(220,40%,70%)]",
      description: "Зеркальное рисование",
      emoji: "🪞",
    },
    {
      id: "half-tracing",
      title: "Половинки",
      icon: SplitSquareHorizontal,
      bgClass: "bg-[hsl(150,35%,70%)]",
      hoverClass: "hover:bg-[hsl(150,35%,65%)]",
      description: "Дорисуй вторую часть",
      emoji: "🧩",
    },
    {
      id: "gallery",
      title: "Галерея",
      icon: Image,
      bgClass: "bg-[hsl(150,35%,70%)]",
      hoverClass: "hover:bg-[hsl(150,35%,65%)]",
      description: "Твои творения",
      emoji: "🖼️",
    },
    {
      id: "analytics",
      title: "Прогресс",
      icon: BarChart3,
      bgClass: "bg-[hsl(260,35%,70%)]",
      hoverClass: "hover:bg-[hsl(260,35%,65%)]",
      description: "Отслеживай успехи",
      emoji: "📊",
    },
    {
      id: "photo-analysis",
      title: "Фото AI",
      icon: Camera,
      bgClass: "bg-[hsl(45,50%,75%)]",
      hoverClass: "hover:bg-[hsl(45,50%,70%)]",
      description: "Анализ с AI",
      emoji: "📷",
    },
    {
      id: "tasks",
      title: "Задания",
      icon: Target,
      bgClass: "bg-[hsl(330,35%,75%)]",
      hoverClass: "hover:bg-[hsl(330,35%,70%)]",
      description: "Получай награды",
      emoji: "🎯",
    },
    {
      id: "rewards",
      title: "Награды",
      icon: ShoppingBag,
      bgClass: "bg-[hsl(330,35%,80%)]",
      hoverClass: "hover:bg-[hsl(330,35%,75%)]",
      description: "Разблокируй новое",
      emoji: "🎁",
    },
    {
      id: "parent-dashboard",
      title: "Аналитика",
      icon: Heart,
      bgClass: "bg-[hsl(15,45%,75%)]",
      hoverClass: "hover:bg-[hsl(15,45%,70%)]",
      description: "Детальная аналитика",
      emoji: "❤️",
    },
    {
      id: "children",
      title: "Профили",
      icon: Users,
      bgClass: "bg-[hsl(200,45%,75%)]",
      hoverClass: "hover:bg-[hsl(200,45%,70%)]",
      description: "Управление профилями",
      emoji: "👤",
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
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[hsl(200,50%,75%)] rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-white text-2xl">👋</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Привет!</p>
                {userRole === "parent" ? (
                  <button 
                    onClick={onChangeChild}
                    className="font-bold text-xl text-foreground flex items-center gap-2"
                  >
                    {childData.childName || "Ребёнок"}
                    <Users size={16} className="text-primary" />
                  </button>
                ) : (
                  <p className="font-bold text-xl text-foreground">
                    {childData.childName || "Друг"}
                  </p>
                )}
              </div>
            </div>

            {/* Tokens & Settings */}
            <div className="flex items-center gap-3">
              <div className="bg-[hsl(45,50%,75%)] text-foreground px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm">
                <Star className="w-5 h-5 text-amber-600" fill="currentColor" />
                <span className="font-bold text-lg">{tokenCount}</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 rounded-2xl bg-muted hover:bg-muted/80"
                onClick={() => onNavigate("settings")}
              >
                <Settings size={22} className="text-muted-foreground" />
              </Button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className={`${mobileSpacing.screenPadding} py-6 space-y-8`}>
        {/* Quick Stats Row - Larger cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="autism-card text-center">
            <div className="w-14 h-14 mx-auto bg-[hsl(260,35%,85%)] rounded-2xl flex items-center justify-center mb-3">
              <Palette className="w-7 h-7 text-[hsl(260,35%,50%)]" />
            </div>
            <p className="text-3xl font-bold text-[hsl(260,35%,50%)]">{stats.artworks}</p>
            <p className="text-sm text-muted-foreground mt-1">Рисунков</p>
          </Card>

          <Card className="autism-card text-center">
            <div className="w-14 h-14 mx-auto bg-[hsl(150,35%,85%)] rounded-2xl flex items-center justify-center mb-3">
              <Trophy className="w-7 h-7 text-[hsl(150,35%,45%)]" />
            </div>
            <p className="text-3xl font-bold text-[hsl(150,35%,45%)]">{stats.tasksCompleted}</p>
            <p className="text-sm text-muted-foreground mt-1">Заданий</p>
          </Card>

          <Card className="autism-card text-center">
            <div className="w-14 h-14 mx-auto bg-[hsl(25,45%,85%)] rounded-2xl flex items-center justify-center mb-3">
              <Flame className="w-7 h-7 text-[hsl(25,45%,50%)]" />
            </div>
            <p className="text-3xl font-bold text-[hsl(25,45%,50%)]">{stats.streak}</p>
            <p className="text-sm text-muted-foreground mt-1">Дней подряд</p>
          </Card>
        </div>

        {/* Weekly Progress Card - Soft solid color */}
        <Card className="p-6 border-0 bg-[hsl(200,50%,75%)] text-white shadow-md rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl">📈 Недельный прогресс</h3>
            <span className="bg-white/25 px-3 py-1 rounded-full text-sm font-semibold">{weeklyProgress}%</span>
          </div>
          <Progress value={weeklyProgress} className="h-4 bg-white/30" />
          <p className="mt-4 text-white/95 text-base">
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
          <div className="grid grid-cols-2 gap-5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`${item.bgClass} ${item.hoverClass} activity-card text-left`}
                >
                  <div className="flex items-start gap-3">
                    <div className="icon-circle">
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{item.emoji}</span>
                        <h4 className="font-bold text-white text-lg">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-white/90 text-sm leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </main>

      {/* Bottom Navigation Bar - Larger touch targets, solid colors */}
      <nav className="fixed bottom-6 left-4 right-4 z-50">
        <div className="bg-card rounded-3xl shadow-lg px-6 py-4 flex items-center justify-around max-w-md mx-auto border border-border/50">
          <button
            onClick={() => {}}
            className="touch-target rounded-2xl bg-[hsl(200,50%,75%)] flex items-center justify-center"
          >
            <Sparkles size={24} className="text-white" />
          </button>
          
          <button
            onClick={() => onNavigate("gallery")}
            className="touch-target rounded-2xl hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Heart size={24} className="text-muted-foreground" />
          </button>
          
          <button
            onClick={() => onNavigate("art-therapy")}
            className="touch-target-large rounded-2xl bg-[hsl(260,35%,75%)] flex items-center justify-center shadow-md -mt-6"
          >
            <Palette size={28} className="text-white" />
          </button>
          
          <button
            onClick={() => onNavigate("rewards")}
            className="touch-target rounded-2xl hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ShoppingBag size={24} className="text-muted-foreground" />
          </button>
          
          <button
            onClick={handleLogout}
            className="touch-target rounded-2xl hover:bg-muted flex items-center justify-center transition-colors"
          >
            <LogOut size={24} className="text-muted-foreground" />
          </button>
        </div>
      </nav>

      <FloatingAssistant contextType="task" />
    </div>
  );
};
