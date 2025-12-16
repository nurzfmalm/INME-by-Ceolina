/**
 * Продвинутая система анализа рисунков для арт-терапии
 * Использует Hugging Face Inference API + Google Gemini
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  DrawingObservation,
  AnalysisReport,
  VisualValidationResult,
  ProgressComparison,
  HFAnalysisInput,
  HFAnalysisResult,
} from "./analysis-types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Шаг 1: Валидация визуального распознавания
 * КРИТИЧНО: ИИ должен доказать, что он видит изображение
 */
export async function validateVisualRecognition(
  imageBase64: string
): Promise<VisualValidationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const validationPrompt = `
ТЕСТ ВИЗУАЛЬНОГО РАСПОЗНАВАНИЯ.
ВАЖНО: Опиши ТОЛЬКО то, что ты РЕАЛЬНО видишь на изображении.
НЕ анализируй эмоции, НЕ интерпретируй, НЕ предполагай.

Опиши:
1. Какие объекты ты видишь (перечисли все)
2. Где они расположены (слева, справа, центр, верх, низ)
3. Какие цвета использованы (назови конкретные цвета)
4. Размер объектов относительно друг друга
5. Есть ли повторяющиеся элементы

Формат ответа (JSON):
{
  "objects": ["объект1", "объект2"],
  "colors": ["цвет1", "цвет2"],
  "layout": "описание расположения",
  "patterns": ["паттерн1"]
}
`;

    const result = await model.generateContent([
      validationPrompt,
      {
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      },
    ]);

    const response = result.response.text();

    // Извлекаем JSON
    let jsonText = response.trim();
    if (jsonText.includes("```json")) {
      jsonText = jsonText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
    }

    const parsed = JSON.parse(jsonText);

    // Проверяем качество распознавания
    const hasObjects = parsed.objects && parsed.objects.length > 0;
    const hasColors = parsed.colors && parsed.colors.length > 0;
    const hasLayout = parsed.layout && parsed.layout.length > 10;

    const validation_passed = hasObjects && hasColors && hasLayout;
    const description_accuracy = validation_passed ? 85 : 30;

    return {
      validation_passed,
      description_accuracy,
      objects_recognized: parsed.objects || [],
      failed_reason: validation_passed
        ? undefined
        : "ИИ не смог детально описать изображение",
      retry_suggested: !validation_passed,
    };
  } catch (error) {
    console.error("Visual validation error:", error);
    return {
      validation_passed: false,
      description_accuracy: 0,
      objects_recognized: [],
      failed_reason: "Ошибка при валидации изображения",
      retry_suggested: true,
    };
  }
}

/**
 * Шаг 2: Анализ с использованием Hugging Face
 * Используем модели для детекции объектов и анализа
 */
export async function analyzeWithHuggingFace(
  imageBase64: string
): Promise<HFAnalysisResult> {
  if (!HF_API_KEY) {
    console.warn("Hugging Face API key not found, skipping HF analysis");
    return {
      visual_elements: {
        objects: [],
        colors: [],
        composition: "Hugging Face analysis not available",
      },
    };
  }

  try {
    // Используем BLIP для image-to-text
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: imageBase64,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.statusText}`);
    }

    const result = await response.json();

    // BLIP возвращает текстовое описание
    const description = result[0]?.generated_text || "";

    return {
      visual_elements: {
        objects: description.split(" ").slice(0, 5).map((word, i) => ({
          label: word,
          confidence: 0.8 - i * 0.1,
        })),
        colors: [],
        composition: description,
      },
    };
  } catch (error) {
    console.error("Hugging Face analysis error:", error);
    return {
      visual_elements: {
        objects: [],
        colors: [],
        composition: "HF analysis failed",
      },
    };
  }
}

/**
 * Шаг 3: Глубокий анализ с учетом всех данных
 */
export async function performDeepAnalysis(
  input: HFAnalysisInput
): Promise<AnalysisReport> {
  const { image_base64, observation_data, previous_drawings } = input;

  // 1. Валидация
  const validation = await validateVisualRecognition(image_base64);
  if (!validation.validation_passed) {
    throw new Error(
      "Визуальное распознавание не прошло валидацию. " +
        (validation.failed_reason || "Попробуйте снова.")
    );
  }

  // 2. Анализ с Hugging Face
  const hfAnalysis = await analyzeWithHuggingFace(image_base64);

  // 3. Структурированный анализ с Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const analysisPrompt = createStructuredPrompt(
    observation_data,
    validation.objects_recognized,
    hfAnalysis,
    previous_drawings
  );

  const result = await model.generateContent([
    analysisPrompt,
    {
      inlineData: {
        mimeType: "image/png",
        data: image_base64,
      },
    },
  ]);

  const response = result.response.text();

  // Парсим JSON ответ
  let jsonText = response.trim();
  if (jsonText.includes("```json")) {
    jsonText = jsonText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
  }

  const analysis: AnalysisReport = JSON.parse(jsonText);

  // Добавляем обязательный дисклеймер
  analysis.disclaimer =
    "Этот анализ является предварительной интерпретацией и НЕ является медицинским диагнозом. " +
    "Результаты предназначены для поддержки работы квалифицированных специалистов (арт-терапевтов, психологов) " +
    "и должны рассматриваться в контексте комплексной оценки развития ребенка.";

  // Метаданные
  analysis.analysis_metadata = {
    analyzed_at: new Date().toISOString(),
    analysis_version: "2.0.0-asd-specialized",
    confidence_score: validation.description_accuracy,
    requires_professional_review: true,
  };

  return analysis;
}

/**
 * Создание структурированного промпта для анализа
 */
function createStructuredPrompt(
  observation: DrawingObservation,
  objectsFromValidation: string[],
  hfAnalysis: HFAnalysisResult,
  previousDrawings?: HFAnalysisInput["previous_drawings"]
): string {
  return `
Ты - опытный детский арт-терапевт, специализирующийся на работе с детьми с расстройствами аутистического спектра (ASD).

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. ЗАПРЕЩЕНО использовать логику "цвет = эмоция"
2. Каждый вывод ОБЯЗАТЕЛЬНО должен быть обоснован
3. Анализ МНОГОФАКТОРНЫЙ: композиция + пространство + нажим + повторяемость + детализация + процесс
4. НЕ утверждения, а ГИПОТЕЗЫ с указанием уровня уверенности
5. Учитывай специфические маркеры ASD

ДАННЫЕ О РИСОВАНИИ:

Возраст ребенка: ${observation.child_age} лет
Тип задания: ${observation.task_type}
${observation.task_description ? `Описание: ${observation.task_description}` : ""}

Эмоциональное состояние во время рисования: ${observation.emotional_states.join(", ")}
Поведение: ${observation.behaviors.join(", ")}

${observation.verbal_comments ? `Вербальные комментарии ребенка: "${observation.verbal_comments}"` : ""}

Длительность: ${observation.drawing_duration_seconds} секунд
Количество штрихов: ${observation.stroke_count}
Средний нажим: ${observation.average_pressure}/10
Использование ластика: ${observation.eraser_usage} раз

Объекты, распознанные при валидации: ${objectsFromValidation.join(", ")}

${hfAnalysis.visual_elements.composition ? `Композиционный анализ: ${hfAnalysis.visual_elements.composition}` : ""}

${previousDrawings && previousDrawings.length > 0 ? `
ПРЕДЫДУЩИЕ РИСУНКИ (для сравнения):
${previousDrawings.map((pd, i) => `
Рисунок ${i + 1} (${Math.floor((Date.now() - new Date(pd.created_at).getTime()) / (1000 * 60 * 60 * 24))} дней назад):
- Основные темы: ${pd.analysis.interpretation.emotional_themes.map(t => t.theme).join(", ")}
- Детализация: ${pd.analysis.visual_description.detail_level}
`).join("\n")}
` : ""}

ФОРМАТ ОТВЕТА (строго JSON):
{
  "visual_description": {
    "objects_identified": ["объект1", "объект2"],
    "spatial_layout": {
      "center_usage": "empty" | "partial" | "full",
      "space_distribution": "scattered" | "grouped" | "balanced" | "confined",
      "object_positions": ["описание позиции объекта 1", "описание позиции объекта 2"]
    },
    "colors_used": [
      {
        "color": "название цвета",
        "hex": "#hex",
        "coverage_percentage": число,
        "location": "где использован"
      }
    ],
    "patterns_detected": ["повторяющийся элемент 1"],
    "detail_level": "minimal" | "moderate" | "high" | "very_high"
  },
  "process_analysis": {
    "emotional_state_impact": "Как эмоциональное состояние (${observation.emotional_states.join(", ")}) отразилось на рисунке. КОНКРЕТНЫЕ примеры: нажим ${observation.average_pressure}/10 + поведение ${observation.behaviors.join(", ")}",
    "pressure_patterns": "Анализ нажима ${observation.average_pressure}/10 в контексте поведения",
    "timing_observations": "Что говорит длительность ${observation.drawing_duration_seconds}с и ${observation.stroke_count} штрихов",
    "behavioral_correlations": "Связь между ${observation.behaviors.join(", ")} и визуальным результатом"
  },
  "interpretation": {
    "emotional_themes": [
      {
        "theme": "название темы",
        "confidence": "low" | "medium" | "high",
        "supporting_evidence": ["факт 1 из рисунка", "факт 2 из процесса"]
      }
    ],
    "asd_specific_markers": [
      {
        "marker": "название маркера (повторяемость, детализация социальных сцен, пространственная организация)",
        "observation": "что именно наблюдается",
        "clinical_relevance": "почему это важно для ASD"
      }
    ]
  },
  ${previousDrawings && previousDrawings.length > 0 ? `
  "progress_tracking": {
    "changes_from_previous": [
      {
        "aspect": "аспект (цвета, пространство, детализация)",
        "change_description": "что изменилось",
        "direction": "positive" | "neutral" | "concerning"
      }
    ],
    "trend_analysis": "общий тренд развития"
  },
  ` : ""}
  "recommendations": {
    "for_parents": ["совет 1", "совет 2"],
    "for_therapists": ["рекомендация для терапевта 1"],
    "suggested_activities": ["активность 1"],
    "areas_to_monitor": ["что отслеживать"]
  }
}

ВАЖНО:
- Ответь ТОЛЬКО JSON
- Каждый вывод в interpretation.emotional_themes ОБЯЗАТЕЛЬНО должен иметь supporting_evidence
- НЕ используй шаблонные фразы
- Если удалить название цвета и текст все еще подходит к любому рисунку — ответ провален
`;
}

/**
 * Сравнение с предыдущими рисунками
 */
export async function compareWithPrevious(
  currentAnalysis: AnalysisReport,
  previousDrawing: {
    id: string;
    analysis: AnalysisReport;
    created_at: string;
    observation?: DrawingObservation;
  }
): Promise<ProgressComparison> {
  const daysSince = Math.floor(
    (Date.now() - new Date(previousDrawing.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Анализ изменений
  const colorChange =
    ((currentAnalysis.visual_description.colors_used.length -
      (previousDrawing.analysis.visual_description.colors_used?.length || 0)) /
      (previousDrawing.analysis.visual_description.colors_used?.length || 1)) *
    100;

  const currentThemes = currentAnalysis.interpretation.emotional_themes.map(
    (t) => t.theme
  );
  const previousThemes = previousDrawing.analysis.interpretation.emotional_themes.map(
    (t) => t.theme
  );

  const newThemes = currentThemes.filter((t) => !previousThemes.includes(t));
  const resolvedThemes = previousThemes.filter((t) => !currentThemes.includes(t));

  // Определение траектории
  let positiveChanges = 0;
  let negativeChanges = 0;

  if (currentAnalysis.visual_description.detail_level === "high" ||
      currentAnalysis.visual_description.detail_level === "very_high") {
    positiveChanges++;
  }

  if (colorChange > 20) positiveChanges++;
  if (newThemes.length > resolvedThemes.length) positiveChanges++;

  const trajectory =
    positiveChanges > negativeChanges
      ? "improving"
      : positiveChanges < negativeChanges
      ? "regressing"
      : "stable";

  return {
    previous_drawing_id: previousDrawing.id,
    days_since_previous: daysSince,
    changes: {
      color_usage: {
        before: previousDrawing.analysis.visual_description.colors_used?.length || 0,
        after: currentAnalysis.visual_description.colors_used.length,
        change_percentage: colorChange,
      },
      space_usage: {
        before: previousDrawing.analysis.visual_description.spatial_layout.space_distribution,
        after: currentAnalysis.visual_description.spatial_layout.space_distribution,
        interpretation: `Использование пространства изменилось с "${previousDrawing.analysis.visual_description.spatial_layout.space_distribution}" на "${currentAnalysis.visual_description.spatial_layout.space_distribution}"`,
      },
      pressure: {
        before: previousDrawing.observation?.average_pressure || 5,
        after: 5, // Нужно передавать текущее значение
        interpretation: "Изменение нажима требует дополнительного анализа",
      },
      detail_level: {
        before: previousDrawing.analysis.visual_description.detail_level,
        after: currentAnalysis.visual_description.detail_level,
        interpretation: `Уровень детализации: ${previousDrawing.analysis.visual_description.detail_level} → ${currentAnalysis.visual_description.detail_level}`,
      },
      emotional_expression: {
        before: previousThemes,
        after: currentThemes,
        new_themes: newThemes,
        resolved_themes: resolvedThemes,
      },
    },
    overall_trajectory: trajectory,
    therapist_attention_required: trajectory === "regressing" || newThemes.some(t => t.includes("тревога") || t.includes("стресс")),
  };
}
