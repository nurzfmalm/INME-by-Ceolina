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
  X
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
}

export const Dashboard = ({ childData, onNavigate, userRole }: DashboardProps) => {
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

  const allMenuItems = [
    {
      id: "art-therapy",
      title: "АРТ - Терапия",
      icon: Palette,
      gradient: "from-purple-500 via-pink-500 to-rose-500",
      description: "Рисуй и выражай эмоции",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      id: "learning-path",
      title: "Программа",
      icon: Brain,
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      description: "Персональный план",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      id: "dual-drawing",
      title: "Вместе",
      icon: Users,
      gradient: "from-orange-500 via-red-500 to-pink-500",
      description: "Рисуй с друзьями",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      id: "gallery",
      title: "Галерея",
      icon: Image,
      gradient: "from-green-500 via-emerald-500 to-teal-500",
      description: "Твои творения",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      id: "analytics",
      title: "Прогресс",
      icon: BarChart3,
      gradient: "from-violet-500 via-purple-500 to-indigo-500",
      description: "Отслеживай успехи",
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-950",
    },
    {
      id: "photo-analysis",
      title: "Фото AI",
      icon: Camera,
      gradient: "from-amber-500 via-yellow-500 to-orange-500",
      description: "Анализ с AI",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      id: "tasks",
      title: "Задания",
      icon: Target,
      gradient: "from-red-500 via-rose-500 to-pink-500",
      description: "Получай награды",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      id: "rewards",
      title: "Награды",
      icon: ShoppingBag,
      gradient: "from-fuchsia-500 via-purple-500 to-pink-500",
      description: "Разблокируй новое",
      color: "text-fuchsia-600",
      bgColor: "bg-fuchsia-50 dark:bg-fuchsia-950",
    },
    {
      id: "parent-dashboard",
      title: "Родителю",
      icon: Heart,
      gradient: "from-rose-500 via-pink-500 to-red-500",
      description: "Детальная аналитика",
      color: "text-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-950",
    },
  ];

  const menuItems = userRole === "child"
    ? allMenuItems.filter(item => !["analytics", "parent-dashboard", "learning-path", "photo-analysis"].includes(item.id))
    : allMenuItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50 dark:from-slate-950 dark:via-purple-950/30 dark:to-blue-950">
      {/* Mobile Header with Menu */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className={`${mobileSpacing.screenPadding} py-3`}>
          <div className="flex items-center justify-between">
            {/* Logo & Greeting */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="text-white" size={20} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Привет!</p>
                <p className={`${responsiveText.h4} bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                  {childData.childName || "Друг"}
                </p>
              </div>
            </div>

            {/* Tokens & Actions */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1.5 cursor-help">
                      <Star className="w-3 h-3 mr-1" fill="currentColor" />
                      {tokenCount}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">⭐ Токены награды</p>
                    <p className="text-sm">Зарабатывай токены, выполняя задания и создавая рисунки. Обменивай их на новые кисти, фоны и цвета в магазине наград!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="ghost"
                size="icon"
                className={`${touchSizes.icon} sm:hidden`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>

              <div className="hidden sm:flex items-center gap-1">
                {userRole === "parent" && (
                  <Button variant="ghost" size="icon" className={touchSizes.icon} onClick={() => onNavigate("settings")}>
                    <Settings size={20} />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className={touchSizes.icon} onClick={handleLogout} title="Выйти">
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 sm:hidden">
              {userRole === "parent" && (
                <Button variant="ghost" className="w-full justify-start" onClick={() => {
                  onNavigate("settings");
                  setMobileMenuOpen(false);
                }}>
                  <Settings className="mr-2" size={20} />
                  Настройки
                </Button>
              )}
              <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2" size={20} />
                Выйти
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`${mobileSpacing.screenPadding} py-6 space-y-6`}>
        {/* Hero Section */}
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50" />
          <div className={`${mobileSpacing.cardPadding} relative z-10`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`${responsiveText.h2} mb-2`}>
                  Готов творить?
                </h2>
                <p className={`${responsiveText.body} text-white/90`}>
                  Сегодня отличный день для новых открытий!
                </p>
              </div>
              <Sparkles className="hidden sm:block w-16 h-16 opacity-50" />
            </div>

            {/* Quick Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Недельный прогресс</span>
                <span className="font-semibold">{weeklyProgress}%</span>
              </div>
              <Progress value={weeklyProgress} className="h-2 bg-white/20" />
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {stats.artworks}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Рисунков</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {stats.tasksCompleted}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Заданий</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {stats.streak}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Дней</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Menu Grid */}
        <div>
          <h3 className={`${responsiveText.h3} mb-4 text-slate-800 dark:text-slate-200`}>
            Чем займёмся?
          </h3>
          <div className={responsiveGrid.cards}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  className={`group relative overflow-hidden border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer ${touchSizes.minTouchTarget}`}
                  onClick={() => onNavigate(item.id)}
                >
                  {/* Gradient Background on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  <div className="relative z-10 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="text-white" size={24} />
                      </div>
                    </div>
                    <div>
                      <h4 className={`${responsiveText.h4} mb-1 text-slate-800 dark:text-slate-200`}>
                        {item.title}
                      </h4>
                      <p className={`${responsiveText.small} text-slate-600 dark:text-slate-400`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Motivation Card */}
        <Card className="border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl">
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Star className="w-6 h-6" fill="currentColor" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Продолжай в том же духе!</h4>
              <p className="text-sm text-white/90">
                Ты на правильном пути. Каждый рисунок приближает тебя к цели!
              </p>
            </div>
          </div>
        </Card>
      </main>

      <FloatingAssistant contextType="task" />
    </div>
  );
};
