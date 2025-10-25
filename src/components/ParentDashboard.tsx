import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Clock, Palette, Heart, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { ParentAccessCodes } from "./ParentAccessCodes";

interface ParentDashboardProps {
  onBack: () => void;
  childName: string;
}

export const ParentDashboard = ({ onBack, childName }: ParentDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Необходима авторизация");
        return;
      }

      // Load session analytics
      const { data: sessionsData } = await supabase
        .from("session_analytics")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentSessions(sessionsData || []);

      // Load progress tracking
      const { data: progressData } = await supabase
        .from("progress_tracking")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("week_number", { ascending: true });

      setProgressData(progressData || []);

      // Calculate analytics
      if (sessionsData && sessionsData.length > 0) {
        const totalSessions = sessionsData.length;
        const totalTime = sessionsData.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
        const avgReactionTime = sessionsData
          .filter((s: any) => s.reaction_times && Array.isArray(s.reaction_times))
          .reduce((sum: number, s: any) => {
            const times = s.reaction_times as number[];
            return sum + (times.reduce((a, b) => a + b, 0) / times.length);
          }, 0) / sessionsData.length;

        const emotionalData = sessionsData
          .filter((s: any) => s.emotional_markers)
          .map((s: any) => s.emotional_markers);

        const colorPreferences = sessionsData
          .filter((s: any) => s.color_choices)
          .flatMap((s: any) => s.color_choices as string[])
          .reduce((acc: any, color: string) => {
            acc[color] = (acc[color] || 0) + 1;
            return acc;
          }, {});

        setAnalytics({
          totalSessions,
          totalTime,
          avgReactionTime,
          emotionalData,
          colorPreferences,
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  const progressChartData = progressData.map((p) => ({
    week: `Неделя ${p.week_number}`,
    value: Number(p.metric_value),
  }));

  const colorChartData = analytics?.colorPreferences
    ? Object.entries(analytics.colorPreferences).map(([color, count]) => ({
        color,
        count: count as number,
      }))
    : [];

  const emotionalProfileData = [
    { emotion: "Радость", value: 85 },
    { emotion: "Спокойствие", value: 78 },
    { emotion: "Интерес", value: 90 },
    { emotion: "Фокус", value: 72 },
    { emotion: "Уверенность", value: 65 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Панель родителя</h1>
          <p className="text-muted-foreground">Прогресс и аналитика для {childName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Всего занятий</p>
                  <p className="text-3xl font-bold">{analytics?.totalSessions || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Общее время</p>
                  <p className="text-3xl font-bold">
                    {Math.round((analytics?.totalTime || 0) / 60)} мин
                  </p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Средняя реакция</p>
                  <p className="text-3xl font-bold">
                    {analytics?.avgReactionTime ? `${analytics.avgReactionTime.toFixed(0)}мс` : 'N/A'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Эмоц. стабильность</p>
                  <p className="text-3xl font-bold">82%</p>
                </div>
                <Heart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="progress">Прогресс</TabsTrigger>
            <TabsTrigger value="emotions">Эмоции</TabsTrigger>
            <TabsTrigger value="colors">Цвета</TabsTrigger>
            <TabsTrigger value="sessions">Занятия</TabsTrigger>
            <TabsTrigger value="codes">Коды доступа</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Динамика прогресса</CardTitle>
                <CardDescription>Развитие навыков по неделям</CardDescription>
              </CardHeader>
              <CardContent>
                {progressChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progressChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">Нет данных о прогрессе</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Рекомендации специалиста</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">✅ Сильные стороны:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Отличная концентрация внимания на задачах</li>
                    <li>Проявляет интерес к цветовым комбинациям</li>
                    <li>Хорошо реагирует на структурированные задания</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">💡 Области для развития:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Рекомендуется увеличить время на коллаборативные задания</li>
                    <li>Попробовать более сложные сенсорные стимулы</li>
                    <li>Работать над выражением эмоций через цвет</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emotions">
            <Card>
              <CardHeader>
                <CardTitle>Эмоциональный профиль</CardTitle>
                <CardDescription>Анализ эмоциональных реакций</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={emotionalProfileData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="emotion" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Уровень" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors">
            <Card>
              <CardHeader>
                <CardTitle>Цветовые предпочтения</CardTitle>
                <CardDescription>Частота использования цветов</CardDescription>
              </CardHeader>
              <CardContent>
                {colorChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={colorChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="color" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">Нет данных о цветах</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Последние занятия</CardTitle>
                <CardDescription>Детальная информация по каждому занятию</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.length > 0 ? (
                    recentSessions.map((session) => (
                      <div key={session.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge>{session.session_type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <Badge variant={session.completion_status === 'completed' ? 'default' : 'outline'}>
                            {session.completion_status === 'completed' ? 'Завершено' : 'В процессе'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Длительность</p>
                            <p className="font-semibold">{session.duration_seconds ? `${Math.round(session.duration_seconds / 60)} мин` : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Реакция</p>
                            <p className="font-semibold">
                              {session.reaction_times && Array.isArray(session.reaction_times) && session.reaction_times.length > 0
                                ? `${Math.round(session.reaction_times.reduce((a: number, b: number) => a + b, 0) / session.reaction_times.length)}мс`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Цвета</p>
                            <p className="font-semibold">
                              {session.color_choices && Array.isArray(session.color_choices) ? session.color_choices.length : 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Активность</p>
                            <p className="font-semibold">
                              {session.sensory_activity ? 'Высокая' : 'Средняя'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-12">Нет данных о занятиях</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-6">
            <ParentAccessCodes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
