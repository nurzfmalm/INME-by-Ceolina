import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema - CRITICAL for security
const requestSchema = z.object({
  imageData: z.string()
    .refine(val => val.startsWith('data:image/'), { message: 'Image must be a valid data URL' })
    .refine(val => val.length <= 5 * 1024 * 1024, { message: 'Image size must be less than 5MB' }), // 5MB limit
  taskPrompt: z.string()
    .min(1, { message: 'Task prompt is required' })
    .max(500, { message: 'Task prompt must be less than 500 characters' })
    .refine(val => !/[<>{}[\]\\]/.test(val), { message: 'Task prompt contains invalid characters' }), // Basic sanitization
  emotionStats: z.record(z.string().max(50), z.number().min(0).max(1000000)).optional().default({}),
  colorsUsed: z.array(z.string().max(50)).max(100).optional().default([]),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    // Parse and validate input - CRITICAL for preventing DoS and prompt injection
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: parseResult.error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageData, taskPrompt, emotionStats, colorsUsed } = parseResult.data;
    
    console.log("Analyzing task drawing with validated prompt");
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Star, a friendly art therapy assistant for children aged 6-12.
Your role is to VISUALLY analyze drawings and evaluate if they match task requirements.

CRITICAL RULES:
1. Look at the ACTUAL drawing content - what objects, shapes, figures are drawn
2. If task asks to "draw a friend" but you only see random lines/scribbles - REJECT (taskCompleted: false)
3. If task asks for specific things (emotions, objects, scenes) - they MUST be visible in the drawing
4. Minimal effort (just lines, single stroke, blank canvas) = NO tokens (0-2 tokens max)
5. Proper attempt that matches task = 10-20 tokens

Be warm but honest about whether the drawing actually addresses the task.`;

    // Safe prompt construction - taskPrompt is already validated and sanitized
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
      console.error("AI gateway error:", response.status);
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

    console.log("Analysis result completed");

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-task-drawing:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred during analysis" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
