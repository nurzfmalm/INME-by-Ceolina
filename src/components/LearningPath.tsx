import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Circle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface LearningPathProps {
  onBack: () => void;
}

interface Activity {
  day: number;
  title: string;
  type: string;
  difficulty: string;
  description: string;
  duration_minutes: number;
  sensory_focus: string[];
  emotional_goals: string[];
  completed?: boolean;
}

interface Week {
  week: number;
  theme: string;
  goals: string[];
  activities: Activity[];
  adaptation_triggers: {
    if_faster: string;
    if_slower: string;
  };
}

interface PathData {
  weeks: Week[];
  overall_focus_areas: string[];
  parent_recommendations: string;
}

interface LearningPath {
  id: string;
  current_week: number;
  total_weeks: number;
  path_data: any;
  completion_percentage: number;
}

export const LearningPath = ({ onBack }: LearningPathProps) => {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdaptation, setShowAdaptation] = useState<'faster' | 'slower' | null>(null);

  useEffect(() => {
    loadLearningPath();
  }, []);

  const loadLearningPath = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData.user) {
        // Load from database for authenticated users
        const { data, error } = await supabase
          .from("learning_paths")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setPath(data as any);
      } else {
        // Load from localStorage for guest users
        const localPath = localStorage.getItem('learningPath');
        if (localPath) {
          const parsedPath = JSON.parse(localPath);
          setPath({
            id: parsedPath.id,
            current_week: 1,
            total_weeks: 6,
            path_data: parsedPath.path_data,
            completion_percentage: 0,
          });
        } else {
          throw new Error("Программа не найдена");
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Ошибка загрузки программы");
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (weekNum: number, activityDay: number) => {
    if (!path) return;

    const updatedPathData = { ...path.path_data };
    const week = updatedPathData.weeks.find((w) => w.week === weekNum);
    if (week) {
      const activity = week.activities.find((a) => a.day === activityDay);
      if (activity) {
        activity.completed = !activity.completed;
      }
    }

    const totalActivities = updatedPathData.weeks.reduce(
      (sum, w) => sum + w.activities.length,
      0
    );
    const completedActivities = updatedPathData.weeks.reduce(
      (sum, w) => sum + w.activities.filter((a) => a.completed).length,
      0
    );
    const percentage = Math.round((completedActivities / totalActivities) * 100);

    try {
      const { error } = await supabase
        .from("learning_paths")
        .update({
          path_data: updatedPathData,
          completion_percentage: percentage,
          last_activity: new Date().toISOString(),
        })
        .eq("id", path.id);

      if (error) throw error;

      setPath({
        ...path,
        path_data: updatedPathData,
        completion_percentage: percentage,
      });

      toast.success("Прогресс обновлён!");
    } catch (error: any) {
      toast.error("Ошибка обновления");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка программы...</p>
        </div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Программа обучения не найдена</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWeek = path.path_data.weeks.find((w) => w.week === path.current_week);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="max-w-4xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Персональная программа обучения</CardTitle>
            <CardDescription>
              Неделя {path.current_week} из {path.total_weeks}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={path.completion_percentage} className="mb-4" />
            <p className="text-sm text-muted-foreground">
              Прогресс: {path.completion_percentage}%
            </p>
          </CardContent>
        </Card>

        {currentWeek && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{currentWeek.theme}</span>
                  <Badge variant="outline">Неделя {currentWeek.week}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Цели недели:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {currentWeek.goals.map((goal, idx) => (
                        <li key={idx}>{goal}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdaptation(showAdaptation === 'faster' ? null : 'faster')}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Справляется быстрее
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdaptation(showAdaptation === 'slower' ? null : 'slower')}
                    >
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Нужно больше времени
                    </Button>
                  </div>

                  {showAdaptation && (
                    <Card className="bg-muted">
                      <CardContent className="p-4">
                        <p className="text-sm">
                          {showAdaptation === 'faster'
                            ? currentWeek.adaptation_triggers.if_faster
                            : currentWeek.adaptation_triggers.if_slower}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Активности</h3>
              {currentWeek.activities.map((activity) => (
                <Card key={activity.day} className={activity.completed ? "border-primary" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => updateProgress(currentWeek.week, activity.day)}
                        className="mt-1 transition-transform hover:scale-110"
                      >
                        {activity.completed ? (
                          <CheckCircle className="h-6 w-6 text-primary" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">День {activity.day}: {activity.title}</h4>
                          <Badge variant={activity.difficulty === 'easy' ? 'outline' : activity.difficulty === 'hard' ? 'destructive' : 'secondary'}>
                            {activity.difficulty === 'easy' ? 'Легко' : activity.difficulty === 'hard' ? 'Сложно' : 'Средне'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{activity.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">{activity.duration_minutes} мин</Badge>
                          {activity.sensory_focus.map((focus) => (
                            <Badge key={focus} variant="outline">{focus}</Badge>
                          ))}
                          {activity.emotional_goals.map((goal) => (
                            <Badge key={goal}>{goal}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Области фокусировки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {path.path_data.overall_focus_areas.map((area) => (
                <Badge key={area} variant="outline">{area}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
