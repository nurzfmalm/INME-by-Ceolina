import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const requestSchema = z.object({
  assessmentId: z.string().optional().nullable(),
  assessmentData: z.record(z.string(), z.union([
    z.number(), z.string(), z.array(z.string()), z.array(z.number()), z.boolean(), z.null(),
    z.record(z.string(), z.unknown()),
  ])).optional().nullable(),
  childName: z.string().min(1).max(100).optional().nullable(),
  childAge: z.union([z.number(), z.string()]).optional().nullable(),
  childId: z.string().uuid().optional().nullable(),
  preferences: z.object({
    focusAreas: z.array(z.string()).optional(),
    sessionDuration: z.number().optional(),
    preferredTypes: z.array(z.string()).optional(),
    personalNotes: z.string().optional(),
    complexity: z.string().optional(),
  }).optional().nullable(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedUserId = userData.user.id;

    let rawBody;
    try { rawBody = await req.json(); } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { assessmentId, assessmentData: providedData, childName, childAge, childId, preferences } = parseResult.data;

    let assessmentData: Record<string, unknown> | null | undefined = providedData;
    if (!assessmentData && assessmentId && !assessmentId.startsWith('assessment-')) {
      const { data: assessment } = await supabaseClient
        .from('adaptive_assessments').select('*').eq('id', assessmentId).single();
      if (assessment) assessmentData = assessment.assessment_data as Record<string, unknown>;
    }
    if (!assessmentData) {
      assessmentData = { q1: 3, q2: 2, q3: 4, q4: 3 };
    }

    const sanitizedChildName = childName?.replace(/[<>\"'&]/g, '') || 'Ребёнок';
    const sanitizedChildAge = childAge ?? 'не указан';

    // Build preferences context
    const prefContext = preferences ? `
ПРЕДПОЧТЕНИЯ СПЕЦИАЛИСТА:
- Фокусные области: ${preferences.focusAreas?.join(', ') || 'не указаны'}
- Длительность занятия: ${preferences.sessionDuration || 15} мин
- Предпочитаемые типы: ${preferences.preferredTypes?.join(', ') || 'разнообразные'}
- Сложность: ${preferences.complexity || 'адаптивная'}
- Заметки специалиста: ${preferences.personalNotes || 'нет'}
` : '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

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
          content: `Ты ведущий эксперт по арт-терапии для детей с расстройствами аутистического спектра (РАС).

НАУЧНАЯ БАЗА:
Программа основана на доказательных подходах:
- DIR/Floortime (Stanley Greenspan) — следуем за интересами ребёнка, развиваем через эмоциональное вовлечение
- TEACCH (структурированное обучение) — визуальные подсказки, предсказуемая структура занятий
- Сенсорная интеграция (Jean Ayres) — регуляция сенсорного ввода через рисование
- Арт-терапия по Judith Rubin — процесс важнее результата, свобода самовыражения
- ABA-элементы — подкрепление, постепенное усложнение, разбивка навыков на шаги

РЕБЁНОК:
- Имя: ${sanitizedChildName}
- Возраст: ${sanitizedChildAge} лет

РЕЗУЛЬТАТЫ ДИАГНОСТИКИ (1=низкий, 4=высокий):
${JSON.stringify(assessmentData, null, 2)}

${prefContext}

ЗАДАНИЕ: Создай 6-недельную программу арт-терапии.

КАЖДАЯ АКТИВНОСТЬ должна содержать:
- "title": краткое название
- "type": один из ["solo_drawing", "tracing", "symmetry", "half_tracing", "collaborative", "sensory", "observation", "mixed"]
- "difficulty": "easy" / "medium" / "hard"
- "description": подробная инструкция для специалиста (3-5 предложений)
- "duration_minutes": число
- "materials": список конкретных материалов ["мягкие карандаши", "гуашь", "ватман A3"]
- "steps": пошаговая инструкция для специалиста (массив строк, 3-6 шагов)
- "therapeutic_rationale": почему именно это задание для этого ребёнка (1-2 предложения)
- "sensory_focus": ["visual", "tactile", "proprioceptive", "vestibular"]
- "emotional_goals": ["саморегуляция", "самовыражение", "уверенность"]
- "adaptation_notes": как адаптировать если ребёнку слишком легко или сложно
- "success_indicators": что считать успехом (массив строк)

ФОРМАТ (строго JSON):
{
  "weeks": [
    {
      "week": 1,
      "theme": "Знакомство с материалами",
      "goals": ["цель 1", "цель 2"],
      "activities": [ ... ],
      "adaptation_triggers": {
        "if_faster": "рекомендация при быстром прогрессе",
        "if_slower": "рекомендация при медленном прогрессе"
      }
    }
  ],
  "overall_focus_areas": ["область 1", "область 2"],
  "parent_recommendations": "рекомендации для родителей (2-3 предложения)"
}

ВАЖНО:
- ВСЕ 6 недель, 3-5 активностей в каждой
- Постепенное усложнение от недели к неделе
- Учитывай диагностику: низкие показатели = больше внимания этой области
- Разнообразие типов активностей
- Конкретные материалы и пошаговые инструкции
- Верни ТОЛЬКО валидный JSON`
        }],
        temperature: 0.7,
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    let pathData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      pathData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      throw new Error('Failed to parse AI response');
    }

    const insertData: Record<string, unknown> = {
      user_id: authenticatedUserId,
      path_data: pathData,
      current_week: 1,
      total_weeks: 6,
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      completion_percentage: 0,
    };
    if (childId) insertData.child_id = childId;

    let existingPath = null;
    const queryBuilder = supabaseClient.from('learning_paths').select('id').eq('user_id', authenticatedUserId);
    if (childId) {
      const { data } = await queryBuilder.eq('child_id', childId).maybeSingle();
      existingPath = data;
    } else {
      const { data } = await queryBuilder.is('child_id', null).maybeSingle();
      existingPath = data;
    }

    let learningPath;
    if (existingPath) {
      const { data, error: updateError } = await supabaseClient
        .from('learning_paths')
        .update({ path_data: pathData, current_week: 1, total_weeks: 6, started_at: new Date().toISOString(), last_activity: new Date().toISOString(), completion_percentage: 0 })
        .eq('id', existingPath.id).select().single();
      if (updateError) throw updateError;
      learningPath = data;
    } else {
      const { data, error: insertError } = await supabaseClient
        .from('learning_paths').insert(insertData).select().single();
      if (insertError) throw insertError;
      learningPath = data;
    }

    return new Response(
      JSON.stringify({ success: true, learningPath, message: 'Персональная программа создана!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-learning-path:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
