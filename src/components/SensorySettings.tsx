import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Volume2, VolumeX, Eye, Sparkles, LogOut } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SensorySettingsProps {
  onBack: () => void;
}

interface Settings {
  visual_intensity: number;
  animation_speed: number;
  sound_enabled: boolean;
  quiet_mode: boolean;
  color_scheme: string;
  interface_complexity: string;
  hint_frequency: number;
}

export const SensorySettings = ({ onBack }: SensorySettingsProps) => {
  const [settings, setSettings] = useState<Settings>({
    visual_intensity: 50,
    animation_speed: 50,
    sound_enabled: true,
    quiet_mode: false,
    color_scheme: "default",
    interface_complexity: "medium",
    hint_frequency: 50,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("sensory_settings")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          visual_intensity: data.visual_intensity ?? 50,
          animation_speed: data.animation_speed ?? 50,
          sound_enabled: data.sound_enabled ?? true,
          quiet_mode: data.quiet_mode ?? false,
          color_scheme: data.color_scheme ?? "default",
          interface_complexity: data.interface_complexity ?? "medium",
          hint_frequency: data.hint_frequency ?? 50,
        });
      }
    } catch (error: any) {
      toast.error("Ошибка загрузки настроек");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase.from("sensory_settings").update({
        ...newSettings,
      }).eq("user_id", userData.user.id);

      document.documentElement.style.setProperty(
        "--animation-speed",
        `${newSettings.animation_speed / 50}s`
      );
      document.documentElement.style.setProperty(
        "--visual-opacity",
        `${newSettings.visual_intensity / 100}`
      );
    } catch (error: any) {
      toast.error("Ошибка сохранения");
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8F4FC] flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8F4FC] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base">Домой</span>
        </button>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {/* Visual Settings - takes 3 cols */}
          <div className="md:col-span-3 bg-white rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Eye className="text-[#4A90D9]" size={22} />
              <h2 className="text-lg font-semibold text-gray-800">Визуальные настройки</h2>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                Интенсивность визуальных эффектов: {settings.visual_intensity}%
              </Label>
              <Slider
                value={[settings.visual_intensity]}
                onValueChange={(v) => updateSetting("visual_intensity", v[0])}
                max={100}
                step={10}
              />
              <p className="text-xs text-gray-400">
                Низкое значение снижает яркость и контрастность
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                Скорость анимации: {settings.animation_speed}%
              </Label>
              <Slider
                value={[settings.animation_speed]}
                onValueChange={(v) => updateSetting("animation_speed", v[0])}
                max={100}
                step={10}
              />
              <p className="text-xs text-gray-400">
                Низкое значение делает движение меньше
              </p>
            </div>
          </div>

          {/* Audio Settings - takes 2 cols */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              {settings.sound_enabled ? (
                <Volume2 className="text-[#4A90D9]" size={22} />
              ) : (
                <VolumeX className="text-gray-400" size={22} />
              )}
              <h2 className="text-lg font-semibold text-gray-800">Звуковые настройки</h2>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-700">Включить звуки</Label>
              <Switch
                checked={settings.sound_enabled}
                onCheckedChange={(v) => updateSetting("sound_enabled", v)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-700">Тихий режим</Label>
                  <p className="text-xs text-gray-400">минимальные звуковые уведомления</p>
                </div>
                <Switch
                  checked={settings.quiet_mode}
                  onCheckedChange={(v) => updateSetting("quiet_mode", v)}
                />
              </div>
            </div>
          </div>

          {/* Interface Settings - takes 3 cols */}
          <div className="md:col-span-3 bg-white rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Sparkles className="text-[#4A90D9]" size={22} />
              <h2 className="text-lg font-semibold text-gray-800">Интерфейс подсказки</h2>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Сложность интерфейста</Label>
              <Select
                value={settings.interface_complexity}
                onValueChange={(v) => updateSetting("interface_complexity", v)}
              >
                <SelectTrigger className="bg-gray-100 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Простой</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="advanced">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Простой режим показывает только основные элементы
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                Частота подсказок: {settings.hint_frequency}%
              </Label>
              <Slider
                value={[settings.hint_frequency]}
                onValueChange={(v) => updateSetting("hint_frequency", v[0])}
                max={100}
                step={10}
              />
              <p className="text-xs text-gray-400">
                Как часто показывать подсказки и помощь
              </p>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 rounded-2xl h-12"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" /> Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
};
