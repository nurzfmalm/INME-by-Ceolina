import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageData, shapeName, shapeId, mode, difficulty } = await req.json();
    
    console.log(`Analyzing tracing: shape=${shapeName}, mode=${mode}, difficulty=${difficulty}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const modeDescriptions: Record<string, string> = {
      trace: "Ребёнок должен был обвести контур фигуры по пунктирным линиям",
      draw: "Ребёнок должен был нарисовать фигуру самостоятельно, глядя на маленький образец в углу",
      color: "Ребёнок должен был раскрасить фигуру цветами"
    };

    const systemPrompt = `Ты - доброжелательный помощник для обучения детей 4-10 лет рисованию.
Твоя задача - оценить, насколько хорошо ребёнок выполнил задание по рисованию фигуры.

Режим: ${modeDescriptions[mode]}
Фигура: ${shapeName}
Сложность: ${difficulty}/3

КРИТЕРИИ ОЦЕНКИ:
- Для режима "trace" (обводка): проверь, насколько линии ребёнка совпадают с контуром
- Для режима "draw" (рисование): проверь, узнаваема ли фигура и правильны ли пропорции
- Для режима "color" (раскраска): проверь, аккуратно ли закрашено и использованы ли цвета

Будь ПОЗИТИВНЫМ и ПОДДЕРЖИВАЮЩИМ! Отмечай старания ребёнка.
Если рисунок не идеален - это нормально, дай мягкие советы.

Считай задание ВЫПОЛНЕННЫМ (passed: true) если:
- Видна попытка нарисовать нужную фигуру
- Фигура хотя бы частично узнаваема
- Ребёнок явно старался

НЕ ВЫПОЛНЕНО только если:
- Холст пустой или почти пустой
- Нарисовано что-то совершенно другое
- Просто хаотичные каракули без попытки сделать фигуру`;

    const userPrompt = `Проанализируй рисунок ребёнка.

Ребёнок должен был: ${modeDescriptions[mode]}
Фигура: ${shapeName}

Дай оценку в JSON формате:
{
  "passed": true/false,
  "accuracy": 0-100,
  "feedback": "Добрый отзыв на русском для ребёнка",
  "tokensAwarded": 3-10,
  "tips": ["совет 1", "совет 2"],
  "emotionalState": "радость/сосредоточенность/старание/затруднение"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageData } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    let result;

    try {
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      result = {
        passed: true,
        accuracy: 70,
        feedback: "Хорошая работа! Продолжай стараться!",
        tokensAwarded: 5,
        tips: ["Старайся рисовать плавными линиями"],
        emotionalState: "старание"
      };
    }

    // Adjust tokens based on difficulty and mode
    const baseTokens = result.tokensAwarded || 5;
    const modeMultiplier = mode === "draw" ? 1.5 : mode === "color" ? 1.2 : 1;
    const difficultyBonus = difficulty * 2;
    result.tokensAwarded = Math.round(baseTokens * modeMultiplier + difficultyBonus);

    console.log("Analysis result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-tracing:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
