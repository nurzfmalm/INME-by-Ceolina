import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Volume2, VolumeX, Eye, Sparkles } from "lucide-react";
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
  const [saving, setSaving] = useState(false);

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
          visual_intensity: data.visual_intensity,
          animation_speed: data.animation_speed,
          sound_enabled: data.sound_enabled,
          quiet_mode: data.quiet_mode,
          color_scheme: data.color_scheme,
          interface_complexity: data.interface_complexity,
          hint_frequency: data.hint_frequency,
        });
      }
    } catch (error: any) {
      toast.error("Ошибка загрузки настроек");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Не авторизован");

      const { error } = await supabase.from("sensory_settings").upsert(
        {
          user_id: userData.user.id,
          ...settings,
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      toast.success("Настройки сохранены!");

      // Apply settings to document
      document.documentElement.style.setProperty(
        "--animation-speed",
        `${settings.animation_speed / 50}s`
      );
      document.documentElement.style.setProperty(
        "--visual-opacity",
        `${settings.visual_intensity / 100}`
      );
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2" /> Назад
          </Button>
          <h1 className="text-2xl font-bold">Настройки сенсорики</h1>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2" /> Сохранить
          </Button>
        </div>

        {/* Visual Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Eye className="text-primary" size={24} />
            <h2 className="text-xl font-semibold">Визуальные настройки</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Интенсивность визуальных эффектов: {settings.visual_intensity}%</Label>
              <Slider
                value={[settings.visual_intensity]}
                onValueChange={(value) =>
                  setSettings({ ...settings, visual_intensity: value[0] })
                }
                max={100}
                step={10}
              />
              <p className="text-sm text-muted-foreground">
                Более низкое значение снижает яркость и контрастность
              </p>
            </div>

            <div className="space-y-2">
              <Label>Скорость анимации: {settings.animation_speed}%</Label>
              <Slider
                value={[settings.animation_speed]}
                onValueChange={(value) => setSettings({ ...settings, animation_speed: value[0] })}
                max={100}
                step={10}
              />
              <p className="text-sm text-muted-foreground">
                Более низкое значение делает движения медленнее
              </p>
            </div>

            <div className="space-y-2">
              <Label>Цветовая схема</Label>
              <Select
                value={settings.color_scheme}
                onValueChange={(value) => setSettings({ ...settings, color_scheme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">По умолчанию</SelectItem>
                  <SelectItem value="pastel">Пастельные тона</SelectItem>
                  <SelectItem value="high-contrast">Высокий контраст</SelectItem>
                  <SelectItem value="warm">Тёплые цвета</SelectItem>
                  <SelectItem value="cool">Холодные цвета</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Audio Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            {settings.sound_enabled ? (
              <Volume2 className="text-primary" size={24} />
            ) : (
              <VolumeX className="text-muted-foreground" size={24} />
            )}
            <h2 className="text-xl font-semibold">Звуковые настройки</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound_enabled">Включить звуки</Label>
              <Switch
                id="sound_enabled"
                checked={settings.sound_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, sound_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="quiet_mode">Тихий режим</Label>
                <p className="text-sm text-muted-foreground">
                  Минимальные звуковые уведомления
                </p>
              </div>
              <Switch
                id="quiet_mode"
                checked={settings.quiet_mode}
                onCheckedChange={(checked) => setSettings({ ...settings, quiet_mode: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Interface Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary" size={24} />
            <h2 className="text-xl font-semibold">Интерфейс и подсказки</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сложность интерфейса</Label>
              <Select
                value={settings.interface_complexity}
                onValueChange={(value) =>
                  setSettings({ ...settings, interface_complexity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Простой</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="advanced">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Простой режим показывает только основные элементы
              </p>
            </div>

            <div className="space-y-2">
              <Label>Частота подсказок: {settings.hint_frequency}%</Label>
              <Slider
                value={[settings.hint_frequency]}
                onValueChange={(value) => setSettings({ ...settings, hint_frequency: value[0] })}
                max={100}
                step={10}
              />
              <p className="text-sm text-muted-foreground">
                Как часто показывать подсказки и помощь
              </p>
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-6 bg-gradient-calm">
          <h3 className="font-semibold mb-4">Предпросмотр</h3>
          <div
            className="space-y-4"
            style={{
              opacity: settings.visual_intensity / 100,
              animationDuration: `${settings.animation_speed / 50}s`,
            }}
          >
            <div className="h-20 bg-primary/20 rounded-lg animate-pulse" />
            <div className="h-20 bg-secondary/20 rounded-lg animate-pulse" />
          </div>
        </Card>
      </div>
    </div>
  );
};
