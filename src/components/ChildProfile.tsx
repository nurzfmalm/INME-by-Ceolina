import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Palette, BookOpen, Gamepad2, Bot, Plus, Trash2, Clock, X } from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import characterGlasses from "@/assets/character-glasses.png";
import characterKidWave from "@/assets/character-kid-wave.png";
import complexityIllustration from "@/assets/complexity-illustration.png";

interface ChildProfileProps {
  childId: string;
  childName: string;
  onBack: () => void;
}

interface AssessmentData {
  responses?: Array<{
    question: string;
    answer: string;
    category?: string;
  }>;
}

interface ScheduleSlot {
  day: string;
  shortDay: string;
  time: string;
  active: boolean;
}

interface ProfileData {
  parentName: string;
  parentContact: string;
  childName: string;
  childAge: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  confirmationEnabled: boolean;
  soundsEnabled: boolean;
  interfaceComplexity: "simple" | "medium" | "complex";
  schedule: ScheduleSlot[];
  socialBehavior: string;
  engagement: string;
  selfRegulation: string;
  motorSkills: string;
  sensoryFeatures: string[];
  interests: string[];
  currentFocus: string;
}

const SOCIAL_BEHAVIOR_OPTIONS = [
  "Избегает контакта",
  "Играет рядом но не вместе",
  "Может играть вместе",
  "Легко взаимодействует",
];

const ENGAGEMENT_OPTIONS = [
  "Легко вовлекается",
  "Нужно время, чтобы привыкнуть",
  "Быстро теряет интерес",
  "Зацикливается на одном",
];

const SELF_REGULATION_OPTIONS = [
  "Импульсивный (действует без ожидания)",
  "Тревожный / избегает нового",
  "Легко расстраивается при ошибке",
  "Спокойно переносит трудности",
];

const MOTOR_SKILLS_OPTIONS = [
  "Движения неуверенные",
  "Трудно обводить линии",
  "Предпочитает нажимать, а не вести",
  "Держит предметы уверенно",
  "Моторика хорошая",
];

const SENSORY_FEATURES_OPTIONS = [
  "Чувствителен к звукам",
  "Чувствителен к яркому свету",
  "Избегает прикосновений",
  "Любит тактильные ощущения",
  "Сенсорных особенностей не замечено",
];

const INTERESTS_OPTIONS = [
  "Животные",
  "Машины",
  "Космос",
  "Персонажи",
  "Природа",
  "Вода/песок",
  "Цвета и узоры",
];

const CURRENT_FOCUS_OPTIONS = [
  "Моторика",
  "Внимание",
  "Саморегуляция и ожидание",
  "Взаимодействие с другими",
];

const DEFAULT_SCHEDULE: ScheduleSlot[] = [
  { day: "Понедельник", shortDay: "Пн", time: "22:22", active: true },
  { day: "Вторник", shortDay: "Вт", time: "", active: false },
  { day: "Среда", shortDay: "Ср", time: "22:22", active: true },
  { day: "Четверг", shortDay: "Чт", time: "", active: false },
  { day: "Пятница", shortDay: "Пт", time: "22:22", active: true },
  { day: "Суббота", shortDay: "Сб", time: "", active: false },
  { day: "Воскресенье", shortDay: "Вс", time: "", active: false },
];

const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const ACTIVITY_TYPES = [
  { key: "drawing", name: "Рисование", icon: Palette, color: "#F59E0B" },
  { key: "tasks", name: "Задания", icon: BookOpen, color: "#3B82F6" },
  { key: "games", name: "Игры", icon: Gamepad2, color: "#8B5CF6" },
  { key: "other", name: "Другое", icon: Bot, color: "#10B981" },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const MONTH_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  const mins = Math.floor(seconds / 60);
  return `${mins} мин`;
}

interface ScheduleEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_type: string;
  activity_name: string;
}

interface SessionLog {
  id: string;
  activity_type: string;
  activity_name: string;
  duration_seconds: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

const ScheduleCalendarCard = ({ childId, userId }: { childId: string; userId: string }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  // Data
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // New entry form
  const [newEntryType, setNewEntryType] = useState("drawing");
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("10:30");

  const daysInMonth = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);
  const firstDay = useMemo(() => getFirstDayOfMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const selectedDate = new Date(currentYear, currentMonth, selectedDay);
  const selectedDayOfWeek = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;
  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  const isTodayFn = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // Load schedule entries for this child
  const loadSchedule = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("schedule_entries")
        .select("*")
        .eq("child_id", childId);
      setScheduleEntries((data as ScheduleEntry[]) || []);
    } catch (e) { console.error(e); }
  }, [childId]);

  // Load session logs for selected date
  const loadSessionLogs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("daily_session_logs")
        .select("*")
        .eq("child_id", childId)
        .eq("session_date", dateStr);
      setSessionLogs((data as SessionLog[]) || []);
    } catch (e) { console.error(e); }
  }, [childId, dateStr]);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([loadSchedule(), loadSessionLogs()]).finally(() => setLoadingData(false));
  }, [loadSchedule, loadSessionLogs]);

  // Entries for selected day
  const dayEntries = scheduleEntries.filter(e => e.day_of_week === selectedDayOfWeek);

  // Activity summary for the sidebar
  const activitySummary = ACTIVITY_TYPES.map(at => {
    const logs = sessionLogs.filter(l => l.activity_type === at.key);
    const totalDuration = logs.reduce((sum, l) => sum + l.duration_seconds, 0);
    const completed = logs.some(l => l.status === "completed");
    return { ...at, totalDuration, completed, logCount: logs.length };
  });

  const goalMet = activitySummary.some(a => a.completed);

  // Add schedule entry
  const addEntry = async () => {
    const actType = ACTIVITY_TYPES.find(a => a.key === newEntryType);
    const { error } = await supabase.from("schedule_entries").insert({
      child_id: childId,
      user_id: userId,
      day_of_week: selectedDayOfWeek,
      start_time: newStartTime,
      end_time: newEndTime,
      activity_type: newEntryType,
      activity_name: actType?.name || "Занятие",
    });
    if (!error) await loadSchedule();
  };

  // Delete schedule entry
  const deleteEntry = async (id: string) => {
    await supabase.from("schedule_entries").delete().eq("id", id);
    await loadSchedule();
  };

  // Toggle session log status
  const toggleLogStatus = async (log: SessionLog) => {
    const newStatus = log.status === "completed" ? "pending" : "completed";
    await supabase.from("daily_session_logs").update({
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    }).eq("id", log.id);
    await loadSessionLogs();
  };

  const dayLabel = `${selectedDay} ${MONTH_GENITIVE[currentMonth]}`;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex gap-4">
        {/* Calendar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-800 text-sm">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-[#4A90D9] text-white flex items-center justify-center hover:bg-[#3A7BC8] transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-[#4A90D9] text-white flex items-center justify-center hover:bg-[#3A7BC8] transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0 mb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="text-center py-1">
                <span className="text-[10px] text-gray-300">•</span>
              </div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = day === selectedDay;
              // Check if this day has schedule entries
              const dayDate = new Date(currentYear, currentMonth, day);
              const dow = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1;
              const hasEntries = scheduleEntries.some(e => e.day_of_week === dow);
              return (
                <button
                  key={day}
                  onClick={() => { setSelectedDay(day); setExpanded(true); }}
                  className={`text-center py-1 text-xs rounded-lg transition-colors relative ${
                    selected
                      ? "bg-[#FCD34D] text-gray-800 font-semibold"
                      : isTodayFn(day)
                      ? "text-[#4A90D9] font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {day}
                  {hasEntries && !selected && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#4A90D9]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily activities summary */}
        <div className="w-[140px] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-800 text-sm">{dayLabel}</span>
          </div>
          <div className="space-y-2.5">
            {activitySummary.map((cat) => (
              <div key={cat.key} className="flex items-center gap-2">
                <cat.icon size={16} style={{ color: cat.color }} />
                <span className="text-xs text-gray-700 flex-1 truncate">{cat.name}</span>
                <div className="flex items-center gap-0.5">
                  <CheckCircle2 size={12} className={cat.completed ? "text-green-500" : "text-gray-300"} />
                  <span className={`text-[10px] ${cat.completed ? "text-green-500 font-medium" : "text-gray-400"}`}>
                    {formatDuration(cat.totalDuration)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className={`text-[10px] mt-3 text-right ${goalMet ? "text-green-500" : "text-gray-400"}`}>
            {goalMet ? "Цель дня выполнена ✓" : "Цель дня не выполнена"}
          </p>
        </div>
      </div>

      {/* Expandable day details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 text-sm">
              Расписание на {dayLabel}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-[#4A90D9] hover:underline"
              >
                {editing ? "Готово" : "Изменить"}
              </button>
              <button onClick={() => { setExpanded(false); setEditing(false); }}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Existing entries */}
          {dayEntries.length === 0 && !editing ? (
            <p className="text-xs text-gray-400 py-2">Нет занятий на этот день</p>
          ) : (
            <div className="space-y-2">
              {dayEntries.map((entry) => {
                const actType = ACTIVITY_TYPES.find(a => a.key === entry.activity_type);
                const Icon = actType?.icon || BookOpen;
                const log = sessionLogs.find(l => l.activity_type === entry.activity_type);
                return (
                  <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${actType?.color}20` }}>
                      <Icon size={16} style={{ color: actType?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 block">{entry.activity_name}</span>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={10} />
                        <span>{entry.start_time.slice(0, 5)} – {entry.end_time.slice(0, 5)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log && (
                        <button onClick={() => toggleLogStatus(log)}>
                          <CheckCircle2 size={18} className={log.status === "completed" ? "text-green-500" : "text-gray-300"} />
                        </button>
                      )}
                      {log && (
                        <span className={`text-xs ${log.status === "completed" ? "text-green-500" : "text-gray-400"}`}>
                          {formatDuration(log.duration_seconds)}
                        </span>
                      )}
                      {!log && <span className="text-xs text-gray-300">—</span>}
                      {editing && (
                        <button onClick={() => deleteEntry(entry.id)} className="text-red-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new entry form */}
          {editing && (
            <div className="mt-3 flex items-end gap-2 flex-wrap">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Тип</label>
                <select
                  value={newEntryType}
                  onChange={(e) => setNewEntryType(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  {ACTIVITY_TYPES.map(a => (
                    <option key={a.key} value={a.key}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Начало</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Конец</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                />
              </div>
              <button
                onClick={addEntry}
                className="flex items-center gap-1 text-xs bg-[#4A90D9] text-white rounded-lg px-3 py-1.5 hover:bg-[#3A7BC8] transition-colors"
              >
                <Plus size={12} />
                Добавить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ChildProfile = ({ childId, childName, onBack }: ChildProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [customInterest, setCustomInterest] = useState("");
  const [profileData, setProfileData] = useState<ProfileData>({
    parentName: "",
    parentContact: "",
    childName: childName,
    childAge: "",
    notificationsEnabled: false,
    soundEnabled: false,
    confirmationEnabled: false,
    soundsEnabled: true,
    interfaceComplexity: "medium",
    schedule: DEFAULT_SCHEDULE,
    socialBehavior: "",
    engagement: "",
    selfRegulation: "",
    motorSkills: "",
    sensoryFeatures: [],
    interests: [],
    currentFocus: "",
  });

  useEffect(() => {
    loadProfileData();
  }, [childId]);

  const loadProfileData = async () => {
    try {
      const { data: child, error: childError } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .single();

      if (childError) throw childError;

      const { data: assessment } = await supabase
        .from("adaptive_assessments")
        .select("assessment_data")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
      const { data: sensorySettings } = await supabase
        .from("sensory_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      let parsedData: Partial<ProfileData> = {};
      if (assessment?.assessment_data) {
        const assessmentData = assessment.assessment_data as AssessmentData;
        if (assessmentData.responses) {
          assessmentData.responses.forEach((response) => {
            if (response.category === "social" || response.question?.includes("взаимодействует")) {
              parsedData.socialBehavior = response.answer;
            } else if (response.category === "engagement" || response.question?.includes("включается")) {
              parsedData.engagement = response.answer;
            } else if (response.category === "regulation" || response.question?.includes("ведет")) {
              parsedData.selfRegulation = response.answer;
            } else if (response.category === "motor" || response.question?.includes("использует")) {
              parsedData.motorSkills = response.answer;
            } else if (response.category === "focus" || response.question?.includes("важнее")) {
              parsedData.currentFocus = response.answer;
            }
          });
        }
      }

      setProfileData({
        ...profileData,
        childName: child.name,
        childAge: child.age?.toString() || "",
        soundsEnabled: sensorySettings?.sound_enabled ?? true,
        ...parsedData,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({
          name: profileData.childName,
          age: profileData.childAge ? parseInt(profileData.childAge) : null,
        })
        .eq("id", childId);

      if (error) throw error;
      toast.success("Профиль сохранён!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setProfileData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const toggleSensoryFeature = (feature: string) => {
    setProfileData((prev) => ({
      ...prev,
      sensoryFeatures: prev.sensoryFeatures.includes(feature)
        ? prev.sensoryFeatures.filter((f) => f !== feature)
        : [...prev.sensoryFeatures, feature],
    }));
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      setProfileData((prev) => ({
        ...prev,
        interests: [...prev.interests, customInterest.trim()],
      }));
      setCustomInterest("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8F4FC]">
      <div className="max-w-4xl mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Домой</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Профиль {profileData.childName}
        </h1>

        {/* Row 1: Parent Data & Settings */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Parent Data Card */}
          <div className="bg-white rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex">
              <div className="flex-1 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Данные родителя</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">ФИО</label>
                    <Input
                      value={profileData.parentName}
                      onChange={(e) => setProfileData({ ...profileData, parentName: e.target.value })}
                      placeholder="Введите ФИО"
                      className="mt-1 border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Контактные данные</label>
                    <Input
                      value={profileData.parentContact}
                      onChange={(e) => setProfileData({ ...profileData, parentContact: e.target.value })}
                      placeholder="Телефон или email"
                      className="mt-1 border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="w-[200px] flex-shrink-0">
                <img src={characterGlasses} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Занятия</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Получать уведомления о занятиях</span>
                <Switch
                  checked={profileData.notificationsEnabled}
                  onCheckedChange={(checked) => setProfileData({ ...profileData, notificationsEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Включить озвучку</span>
                <Switch
                  checked={profileData.soundEnabled}
                  onCheckedChange={(checked) => setProfileData({ ...profileData, soundEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Включить подтверждение ответа</span>
                <Switch
                  checked={profileData.confirmationEnabled}
                  onCheckedChange={(checked) => setProfileData({ ...profileData, confirmationEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Включить звуки</span>
                <Switch
                  checked={profileData.soundsEnabled}
                  onCheckedChange={(checked) => setProfileData({ ...profileData, soundsEnabled: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Student Data & Schedule */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Student Data Card */}
          <div className="bg-white rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex">
              <div className="flex-1 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Данные ученика</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">ФИО</label>
                    <Input
                      value={profileData.childName}
                      onChange={(e) => setProfileData({ ...profileData, childName: e.target.value })}
                      placeholder="Имя ребёнка"
                      className="mt-1 border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Возраст</label>
                    <Input
                      value={profileData.childAge}
                      onChange={(e) => setProfileData({ ...profileData, childAge: e.target.value })}
                      placeholder="Возраст"
                      type="number"
                      className="mt-1 border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="w-[200px] flex-shrink-0">
                <img src={characterKidWave} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Schedule Card - Calendar + Daily Activities */}
          <ScheduleCalendarCard childId={childId} userId={userId} />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Interface Complexity */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Уровень сложности интерфейса</h2>
          <div className="grid grid-cols-3 gap-4">
            {([
              { key: "simple" as const, label: "Простой", desc: "Подробнее о простом режиме" },
              { key: "medium" as const, label: "Средний", desc: "Подробнее о среднем режиме" },
              { key: "complex" as const, label: "Сложный", desc: "Подробнее о сложном режиме" },
            ]).map((level) => (
              <button
                key={level.key}
                onClick={() => setProfileData({ ...profileData, interfaceComplexity: level.key })}
                className={`rounded-2xl overflow-hidden text-left transition-all border-2 ${
                  profileData.interfaceComplexity === level.key
                    ? "border-[#4A90D9] shadow-md"
                    : "border-transparent shadow-sm"
                }`}
              >
                <div className="h-24 bg-[#E8F4FC] flex items-center justify-center overflow-hidden">
                  <img src={complexityIllustration} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white p-3">
                  <span className="text-sm font-medium text-gray-800 block">{level.label}</span>
                  <span className="text-xs text-[#4A90D9]">{level.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Assessment Categories Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Social Behavior */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Общение и социальное поведение</h3>
            <p className="text-xs text-gray-500 mb-3">Как ребенок взаимодействует с другими?</p>
            <div className="space-y-2">
              {SOCIAL_BEHAVIOR_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="socialBehavior"
                    checked={profileData.socialBehavior === option}
                    onChange={() => setProfileData({ ...profileData, socialBehavior: option })}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Engagement */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Вовлеченность и внимание</h3>
            <p className="text-xs text-gray-500 mb-3">Как ребенок обычно включается в задания?</p>
            <div className="space-y-2">
              {ENGAGEMENT_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="engagement"
                    checked={profileData.engagement === option}
                    onChange={() => setProfileData({ ...profileData, engagement: option })}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Self-Regulation */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Поведение и саморегуляция</h3>
            <p className="text-xs text-gray-500 mb-3">Как себя ведет ребенок?</p>
            <div className="space-y-2">
              {SELF_REGULATION_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="selfRegulation"
                    checked={profileData.selfRegulation === option}
                    onChange={() => setProfileData({ ...profileData, selfRegulation: option })}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Motor Skills */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Моторика</h3>
            <p className="text-xs text-gray-500 mb-3">Как ребенок использует руки</p>
            <div className="space-y-2">
              {MOTOR_SKILLS_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="motorSkills"
                    checked={profileData.motorSkills === option}
                    onChange={() => setProfileData({ ...profileData, motorSkills: option })}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sensory Features */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Сенсорные особенности</h3>
            <div className="space-y-2">
              {SENSORY_FEATURES_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileData.sensoryFeatures.includes(option)}
                    onChange={() => toggleSensoryFeature(option)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Интересы ребенка</h3>
            <p className="text-xs text-gray-500 mb-3">Что нравится ребенку?</p>
            <div className="space-y-2">
              {INTERESTS_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileData.interests.includes(option)}
                    onChange={() => toggleInterest(option)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={addCustomInterest}
                  className="text-primary text-sm hover:underline"
                >
                  + Добавить свой вариант
                </button>
              </div>
            </div>
          </div>

          {/* Current Focus - Full width */}
          <div className="bg-white rounded-2xl p-5 shadow-sm md:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-2">Текущий запрос</h3>
            <p className="text-xs text-gray-500 mb-3">Над чем сейчас важнее работать?</p>
            <div className="grid md:grid-cols-2 gap-2">
              {CURRENT_FOCUS_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currentFocus"
                    checked={profileData.currentFocus === option}
                    onChange={() => setProfileData({ ...profileData, currentFocus: option })}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-[#4A90D9] text-white rounded-full font-medium hover:bg-[#3A7BC8] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Сохранить"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
