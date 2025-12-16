# Примеры использования CLIP Analysis

## 1. Базовый анализ изображения

```typescript
import { analyzeCLIP } from "@/lib/clip-service";

// Анализ загруженного изображения
const handleImageUpload = async (imageFile: File) => {
  // Конвертация в base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    const imageData = e.target?.result as string;

    try {
      const analysis = await analyzeCLIP(imageData, {
        taskContext: "Анализ детского рисунка для арт-терапии"
      });

      console.log("Общая оценка:", analysis.overallScore);
      console.log("Эмоции:", analysis.emotions);
      console.log("Рекомендации:", analysis.therapeuticRecommendations);
    } catch (error) {
      console.error("Ошибка анализа:", error);
    }
  };
  reader.readAsDataURL(imageFile);
};
```

## 2. Анализ с кастомными метками

```typescript
import { analyzeCLIP } from "@/lib/clip-service";

const analyzeWithCustomLabels = async (imageData: string) => {
  const analysis = await analyzeCLIP(imageData, {
    candidateLabels: [
      // Специфические эмоции
      "joy", "sadness", "anger", "fear", "surprise",
      // Терапевтические маркеры
      "stress", "relaxation", "confidence", "anxiety",
      // Социальные элементы
      "family", "friends", "isolation", "connection"
    ],
    taskContext: "Оценка социально-эмоционального состояния"
  });

  return analysis;
};
```

## 3. Использование вспомогательных функций

```typescript
import {
  analyzeCLIP,
  getDominantEmotion,
  hasPositiveEmotions,
  getColorTheme,
  formatAnalysisForDisplay
} from "@/lib/clip-service";

const analyzeAndFormat = async (imageData: string) => {
  const analysis = await analyzeCLIP(imageData);

  // Получить доминирующую эмоцию
  const emotion = getDominantEmotion(analysis);
  console.log(`Основная эмоция: ${emotion?.emotion} (${emotion?.confidence * 100}%)`);

  // Проверить позитивность
  const isPositive = hasPositiveEmotions(analysis, 0.6);
  console.log(`Позитивное настроение: ${isPositive ? "Да" : "Нет"}`);

  // Определить цветовую тему
  const colorTheme = getColorTheme(analysis);
  console.log(`Цветовая тема: ${colorTheme}`);

  // Форматировать для отображения
  const formatted = formatAnalysisForDisplay(analysis);
  return formatted;
};
```

## 4. Сравнение двух анализов (прогресс)

```typescript
import { analyzeCLIP, compareAnalyses } from "@/lib/clip-service";

const trackProgress = async (previousImage: string, currentImage: string) => {
  const [previousAnalysis, currentAnalysis] = await Promise.all([
    analyzeCLIP(previousImage),
    analyzeCLIP(currentImage)
  ]);

  const comparison = compareAnalyses(previousAnalysis, currentAnalysis);

  console.log("Изменение оценки:", comparison.scoreChange);
  console.log("Улучшение?", comparison.scoreImprovement);
  console.log("Эмоция изменилась?", comparison.emotionChanged);
  console.log("Резюме:", comparison.summary);

  // Показать уведомление о прогрессе
  if (comparison.sentimentImproved) {
    toast.success("Отличный прогресс! Эмоциональное состояние улучшилось!");
  } else if (comparison.sentimentDeclined) {
    toast.warning("Требуется внимание. Рассмотрите терапевтическую поддержку.");
  }

  return comparison;
};
```

## 5. Пакетный анализ нескольких изображений

```typescript
import { analyzeCLIPBatch } from "@/lib/clip-service";

const analyzeMultipleDrawings = async (imageFiles: File[]) => {
  // Конвертация всех файлов в base64
  const imageDataPromises = imageFiles.map(file => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  });

  const imageDataArray = await Promise.all(imageDataPromises);

  // Анализ всех изображений
  const analyses = await analyzeCLIPBatch(imageDataArray, {
    taskContext: "Пакетный анализ творческих работ"
  });

  // Агрегация результатов
  const avgScore = analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length;
  const allEmotions = analyses.flatMap(a => a.emotions);

  console.log("Средняя оценка:", avgScore);
  console.log("Все эмоции:", allEmotions);

  return analyses;
};
```

## 6. Интеграция с компонентом ArtTherapy

```typescript
// src/components/ArtTherapy.tsx
import { analyzeCLIP, formatAnalysisForDisplay } from "@/lib/clip-service";
import { supabase } from "@/integrations/supabase/client";

const analyzeArtwork = async (canvasData: string, userId: string) => {
  try {
    // Анализ с CLIP
    const analysis = await analyzeCLIP(canvasData, {
      taskContext: "Анализ арт-терапевтической сессии"
    });

    const formatted = formatAnalysisForDisplay(analysis);

    // Сохранение в базу данных
    const { error } = await supabase
      .from('artworks')
      .insert({
        user_id: userId,
        image_url: canvasData,
        metadata: {
          clip_analysis: analysis,
          formatted_analysis: formatted,
          analyzed_at: new Date().toISOString()
        },
        emotions_used: analysis.emotions.map(e => e.emotion),
        colors_used: [getColorTheme(analysis)]
      });

    if (error) throw error;

    // Показать результаты пользователю
    toast.success(analysis.ceolinaFeedback);

    return formatted;
  } catch (error) {
    console.error("Ошибка анализа:", error);
    toast.error("Не удалось проанализировать рисунок");
  }
};
```

## 7. Обработка ошибок

```typescript
import { analyzeCLIP, CLIPAnalysisError } from "@/lib/clip-service";

const safeAnalyze = async (imageData: string) => {
  try {
    const analysis = await analyzeCLIP(imageData);
    return { success: true, data: analysis };
  } catch (error) {
    if (error instanceof CLIPAnalysisError) {
      // Специфические ошибки CLIP API
      if (error.statusCode === 429) {
        return {
          success: false,
          error: "Превышен лимит запросов. Попробуйте позже."
        };
      } else if (error.statusCode === 503) {
        return {
          success: false,
          error: "Модель загружается. Подождите 30 секунд."
        };
      }
    }

    // Общая ошибка
    return {
      success: false,
      error: "Произошла ошибка при анализе изображения"
    };
  }
};
```

## 8. Кэширование результатов

```typescript
import { analyzeCLIP } from "@/lib/clip-service";

const cache = new Map<string, any>();

const analyzeCLIPWithCache = async (
  imageData: string,
  options?: any
) => {
  // Создать ключ кэша из хэша изображения
  const cacheKey = btoa(imageData.substring(0, 100));

  // Проверить кэш
  if (cache.has(cacheKey)) {
    console.log("Результат взят из кэша");
    return cache.get(cacheKey);
  }

  // Выполнить анализ
  const analysis = await analyzeCLIP(imageData, options);

  // Сохранить в кэш
  cache.set(cacheKey, analysis);

  return analysis;
};
```

## 9. Real-time анализ во время рисования

```typescript
import { useState, useEffect } from "react";
import { analyzeCLIP } from "@/lib/clip-service";
import { debounce } from "lodash";

const ArtCanvas = () => {
  const [canvasData, setCanvasData] = useState<string>("");
  const [liveAnalysis, setLiveAnalysis] = useState<any>(null);

  // Debounced анализ (каждые 3 секунды)
  const analyzeLive = debounce(async (imageData: string) => {
    try {
      const analysis = await analyzeCLIP(imageData, {
        taskContext: "Live анализ в процессе рисования"
      });
      setLiveAnalysis(analysis);
    } catch (error) {
      console.error("Live анализ не удался:", error);
    }
  }, 3000);

  useEffect(() => {
    if (canvasData) {
      analyzeLive(canvasData);
    }
  }, [canvasData]);

  return (
    <div>
      <canvas
        onMouseUp={() => {
          // Получить данные canvas
          const data = canvas.toDataURL();
          setCanvasData(data);
        }}
      />

      {liveAnalysis && (
        <div className="live-feedback">
          <p>Текущая эмоция: {getDominantEmotion(liveAnalysis)?.emotion}</p>
          <p>Оценка: {liveAnalysis.overallScore}%</p>
        </div>
      )}
    </div>
  );
};
```

## 10. Экспорт аналитики для специалистов

```typescript
import { analyzeCLIPBatch, formatAnalysisForDisplay } from "@/lib/clip-service";

const generateTherapyReport = async (userId: string) => {
  // Получить все рисунки пользователя
  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (!artworks) return null;

  // Анализ всех рисунков
  const analyses = await analyzeCLIPBatch(
    artworks.map(a => a.image_url)
  );

  // Форматирование для отчёта
  const report = {
    userId,
    totalArtworks: artworks.length,
    dateRange: {
      from: artworks[0].created_at,
      to: artworks[artworks.length - 1].created_at
    },
    averageScore: analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length,
    emotionalTrends: {
      positive: analyses.filter(a => hasPositiveEmotions(a)).length,
      neutral: analyses.filter(a => !hasPositiveEmotions(a) && !hasNegativeEmotions(a)).length,
      needsAttention: analyses.filter(a => hasNegativeEmotions(a)).length
    },
    recommendations: [
      ...new Set(analyses.flatMap(a => a.therapeuticRecommendations))
    ],
    progressSummary: compareAnalyses(analyses[0], analyses[analyses.length - 1])
  };

  // Экспорт в JSON
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Скачать
  const a = document.createElement('a');
  a.href = url;
  a.download = `therapy-report-${userId}-${Date.now()}.json`;
  a.click();

  return report;
};
```

---

Эти примеры демонстрируют различные сценарии использования CLIP анализа в приложении INME.
