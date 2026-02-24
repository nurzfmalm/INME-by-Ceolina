import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, CheckCircle, Circle, TrendingUp, TrendingDown,
  BookOpen, Loader2, ChevronLeft, ChevronRight, Plus, Trash2,
  Edit2, Save, X, GripVertical, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface LearningPathProps {
  onBack: () => void;
  childId?: string;
  childName?: string;
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

interface LearningPathData {
  id: string;
  current_week: number;
  total_weeks: number;
  path_data: any;
  completion_percentage: number;
}

export const LearningPath = ({ onBack, childId, childName }: LearningPathProps) => {
  const [path, setPath] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAdaptation, setShowAdaptation] = useState<'faster' | 'slower' | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Editing state
  const [editingActivity, setEditingActivity] = useState<string | null>(null); // "week-day"
  const [editForm, setEditForm] = useState<Partial<Activity>>({});
  const [addingActivity, setAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    title: "", description: "", type: "solo_drawing", difficulty: "easy", duration_minutes: 15,
    sensory_focus: [], emotional_goals: [],
  });

  useEffect(() => { loadLearningPath(); }, [childId]);

  const loadLearningPath = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        let query = supabase.from("learning_paths").select("*").eq("user_id", userData.user.id);
        if (childId) query = query.eq("child_id", childId);
        const { data, error } = await query.order("started_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        if (data) {
          setPath(data as any);
          setSelectedWeek(data.current_week || 1);
        } else {
          const localPath = localStorage.getItem('learningPath');
          if (localPath) {
            const p = JSON.parse(localPath);
            setPath({ id: p.id, current_week: 1, total_weeks: 6, path_data: p.path_data, completion_percentage: 0 });
          }
        }
      } else {
        const localPath = localStorage.getItem('learningPath');
        if (localPath) {
          const p = JSON.parse(localPath);
          setPath({ id: p.id, current_week: 1, total_weeks: 6, path_data: p.path_data, completion_percentage: 0 });
        }
      }
    } catch (error) {
      console.error("Error loading learning path:", error);
      toast.error("Ошибка загрузки программы");
    } finally {
      setLoading(false);
    }
  };

  const generateLearningPath = async () => {
    setGenerating(true);
    try {
      await supabase.auth.refreshSession();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { toast.error("Необходима авторизация"); return; }

      let assessmentData = {};
      if (childId) {
        const { data: assessment } = await supabase.from("adaptive_assessments")
          .select("assessment_data").eq("child_id", childId).eq("completed", true)
          .order("completed_at", { ascending: false }).limit(1).maybeSingle();
        if (assessment) assessmentData = assessment.assessment_data;
      }

      const { data, error } = await supabase.functions.invoke('generate-learning-path', {
        body: { userId: userData.user.id, childId, childName, assessmentData }
      });
      if (error) throw error;
      if (data?.learningPath) {
        setPath(data.learningPath);
        setSelectedWeek(1);
        toast.success("Программа терапии создана!");
      }
    } catch (error) {
      console.error("Error generating learning path:", error);
      toast.error("Ошибка создания программы");
    } finally {
      setGenerating(false);
    }
  };

  const savePath = async (updatedPathData: any, extraFields?: Record<string, any>) => {
    if (!path) return;
    const weeksData = updatedPathData.weeks || [];
    const totalActivities = weeksData.reduce((sum: number, w: Week) => sum + (w.activities?.length || 0), 0);
    const completedActivities = weeksData.reduce((sum: number, w: Week) => sum + (w.activities?.filter((a: Activity) => a.completed).length || 0), 0);
    const percentage = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    try {
      const { error } = await supabase.from("learning_paths").update({
        path_data: updatedPathData,
        completion_percentage: percentage,
        last_activity: new Date().toISOString(),
        ...extraFields,
      }).eq("id", path.id);
      if (error) throw error;
      setPath({ ...path, path_data: updatedPathData, completion_percentage: percentage, ...extraFields });
    } catch {
      toast.error("Ошибка сохранения");
    }
  };

  const updateProgress = async (weekNum: number, activityDay: number) => {
    if (!path?.path_data?.weeks) return;
    const updatedPathData = JSON.parse(JSON.stringify(path.path_data));
    const week = updatedPathData.weeks.find((w: Week) => w.week === weekNum);
    if (!week) return;
    const activity = week.activities.find((a: Activity) => a.day === activityDay);
    if (activity) activity.completed = !activity.completed;
    await savePath(updatedPathData);
    toast.success("Прогресс обновлён!");
  };

  const goToWeek = async (weekNum: number) => {
    if (!path) return;
    setSelectedWeek(weekNum);
    await savePath(path.path_data, { current_week: weekNum });
  };

  // ─── Editing functions ───
  const startEditActivity = (weekNum: number, day: number, activity: Activity) => {
    setEditingActivity(`${weekNum}-${day}`);
    setEditForm({ ...activity });
  };

  const saveEditActivity = async (weekNum: number, day: number) => {
    if (!path?.path_data?.weeks) return;
    const updatedPathData = JSON.parse(JSON.stringify(path.path_data));
    const week = updatedPathData.weeks.find((w: Week) => w.week === weekNum);
    if (!week) return;
    const idx = week.activities.findIndex((a: Activity) => a.day === day);
    if (idx >= 0) week.activities[idx] = { ...week.activities[idx], ...editForm };
    await savePath(updatedPathData);
    setEditingActivity(null);
    toast.success("Задание обновлено");
  };

  const deleteActivity = async (weekNum: number, day: number) => {
    if (!path?.path_data?.weeks) return;
    const updatedPathData = JSON.parse(JSON.stringify(path.path_data));
    const week = updatedPathData.weeks.find((w: Week) => w.week === weekNum);
    if (!week) return;
    week.activities = week.activities.filter((a: Activity) => a.day !== day);
    // Re-number days
    week.activities.forEach((a: Activity, i: number) => { a.day = i + 1; });
    await savePath(updatedPathData);
    toast.success("Задание удалено");
  };

  const addActivity = async (weekNum: number) => {
    if (!path?.path_data?.weeks || !newActivity.title) return;
    const updatedPathData = JSON.parse(JSON.stringify(path.path_data));
    const week = updatedPathData.weeks.find((w: Week) => w.week === weekNum);
    if (!week) return;
    const maxDay = week.activities.length > 0 ? Math.max(...week.activities.map((a: Activity) => a.day)) : 0;
    week.activities.push({
      day: maxDay + 1,
      title: newActivity.title || "Новое задание",
      type: newActivity.type || "solo_drawing",
      difficulty: newActivity.difficulty || "easy",
      description: newActivity.description || "",
      duration_minutes: newActivity.duration_minutes || 15,
      sensory_focus: newActivity.sensory_focus || [],
      emotional_goals: newActivity.emotional_goals || [],
      completed: false,
    });
    await savePath(updatedPathData);
    setAddingActivity(false);
    setNewActivity({ title: "", description: "", type: "solo_drawing", difficulty: "easy", duration_minutes: 15, sensory_focus: [], emotional_goals: [] });
    toast.success("Задание добавлено");
  };

  // ─── Week completion check ───
  const getWeekCompletion = (week: Week) => {
    if (!week.activities?.length) return 0;
    const done = week.activities.filter(a => a.completed).length;
    return Math.round((done / week.activities.length) * 100);
  };

  // ─── Render states ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка программы...</p>
        </div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
        <Button onClick={onBack} variant="ghost" className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Button>
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Программа для {childName || "ребёнка"} не найдена</h3>
            <p className="text-muted-foreground mb-4">Создайте персональную программу терапии</p>
            <Button onClick={generateLearningPath} disabled={generating}>
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Создание...</> : <><BookOpen className="w-4 h-4 mr-2" />Создать программу</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weeks: Week[] = path.path_data?.weeks || [];
  if (weeks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
        <Button onClick={onBack} variant="ghost" className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Button>
        <Card><CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Программа пуста. Пройдите диагностику заново.</p>
          <Button onClick={onBack} className="mt-4">Вернуться</Button>
        </CardContent></Card>
      </div>
    );
  }

  const currentWeek = weeks.find((w: Week) => w.week === selectedWeek) || weeks[0];
  const weekCompletion = getWeekCompletion(currentWeek);
  const isLastWeek = selectedWeek >= weeks.length;
  const canGoNext = weekCompletion >= 80; // Allow next week when 80%+ done

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Button>

        {/* Header with overall progress */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Программа терапии</CardTitle>
                <CardDescription>{childName ? `для ${childName} · ` : ''}Неделя {selectedWeek} из {weeks.length}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={generateLearningPath} disabled={generating}>
                <RefreshCw className={`w-4 h-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
                Пересоздать
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={path.completion_percentage} className="mb-2" />
            <p className="text-xs text-muted-foreground">Общий прогресс: {path.completion_percentage}%</p>
          </CardContent>
        </Card>

        {/* Week navigation tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2">
          {weeks.map((w: Week) => {
            const wc = getWeekCompletion(w);
            return (
              <button
                key={w.week}
                onClick={() => goToWeek(w.week)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  w.week === selectedWeek
                    ? 'bg-foreground text-white shadow-md'
                    : wc === 100
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="block text-xs">Неделя {w.week}</span>
                {wc > 0 && wc < 100 && <span className="block text-[10px] mt-0.5">{wc}%</span>}
                {wc === 100 && <CheckCircle className="w-3 h-3 mx-auto mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Current week content */}
        {currentWeek && (
          <>
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{currentWeek.theme}</CardTitle>
                  <Badge variant="outline">Неделя {currentWeek.week}</Badge>
                </div>
                {/* Week progress bar */}
                <div className="mt-2">
                  <Progress value={weekCompletion} className="h-2" />
                  <p className="text-[11px] text-muted-foreground mt-1">{weekCompletion}% выполнено</p>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {currentWeek.goals?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Цели недели:</h4>
                    <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
                      {currentWeek.goals.map((goal, idx) => <li key={idx}>{goal}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAdaptation(showAdaptation === 'faster' ? null : 'faster')}>
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />Быстрее
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAdaptation(showAdaptation === 'slower' ? null : 'slower')}>
                    <TrendingDown className="mr-1 h-3.5 w-3.5" />Медленнее
                  </Button>
                </div>

                {showAdaptation && currentWeek.adaptation_triggers && (
                  <Card className="bg-muted"><CardContent className="p-3">
                    <p className="text-sm">{showAdaptation === 'faster' ? currentWeek.adaptation_triggers.if_faster : currentWeek.adaptation_triggers.if_slower}</p>
                  </CardContent></Card>
                )}
              </CardContent>
            </Card>

            {/* Activities */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Активности</h3>
                <Button variant="outline" size="sm" onClick={() => setAddingActivity(!addingActivity)}>
                  <Plus className="w-4 h-4 mr-1" />Добавить
                </Button>
              </div>

              {/* Add activity form */}
              {addingActivity && (
                <Card className="border-dashed border-2 border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Новое задание</h4>
                    <Input
                      placeholder="Название задания"
                      value={newActivity.title || ""}
                      onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
                    />
                    <Input
                      placeholder="Описание"
                      value={newActivity.description || ""}
                      onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <select
                        className="flex-1 rounded-md border px-3 py-2 text-sm bg-background"
                        value={newActivity.type}
                        onChange={e => setNewActivity({ ...newActivity, type: e.target.value })}
                      >
                        <option value="solo_drawing">Свободный рисунок</option>
                        <option value="tracing">Обводка</option>
                        <option value="symmetry">Симметрия</option>
                        <option value="collaborative">Совместное</option>
                        <option value="sensory">Сенсорное</option>
                      </select>
                      <select
                        className="w-28 rounded-md border px-3 py-2 text-sm bg-background"
                        value={newActivity.difficulty}
                        onChange={e => setNewActivity({ ...newActivity, difficulty: e.target.value })}
                      >
                        <option value="easy">Легко</option>
                        <option value="medium">Средне</option>
                        <option value="hard">Сложно</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => addActivity(currentWeek.week)}>
                        <Save className="w-3.5 h-3.5 mr-1" />Добавить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingActivity(false)}>
                        <X className="w-3.5 h-3.5 mr-1" />Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentWeek.activities.map((activity) => {
                const isEditing = editingActivity === `${currentWeek.week}-${activity.day}`;

                if (isEditing) {
                  return (
                    <Card key={activity.day} className="border-primary">
                      <CardContent className="p-4 space-y-3">
                        <Input
                          value={editForm.title || ""}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="Название"
                        />
                        <Input
                          value={editForm.description || ""}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Описание"
                        />
                        <div className="flex gap-2">
                          <select
                            className="flex-1 rounded-md border px-3 py-2 text-sm bg-background"
                            value={editForm.type || "solo_drawing"}
                            onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                          >
                            <option value="solo_drawing">Свободный рисунок</option>
                            <option value="tracing">Обводка</option>
                            <option value="symmetry">Симметрия</option>
                            <option value="collaborative">Совместное</option>
                            <option value="sensory">Сенсорное</option>
                          </select>
                          <select
                            className="w-28 rounded-md border px-3 py-2 text-sm bg-background"
                            value={editForm.difficulty || "easy"}
                            onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}
                          >
                            <option value="easy">Легко</option>
                            <option value="medium">Средне</option>
                            <option value="hard">Сложно</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEditActivity(currentWeek.week, activity.day)}>
                            <Save className="w-3.5 h-3.5 mr-1" />Сохранить
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingActivity(null)}>
                            <X className="w-3.5 h-3.5 mr-1" />Отмена
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card key={activity.day} className={activity.completed ? "border-primary/50 bg-primary/5" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <button onClick={() => updateProgress(currentWeek.week, activity.day)} className="mt-1 transition-transform hover:scale-110">
                          {activity.completed ? <CheckCircle className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-sm font-semibold ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>
                              День {activity.day}: {activity.title}
                            </h4>
                            <Badge variant={activity.difficulty === 'easy' ? 'outline' : activity.difficulty === 'hard' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {activity.difficulty === 'easy' ? 'Легко' : activity.difficulty === 'hard' ? 'Сложно' : 'Средне'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{activity.description}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-[10px]">{activity.duration_minutes} мин</Badge>
                            {activity.type && <Badge variant="outline" className="text-[10px]">{
                              activity.type === 'solo_drawing' ? '🎨 Рисунок' :
                              activity.type === 'tracing' ? '✏️ Обводка' :
                              activity.type === 'symmetry' ? '🪞 Симметрия' :
                              activity.type === 'collaborative' ? '👥 Совместное' :
                              activity.type
                            }</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEditActivity(currentWeek.week, activity.day, activity)} className="p-1.5 rounded-lg hover:bg-muted transition">
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => deleteActivity(currentWeek.week, activity.day)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition">
                            <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {currentWeek.activities.length === 0 && (
                <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground text-sm">
                  Нет заданий. Добавьте новое задание.
                </CardContent></Card>
              )}
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                disabled={selectedWeek <= 1}
                onClick={() => goToWeek(selectedWeek - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />Предыдущая неделя
              </Button>

              {weekCompletion === 100 && !isLastWeek && (
                <div className="text-center">
                  <p className="text-xs text-primary font-medium mb-1">🎉 Неделя завершена!</p>
                </div>
              )}

              {isLastWeek && weekCompletion === 100 ? (
                <div className="text-center bg-primary/10 rounded-xl px-4 py-2">
                  <p className="text-sm font-semibold text-primary">🏆 Программа завершена!</p>
                </div>
              ) : (
                <Button
                  disabled={!canGoNext && selectedWeek >= (path.current_week || 1)}
                  onClick={() => goToWeek(selectedWeek + 1)}
                >
                  Следующая неделя<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </>
        )}

        {/* Focus areas */}
        {path.path_data?.overall_focus_areas?.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Области фокусировки</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {path.path_data.overall_focus_areas.map((area: string) => (
                  <Badge key={area} variant="outline" className="text-xs">{area}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parent recommendations */}
        {path.path_data?.parent_recommendations && (
          <Card className="mt-3">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Рекомендации</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{path.path_data.parent_recommendations}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
