import { useState, useEffect } from "react";
import { Palette, Monitor, Flame, Menu, Users } from "lucide-react";
import { OnboardingData } from "./Onboarding";
import { FloatingAssistant } from "./FloatingAssistant";
import type { UserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import card images
import cardDrawing from "@/assets/card-drawing.png";
import cardAnalytics from "@/assets/card-analytics.png";
import cardProfiles from "@/assets/card-profiles.png";

interface DashboardProps {
  childData: OnboardingData;
  onNavigate: (section: string) => void;
  userRole?: UserRole;
  selectedChildId?: string | null;
  onChangeChild?: () => void;
}

export const Dashboard = ({ childData, onNavigate, userRole, selectedChildId, onChangeChild }: DashboardProps) => {
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

      const { count: artworksCount } = await supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: tasksCount } = await supabase
        .from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

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
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Ошибка при выходе");
    } else {
      toast.success("Вы вышли из аккаунта");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#E8F4FC]">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Avatar and Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#4A90D9] rounded-full flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Привет!</p>
              {userRole === "parent" ? (
                <button 
                  onClick={onChangeChild}
                  className="font-semibold text-lg text-gray-800 flex items-center gap-1"
                >
                  {childData.childName || "Ребёнок"} <span className="text-[#4A90D9]">🎨</span>
                </button>
              ) : (
                <p className="font-semibold text-lg text-gray-800">
                  {childData.childName || "Друг"} <span className="text-[#4A90D9]">🎨</span>
                </p>
              )}
            </div>
          </div>

          {/* Menu Button */}
          <button 
            onClick={handleLogout}
            className="w-10 h-10 flex flex-col items-end justify-center gap-1"
          >
            <div className="w-6 h-0.5 bg-[#4A90D9]"></div>
            <div className="w-4 h-0.5 bg-[#4A90D9]"></div>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-4 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Drawings stat */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Palette className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-gray-700 text-sm">
                выполнено <span className="font-semibold">{stats.artworks}</span> рисунков
              </p>
            </div>
          </div>

          {/* Tasks stat */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Monitor className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-gray-700 text-sm">
                выполнено <span className="font-semibold">{stats.tasksCompleted}</span> задач
              </p>
            </div>
          </div>

          {/* Streak stat */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-gray-700 text-sm">
                <span className="font-semibold">{stats.streak}</span> дней серии
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-[#2563EB] rounded-2xl p-5 text-white">
          <h3 className="font-semibold text-lg mb-3">Недельный прогресс</h3>
          <div className="relative h-2 bg-white/30 rounded-full overflow-hidden mb-2">
            <div 
              className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-white/90 text-sm italic">Продолжай в том же духе!</p>
            <span className="text-white/80 text-sm">{weeklyProgress}%</span>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Drawing Card */}
          <button
            onClick={() => onNavigate("art-therapy")}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="h-24 overflow-hidden rounded-t-2xl">
              <img 
                src={cardDrawing} 
                alt="Рисование" 
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-gray-800 mb-1">Рисование</h4>
              <p className="text-gray-500 text-sm">Что нарисуем сегодня?</p>
            </div>
          </button>

          {/* Analytics Card */}
          <button
            onClick={() => onNavigate(userRole === "parent" ? "parent-dashboard" : "analytics")}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="h-24 overflow-hidden rounded-t-2xl">
              <img 
                src={cardAnalytics} 
                alt="Аналитика" 
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-gray-800 mb-1">Аналитика</h4>
              <p className="text-gray-500 text-sm">Отследите прогресс ребенка</p>
            </div>
          </button>

          {/* Profiles Card */}
          <button
            onClick={() => onNavigate("children")}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="h-24 overflow-hidden rounded-t-2xl">
              <img 
                src={cardProfiles} 
                alt="Профили" 
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="p-4">
              <h4 className="font-semibold text-gray-800 mb-1">Профили</h4>
              <p className="text-gray-500 text-sm">Управление профилями</p>
            </div>
          </button>
        </div>
      </main>

      <FloatingAssistant contextType="task" />
    </div>
  );
};
