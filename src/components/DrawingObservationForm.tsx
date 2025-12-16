/**
 * Форма наблюдений за процессом рисования
 * Обязательна для полноценного анализа
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type {
  DrawingObservation,
  TaskType,
  EmotionalState,
  DrawingBehavior,
  MaterialUsage,
} from "@/lib/analysis-types";

interface DrawingObservationFormProps {
  childId: string;
  childAge: number;
  onSubmit: (observation: DrawingObservation) => void;
  initialData?: Partial<DrawingObservation>;
  strokeCount?: number;
  averagePressure?: number;
  eraserUsage?: number;
  durationSeconds?: number;
  isPhotoUpload?: boolean;
}

export const DrawingObservationForm = ({
  childId,
  childAge,
  onSubmit,
  initialData,
  strokeCount = 0,
  averagePressure = 5,
  eraserUsage = 0,
  durationSeconds = 0,
  isPhotoUpload = false,
}: DrawingObservationFormProps) => {
  const [taskType, setTaskType] = useState<TaskType>(
    initialData?.task_type || "free_drawing"
  );
  const [taskDescription, setTaskDescription] = useState(
    initialData?.task_description || ""
  );
  const [emotionalStates, setEmotionalStates] = useState<EmotionalState[]>(
    initialData?.emotional_states || []
  );
  const [behaviors, setBehaviors] = useState<DrawingBehavior[]>(
    initialData?.behaviors || []
  );
  const [verbalComments, setVerbalComments] = useState(
    initialData?.verbal_comments || ""
  );
  const [materialsUsed, setMaterialsUsed] = useState<MaterialUsage[]>(
    initialData?.materials_used || []
  );
  const [colorsCount, setColorsCount] = useState(
    initialData?.colors_count || 1
  );
  const [pauseFrequency, setPauseFrequency] = useState<"low" | "medium" | "high">(
    initialData?.pause_frequency || "low"
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialData?.additional_notes || ""
  );
  const [manualDuration, setManualDuration] = useState(durationSeconds || 0);
  const [manualPressure, setManualPressure] = useState(averagePressure || 5);

  const toggleEmotionalState = (state: EmotionalState) => {
    setEmotionalStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const toggleBehavior = (behavior: DrawingBehavior) => {
    setBehaviors((prev) =>
      prev.includes(behavior)
        ? prev.filter((b) => b !== behavior)
        : [...prev, behavior]
    );
  };

  const toggleMaterial = (material: MaterialUsage) => {
    setMaterialsUsed((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  const handleSubmit = () => {
    if (emotionalStates.length === 0 || behaviors.length === 0) {
      alert("Пожалуйста, выберите хотя бы одно эмоциональное состояние и одно поведение");
      return;
    }

    const observation: DrawingObservation = {
      child_id: childId,
      child_age: childAge,
      session_date: new Date().toISOString(),
      task_type: taskType,
      task_description: taskDescription || undefined,
      emotional_states: emotionalStates,
      behaviors: behaviors,
      verbal_comments: verbalComments || undefined,
      materials_used: materialsUsed,
      colors_count: colorsCount,
      drawing_duration_seconds: isPhotoUpload ? manualDuration * 60 : durationSeconds,
      pause_frequency: pauseFrequency,
      stroke_count: strokeCount,
      average_pressure: isPhotoUpload ? manualPressure : averagePressure,
      eraser_usage: eraserUsage,
      additional_notes: additionalNotes || undefined,
    };

    onSubmit(observation);
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Форма наблюдений</h2>
        <p className="text-sm text-muted-foreground">
          Заполнение этой формы необходимо для качественного анализа рисунка
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Без заполнения формы анализ будет неполным. Пожалуйста, отметьте все
          наблюдения во время сессии рисования.
        </AlertDescription>
      </Alert>

      {/* Тип задания */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Тип задания *</Label>
        <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free_drawing">Свободное рисование</SelectItem>
            <SelectItem value="draw_family">Нарисуй семью</SelectItem>
            <SelectItem value="draw_emotion">Нарисуй эмоцию</SelectItem>
            <SelectItem value="draw_happy">Нарисуй себя счастливым</SelectItem>
            <SelectItem value="draw_sad">Нарисуй себя грустным</SelectItem>
            <SelectItem value="custom">Другое (укажите ниже)</SelectItem>
          </SelectContent>
        </Select>
        {taskType === "custom" && (
          <Textarea
            placeholder="Опишите задание..."
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            rows={2}
          />
        )}
      </div>

      {/* Эмоциональное состояние */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Эмоциональное состояние во время рисования *
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "calm", label: "Спокоен" },
            { value: "anxious", label: "Тревожен" },
            { value: "withdrawn", label: "Отстранен" },
            { value: "excited", label: "Возбужден" },
            { value: "frustrated", label: "Фрустрирован" },
            { value: "neutral", label: "Нейтрален" },
          ].map((state) => (
            <div key={state.value} className="flex items-center space-x-2">
              <Checkbox
                id={`emotion-${state.value}`}
                checked={emotionalStates.includes(state.value as EmotionalState)}
                onCheckedChange={() =>
                  toggleEmotionalState(state.value as EmotionalState)
                }
              />
              <Label
                htmlFor={`emotion-${state.value}`}
                className="font-normal cursor-pointer"
              >
                {state.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Поведение */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Поведение *</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "focused", label: "Сосредоточен" },
            { value: "distracted", label: "Часто отвлекался" },
            { value: "strong_pressure", label: "Сильный нажим" },
            { value: "fast_drawing", label: "Быстрое рисование" },
            { value: "slow_drawing", label: "Медленное рисование" },
            { value: "frequent_pauses", label: "Частые паузы" },
          ].map((behavior) => (
            <div key={behavior.value} className="flex items-center space-x-2">
              <Checkbox
                id={`behavior-${behavior.value}`}
                checked={behaviors.includes(behavior.value as DrawingBehavior)}
                onCheckedChange={() =>
                  toggleBehavior(behavior.value as DrawingBehavior)
                }
              />
              <Label
                htmlFor={`behavior-${behavior.value}`}
                className="font-normal cursor-pointer"
              >
                {behavior.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Вербальные комментарии */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          Вербальные комментарии ребёнка
        </Label>
        <Textarea
          placeholder="Что ребёнок говорил во время рисования?"
          value={verbalComments}
          onChange={(e) => setVerbalComments(e.target.value)}
          rows={3}
        />
      </div>

      {/* Использованные материалы */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Материалы и методы</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "one_color", label: "Один цвет" },
            { value: "many_colors", label: "Много цветов" },
            { value: "strong_contrast", label: "Сильный контраст" },
            { value: "frequent_erasing", label: "Частые стирания" },
            { value: "layer_building", label: "Наслоение" },
          ].map((material) => (
            <div key={material.value} className="flex items-center space-x-2">
              <Checkbox
                id={`material-${material.value}`}
                checked={materialsUsed.includes(material.value as MaterialUsage)}
                onCheckedChange={() =>
                  toggleMaterial(material.value as MaterialUsage)
                }
              />
              <Label
                htmlFor={`material-${material.value}`}
                className="font-normal cursor-pointer"
              >
                {material.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Частота пауз */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Частота пауз</Label>
        <Select
          value={pauseFrequency}
          onValueChange={(v) => setPauseFrequency(v as "low" | "medium" | "high")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Низкая</SelectItem>
            <SelectItem value="medium">Средняя</SelectItem>
            <SelectItem value="high">Высокая</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Дополнительные заметки */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Дополнительные заметки</Label>
        <Textarea
          placeholder="Любые другие наблюдения..."
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Метрики сессии */}
      {isPhotoUpload ? (
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-sm">Данные о сессии рисования (укажите примерно):</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Длительность (минуты)</Label>
              <input
                type="number"
                min="1"
                max="120"
                value={manualDuration}
                onChange={(e) => setManualDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label>Нажим (1-10)</Label>
              <input
                type="number"
                min="1"
                max="10"
                value={manualPressure}
                onChange={(e) => setManualPressure(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="5"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h3 className="font-semibold text-sm">Автоматически собранные данные:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Длительность: {Math.floor(durationSeconds / 60)} мин {durationSeconds % 60} сек</div>
            <div>Количество штрихов: {strokeCount}</div>
            <div>Средний нажим: {averagePressure.toFixed(1)}/10</div>
            <div>Использование ластика: {eraserUsage} раз</div>
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} size="lg" className="w-full">
        Сохранить и проанализировать
      </Button>
    </Card>
  );
};
