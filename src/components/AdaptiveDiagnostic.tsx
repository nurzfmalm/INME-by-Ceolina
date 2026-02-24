import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import classroomBg from "@/assets/classroom-background.png";

interface AdaptiveDiagnosticProps {
  onComplete: (assessmentId: string) => void;
  onBack: () => void;
  childId?: string;
  childName?: string;
  childAge?: number | null;
}

interface Question {
  id: string;
  category: string;
  subtitle: string;
  type: "single" | "multi";
  options: string[];
}

const questions: Question[] = [
  {
    id: "q1_social",
    category: "Общение и социальное поведение",
    subtitle: "Как ребёнок взаимодействует с другими?",
    type: "single",
    options: [
      "Избегает контакта",
      "Играет рядом но не вместе",
      "Может играть вместе",
      "Легко взаимодействует",
    ],
  },
  {
    id: "q2_motor",
    category: "Моторика",
    subtitle: "Как ребёнок использует руки",
    type: "multi",
    options: [
      "Движения неуверенные",
      "Трудно обводить линии",
      "Предпочитает нажимать, а не вести",
      "Держит предметы уверенно",
      "Моторика хорошая",
    ],
  },
  {
    id: "q3_emotions",
    category: "Эмоции и самовыражение",
    subtitle: "Как ребёнок выражает свои чувства?",
    type: "single",
    options: [
      "Называет эмоции словами",
      "Показывает мимикой и жестами",
      "Выражает через крик или плач",
      "Подавляет эмоции, замыкается",
    ],
  },
  {
    id: "q4_sensory",
    category: "Сенсорика",
    subtitle: "Как ребёнок реагирует на звуки, свет, прикосновения?",
    type: "multi",
    options: [
      "Чувствителен к громким звукам",
      "Не любит яркий свет",
      "Избегает определённых текстур",
      "Реагирует спокойно",
      "Ищет сенсорные ощущения",
    ],
  },
  {
    id: "q5_attention",
    category: "Внимание и концентрация",
    subtitle: "Как долго ребёнок удерживает внимание?",
    type: "single",
    options: [
      "Менее 5 минут",
      "5–10 минут с перерывами",
      "10–20 минут",
      "Более 20 минут",
    ],
  },
  {
    id: "q6_routine",
    category: "Поведение и распорядок",
    subtitle: "Как ребёнок реагирует на изменения в привычном распорядке?",
    type: "single",
    options: [
      "Сильный стресс, истерики",
      "Беспокоится, но справляется",
      "Нужна подготовка и объяснение",
      "Спокойно адаптируется",
    ],
  },
  {
    id: "q7_interests",
    category: "Интересы",
    subtitle: "Какие активности увлекают ребёнка?",
    type: "multi",
    options: [
      "Рисование и творчество",
      "Музыка и звуки",
      "Движение и танцы",
      "Конструирование",
      "Ролевые игры",
      "Сенсорные игры",
      "Книги и истории",
    ],
  },
];

export const AdaptiveDiagnostic = ({ onComplete, onBack, childId, childName }: AdaptiveDiagnosticProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const q = questions[currentStep];
  const displayName = childName || "ребёнка";

  const handleSelect = (option: string) => {
    if (q.type === "single") {
      setAnswers({ ...answers, [q.id]: option });
    } else {
      const prev: string[] = answers[q.id] || [];
      const next = prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option];
      setAnswers({ ...answers, [q.id]: next });
    }
  };

  const isSelected = (option: string) => {
    const val = answers[q.id];
    if (q.type === "single") return val === option;
    return Array.isArray(val) && val.includes(option);
  };

  const canProceed = () => {
    const val = answers[q.id];
    if (!val) return false;
    if (q.type === "multi") return Array.isArray(val) && val.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
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
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else onBack();
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const insertData: any = {
          user_id: userData.user.id,
          assessment_data: answers,
          completed: true,
          current_step: questions.length,
          total_steps: questions.length,
          completed_at: new Date().toISOString(),
        };
        if (childId) insertData.child_id = childId;

        const { data, error } = await supabase
          .from("adaptive_assessments")
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        toast.success(`Диагностика для ${displayName} завершена!`);
        onComplete(data.id);
      } else {
        const assessmentId = `assessment-${Date.now()}`;
        localStorage.setItem("starAssessment", JSON.stringify({ id: assessmentId, answers, completed_at: new Date().toISOString() }));
        toast.success("Диагностика завершена!");
        onComplete(assessmentId);
      }
    } catch (error: any) {
      console.error("Assessment error:", error);
      const fallbackId = `assessment-${Date.now()}`;
      localStorage.setItem("starAssessment", JSON.stringify({ id: fallbackId, answers, completed_at: new Date().toISOString() }));
      toast.success("Диагностика завершена!");
      onComplete(fallbackId);
    } finally {
      setLoading(false);
    }
  };

  if (!q) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${classroomBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur rounded-full p-2 shadow-md hover:bg-white transition"
        aria-label="Назад"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-5 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground leading-tight">{q.category}</h2>
          <p className="text-sm text-muted-foreground mt-1">{q.subtitle}</p>
        </div>

        <div className="space-y-3">
          {q.options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleSelect(option)}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected(option)
                    ? "border-foreground bg-foreground"
                    : "border-muted-foreground/40 group-hover:border-muted-foreground"
                }`}
              >
                {isSelected(option) && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>
              <span className="text-sm text-foreground">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex gap-2 mt-6">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (i < currentStep) setCurrentStep(i);
            }}
            className={`h-2.5 rounded-full transition-all ${
              i === currentStep
                ? "w-7 bg-foreground"
                : i < currentStep
                ? "w-2.5 bg-foreground/50 cursor-pointer"
                : "w-2.5 bg-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Next / Complete */}
      <button
        onClick={handleNext}
        disabled={loading || !canProceed()}
        className="mt-4 bg-foreground text-white rounded-full px-8 py-3 font-medium shadow-lg hover:opacity-90 transition disabled:opacity-40"
      >
        {currentStep === questions.length - 1 ? "Завершить" : "Далее"}
      </button>
    </div>
  );
};
