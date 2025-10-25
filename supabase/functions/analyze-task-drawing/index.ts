import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, taskPrompt, emotionStats, colorsUsed } = await req.json();
    
    console.log("Analyzing task drawing with prompt:", taskPrompt);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Ceolina, a friendly art therapy assistant for children aged 6-12.
Your role is to evaluate if drawings match task requirements and provide encouraging, specific guidance.
When tasks aren't completed correctly, give clear, actionable suggestions in Russian.
Always be warm, supportive, and specific about what to improve.`;

    const userPrompt = `Task Prompt: "${taskPrompt}"

Drawing Statistics:
- Emotions used: ${JSON.stringify(emotionStats)}
- Colors used: ${colorsUsed.length} different colors

Analyze if this drawing appropriately addresses the task prompt.

If COMPLETED (taskCompleted: true):
- Give warm congratulations in Russian
- Award 10-20 tokens based on quality
- Mention specific positive aspects

If NOT COMPLETED (taskCompleted: false):
- Start with "Давай попробуем ещё раз!"
- Give 2-3 SPECIFIC suggestions like:
  * "Попробуй использовать больше синих и зелёных цветов для спокойствия"
  * "Нарисуй солнце или цветы, чтобы показать радость"
  * "Добавь больше деталей в свой рисунок"
- Award 0-5 tokens for effort
- Be encouraging and specific

Respond with JSON in this exact format:
{
  "taskCompleted": true/false,
  "score": 0-100,
  "feedback": "detailed feedback in Russian with specific suggestions",
  "tokensAwarded": number (0-20),
  "suggestions": ["конкретная подсказка 1", "конкретная подсказка 2"]
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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    let analysisResult;

    try {
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysisResult = {
        taskCompleted: true,
        score: 70,
        feedback: "Отличная работа! Продолжай рисовать!",
        tokensAwarded: 10,
        suggestions: []
      };
    }

    console.log("Analysis result:", analysisResult);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-task-drawing:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
