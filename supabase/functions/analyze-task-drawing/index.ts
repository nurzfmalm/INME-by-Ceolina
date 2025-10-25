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
Your role is to VISUALLY analyze drawings and evaluate if they match task requirements.

CRITICAL RULES:
1. Look at the ACTUAL drawing content - what objects, shapes, figures are drawn
2. If task asks to "draw a friend" but you only see random lines/scribbles - REJECT (taskCompleted: false)
3. If task asks for specific things (emotions, objects, scenes) - they MUST be visible in the drawing
4. Minimal effort (just lines, single stroke, blank canvas) = NO tokens (0-2 tokens max)
5. Proper attempt that matches task = 10-20 tokens

Be warm but honest about whether the drawing actually addresses the task.`;

    const userPrompt = `Task: "${taskPrompt}"

Statistics: ${colorsUsed.length} colors used, emotions: ${JSON.stringify(emotionStats)}

ANALYZE THE IMAGE CAREFULLY:
- What do you actually SEE in the drawing?
- Does it relate to the task prompt?
- Is this a real attempt or just scribbles/minimal effort?

If COMPLETED (matches task requirements):
- Describe what you see that matches the task
- Give warm congratulations in Russian
- Award 10-20 tokens based on quality

If NOT COMPLETED (doesn't match task or minimal effort):
- Explain what's missing: "Я вижу только линии, но не вижу друга"
- Give SPECIFIC suggestions based on the task:
  * For "draw a friend": "Нарисуй человечка с головой, телом, руками и ногами"
  * For "show happiness": "Нарисуй улыбку, солнце или яркие цветы"
- Award only 0-5 tokens for effort

Respond ONLY with valid JSON:
{
  "taskCompleted": true/false,
  "score": 0-100,
  "feedback": "what you see + evaluation in Russian",
  "tokensAwarded": 0-20,
  "suggestions": ["specific hint 1", "specific hint 2"]
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
              { 
                type: "image_url", 
                image_url: { url: imageData }
              }
            ]
          }
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
