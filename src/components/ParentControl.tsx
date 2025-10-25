import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Unlock, Shield, Clock, Bell, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ParentControlProps {
  onBack: () => void;
}

interface ControlSettings {
  pin_enabled: boolean;
  pin_code?: string;
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
  notifications: {
    session_complete: boolean;
    milestone_reached: boolean;
    time_limit_warning: boolean;
  };
}

export const ParentControl = ({ onBack }: ParentControlProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [settings, setSettings] = useState<ControlSettings>({
    pin_enabled: false,
    time_limits_enabled: false,
    content_restrictions: {
      collaborative_drawing: true,
      gallery_access: true,
      analytics_access: true,
    },
    quiet_hours: {
      enabled: false,
    },
    notifications: {
      session_complete: true,
      milestone_reached: true,
      time_limit_warning: true,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        // Load from localStorage for guest users
        const localSettings = localStorage.getItem('parentControl');
        if (localSettings) {
          setSettings(JSON.parse(localSettings));
        }
      } else {
        const { data, error } = await supabase
          .from("sensory_settings")
          .select("*")
          .eq("user_id", userData.user.id)
          .single();

        if (error) throw error;
        
        // Parse parent control settings from metadata
        const parentControl = (data as any).parent_control || settings;
        setSettings(parentControl);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        // Save to localStorage for guest users
        localStorage.setItem('parentControl', JSON.stringify(settings));
      } else {
        const { error } = await supabase
          .from("sensory_settings")
          .update({ parent_control: settings } as any)
          .eq("user_id", userData.user.id);

        if (error) throw error;
      }
      
      toast.success("Настройки сохранены!");
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePinSubmit = () => {
    if (settings.pin_enabled && pinInput === settings.pin_code) {
      setIsUnlocked(true);
      setPinInput("");
      toast.success("Доступ разрешён");
    } else if (!settings.pin_enabled) {
      setIsUnlocked(true);
    } else {
      toast.error("Неверный PIN-код");
      setPinInput("");
    }
  };

  const handleSetPin = (newPin: string) => {
    setSettings({
      ...settings,
      pin_code: newPin,
      pin_enabled: newPin.length >= 4,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (settings.pin_enabled && !isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div className="max-w-md mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Родительский контроль</CardTitle>
              <CardDescription>Введите PIN-код для доступа</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>PIN-код</Label>
                <Input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
                  placeholder="••••"
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <Button onClick={handlePinSubmit} className="w-full">
                Разблокировать
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={onBack} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Родительский контроль</h1>
          <p className="text-muted-foreground">
            Управление доступом и безопасностью приложения
          </p>
        </div>

        <Tabs defaultValue="security" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="security">Безопасность</TabsTrigger>
            <TabsTrigger value="time">Время</TabsTrigger>
            <TabsTrigger value="content">Контент</TabsTrigger>
            <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  PIN-код защита
                </CardTitle>
                <CardDescription>
                  Защитите родительские настройки PIN-кодом
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Включить PIN-код</Label>
                    <p className="text-sm text-muted-foreground">
                      Требовать PIN для доступа к настройкам
                    </p>
                  </div>
                  <Switch
                    checked={settings.pin_enabled}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        setSettings({ ...settings, pin_enabled: false, pin_code: undefined });
                      }
                    }}
                  />
                </div>

                {settings.pin_enabled && (
                  <div>
                    <Label>Установить новый PIN-код (4-6 цифр)</Label>
                    <Input
                      type="password"
                      maxLength={6}
                      placeholder="••••"
                      onChange={(e) => handleSetPin(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Ограничения по времени
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Включить ограничения</Label>
                    <p className="text-sm text-muted-foreground">
                      Контроль времени использования
                    </p>
                  </div>
                  <Switch
                    checked={settings.time_limits_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, time_limits_enabled: checked })
                    }
                  />
                </div>

                {settings.time_limits_enabled && (
                  <>
                    <div>
                      <Label>Дневной лимит (минут)</Label>
                      <Input
                        type="number"
                        value={settings.daily_limit_minutes || 60}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            daily_limit_minutes: parseInt(e.target.value),
                          })
                        }
                        className="max-w-xs"
                      />
                    </div>

                    <div>
                      <Label>Лимит на сессию (минут)</Label>
                      <Input
                        type="number"
                        value={settings.session_limit_minutes || 30}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            session_limit_minutes: parseInt(e.target.value),
                          })
                        }
                        className="max-w-xs"
                      />
                    </div>

                    <div>
                      <Label>Напоминание о перерыве (минут)</Label>
                      <Input
                        type="number"
                        value={settings.break_reminder_minutes || 15}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            break_reminder_minutes: parseInt(e.target.value),
                          })
                        }
                        className="max-w-xs"
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label>Тихие часы</Label>
                      <p className="text-sm text-muted-foreground">
                        Отключение уведомлений в определённое время
                      </p>
                    </div>
                    <Switch
                      checked={settings.quiet_hours.enabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          quiet_hours: { ...settings.quiet_hours, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {settings.quiet_hours.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Начало</Label>
                        <Input
                          type="time"
                          value={settings.quiet_hours.start_time || "20:00"}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              quiet_hours: {
                                ...settings.quiet_hours,
                                start_time: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Конец</Label>
                        <Input
                          type="time"
                          value={settings.quiet_hours.end_time || "08:00"}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              quiet_hours: {
                                ...settings.quiet_hours,
                                end_time: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Ограничения контента
                </CardTitle>
                <CardDescription>
                  Управление доступом к функциям приложения
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Совместное рисование</Label>
                    <p className="text-sm text-muted-foreground">
                      Разрешить рисовать с другими пользователями
                    </p>
                  </div>
                  <Switch
                    checked={settings.content_restrictions.collaborative_drawing}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        content_restrictions: {
                          ...settings.content_restrictions,
                          collaborative_drawing: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Доступ к галерее</Label>
                    <p className="text-sm text-muted-foreground">
                      Просмотр сохранённых работ
                    </p>
                  </div>
                  <Switch
                    checked={settings.content_restrictions.gallery_access}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        content_restrictions: {
                          ...settings.content_restrictions,
                          gallery_access: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Доступ к аналитике</Label>
                    <p className="text-sm text-muted-foreground">
                      Просмотр прогресса и статистики
                    </p>
                  </div>
                  <Switch
                    checked={settings.content_restrictions.analytics_access}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        content_restrictions: {
                          ...settings.content_restrictions,
                          analytics_access: checked,
                        },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Уведомления родителям
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Завершение сессии</Label>
                    <p className="text-sm text-muted-foreground">
                      Уведомление после каждого занятия
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.session_complete}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          session_complete: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Достижение вехи</Label>
                    <p className="text-sm text-muted-foreground">
                      Уведомление о важных достижениях
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.milestone_reached}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          milestone_reached: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Предупреждение о лимите</Label>
                    <p className="text-sm text-muted-foreground">
                      За 5 минут до исчерпания времени
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.time_limit_warning}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          time_limit_warning: checked,
                        },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
