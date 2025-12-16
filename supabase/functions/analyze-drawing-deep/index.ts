import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DrawingObservation {
  child_id: string;
  child_age: number;
  session_date: string;
  observer_name?: string;
  task_type: string;
  task_description?: string;
  emotional_states: string[];
  behaviors: string[];
  verbal_comments?: string;
  materials_used: string[];
  colors_count: number;
  drawing_duration_seconds: number;
  pause_frequency: string;
  stroke_count: number;
  average_pressure: number;
  eraser_usage: number;
  additional_notes?: string;
}

interface AnalysisRequest {
  imageData: string;
  observation: DrawingObservation;
  previousDrawings?: {
    id: string;
    created_at: string;
    metadata: any;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageData, observation, previousDrawings }: AnalysisRequest = await req.json();

    if (!imageData) {
      console.error('No image data provided');
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting deep drawing analysis for user:', user.id);
    console.log('Image data length:', imageData.length);
    console.log('Observation data:', JSON.stringify(observation).substring(0, 200));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build observation context
    const taskTypeMap: Record<string, string> = {
      'free_drawing': 'Свободное рисование',
      'draw_family': 'Нарисуй семью',
      'draw_emotion': 'Нарисуй эмоцию',
      'draw_happy': 'Нарисуй себя счастливым',
      'draw_sad': 'Нарисуй себя грустным',
      'custom': observation.task_description || 'Другое задание'
    };

    const emotionalStateMap: Record<string, string> = {
      'calm': 'Спокоен',
      'anxious': 'Тревожен',
      'withdrawn': 'Отстранен',
      'excited': 'Возбужден',
      'frustrated': 'Фрустрирован',
      'neutral': 'Нейтрален'
    };

    const behaviorMap: Record<string, string> = {
      'focused': 'Сосредоточен',
      'distracted': 'Часто отвлекался',
      'strong_pressure': 'Сильный нажим',
      'fast_drawing': 'Быстрое рисование',
      'slow_drawing': 'Медленное рисование',
      'frequent_pauses': 'Частые паузы'
    };

    const observationContext = `
ДАННЫЕ О СЕССИИ РИСОВАНИЯ:
- Возраст ребёнка: ${observation.child_age} лет
- Тип задания: ${taskTypeMap[observation.task_type] || observation.task_type}
- Длительность: ${Math.floor(observation.drawing_duration_seconds / 60)} мин
- Эмоциональное состояние во время рисования: ${observation.emotional_states.map(s => emotionalStateMap[s] || s).join(', ')}
- Поведение: ${observation.behaviors.map(b => behaviorMap[b] || b).join(', ')}
- Средний нажим: ${observation.average_pressure}/10
${observation.verbal_comments ? `- Комментарии ребёнка во время рисования: "${observation.verbal_comments}"` : ''}
${observation.additional_notes ? `- Дополнительные заметки наблюдателя: ${observation.additional_notes}` : ''}
`;

    let previousContext = '';
    if (previousDrawings && previousDrawings.length > 0) {
      previousContext = `\n\nИСТОРИЯ ПРЕДЫДУЩИХ РИСУНКОВ (${previousDrawings.length}):
${previousDrawings.slice(0, 3).map((d, i) => {
  const daysAgo = Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const prevAnalysis = d.metadata?.deep_analysis || d.metadata?.clip_analysis;
  return `${i + 1}. ${daysAgo} дней назад: ${prevAnalysis?.visual_description?.objects_identified?.join(', ') || 'Нет данных'}`;
}).join('\n')}

Обязательно сравни текущий рисунок с предыдущими и отметь изменения в динамике.`;
    }

    // Single comprehensive analysis prompt
    const analysisPrompt = `Ты опытный детский арт-терапевт, специализирующийся на работе с детьми с РАС (расстройство аутистического спектра).

ТВОЯ ЗАДАЧА: Провести глубокий, многофакторный анализ детского рисунка.

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. ЗАПРЕЩЕНО делать простые выводы "цвет = эмоция" (темный ≠ грусть, яркий ≠ радость)
2. Анализ должен быть МНОГОФАКТОРНЫМ: учитывай композицию, использование пространства, детализацию, паттерны, а также данные о процессе рисования
3. КАЖДЫЙ вывод ОБЯЗАТЕЛЬНО обосновывай конкретными визуальными элементами рисунка
4. Все интерпретации — это ГИПОТЕЗЫ, а не утверждения
5. НЕ используй шаблонные фразы ("ребёнок выражает эмоции через цвет", "рисунок отражает внутренний мир")
6. Описывай КОНКРЕТНО что изображено: какие объекты, где расположены, какого размера, как детализированы

${observationContext}
${previousContext}

ВНИМАТЕЛЬНО ИЗУЧИ РИСУНОК И ОТВЕТЬ В ФОРМАТЕ JSON:

{
  "visual_description": {
    "objects_identified": ["подробный список всех объектов, которые ты видишь на рисунке"],
    "spatial_layout": {
      "center_usage": "empty или partial или full - насколько заполнен центр листа",
      "space_distribution": "scattered или grouped или balanced или confined - как распределены элементы",
      "object_positions": ["конкретные позиции: например 'солнце в правом верхнем углу', 'дом занимает центр', 'человек слева внизу']"
    },
    "colors_used": [
      {"color": "название цвета", "hex": "#примерный код", "coverage_percentage": примерный процент, "location": "где использован этот цвет"}
    ],
    "patterns_detected": ["повторяющиеся элементы, формы, линии"],
    "detail_level": "minimal или moderate или high или very_high",
    "composition_analysis": "анализ композиции: баланс, симметрия, фокусные точки"
  },
  "process_analysis": {
    "emotional_state_impact": "как наблюдаемое эмоциональное состояние ребёнка могло повлиять на рисунок",
    "pressure_patterns": "анализ нажима (${observation.average_pressure}/10) в контексте содержания рисунка",
    "timing_observations": "что говорит длительность ${Math.floor(observation.drawing_duration_seconds / 60)} мин о вовлечённости",
    "behavioral_correlations": "связь между наблюдаемым поведением и результатом на рисунке"
  },
  "interpretation": {
    "emotional_themes": [
      {
        "theme": "название эмоциональной темы (это ГИПОТЕЗА)",
        "confidence": "low или medium или high",
        "supporting_evidence": ["конкретные визуальные элементы рисунка, подтверждающие эту гипотезу"]
      }
    ],
    "asd_specific_markers": [
      {
        "marker": "название маркера специфичного для ASD",
        "observation": "что конкретно наблюдается на рисунке",
        "clinical_relevance": "почему это может быть важно для понимания ребёнка"
      }
    ],
    "developmental_observations": "наблюдения о развитии мелкой моторики, пространственного мышления"
  },
  "progress_tracking": ${previousDrawings && previousDrawings.length > 0 ? `{
    "changes_from_previous": [
      {
        "aspect": "аспект изменения",
        "change_description": "что изменилось по сравнению с предыдущими рисунками",
        "direction": "positive или neutral или concerning"
      }
    ],
    "trend_analysis": "общий анализ тренда развития"
  }` : 'null'},
  "recommendations": {
    "for_parents": ["конкретные рекомендации для родителей на основе анализа"],
    "for_therapists": ["рекомендации для терапевтов"],
    "suggested_activities": ["рекомендуемые арт-терапевтические активности"],
    "areas_to_monitor": ["области, требующие внимания и наблюдения"]
  },
  "disclaimer": "Данный анализ носит наблюдательный характер и не является медицинским диагнозом. Для клинической оценки необходима консультация квалифицированного специалиста.",
  "analysis_metadata": {
    "confidence_score": число от 0 до 100 - общая уверенность в анализе,
    "requires_professional_review": true или false - нужна ли проверка специалиста
  }
}

ВАЖНО: Отвечай ТОЛЬКО валидным JSON без markdown-обёртки, без \`\`\`json, просто чистый JSON.`;

    console.log('Sending request to Lovable AI...');

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a JSON API. Always respond with valid JSON only, no markdown formatting, no code blocks, no explanations. Just pure JSON.'
          },
          { 
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
        max_tokens: 8192,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Analysis API error:', analysisResponse.status, errorText);
      
      if (analysisResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Превышен лимит запросов. Попробуйте позже.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (analysisResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Недостаточно средств для AI-анализа.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Analysis failed: ${analysisResponse.status} - ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();
    let analysisContent = analysisResult.choices?.[0]?.message?.content || '';
    
    console.log('AI Response length:', analysisContent.length);
    console.log('AI Response preview:', analysisContent.substring(0, 500));

    // Extract JSON from response (handle markdown code blocks)
    let jsonString = analysisContent;
    
    // Remove markdown code blocks if present
    const jsonBlockMatch = analysisContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    } else {
      // Try to find raw JSON
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }

    let report;
    try {
      report = JSON.parse(jsonString);
      console.log('JSON parsed successfully');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', jsonString.substring(0, 1000));
      
      // Create a fallback report with the raw AI response
      report = {
        visual_description: {
          objects_identified: ['Не удалось распарсить ответ AI'],
          spatial_layout: {
            center_usage: 'partial',
            space_distribution: 'balanced',
            object_positions: []
          },
          colors_used: [],
          patterns_detected: [],
          detail_level: 'moderate',
          composition_analysis: analysisContent.substring(0, 500)
        },
        process_analysis: {
          emotional_state_impact: 'Анализ требует ручной проверки',
          pressure_patterns: '',
          timing_observations: '',
          behavioral_correlations: ''
        },
        interpretation: {
          emotional_themes: [],
          asd_specific_markers: []
        },
        recommendations: {
          for_parents: ['Рекомендуется повторный анализ'],
          for_therapists: [],
          suggested_activities: [],
          areas_to_monitor: []
        },
        disclaimer: 'Произошла ошибка при обработке анализа. Пожалуйста, попробуйте снова.',
        analysis_metadata: {
          confidence_score: 0,
          requires_professional_review: true
        }
      };
    }

    // Add metadata
    report.analysis_metadata = {
      ...report.analysis_metadata,
      analyzed_at: new Date().toISOString(),
      analysis_version: '2.1-deep',
    };

    // If no previous drawings, ensure progress_tracking is null
    if (!previousDrawings || previousDrawings.length === 0) {
      report.progress_tracking = null;
    }

    console.log('Analysis complete, returning report');

    return new Response(
      JSON.stringify({
        success: true,
        report
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-drawing-deep function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
