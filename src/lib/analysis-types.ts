/**
 * Типы и интерфейсы для системы анализа рисунков
 * Соответствует требованиям арт-терапии для детей с ASD
 */

// Типы заданий
export type TaskType =
  | "free_drawing"
  | "draw_family"
  | "draw_emotion"
  | "draw_happy"
  | "draw_sad"
  | "custom";

// Эмоциональное состояние во время рисования
export type EmotionalState =
  | "calm"
  | "anxious"
  | "withdrawn"
  | "excited"
  | "frustrated"
  | "neutral";

// Поведение во время рисования
export type DrawingBehavior =
  | "focused"
  | "distracted"
  | "strong_pressure"
  | "fast_drawing"
  | "slow_drawing"
  | "frequent_pauses";

// Использованные материалы
export type MaterialUsage =
  | "one_color"
  | "many_colors"
  | "strong_contrast"
  | "frequent_erasing"
  | "layer_building";

// Основной интерфейс для данных наблюдений
export interface DrawingObservation {
  // Общие данные
  child_id: string;
  child_age: number;
  session_date: string;
  observer_name?: string;

  // Тип задания
  task_type: TaskType;
  task_description?: string;

  // Наблюдения за процессом
  emotional_states: EmotionalState[];
  behaviors: DrawingBehavior[];

  // Вербальные комментарии ребёнка
  verbal_comments?: string;

  // Использованные материалы и цвета
  materials_used: MaterialUsage[];
  colors_count: number;

  // Временные метрики
  drawing_duration_seconds: number;
  pause_frequency: "low" | "medium" | "high";

  // Технические метрики процесса рисования
  stroke_count: number;
  average_pressure: number; // 1-10
  eraser_usage: number; // количество использований ластика

  // Дополнительные заметки
  additional_notes?: string;
}

// Структурированный отчет анализа
export interface AnalysisReport {
  // 1. Фактическое описание изображения
  visual_description: {
    objects_identified: string[];
    spatial_layout: {
      center_usage: "empty" | "partial" | "full";
      space_distribution: "scattered" | "grouped" | "balanced" | "confined";
      object_positions: string[]; // например: ["солнце в верхнем правом углу", "дом в центре"]
    };
    colors_used: {
      color: string;
      hex: string;
      coverage_percentage: number;
      location: string;
    }[];
    patterns_detected: string[]; // повторяющиеся элементы
    detail_level: "minimal" | "moderate" | "high" | "very_high";
  };

  // 2. Анализ процесса рисования
  process_analysis: {
    emotional_state_impact: string;
    pressure_patterns: string;
    timing_observations: string;
    behavioral_correlations: string;
  };

  // 3. Интерпретация (гипотезы, НЕ утверждения)
  interpretation: {
    emotional_themes: {
      theme: string;
      confidence: "low" | "medium" | "high";
      supporting_evidence: string[];
    }[];
    asd_specific_markers: {
      marker: string;
      observation: string;
      clinical_relevance: string;
    }[];
  };

  // 4. Динамика (если есть предыдущие рисунки)
  progress_tracking?: {
    changes_from_previous: {
      aspect: string;
      change_description: string;
      direction: "positive" | "neutral" | "concerning";
    }[];
    trend_analysis: string;
  };

  // 5. Рекомендации
  recommendations: {
    for_parents: string[];
    for_therapists: string[];
    suggested_activities: string[];
    areas_to_monitor: string[];
  };

  // Обязательный дисклеймер
  disclaimer: string;

  // Метаданные анализа
  analysis_metadata: {
    analyzed_at: string;
    analysis_version: string;
    confidence_score: number; // 0-100
    requires_professional_review: boolean;
  };
}

// Результат валидации визуального распознавания
export interface VisualValidationResult {
  validation_passed: boolean;
  description_accuracy: number; // 0-100
  objects_recognized: string[];
  failed_reason?: string;
  retry_suggested: boolean;
}

// Сравнение с предыдущими рисунками
export interface ProgressComparison {
  previous_drawing_id: string;
  days_since_previous: number;

  changes: {
    color_usage: {
      before: number;
      after: number;
      change_percentage: number;
    };
    space_usage: {
      before: string;
      after: string;
      interpretation: string;
    };
    pressure: {
      before: number;
      after: number;
      interpretation: string;
    };
    detail_level: {
      before: string;
      after: string;
      interpretation: string;
    };
    emotional_expression: {
      before: string[];
      after: string[];
      new_themes: string[];
      resolved_themes: string[];
    };
  };

  overall_trajectory: "improving" | "stable" | "regressing" | "mixed";
  therapist_attention_required: boolean;
}

// Данные для Hugging Face анализа
export interface HFAnalysisInput {
  image_base64: string;
  observation_data: DrawingObservation;
  previous_drawings?: {
    id: string;
    analysis: AnalysisReport;
    created_at: string;
  }[];
}

// Результат от Hugging Face
export interface HFAnalysisResult {
  visual_elements: {
    objects: { label: string; confidence: number; bbox?: number[] }[];
    colors: { color: string; percentage: number }[];
    composition: string;
  };
  sentiment_analysis?: {
    overall_sentiment: "positive" | "negative" | "neutral" | "mixed";
    confidence: number;
  };
}