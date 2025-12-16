# CLIP Image Analysis Integration

## Описание

В приложение INME интегрирована модель **OpenAI CLIP (clip-vit-large-patch14)** для глубокого анализа детских рисунков в контексте арт-терапии. CLIP - это мультимодальная нейросеть, которая понимает взаимосвязь между изображениями и текстом.

## Возможности CLIP анализа

### 1. Zero-Shot Image Classification
- Определение содержимого рисунка без предварительного обучения
- Классификация по произвольным текстовым меткам
- Оценка вероятности каждой метки (confidence score)

### 2. Эмоциональный анализ
Автоматическое определение эмоций через визуальные признаки:
- **Радость (happy)** - яркие цвета, динамичные формы
- **Спокойствие (calm)** - плавные линии, холодные оттенки
- **Грусть (sad)** - тёмные тона, минимализм
- **Возбуждение (excited)** - насыщенные цвета, хаос
- **Умиротворение (peaceful)** - мягкие переходы, природные мотивы

### 3. Анализ композиции
- Структурированность vs хаотичность
- Детализация (много деталей vs простота)
- Узнаваемые объекты (люди, животные, природа, дома)

### 4. Цветовой анализ
- Тёплые vs холодные цвета
- Яркость и насыщенность
- Разнообразие палитры

## Как это работает

### Архитектура

```
[Детский рисунок]
    ↓
[Base64 Encoding]
    ↓
[Supabase Edge Function: analyze-image-clip]
    ↓
[Hugging Face API: openai/clip-vit-large-patch14]
    ↓
[Zero-Shot Classification с терапевтическими метками]
    ↓
[Обработка и интерпретация результатов]
    ↓
[Терапевтические рекомендации]
    ↓
[Сохранение в Supabase Database]
```

### Метки для анализа (по умолчанию)

**Эмоциональные метки:**
- happy, sad, angry, calm, excited, peaceful

**Визуальные характеристики:**
- colorful, dark, bright, structured, chaotic

**Содержимое:**
- person, animal, nature, house, abstract, geometric

**Цветовые характеристики:**
- warm colors, cool colors

**Детализация:**
- many details, simple drawing

## Настройка и использование

### 1. Переменные окружения

В файле `.env` уже настроен ключ API:

```env
VITE_HUGGINGFACE_API_KEY="your_huggingface_api_key"
```

### 2. Деплой Edge Function

```bash
# Перейти в директорию проекта
cd "c:\Users\Нурзат\Documents\INME App\INME-by-Ceolina"

# Войти в Supabase CLI
supabase login

# Линковать проект
supabase link --project-ref ragmaoabxrzcndasyggy

# Задать секреты
supabase secrets set HUGGINGFACE_API_KEY=your_huggingface_api_key

# Деплой функции
supabase functions deploy analyze-image-clip
```

### 3. Использование в коде

```typescript
import { supabase } from "@/integrations/supabase/client";

// Анализ изображения
const { data, error } = await supabase.functions.invoke('analyze-image-clip', {
  body: {
    imageData: base64ImageData, // "data:image/png;base64,..."
    candidateLabels: ['happy', 'creative', 'detailed'], // Опционально
    taskContext: 'Рисунок ребенка для арт-терапии' // Опционально
  }
});

if (!error && data?.analysis) {
  console.log('Топ метки:', data.analysis.labels);
  console.log('Эмоции:', data.analysis.emotions);
  console.log('Рекомендации:', data.analysis.therapeuticRecommendations);
}
```

### 4. Структура ответа

```typescript
interface CLIPAnalysisResult {
  // Топ-10 меток с вероятностями
  labels: Array<{ label: string; score: number }>;

  // Обнаруженные эмоции
  emotions: Array<{ emotion: string; confidence: number }>;

  // Анализ цвета
  colorAnalysis: string;

  // Анализ композиции
  compositionInsights: string;

  // Терапевтические рекомендации
  therapeuticRecommendations: string[];

  // Обратная связь от Ceolina
  ceolinaFeedback: string;

  // Общая оценка (0-100)
  overallScore: number;
}
```

## Преимущества CLIP для арт-терапии

### 1. Объективность
- Независимый AI анализ без человеческих предубеждений
- Количественные метрики для отслеживания прогресса

### 2. Мультимодальность
- Понимание связи между визуальным и вербальным
- Гибкая настройка меток под терапевтические задачи

### 3. Zero-Shot Learning
- Не требует обучения на конкретных данных
- Работает с любыми изображениями "из коробки"

### 4. Динамический анализ
- Возможность менять метки для разных терапевтических сессий
- Адаптация под индивидуальные потребности ребёнка

## Ограничения и рекомендации

### Ограничения модели
- Не заменяет профессиональную оценку психолога
- Может давать неточные результаты на абстрактных детских рисунках
- Требует интернет-соединения для API вызовов

### Рекомендации по использованию
1. Используйте CLIP анализ как **дополнительный** инструмент
2. Комбинируйте с традиционными методами арт-терапии
3. Настраивайте метки под конкретные терапевтические цели
4. Отслеживайте динамику изменений во времени
5. Всегда учитывайте контекст и историю ребёнка

## Стоимость и лимиты

### Hugging Face Inference API
- **Бесплатный тир**: ~30,000 requests/месяц
- **Платный тир**: от $9/месяц за расширенные лимиты
- Средний response time: 1-3 секунды

### Оптимизация использования
- Кэширование результатов в Supabase
- Батчевая обработка при массовом анализе
- Использование только для финальных работ (не для каждого штриха)

## Примеры использования

### Анализ рисунка "Моя семья"
```json
{
  "labels": [
    { "label": "person", "score": 0.89 },
    { "label": "warm colors", "score": 0.76 },
    { "label": "structured", "score": 0.72 }
  ],
  "emotions": [
    { "emotion": "happy", "confidence": 0.81 },
    { "emotion": "calm", "confidence": 0.65 }
  ],
  "colorAnalysis": "Преобладают теплые цвета, что указывает на позитивное настроение",
  "overallScore": 89
}
```

### Анализ абстрактного рисунка
```json
{
  "labels": [
    { "label": "abstract", "score": 0.92 },
    { "label": "colorful", "score": 0.85 },
    { "label": "chaotic", "score": 0.67 }
  ],
  "emotions": [
    { "emotion": "excited", "confidence": 0.74 }
  ],
  "colorAnalysis": "Богатая и разнообразная цветовая палитра показывает эмоциональную выразительность",
  "overallScore": 74
}
```

## Дальнейшее развитие

### Планируемые улучшения
1. Fine-tuning CLIP на детских рисунках для улучшения точности
2. Интеграция с другими модальностями (аудио, текст)
3. Автоматическое построение трендов и графиков прогресса
4. Персонализация меток под каждого ребёнка
5. Экспорт аналитики для специалистов

---

**Версия:** 1.0
**Дата:** 2025-12-16
**Автор:** INME Team
