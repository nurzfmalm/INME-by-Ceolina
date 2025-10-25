import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ParentControlSettings {
  time_limits_enabled: boolean;
  daily_limit_minutes?: number;
  session_limit_minutes?: number;
  break_reminder_minutes?: number;
  content_restrictions: {
    collaborative_drawing: boolean;
    gallery_access: boolean;
    analytics_access: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time?: string;
    end_time?: string;
  };
  notifications?: {
    session_complete: boolean;
    milestone_reached: boolean;
    time_limit_warning: boolean;
  };
}

export const useParentControl = () => {
  const [settings, setSettings] = useState<ParentControlSettings | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [dailyUsageMinutes, setDailyUsageMinutes] = useState(0);

  useEffect(() => {
    loadSettings();
    loadDailyUsage();
  }, []);

  useEffect(() => {
    if (settings?.time_limits_enabled && sessionStartTime) {
      const interval = setInterval(() => {
        checkTimeLimits();
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [settings, sessionStartTime]);

  const loadSettings = () => {
    const stored = localStorage.getItem('parentControl');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  };

  const loadDailyUsage = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('dailyUsage');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        setDailyUsageMinutes(data.minutes);
      } else {
        // Reset for new day
        localStorage.setItem('dailyUsage', JSON.stringify({ date: today, minutes: 0 }));
        setDailyUsageMinutes(0);
      }
    }
  };

  const startSession = () => {
    if (settings?.time_limits_enabled) {
      if (settings.daily_limit_minutes && dailyUsageMinutes >= settings.daily_limit_minutes) {
        toast.error("Достигнут дневной лимит времени");
        return false;
      }
      setSessionStartTime(Date.now());
    }
    return true;
  };

  const endSession = () => {
    if (sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 60000);
      const newTotal = dailyUsageMinutes + duration;
      
      const today = new Date().toDateString();
      localStorage.setItem('dailyUsage', JSON.stringify({ 
        date: today, 
        minutes: newTotal 
      }));
      
      setDailyUsageMinutes(newTotal);
      setSessionStartTime(null);

      if (settings?.notifications?.session_complete) {
        toast.success(`Сессия завершена. Время: ${duration} мин`);
      }
    }
  };

  const checkTimeLimits = () => {
    if (!settings?.time_limits_enabled || !sessionStartTime) return;

    const currentDuration = Math.floor((Date.now() - sessionStartTime) / 60000);

    // Check session limit
    if (settings.session_limit_minutes && currentDuration >= settings.session_limit_minutes) {
      toast.warning("Время сессии истекло. Сделайте перерыв!");
      endSession();
      return;
    }

    // Check break reminder
    if (
      settings.break_reminder_minutes && 
      currentDuration > 0 && 
      currentDuration % settings.break_reminder_minutes === 0
    ) {
      toast.info("Время для короткого перерыва!");
    }

    // Check daily limit warning
    const totalToday = dailyUsageMinutes + currentDuration;
    if (
      settings.daily_limit_minutes && 
      settings.notifications?.time_limit_warning &&
      totalToday >= settings.daily_limit_minutes - 5 &&
      totalToday < settings.daily_limit_minutes
    ) {
      toast.warning(`Осталось ${settings.daily_limit_minutes - totalToday} минут до дневного лимита`);
    }
  };

  const isInQuietHours = (): boolean => {
    if (!settings?.quiet_hours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quiet_hours.start_time || "20:00";
    const end = settings.quiet_hours.end_time || "08:00";

    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  };

  const canAccessFeature = (feature: keyof ParentControlSettings['content_restrictions']): boolean => {
    return settings?.content_restrictions[feature] ?? true;
  };

  return {
    settings,
    startSession,
    endSession,
    isInQuietHours,
    canAccessFeature,
    dailyUsageMinutes,
    remainingMinutes: settings?.daily_limit_minutes 
      ? Math.max(0, settings.daily_limit_minutes - dailyUsageMinutes)
      : null,
  };
};
