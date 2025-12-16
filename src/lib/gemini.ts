import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface AssessmentData {
  assessment_data: {
    responses?: Array<{
      question: string;
      answer: string;
      category?: string;
    }>;
  };
}

export interface LearningPathWeek {
  week: number;
  theme: string;
  focus: string;
  activities: Array<{
    title: string;
    description: string;
    duration: string;
    materials: string[];
  }>;
  goals: string[];
}

export async function generateLearningPath(
  assessmentData: AssessmentData,
  childName: string = "ребёнок",
  childAge: number = 6
): Promise<{ weeks: LearningPathWeek[] }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Ты - опытный детский психолог и специалист по арт-терапии. Создай персонализированную 12-недельную программу обучения для ребёнка с особенностями развития.

ИНФОРМАЦИЯ О РЕБЁНКЕ:
- Имя: ${childName}
- Возраст: ${childAge} лет
- Результаты диагностики: ${JSON.stringify(assessmentData.assessment_data, null, 2)}

ТРЕБОВАНИЯ К ПРОГРАММЕ:
1. Программа должна быть адаптирована под уровень развития ребёнка
2. Каждая неделя должна иметь ясную тему и фокус
3. Активности должны быть основаны на арт-терапии и творчестве
4. Включи сенсорные, эмоциональные и когнитивные упражнения
5. Постепенно увеличивай сложность
6. Используй русский язык

ФОРМАТ ОТВЕТА (строго JSON без дополнительного текста):
{
  "weeks": [
    {
      "week": 1,
      "theme": "Знакомство с эмоциями",
      "focus": "Базовые эмоции: радость и грусть",
      "activities": [
        {
          "title": "Рисуем радость",
          "description": "Создание рисунка на тему радости с использованием ярких цветов",
          "duration": "15-20 минут",
          "materials": ["бумага", "краски", "кисти"]
        }
      ],
      "goals": ["Распознавание эмоций", "Самовыражение через творчество"]
    }
  ]
}

Создай ВСЕ 12 недель с разнообразными активностями. Ответь ТОЛЬКО JSON, без дополнительных комментариев.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Попытка извлечь JSON из ответа
    let jsonText = text.trim();

    // Удаляем markdown блоки кода если есть
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    try {
      const learningPath = JSON.parse(jsonText);
      return learningPath;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Не удалось разобрать ответ AI. Попробуйте ещё раз.");
    }
  } catch (error) {
    console.error("Error generating learning path with Gemini:", error);
    throw error;
  }
}

export async function analyzDrawing(imageBase64: string, context?: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Ты - детский психолог-арттерапевт. Проанализируй этот детский рисунок.

${context ? `Контекст: ${context}` : ''}

Обрати внимание на:
1. Использование цветов и их эмоциональное значение
2. Композицию и размещение элементов
3. Уровень детализации
4. Возможные эмоциональные состояния ребёнка
5. Рекомендации для родителей

Ответь на русском языке, в дружелюбном и поддерживающем тоне.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error analyzing drawing with Gemini:", error);
    throw error;
  }
}
