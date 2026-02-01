import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import classroomBackground from "@/assets/classroom-background.png";
import characterFace from "@/assets/character-face.png";
import paintPalette from "@/assets/paint-palette.png";

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

interface ProfileData {
  parentName: string;
  parentContact: string;
  childName: string;
  childAge: string;
  // Settings
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  confirmationEnabled: boolean;
  soundsEnabled: boolean;
  // Assessment categories
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

export const ChildProfile = ({ childId, childName, onBack }: ChildProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      // Load child data
      const { data: child, error: childError } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .single();

      if (childError) throw childError;

      // Load assessment data if exists
      const { data: assessment } = await supabase
        .from("adaptive_assessments")
        .select("assessment_data")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Load sensory settings
      const { data: { user } } = await supabase.auth.getUser();
      const { data: sensorySettings } = await supabase
        .from("sensory_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      // Parse assessment responses into categories
      let parsedData: Partial<ProfileData> = {};
      if (assessment?.assessment_data) {
        const assessmentData = assessment.assessment_data as AssessmentData;
        if (assessmentData.responses) {
          assessmentData.responses.forEach((response) => {
            // Map responses to categories based on question content
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
      // Update child data
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
    <div className="min-h-screen bg-[#E8F4FC] relative overflow-hidden">
      {/* Background pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{ 
          backgroundImage: `url(${classroomBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="relative z-10 max-w-4xl mx-auto p-4 pb-8">
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

        {/* Top Section - Parent Data & Settings */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Parent Data Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between">
              <div className="flex-1">
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
              
              {/* Decorative illustration */}
              <div className="w-24 h-24 ml-4 flex-shrink-0">
                <img src={paintPalette} alt="" className="w-full h-full object-contain" />
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

        {/* Student Data Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-4">Данные ученика</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
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
            
            {/* Character illustration */}
            <div className="w-28 h-20 ml-4 flex-shrink-0">
              <img src={characterFace} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

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
              
              {/* Custom interest input */}
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
