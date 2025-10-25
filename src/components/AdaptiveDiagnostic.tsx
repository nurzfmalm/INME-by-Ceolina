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

// Ровно 7 диагностических вопросов для полной оценки
const questions: Question[] = [
  {
    id: "q1_communication",
    category: "Коммуникация",
    question: "Как ребёнок общается со сверстниками и взрослыми?",
    type: "choice",
    options: [
      "Легко начинает диалог, поддерживает беседу",
      "Общается при помощи взрослого",
      "Отвечает односложно, избегает разговора",
      "Не вступает в диалог, молчит"
    ],
  },
  {
    id: "q2_emotions",
    category: "Эмоции",
    question: "Как ребёнок выражает свои эмоции и чувства?",
    type: "choice",
    options: [
      "Называет эмоции словами, объясняет причины",
      "Показывает мимикой и жестами",
      "Выражает через крик, плач, агрессию",
      "Подавляет эмоции, замыкается"
    ],
  },
  {
    id: "q3_sensory",
    category: "Сенсорика",
    question: "Как ребёнок реагирует на громкие звуки, яркий свет, прикосновения?",
    type: "scale",
  },
  {
    id: "q4_routine",
    category: "Поведение",
    question: "Как ребёнок реагирует на изменения в привычном распорядке?",
    type: "choice",
    options: [
      "Спокойно адаптируется к новому",
      "Нужна подготовка и объяснение",
      "Выражает беспокойство, но справляется",
      "Сильный стресс, истерики"
    ],
  },
  {
    id: "q5_social",
    category: "Социализация",
    question: "Как ребёнок ведёт себя в группе детей?",
    type: "choice",
    options: [
      "Активно играет с другими, инициирует игры",
      "Играет рядом, но отдельно",
      "Наблюдает со стороны",
      "Избегает других детей, уходит"
    ],
  },
  {
    id: "q6_attention",
    category: "Внимание",
    question: "Как долго ребёнок может удерживать внимание на интересном занятии?",
    type: "choice",
    options: [
      "Более 20 минут, увлечённо",
      "10-20 минут с небольшими перерывами",
      "5-10 минут, часто отвлекается",
      "Менее 5 минут, сразу переключается"
    ],
  },
  {
    id: "q7_interests",
    category: "Интересы",
    question: "Какие активности больше всего увлекают ребёнка? (выберите несколько)",
    type: "multiChoice",
    options: [
      "Рисование и творчество",
      "Музыка и звуки",
      "Движение и танцы",
      "Конструирование",
      "Ролевые игры и фантазии",
      "Сенсорные игры (песок, вода)",
      "Книги и истории"
    ],
  },
];

export const AdaptiveDiagnostic = ({ onComplete, onBack }: AdaptiveDiagnosticProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const totalQuestions = questions.length;

  const handleAnswer = (value: any) => {
    if (!currentQuestion) return;
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (!currentQuestion || answers[currentQuestion.id] === undefined) {
      toast.error("Пожалуйста, ответьте на вопрос");
      return;
    }

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
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
          current_step: questions.length,
          total_steps: questions.length,
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
          <Button variant="ghost" onClick={onBack} disabled={currentStep === 0}>
            <ArrowLeft className="mr-2" /> Назад к регистрации
          </Button>
          <div className="text-sm font-medium text-primary">
            Вопрос {currentStep + 1} из {totalQuestions}
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
        <div className="flex justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={handleBack} 
            disabled={currentStep === 0}
            size="lg"
            className="flex-1"
          >
            <ArrowLeft className="mr-2" /> Предыдущий
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={loading}
            variant="therapeutic"
            size="lg"
            className="flex-1"
          >
            {currentStep === questions.length - 1 ? "Завершить диагностику" : "Следующий"}
            <ArrowRight className="ml-2" />
          </Button>
        </div>
        
        {/* Progress indicator dots */}
        <div className="flex justify-center gap-2 pt-4">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-primary"
                  : index < currentStep
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
