import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schema - flexible to accept various assessment data formats
const requestSchema = z.object({
  assessmentId: z.string().optional().nullable(),
  assessmentData: z.record(z.string(), z.union([
    z.number(),
    z.string(),
    z.array(z.string()),
    z.array(z.number()),
    z.boolean(),
    z.null()
  ])).optional().nullable(),
  childName: z.string()
    .min(1)
    .max(100)
    .optional()
    .nullable(),
  childAge: z.union([z.number(), z.string()]).optional().nullable(),
  childId: z.string().uuid().optional().nullable(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user using getUser with the token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    console.log('User auth result:', userData?.user?.id ? 'authenticated' : 'failed', authError?.message || 'no error');
    
    if (authError || !userData?.user) {
      console.error('Token validation failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedUserId = userData.user.id;
    console.log('Authenticated user:', authenticatedUserId);

    // Parse and validate request body
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

    const { assessmentId, assessmentData: providedData, childName, childAge, childId } = parseResult.data;
    
    console.log('Generating learning path for assessment:', assessmentId, 'user:', authenticatedUserId, 'child:', childId);

    // Fetch assessment data from DB or use provided data - accept any format
    let assessmentData: Record<string, unknown> | null | undefined = providedData;
    
    if (!assessmentData && assessmentId && !assessmentId.startsWith('assessment-')) {
      const { data: assessment, error: assessmentError } = await supabaseClient
        .from('adaptive_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) {
        console.error('Error fetching assessment:', assessmentError);
        throw assessmentError;
      }
      
      assessmentData = assessment.assessment_data as Record<string, unknown>;
    }
    
    // Default data if nothing provided
    if (!assessmentData) {
      assessmentData = {
        q1: 3,
        q2: 2,
        q3: 4,
        q4: 3,
        q5: 2,
        q6: 4,
        q7: 3
      };
    }

    console.log('Assessment data:', JSON.stringify(assessmentData));

    // Sanitize childName for AI prompt (already validated by schema, but extra safety)
    const sanitizedChildName = childName?.replace(/[<>\"'&]/g, '') || 'Ребёнок';
    const sanitizedChildAge = childAge ?? 'не указан';

    // Generate personalized learning path using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Ты эксперт по разработке индивидуальных программ арт-терапии для детей с аутизмом.

Информация о ребёнке:
- Имя: ${sanitizedChildName}
- Возраст: ${sanitizedChildAge} лет

На основе диагностических ответов (по шкале от 1 до 5, где 1 - низкий уровень, 5 - высокий) создай 6-недельную персональную программу:

Результаты диагностики:
${JSON.stringify(assessmentData, null, 2)}

Создай детальную программу в формате JSON:
{
  "weeks": [
    {
      "week": 1,
      "theme": "Знакомство с цветами и эмоциями",
      "goals": ["Научиться различать основные цвета", "Связывать цвета с эмоциями"],
      "activities": [
        {
          "day": 1,
          "title": "Радуга чувств",
          "type": "solo_drawing",
          "difficulty": "easy",
          "description": "Нарисуй радугу используя любимые цвета",
          "duration_minutes": 15,
          "sensory_focus": ["visual", "tactile"],
          "emotional_goals": ["радость", "спокойствие"]
        },
        {
          "day": 2,
          "title": "Моё настроение",
          "type": "solo_drawing",
          "difficulty": "easy",
          "description": "Нарисуй как выглядит твоё настроение сегодня",
          "duration_minutes": 20,
          "sensory_focus": ["visual"],
          "emotional_goals": ["самовыражение"]
        },
        {
          "day": 3,
          "title": "Цветные круги",
          "type": "solo_drawing",
          "difficulty": "medium",
          "description": "Создай узор из цветных кругов",
          "duration_minutes": 20,
          "sensory_focus": ["visual", "motor"],
          "emotional_goals": ["концентрация", "спокойствие"]
        }
      ],
      "adaptation_triggers": {
        "if_faster": "Добавить больше деталей в рисунки, использовать новые техники смешивания цветов",
        "if_slower": "Упростить задания, использовать меньше цветов, увеличить время на выполнение"
      }
    }
  ],
  "overall_focus_areas": ["Эмоциональная регуляция", "Мелкая моторика", "Социальное взаимодействие"],
  "parent_recommendations": "Создайте спокойную обстановку для занятий. Хвалите за процесс, а не только за результат. Не торопите ребёнка."
}

ВАЖНО: 
- Создай ВСЕ 6 недель с 3-5 активностями на каждую неделю
- Постепенно увеличивай сложность от недели к неделе
- Учитывай результаты диагностики при составлении программы
- Используй разнообразные типы активностей: solo_drawing, collaborative, sensory
- Верни ТОЛЬКО валидный JSON, без дополнительного текста`
        }],
        temperature: 0.7,
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    
    const content = aiData.choices[0].message.content;
    
    // Extract JSON from the content (in case there's extra text)
    let pathData;
    try {
      // Try to find JSON in the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        pathData = JSON.parse(jsonMatch[0]);
      } else {
        pathData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response');
      throw new Error('Failed to parse AI response');
    }

    console.log('Parsed path data successfully');

    // Save learning path to database - use upsert to update existing paths
    const insertData: Record<string, unknown> = {
      user_id: authenticatedUserId,
      path_data: pathData,
      current_week: 1,
      total_weeks: 6,
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      completion_percentage: 0,
    };
    
    if (childId) {
      insertData.child_id = childId;
    }
    
    // First try to find existing learning path for this user/child
    let existingPath = null;
    const queryBuilder = supabaseClient
      .from('learning_paths')
      .select('id')
      .eq('user_id', authenticatedUserId);
    
    if (childId) {
      const { data } = await queryBuilder.eq('child_id', childId).maybeSingle();
      existingPath = data;
    } else {
      const { data } = await queryBuilder.is('child_id', null).maybeSingle();
      existingPath = data;
    }
    
    let learningPath;
    
    if (existingPath) {
      // Update existing learning path
      const { data, error: updateError } = await supabaseClient
        .from('learning_paths')
        .update({
          path_data: pathData,
          current_week: 1,
          total_weeks: 6,
          started_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          completion_percentage: 0,
        })
        .eq('id', existingPath.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating learning path:', updateError);
        throw updateError;
      }
      learningPath = data;
      console.log('Learning path updated:', learningPath.id);
    } else {
      // Insert new learning path
      const { data, error: insertError } = await supabaseClient
        .from('learning_paths')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Error saving learning path:', insertError);
        throw insertError;
      }
      learningPath = data;
      console.log('Learning path created:', learningPath.id);
    }
    
    console.log('Learning path saved:', learningPath.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        learningPath: learningPath,
        message: 'Персональная программа создана!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-learning-path:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
