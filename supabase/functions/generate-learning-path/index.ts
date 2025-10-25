import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { assessmentId } = await req.json();

    // Fetch assessment data
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('adaptive_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) throw assessmentError;

    const answers = assessment.assessment_data;

    // Generate personalized learning path using Lovable AI
    const aiResponse = await fetch('https://api.lovable.app/v1/ai/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Ты эксперт по разработке индивидуальных программ арт-терапии для детей с аутизмом.

На основе диагностических ответов создай 6-недельную персональную программу:

Ответы на диагностику:
${JSON.stringify(answers, null, 2)}

Создай JSON с таким форматом:
{
  "weeks": [
    {
      "week": 1,
      "theme": "название темы",
      "goals": ["цель 1", "цель 2"],
      "activities": [
        {
          "day": 1,
          "title": "название",
          "type": "solo_drawing|collaborative|sensory",
          "difficulty": "easy|medium|hard",
          "description": "описание",
          "duration_minutes": 20,
          "sensory_focus": ["visual", "tactile"],
          "emotional_goals": ["радость", "спокойствие"]
        }
      ],
      "adaptation_triggers": {
        "if_faster": "рекомендации если справляется быстро",
        "if_slower": "рекомендации если медленнее"
      }
    }
  ],
  "overall_focus_areas": ["область 1", "область 2"],
  "parent_recommendations": "общие рекомендации для родителей"
}`
        }],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!aiResponse.ok) {
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const pathData = JSON.parse(aiData.choices[0].message.content);

    // Save learning path to database
    const { data: learningPath, error: pathError } = await supabaseClient
      .from('learning_paths')
      .insert({
        user_id: assessment.user_id,
        path_data: pathData,
        current_week: 1,
        total_weeks: 6,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (pathError) throw pathError;

    return new Response(
      JSON.stringify({ success: true, learningPath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
