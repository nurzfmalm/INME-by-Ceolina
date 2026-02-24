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
  allowCustom?: boolean;
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
    id: "q2_engagement",
    category: "Вовлечённость и внимание",
    subtitle: "Как ребёнок обычно включается в задания?",
    type: "single",
    options: [
      "Легко вовлекается",
      "Нужно время, чтобы привыкнуть",
      "Быстро теряет интерес",
      "Зацикливается на одном",
    ],
  },
  {
    id: "q3_selfregulation",
    category: "Поведение и саморегуляция",
    subtitle: "Как себя ведёт ребёнок?",
    type: "single",
    options: [
      "Импульсивный (действует без ожидания)",
      "Тревожный / избегает новое",
      "Легко расстраивается при ошибке",
      "Спокойно переносит трудности",
    ],
  },
  {
    id: "q4_motor",
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
    id: "q5_sensory",
    category: "Сенсорные особенности",
    subtitle: "Есть ли у ребёнка сенсорные особенности?",
    type: "multi",
    options: [
      "Чувствителен к звукам",
      "Чувствителен к яркому свету",
      "Избегает прикосновений",
      "Любит тактильные ощущения",
      "Сенсорных особенностей не замечено",
    ],
  },
  {
    id: "q6_interests",
    category: "Интересы ребёнка",
    subtitle: "Что нравится ребёнку?",
    type: "multi",
    options: [
      "Животные",
      "Машины",
      "Космос",
      "Персонажи",
      "Природа",
      "Водичкой",
      "Цветы и узоры",
    ],
    allowCustom: true,
  },
  {
    id: "q7_focus",
    category: "Текущий запрос",
    subtitle: "Над чем сейчас важнее работать?",
    type: "single",
    options: [
      "Моторика",
      "Внимание",
      "Самовыражение и эмоции",
      "Взаимодействие с другими",
    ],
  },
];

export const AdaptiveDiagnostic = ({ onComplete, onBack, childId, childName }: AdaptiveDiagnosticProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [customInterest, setCustomInterest] = useState("");

  const isComplete = showComplete;
  const q = !isComplete ? questions[currentStep] : null;
  const displayName = childName || "ребёнка";

  const handleSelect = (option: string) => {
    if (!q) return;
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
    if (!q) return false;
    const val = answers[q.id];
    if (q.type === "single") return val === option;
    return Array.isArray(val) && val.includes(option);
  };

  const canProceed = () => {
    if (!q) return true;
    const val = answers[q.id];
    if (!val) return false;
    if (q.type === "multi") return Array.isArray(val) && val.length > 0;
    return true;
  };

  const addCustomInterest = () => {
    if (!customInterest.trim() || !q) return;
    const prev: string[] = answers[q.id] || [];
    if (!prev.includes(customInterest.trim())) {
      setAnswers({ ...answers, [q.id]: [...prev, customInterest.trim()] });
    }
    setCustomInterest("");
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error("Пожалуйста, ответьте на вопрос");
      return;
    }
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowComplete(true);
    }
  };

  const handleBack = () => {
    if (showComplete) {
      setShowComplete(false);
      return;
    }
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else onBack();
  };

  const handleFinish = async () => {
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

      {/* Complete screen */}
      {isComplete ? (
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-5 animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground">Отлично!</h2>
          <p className="text-muted-foreground">Давайте приступим</p>
          <button
            onClick={handleFinish}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-full py-3 font-medium shadow-lg hover:opacity-90 transition disabled:opacity-40"
          >
            {loading ? "Сохранение..." : "Продолжить"}
          </button>

          {/* Dots */}
          <div className="flex gap-1.5 justify-center pt-2">
            {questions.map((_, i) => (
              <span key={i} className="w-2 h-2 rounded-full bg-foreground/30" />
            ))}
            <span className="w-2 h-2 rounded-full bg-foreground" />
          </div>
        </div>
      ) : q && (
        <>
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

              {/* Custom interest input */}
              {q.allowCustom && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-primary text-sm cursor-pointer" onClick={() => {
                    const input = document.getElementById("custom-interest-input");
                    if (input) input.focus();
                  }}>+ Добавить своё</span>
                  <input
                    id="custom-interest-input"
                    type="text"
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomInterest()}
                    placeholder="Введите..."
                    className="text-sm border-b border-muted-foreground/30 outline-none bg-transparent flex-1 py-1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex gap-1.5 mt-6">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
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

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="mt-4 bg-foreground text-white rounded-full px-8 py-3 font-medium shadow-lg hover:opacity-90 transition disabled:opacity-40"
          >
            Далее
          </button>
        </>
      )}
    </div>
  );
};
