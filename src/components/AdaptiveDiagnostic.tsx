import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import classroomBg from "@/assets/classroom-background.png";
import { Check, ChevronRight, ChevronLeft, Play, Pause, RotateCcw } from "lucide-react";

interface AdaptiveDiagnosticProps {
  onComplete: (assessmentId: string) => void;
  onBack: () => void;
  childId?: string;
  childName?: string;
  childAge?: number | null;
}

// ─── Phase 1: Questionnaire (4 key questions) ───

interface Question {
  id: string;
  category: string;
  subtitle: string;
  type: "single" | "multi";
  options: { label: string; value: number }[];
}

const questions: Question[] = [
  {
    id: "social",
    category: "Социальное взаимодействие",
    subtitle: "Как ребёнок взаимодействует с другими?",
    type: "single",
    options: [
      { label: "Избегает контакта", value: 1 },
      { label: "Играет рядом, но не вместе", value: 2 },
      { label: "Может играть вместе с поддержкой", value: 3 },
      { label: "Легко взаимодействует", value: 4 },
    ],
  },
  {
    id: "attention",
    category: "Внимание и вовлечённость",
    subtitle: "Как ребёнок включается в задания?",
    type: "single",
    options: [
      { label: "Быстро теряет интерес (< 2 мин)", value: 1 },
      { label: "Нужно время, чтобы привыкнуть", value: 2 },
      { label: "Удерживает внимание 5-10 мин", value: 3 },
      { label: "Легко вовлекается, работает долго", value: 4 },
    ],
  },
  {
    id: "regulation",
    category: "Саморегуляция",
    subtitle: "Как ребёнок реагирует на трудности?",
    type: "single",
    options: [
      { label: "Сильно расстраивается, отказывается продолжать", value: 1 },
      { label: "Тревожится, избегает новое", value: 2 },
      { label: "Может попросить помощь", value: 3 },
      { label: "Спокойно переносит трудности", value: 4 },
    ],
  },
  {
    id: "motor",
    category: "Моторные навыки",
    subtitle: "Как ребёнок управляет инструментами?",
    type: "single",
    options: [
      { label: "Движения неуверенные, слабый захват", value: 1 },
      { label: "Трудно обводить, предпочитает нажимать", value: 2 },
      { label: "Держит уверенно, линии неровные", value: 3 },
      { label: "Хорошая моторика, уверенные линии", value: 4 },
    ],
  },
];

// ─── Phase 2: Trial Tasks ───

type TrialTaskType = "free_draw" | "tracing" | "symmetry";

interface TrialTask {
  id: TrialTaskType;
  title: string;
  instruction: string;
  durationSec: number;
  emoji: string;
}

const trialTasks: TrialTask[] = [
  {
    id: "free_draw",
    title: "Свободный рисунок",
    instruction: "Попросите ребёнка нарисовать что угодно — всё что захочет!",
    durationSec: 120,
    emoji: "🎨",
  },
  {
    id: "tracing",
    title: "Обводка фигуры",
    instruction: "Ребёнок обводит пунктирный круг по контуру",
    durationSec: 90,
    emoji: "⭕",
  },
  {
    id: "symmetry",
    title: "Зеркальный рисунок",
    instruction: "Ребёнок повторяет узор на другой стороне линии",
    durationSec: 90,
    emoji: "🪞",
  },
];

interface TrialMetrics {
  strokeCount: number;
  colorsUsed: Set<string>;
  totalTime: number;
  startTime: number;
  lastStrokeTime: number;
  pauseCount: number;
  avgStrokeSpeed: number;
  strokeLengths: number[];
}

// ─── Phase 3: Observation Checklist ───

interface ObservationItem {
  id: string;
  category: string;
  items: { id: string; label: string }[];
}

const observationChecklist: ObservationItem[] = [
  {
    id: "behavior",
    category: "Поведение во время рисования",
    items: [
      { id: "focused", label: "Сосредоточен на задании" },
      { id: "distracted", label: "Легко отвлекается" },
      { id: "repetitive", label: "Повторяющиеся движения/паттерны" },
      { id: "seeks_help", label: "Просит помощь" },
      { id: "independent", label: "Работает самостоятельно" },
    ],
  },
  {
    id: "emotions",
    category: "Эмоциональное состояние",
    items: [
      { id: "calm", label: "Спокойный" },
      { id: "excited", label: "Возбуждённый / радостный" },
      { id: "anxious", label: "Тревожный" },
      { id: "frustrated", label: "Расстроенный / фрустрированный" },
      { id: "flat", label: "Безразличный / «плоский» аффект" },
    ],
  },
  {
    id: "motor_obs",
    category: "Моторика (наблюдение)",
    items: [
      { id: "grip_good", label: "Уверенный захват инструмента" },
      { id: "pressure_heavy", label: "Сильное нажатие" },
      { id: "pressure_light", label: "Слабое нажатие" },
      { id: "tremor", label: "Тремор / дрожь руки" },
      { id: "crosses_midline", label: "Пересекает среднюю линию тела" },
    ],
  },
  {
    id: "sensory",
    category: "Сенсорные особенности",
    items: [
      { id: "sound_sensitive", label: "Реагирует на звуки" },
      { id: "light_sensitive", label: "Реагирует на яркий свет" },
      { id: "tactile_avoidant", label: "Избегает тактильного контакта" },
      { id: "tactile_seeking", label: "Ищет тактильные ощущения" },
      { id: "no_sensory", label: "Без выраженных особенностей" },
    ],
  },
];

// ─── Colors for trial drawing ───

const TRIAL_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#1F2937",
];

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export const AdaptiveDiagnostic = ({
  onComplete,
  onBack,
  childId,
  childName,
  childAge,
}: AdaptiveDiagnosticProps) => {
  // Phase management: "questionnaire" | "trial_intro" | "trial_active" | "observation" | "complete"
  const [phase, setPhase] = useState<string>("questionnaire");
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Phase 1: Questionnaire answers
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Phase 2: Trial tasks
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [trialMetrics, setTrialMetrics] = useState<Record<string, any>>({});
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trial drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(TRIAL_COLORS[0]);
  const metricsRef = useRef<TrialMetrics>({
    strokeCount: 0,
    colorsUsed: new Set<string>(),
    totalTime: 0,
    startTime: 0,
    lastStrokeTime: 0,
    pauseCount: 0,
    avgStrokeSpeed: 0,
    strokeLengths: [],
  });
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentStrokeLengthRef = useRef(0);

  // Phase 3: Observation checklist
  const [observations, setObservations] = useState<Record<string, boolean>>({});
  const [specialistNotes, setSpecialistNotes] = useState("");

  const displayName = childName || "ребёнка";
  const totalPhases = 3;

  // ─── Timer ───
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // ─── Canvas setup for trial tasks ───
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFEF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const task = trialTasks[currentTrialIndex];

    // Draw template for tracing task
    if (task.id === "tracing") {
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 3;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.min(canvas.width, canvas.height) * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw template for symmetry task
    if (task.id === "symmetry") {
      ctx.save();
      const cx = canvas.width / 2;
      // Center line
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvas.height);
      ctx.stroke();
      // Left pattern
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 40, canvas.height * 0.2);
      ctx.lineTo(cx - 100, canvas.height * 0.4);
      ctx.lineTo(cx - 40, canvas.height * 0.6);
      ctx.lineTo(cx - 100, canvas.height * 0.8);
      ctx.stroke();
      ctx.restore();
    }
  }, [currentTrialIndex]);

  useEffect(() => {
    if (phase === "trial_active") {
      // Small delay to ensure canvas is mounted
      const t = setTimeout(setupCanvas, 100);
      return () => clearTimeout(t);
    }
  }, [phase, currentTrialIndex, setupCanvas]);

  // ─── Drawing handlers ───
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    lastPointRef.current = pos;
    currentStrokeLengthRef.current = 0;

    const m = metricsRef.current;
    if (m.startTime === 0) {
      m.startTime = Date.now();
      setTimerRunning(true);
    }
    m.colorsUsed.add(currentColor);
    m.strokeCount++;
    m.lastStrokeTime = Date.now();

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPointRef.current) return;

    const midX = (lastPointRef.current.x + pos.x) / 2;
    const midY = (lastPointRef.current.y + pos.y) / 2;
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.stroke();

    // Track stroke length
    const dx = pos.x - lastPointRef.current.x;
    const dy = pos.y - lastPointRef.current.y;
    currentStrokeLengthRef.current += Math.sqrt(dx * dx + dy * dy);

    lastPointRef.current = pos;
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;

    const m = metricsRef.current;
    if (currentStrokeLengthRef.current > 0) {
      m.strokeLengths.push(currentStrokeLengthRef.current);
    }
  };

  // ─── Trial task management ───
  const finishCurrentTrial = () => {
    setTimerRunning(false);
    const m = metricsRef.current;
    const elapsed = m.startTime > 0 ? (Date.now() - m.startTime) / 1000 : 0;

    // Get canvas image
    const imageData = canvasRef.current?.toDataURL("image/png") || "";

    const taskMetrics = {
      strokeCount: m.strokeCount,
      colorsUsed: Array.from(m.colorsUsed),
      totalTimeSec: Math.round(elapsed),
      avgStrokeLength: m.strokeLengths.length > 0
        ? Math.round(m.strokeLengths.reduce((a, b) => a + b, 0) / m.strokeLengths.length)
        : 0,
      imagePreview: imageData.substring(0, 200), // Store tiny preview ref
    };

    const taskId = trialTasks[currentTrialIndex].id;
    setTrialMetrics((prev) => ({ ...prev, [taskId]: taskMetrics }));

    // Reset metrics for next task
    metricsRef.current = {
      strokeCount: 0,
      colorsUsed: new Set(),
      totalTime: 0,
      startTime: 0,
      lastStrokeTime: 0,
      pauseCount: 0,
      avgStrokeSpeed: 0,
      strokeLengths: [],
    };
    setTimer(0);

    if (currentTrialIndex < trialTasks.length - 1) {
      setCurrentTrialIndex(currentTrialIndex + 1);
    } else {
      // Move to observation phase
      setPhase("observation");
    }
  };

  const resetCurrentTrial = () => {
    metricsRef.current = {
      strokeCount: 0,
      colorsUsed: new Set(),
      totalTime: 0,
      startTime: 0,
      lastStrokeTime: 0,
      pauseCount: 0,
      avgStrokeSpeed: 0,
      strokeLengths: [],
    };
    setTimer(0);
    setTimerRunning(false);
    setupCanvas();
  };

  // ─── Phase navigation ───
  const handleQuestionSelect = (questionId: string, value: number) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const canProceedQuestion = () => {
    const q = questions[currentStep];
    return answers[q.id] !== undefined;
  };

  const nextQuestion = () => {
    if (!canProceedQuestion()) {
      toast.error("Пожалуйста, выберите ответ");
      return;
    }
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setPhase("trial_intro");
    }
  };

  const prevQuestion = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else onBack();
  };

  // ─── Save all data ───
  const handleFinish = async () => {
    setLoading(true);
    try {
      const assessmentPayload = {
        phase1_questionnaire: answers,
        phase2_trial_metrics: trialMetrics,
        phase3_observations: observations,
        phase3_notes: specialistNotes,
        diagnostic_version: "hybrid_v1",
        child_age: childAge,
      };

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const insertData: Record<string, unknown> = {
          user_id: userData.user.id,
          assessment_data: assessmentPayload,
          completed: true,
          current_step: 3,
          total_steps: 3,
          completed_at: new Date().toISOString(),
        };
        if (childId) insertData.child_id = childId;

        const { data, error } = await supabase
          .from("adaptive_assessments")
          .insert(insertData as any)
          .select()
          .single();

        if (error) throw error;
        toast.success(`Диагностика для ${displayName} завершена!`);
        onComplete(data.id);
      } else {
        const assessmentId = `assessment-${Date.now()}`;
        localStorage.setItem(
          "starAssessment",
          JSON.stringify({ id: assessmentId, ...assessmentPayload, completed_at: new Date().toISOString() })
        );
        toast.success("Диагностика завершена!");
        onComplete(assessmentId);
      }
    } catch (error) {
      console.error("Assessment error:", error);
      const fallbackId = `assessment-${Date.now()}`;
      localStorage.setItem(
        "starAssessment",
        JSON.stringify({ id: fallbackId, answers, completed_at: new Date().toISOString() })
      );
      toast.success("Диагностика завершена!");
      onComplete(fallbackId);
    } finally {
      setLoading(false);
    }
  };

  const toggleObservation = (id: string) => {
    setObservations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Phase indicator ───
  const currentPhaseIndex =
    phase === "questionnaire" ? 0
    : phase === "trial_intro" || phase === "trial_active" ? 1
    : 2;

  const phaseLabels = ["Анкета", "Пробные задания", "Наблюдение"];

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `url(${classroomBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Back button */}
      <button
        onClick={phase === "questionnaire" ? prevQuestion : () => {
          if (phase === "trial_intro") setPhase("questionnaire");
          else if (phase === "trial_active" && currentTrialIndex === 0) setPhase("trial_intro");
          else if (phase === "trial_active") {
            setCurrentTrialIndex(currentTrialIndex - 1);
          }
          else if (phase === "observation") setPhase("trial_intro");
          else if (phase === "complete") setPhase("observation");
        }}
        className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur rounded-full p-2 shadow-md hover:bg-white transition"
        aria-label="Назад"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-2 px-4 z-10">
        {phaseLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`h-2 rounded-full transition-all ${
                i === currentPhaseIndex
                  ? "w-8 bg-foreground"
                  : i < currentPhaseIndex
                  ? "w-4 bg-foreground/50"
                  : "w-4 bg-foreground/20"
              }`}
            />
            <span className={`text-[10px] font-medium ${
              i === currentPhaseIndex ? "text-foreground" : "text-foreground/40"
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* ═══ PHASE 1: Questionnaire ═══ */}
        {phase === "questionnaire" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                {currentStep + 1}/{questions.length}
              </span>
              <span className="text-xs text-muted-foreground">Фаза 1 — Анкета</span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {questions[currentStep].category}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {questions[currentStep].subtitle}
              </p>
            </div>

            <div className="space-y-2.5">
              {questions[currentStep].options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleQuestionSelect(questions[currentStep].id, option.value)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    answers[questions[currentStep].id] === option.value
                      ? "border-foreground bg-foreground/5"
                      : "border-transparent bg-muted/50 hover:border-muted-foreground/20"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      answers[questions[currentStep].id] === option.value
                        ? "border-foreground bg-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {answers[questions[currentStep].id] === option.value && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="text-sm text-foreground">{option.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={nextQuestion}
              disabled={!canProceedQuestion()}
              className="w-full bg-foreground text-white rounded-full py-3 font-medium shadow-lg hover:opacity-90 transition disabled:opacity-40"
            >
              {currentStep < questions.length - 1 ? "Далее" : "К пробным заданиям →"}
            </button>
          </div>
        )}

        {/* ═══ PHASE 2 INTRO: Trial Tasks Overview ═══ */}
        {phase === "trial_intro" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                Фаза 2
              </span>
            </div>
            <h2 className="text-lg font-bold">Пробные задания</h2>
            <p className="text-sm text-muted-foreground">
              Ребёнок выполнит 3 коротких задания. Приложение автоматически соберёт данные
              о моторике, внимании и предпочтениях.
            </p>
            <div className="space-y-3">
              {trialTasks.map((task, i) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    trialMetrics[task.id]
                      ? "bg-primary/5 border border-primary/30"
                      : "bg-muted/50"
                  }`}
                >
                  <span className="text-2xl">{task.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">~{task.durationSec / 60} мин</p>
                  </div>
                  {trialMetrics[task.id] && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setCurrentTrialIndex(
                  Object.keys(trialMetrics).length < trialTasks.length
                    ? Object.keys(trialMetrics).length
                    : 0
                );
                setPhase("trial_active");
              }}
              className="w-full bg-foreground text-white rounded-full py-3 font-medium shadow-lg hover:opacity-90 transition"
            >
              {Object.keys(trialMetrics).length === 0
                ? "Начать задания"
                : Object.keys(trialMetrics).length >= trialTasks.length
                ? "К наблюдению →"
                : "Продолжить"}
            </button>
            {Object.keys(trialMetrics).length >= trialTasks.length && (
              <button
                onClick={() => setPhase("observation")}
                className="w-full text-sm text-primary hover:underline"
              >
                Пропустить → Наблюдение
              </button>
            )}
          </div>
        )}

        {/* ═══ PHASE 2 ACTIVE: Drawing Trial ═══ */}
        {phase === "trial_active" && (
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col" style={{ maxHeight: "85vh" }}>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{trialTasks[currentTrialIndex].emoji}</span>
                  <h3 className="font-bold text-sm">{trialTasks[currentTrialIndex].title}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({currentTrialIndex + 1}/{trialTasks.length})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {trialTasks[currentTrialIndex].instruction}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold tabular-nums">
                  {formatTime(timer)}
                </span>
              </div>
            </div>

            {/* Color palette */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto">
              {TRIAL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrentColor(c)}
                  className={`w-7 h-7 rounded-full flex-shrink-0 transition-transform ${
                    currentColor === c ? "ring-2 ring-foreground ring-offset-2 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                onClick={resetCurrentTrial}
                className="ml-auto p-1.5 rounded-lg hover:bg-muted transition"
                title="Начать заново"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative" style={{ minHeight: "300px" }}>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>

            {/* Actions */}
            <div className="p-3 border-t flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                Штрихов: {metricsRef.current.strokeCount} | Цветов: {metricsRef.current.colorsUsed.size}
              </div>
              <button
                onClick={finishCurrentTrial}
                className="bg-foreground text-white rounded-full px-5 py-2 text-sm font-medium hover:opacity-90 transition flex items-center gap-1.5"
              >
                {currentTrialIndex < trialTasks.length - 1 ? (
                  <>Дальше <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Завершить <Check className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ PHASE 3: Observation Checklist ═══ */}
        {phase === "observation" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full space-y-5 animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                Фаза 3
              </span>
            </div>
            <h2 className="text-lg font-bold">Наблюдение специалиста</h2>
            <p className="text-sm text-muted-foreground">
              Отметьте всё, что наблюдали во время выполнения заданий ребёнком
            </p>

            {observationChecklist.map((section) => (
              <div key={section.id} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground/80">{section.category}</h3>
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleObservation(item.id)}
                      className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                        observations[item.id]
                          ? "bg-foreground/5 border-2 border-foreground"
                          : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                          observations[item.id]
                            ? "bg-foreground"
                            : "border-2 border-muted-foreground/30"
                        }`}
                      >
                        {observations[item.id] && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/80">Заметки специалиста</h3>
              <textarea
                value={specialistNotes}
                onChange={(e) => setSpecialistNotes(e.target.value)}
                placeholder="Дополнительные наблюдения, особенности поведения..."
                className="w-full p-3 rounded-xl border-2 border-muted/50 bg-muted/20 text-sm resize-none h-24 outline-none focus:border-foreground/30 transition"
              />
            </div>

            <button
              onClick={() => setPhase("complete")}
              className="w-full bg-foreground text-white rounded-full py-3 font-medium shadow-lg hover:opacity-90 transition"
            >
              Завершить диагностику
            </button>
          </div>
        )}

        {/* ═══ COMPLETE SCREEN: Visual Report ═══ */}
        {phase === "complete" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-lg w-full space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Отчёт диагностики</h2>
              <p className="text-xs text-muted-foreground mt-1">{displayName}{childAge ? `, ${childAge} лет` : ''}</p>
            </div>

            {/* Phase 1: Questionnaire Results */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                📋 Анкета
                <span className="text-xs font-normal text-muted-foreground">({Object.keys(answers).length}/{questions.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {questions.map((q) => {
                  const val = answers[q.id] || 0;
                  const label = q.options.find(o => o.value === val)?.label || '—';
                  return (
                    <div key={q.id} className="bg-muted/30 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{q.category}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex gap-0.5">
                          {[1,2,3,4].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i <= val ? 'bg-primary' : 'bg-muted'}`} />
                          ))}
                        </div>
                        <span className="text-xs font-medium">{val}/4</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase 2: Trial Metrics */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                🎨 Пробные задания
                <span className="text-xs font-normal text-muted-foreground">({Object.keys(trialMetrics).length}/{trialTasks.length})</span>
              </h3>
              <div className="space-y-2">
                {trialTasks.map((task) => {
                  const m = trialMetrics[task.id];
                  if (!m) return (
                    <div key={task.id} className="bg-muted/20 rounded-xl p-3 text-xs text-muted-foreground">
                      {task.emoji} {task.title} — не выполнено
                    </div>
                  );
                  return (
                    <div key={task.id} className="bg-muted/30 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{task.emoji}</span>
                        <span className="text-sm font-medium">{task.title}</span>
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{m.strokeCount}</p>
                          <p className="text-[10px] text-muted-foreground">штрихов</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{m.colorsUsed?.length || 0}</p>
                          <p className="text-[10px] text-muted-foreground">цветов</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{m.totalTimeSec}с</p>
                          <p className="text-[10px] text-muted-foreground">время</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{m.avgStrokeLength}</p>
                          <p className="text-[10px] text-muted-foreground">ср. длина</p>
                        </div>
                      </div>
                      {m.colorsUsed?.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {m.colorsUsed.map((c: string) => (
                            <div key={c} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase 3: Observations */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                👁️ Наблюдения специалиста
                <span className="text-xs font-normal text-muted-foreground">({Object.values(observations).filter(Boolean).length} пунктов)</span>
              </h3>
              <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                {observationChecklist.map((section) => {
                  const checked = section.items.filter(item => observations[item.id]);
                  if (checked.length === 0) return null;
                  return (
                    <div key={section.id}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{section.category}</p>
                      <div className="flex flex-wrap gap-1">
                        {checked.map(item => (
                          <span key={item.id} className="text-[11px] bg-foreground/10 text-foreground px-2 py-0.5 rounded-full">
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {Object.values(observations).filter(Boolean).length === 0 && (
                  <p className="text-xs text-muted-foreground">Наблюдения не отмечены</p>
                )}
              </div>
              {specialistNotes && (
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Заметки</p>
                  <p className="text-xs text-foreground">{specialistNotes}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-full py-3 font-medium shadow-lg hover:opacity-90 transition disabled:opacity-40"
            >
              {loading ? "Сохранение..." : "Создать программу →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
