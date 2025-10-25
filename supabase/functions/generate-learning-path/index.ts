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

    const { assessmentId, userId } = await req.json();
    
    console.log('Generating learning path for assessment:', assessmentId, 'user:', userId);

    // Fetch assessment data
    let assessmentData: any = null;
    
    if (assessmentId && !assessmentId.startsWith('assessment-')) {
      const { data: assessment, error: assessmentError } = await supabaseClient
        .from('adaptive_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) {
        console.error('Error fetching assessment:', assessmentError);
        throw assessmentError;
      }
      
      assessmentData = assessment.assessment_data;
    } else {
      // For guest users, use placeholder data
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
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));
    
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
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    console.log('Parsed path data:', JSON.stringify(pathData));

    // Save learning path to database (only for authenticated users)
    let learningPath = null;
    
    if (userId) {
      const { data: path, error: pathError } = await supabaseClient
        .from('learning_paths')
        .insert({
          user_id: userId,
          path_data: pathData,
          current_week: 1,
          total_weeks: 6,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pathError) {
        console.error('Error saving learning path:', pathError);
        throw pathError;
      }
      
      learningPath = path;
      console.log('Learning path saved:', learningPath.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        learningPath: learningPath || { path_data: pathData, id: assessmentId },
        message: 'Персональная программа создана!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-learning-path:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
