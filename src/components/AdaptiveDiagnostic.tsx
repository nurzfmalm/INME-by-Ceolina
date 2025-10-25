import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import ceolinaCharacter from "@/assets/ceolina-character.png";

interface AdaptiveDiagnosticProps {
  onComplete: (assessmentId: string) => void;
  onBack: () => void;
}

interface Question {
  id: string;
  category: string;
  question: string;
  type: "scale" | "choice" | "multiChoice";
  options?: string[];
  adaptNext?: (answer: any) => string | null;
}

const questions: Question[] = [
  {
    id: "communication_level",
    category: "Коммуникация",
    question: "Насколько легко ребёнок общается с другими?",
    type: "scale",
    adaptNext: (answer) => (answer < 30 ? "communication_barriers" : "social_interaction"),
  },
  {
    id: "communication_barriers",
    category: "Коммуникация",
    question: "Что затрудняет общение?",
    type: "multiChoice",
    options: ["Говорит мало слов", "Трудно начать разговор", "Не смотрит в глаза", "Другое"],
  },
  {
    id: "social_interaction",
    category: "Социализация",
    question: "Насколько комфортно ребёнку с другими детьми?",
    type: "scale",
  },
  {
    id: "emotional_regulation",
    category: "Эмоции",
    question: "Как часто возникают эмоциональные вспышки?",
    type: "scale",
    adaptNext: (answer) => (answer > 70 ? "triggers" : "sensory_sensitivity"),
  },
  {
    id: "triggers",
    category: "Эмоции",
    question: "Что чаще всего вызывает эмоциональную реакцию?",
    type: "multiChoice",
    options: ["Громкие звуки", "Яркий свет", "Изменение планов", "Толпа людей", "Другое"],
  },
  {
    id: "sensory_sensitivity",
    category: "Сенсорика",
    question: "Насколько чувствителен ребёнок к сенсорным раздражителям?",
    type: "scale",
  },
  {
    id: "focus_attention",
    category: "Внимание",
    question: "Как долго ребёнок может концентрироваться на задании?",
    type: "choice",
    options: ["Меньше 5 минут", "5-10 минут", "10-20 минут", "Больше 20 минут"],
  },
  {
    id: "interests",
    category: "Интересы",
    question: "Какие виды активности интересуют ребёнка больше всего?",
    type: "multiChoice",
    options: ["Рисование", "Музыка", "Движение", "Конструирование", "Ролевые игры"],
  },
  {
    id: "routine_flexibility",
    category: "Поведение",
    question: "Насколько гибко ребёнок относится к изменениям в распорядке?",
    type: "scale",
  },
  {
    id: "goals",
    category: "Цели",
    question: "Что бы вы хотели улучшить в первую очередь?",
    type: "multiChoice",
    options: [
      "Коммуникативные навыки",
      "Управление эмоциями",
      "Социальное взаимодействие",
      "Концентрацию внимания",
      "Снижение тревожности",
    ],
  },
];

export const AdaptiveDiagnostic = ({ onComplete, onBack }: AdaptiveDiagnosticProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>(["communication_level"]);
  const [loading, setLoading] = useState(false);

  const currentQuestion = questions.find((q) => q.id === visitedQuestions[currentStep]);
  const progress = ((currentStep + 1) / visitedQuestions.length) * 100;

  const handleAnswer = (value: any) => {
    if (!currentQuestion) return;
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (!currentQuestion || answers[currentQuestion.id] === undefined) {
      toast.error("Пожалуйста, ответьте на вопрос");
      return;
    }

    // Adaptive logic: determine next question
    if (currentQuestion.adaptNext) {
      const nextQuestionId = currentQuestion.adaptNext(answers[currentQuestion.id]);
      if (nextQuestionId && !visitedQuestions.includes(nextQuestionId)) {
        setVisitedQuestions([...visitedQuestions, nextQuestionId]);
      }
    } else {
      // Find next unvisited question
      const nextUnvisited = questions.find((q) => !visitedQuestions.includes(q.id));
      if (nextUnvisited) {
        setVisitedQuestions([...visitedQuestions, nextUnvisited.id]);
      }
    }

    if (currentStep < visitedQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (visitedQuestions.length < questions.length) {
      setCurrentStep(visitedQuestions.length);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("adaptive_assessments")
        .insert({
          user_id: userData.user.id,
          assessment_data: answers,
          completed: true,
          current_step: visitedQuestions.length,
          total_steps: visitedQuestions.length,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Диагностика завершена!");
      onComplete(data.id);
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2" /> Назад
          </Button>
          <div className="text-sm text-muted-foreground">
            Шаг {currentStep + 1} из {visitedQuestions.length}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">{Math.round(progress)}%</p>
        </div>

        {/* Question Card */}
        <Card className="p-8 space-y-6 bg-gradient-calm border-0 shadow-float">
          <div className="flex items-start gap-4">
            <img
              src={ceolinaCharacter}
              alt="Ceolina"
              className="w-20 h-20 animate-gentle-float"
            />
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-primary mb-2">{currentQuestion.category}</p>
                <h2 className="text-2xl font-bold">{currentQuestion.question}</h2>
              </div>

              {/* Scale Input */}
              {currentQuestion.type === "scale" && (
                <div className="space-y-4 pt-4">
                  <Slider
                    value={[answers[currentQuestion.id] || 50]}
                    onValueChange={(value) => handleAnswer(value[0])}
                    max={100}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Минимально</span>
                    <span className="font-semibold text-primary">
                      {answers[currentQuestion.id] || 50}
                    </span>
                    <span>Максимально</span>
                  </div>
                </div>
              )}

              {/* Choice Input */}
              {currentQuestion.type === "choice" && (
                <div className="space-y-2 pt-4">
                  {currentQuestion.options?.map((option, index) => (
                    <Button
                      key={index}
                      variant={answers[currentQuestion.id] === option ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleAnswer(option)}
                    >
                      {answers[currentQuestion.id] === option && (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      {option}
                    </Button>
                  ))}
                </div>
              )}

              {/* Multi Choice Input */}
              {currentQuestion.type === "multiChoice" && (
                <div className="space-y-2 pt-4">
                  {currentQuestion.options?.map((option, index) => {
                    const selected = answers[currentQuestion.id] || [];
                    const isSelected = selected.includes(option);
                    return (
                      <Button
                        key={index}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => {
                          const newSelected = isSelected
                            ? selected.filter((s: string) => s !== option)
                            : [...selected, option];
                          handleAnswer(newSelected);
                        }}
                      >
                        {isSelected && <CheckCircle className="mr-2 h-4 w-4" />}
                        {option}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ArrowLeft className="mr-2" /> Назад
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {currentStep === visitedQuestions.length - 1 && visitedQuestions.length >= 5
              ? "Завершить"
              : "Далее"}{" "}
            <ArrowRight className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
