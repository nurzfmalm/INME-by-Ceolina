import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Target, CheckCircle2, Star, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { FloatingAssistant } from "./FloatingAssistant";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TasksProps {
  onBack: () => void;
  onStartTask: (taskId: string, prompt: string) => void;
  childName: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  prompt: string;
  difficulty: string;
  tokens_reward: number; // Changed from emotion_tokens_reward
  category: string | null;
}

interface CompletedTask {
  task_id: string;
  completed_at: string;
}

const DIFFICULTY_COLORS = {
  easy: "bg-green-500",
  medium: "bg-yellow-500",
  hard: "bg-red-500",
};

const DIFFICULTY_LABELS = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

export const Tasks = ({ onBack, onStartTask, childName }: TasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [totalTokens, setTotalTokens] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    loadCompletedTasks();
    loadTokens();
  }, []);

  const loadTasks = async () => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        // Demo mode: use hardcoded tasks
        setTasks([
          {
            id: "1",
            title: "Нарисуй радость",
            description: "Создай рисунок, который показывает, что делает тебя счастливым",
            prompt: "Нарисуй что-то, что делает тебя счастливым",
            difficulty: "easy",
            tokens_reward: 10,
            category: "emotions",
          },
          {
            id: "2",
            title: "Помоги Ceolina найти друга",
            description: "Нарисуй друга для персонажа Ceolina",
            prompt: "Нарисуй друга для Ceolina",
            difficulty: "easy",
            tokens_reward: 10,
            category: "social",
          },
          {
            id: "3",
            title: "Мой спокойный день",
            description: "Изобрази место или момент, где ты чувствуешь себя спокойно",
            prompt: "Нарисуй место, где ты чувствуешь спокойствие",
            difficulty: "medium",
            tokens_reward: 15,
            category: "emotions",
          },
          {
            id: "4",
            title: "Семейный портрет",
            description: "Нарисуй свою семью или близких людей",
            prompt: "Нарисуй свою семью",
            difficulty: "medium",
            tokens_reward: 15,
            category: "social",
          },
          {
            id: "5",
            title: "Сад эмоций",
            description: "Создай сад, где каждый цветок - это разная эмоция",
            prompt: "Нарисуй сад с цветами разных эмоций",
            difficulty: "hard",
            tokens_reward: 20,
            category: "emotions",
          },
        ]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("art_tasks")
        .select("*")
        .order("difficulty");

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Ошибка при загрузке заданий");
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedTasks = async () => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        const stored = localStorage.getItem("ceolinaCompletedTasks");
        if (stored) {
          setCompletedTasks(new Set(JSON.parse(stored)));
        }
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("user_tasks")
        .select("task_id, completed_at")
        .eq("user_id", userId);

      if (error) throw error;

      const completed = new Set(data?.map((t) => t.task_id) || []);
      setCompletedTasks(completed);
    } catch (error) {
      console.error("Error loading completed tasks:", error);
    }
  };

  const loadTokens = async () => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        const stored = localStorage.getItem("ceolinaTokens");
        setTotalTokens(stored ? parseInt(stored) : 0);
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("emotion_tokens")
        .select("amount")
        .eq("user_id", userId);

      if (error) throw error;

      const total = data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      setTotalTokens(total);
    } catch (error) {
      console.error("Error loading tokens:", error);
    }
  };

  const handleStartTask = (task: Task) => {
    onStartTask(task.id, task.prompt);
  };

  const availableTasks = tasks.filter((t) => !completedTasks.has(t.id));
  const completedTasksList = tasks.filter((t) => completedTasks.has(t.id));

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-soft border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft size={24} />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-creative rounded-full flex items-center justify-center">
                  <Target className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Задания</h1>
                  <p className="text-sm text-muted-foreground">
                    Выполняй задания и получай токены, {childName}
                  </p>
                </div>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 bg-gradient-warm px-4 py-2 rounded-full cursor-help">
                    <Star className="text-white" size={20} />
                    <span className="font-bold text-white">{totalTokens}</span>
                    <span className="text-xs text-white/80">токенов</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">⭐ Токены награды</p>
                  <p className="text-sm">Зарабатывай токены, выполняя задания и создавая рисунки. Обменивай их на новые кисти, фоны и цвета в магазине наград!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Available Tasks */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Доступные задания</h2>
          {availableTasks.length === 0 ? (
            <Card className="p-8 text-center border-0 bg-card">
              <CheckCircle2 className="mx-auto mb-4 text-success" size={48} />
              <p className="text-lg font-semibold mb-2">Все задания выполнены!</p>
              <p className="text-muted-foreground">
                Поздравляем! Скоро появятся новые задания.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableTasks.map((task) => (
                <Card
                  key={task.id}
                  className="p-6 border-0 bg-card hover:shadow-float transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={DIFFICULTY_COLORS[task.difficulty]}>
                      {DIFFICULTY_LABELS[task.difficulty]}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <Star size={16} />
                      +{task.tokens_reward}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{task.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {task.description}
                  </p>
                  <Button
                    onClick={() => handleStartTask(task)}
                    className="w-full"
                    variant="default"
                  >
                    Начать задание
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Completed Tasks */}
        {completedTasksList.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Выполненные задания</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTasksList.map((task) => (
                <Card
                  key={task.id}
                  className="p-6 border-0 bg-card opacity-70"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="text-success" size={24} />
                    <span className="text-sm font-semibold text-success">
                      Выполнено
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
      
      <FloatingAssistant contextType="task" />
    </div>
  );
};
