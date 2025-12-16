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

    const { imageData, observation, previousDrawings }: AnalysisRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Starting deep drawing analysis...');

    // Step 1: Visual validation - AI must actually describe what it sees
    const validationPrompt = `Ты арт-терапевт. Опиши ТОЛЬКО ФАКТЫ о рисунке БЕЗ анализа эмоций:
1. Какие объекты изображены?
2. Где они расположены на листе (центр, углы, края)?
3. Какие цвета использованы и где?
4. Есть ли повторяющиеся формы или паттерны?
5. Какой уровень детализации?

Ответь ТОЛЬКО фактами, никаких интерпретаций.`;

    const validationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: validationPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Опиши рисунок.' },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
      }),
    });

    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error('Validation API error:', validationResponse.status, errorText);
      
      if (validationResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Превышен лимит запросов. Попробуйте позже.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (validationResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Недостаточно средств для AI-анализа.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Validation failed: ${validationResponse.status}`);
    }

    const validationResult = await validationResponse.json();
    const visualDescription = validationResult.choices?.[0]?.message?.content || '';
    
    console.log('Visual validation complete:', visualDescription.substring(0, 200));

    // Step 2: Deep multi-factor analysis with observation data
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
ДАННЫЕ О СЕССИИ:
- Возраст ребёнка: ${observation.child_age} лет
- Тип задания: ${taskTypeMap[observation.task_type] || observation.task_type}
- Длительность: ${Math.floor(observation.drawing_duration_seconds / 60)} мин ${observation.drawing_duration_seconds % 60} сек
- Эмоциональное состояние: ${observation.emotional_states.map(s => emotionalStateMap[s] || s).join(', ')}
- Поведение: ${observation.behaviors.map(b => behaviorMap[b] || b).join(', ')}
- Средний нажим: ${observation.average_pressure.toFixed(1)}/10
- Количество штрихов: ${observation.stroke_count}
- Использование ластика: ${observation.eraser_usage} раз
- Частота пауз: ${observation.pause_frequency === 'low' ? 'низкая' : observation.pause_frequency === 'medium' ? 'средняя' : 'высокая'}
${observation.verbal_comments ? `- Комментарии ребёнка: "${observation.verbal_comments}"` : ''}
${observation.additional_notes ? `- Дополнительные заметки: ${observation.additional_notes}` : ''}
`;

    let previousContext = '';
    if (previousDrawings && previousDrawings.length > 0) {
      previousContext = `\n\nПРЕДЫДУЩИЕ РИСУНКИ (${previousDrawings.length}):
${previousDrawings.slice(0, 3).map((d, i) => {
  const daysAgo = Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
  return `${i + 1}. ${daysAgo} дней назад: ${d.metadata?.clip_analysis?.colorAnalysis || 'Нет данных'}`;
}).join('\n')}

Сравни текущий рисунок с предыдущими и отметь изменения.`;
    }

    const analysisPrompt = `Ты опытный арт-терапевт, специализирующийся на работе с детьми с расстройствами аутистического спектра (ASD).

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. ЗАПРЕЩЕНО делать выводы "цвет = эмоция" (темный ≠ грусть, яркий ≠ радость)
2. Анализ ТОЛЬКО многофакторный: композиция + пространство + нажим + процесс + детализация
3. Каждый вывод ОБЯЗАТЕЛЬНО обоснован конкретными визуальными данными
4. Все интерпретации - это ГИПОТЕЗЫ, а не утверждения
5. НЕ используй шаблонные фразы ("выражает эмоции через цвет", "рисунок отражает внутренний мир")

ФАКТИЧЕСКОЕ ОПИСАНИЕ РИСУНКА (от AI):
${visualDescription}

${observationContext}
${previousContext}

Проанализируй рисунок и верни JSON строго в следующем формате:
{
  "visual_description": {
    "objects_identified": ["массив объектов на рисунке"],
    "spatial_layout": {
      "center_usage": "empty|partial|full",
      "space_distribution": "scattered|grouped|balanced|confined",
      "object_positions": ["описание позиций объектов"]
    },
    "colors_used": [
      {"color": "название", "hex": "#код", "coverage_percentage": число, "location": "где использован"}
    ],
    "patterns_detected": ["повторяющиеся элементы"],
    "detail_level": "minimal|moderate|high|very_high"
  },
  "process_analysis": {
    "emotional_state_impact": "как эмоциональное состояние повлияло на рисунок",
    "pressure_patterns": "анализ нажима в контексте наблюдений",
    "timing_observations": "анализ темпа и пауз",
    "behavioral_correlations": "связь поведения с результатом"
  },
  "interpretation": {
    "emotional_themes": [
      {
        "theme": "название темы",
        "confidence": "low|medium|high",
        "supporting_evidence": ["конкретные визуальные доказательства"]
      }
    ],
    "asd_specific_markers": [
      {
        "marker": "название маркера",
        "observation": "что наблюдается",
        "clinical_relevance": "клиническая значимость"
      }
    ]
  },
  "progress_tracking": {
    "changes_from_previous": [
      {
        "aspect": "аспект",
        "change_description": "описание изменения",
        "direction": "positive|neutral|concerning"
      }
    ],
    "trend_analysis": "общий анализ тренда"
  },
  "recommendations": {
    "for_parents": ["рекомендации для родителей"],
    "for_therapists": ["рекомендации для терапевтов"],
    "suggested_activities": ["рекомендуемые активности"],
    "areas_to_monitor": ["области для наблюдения"]
  },
  "disclaimer": "Этот анализ носит наблюдательный характер и не является медицинским диагнозом. Для клинической оценки обратитесь к квалифицированному специалисту.",
  "analysis_metadata": {
    "confidence_score": число от 0 до 100,
    "requires_professional_review": true/false
  }
}`;

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: analysisPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Проведи глубокий анализ этого рисунка. Верни только JSON.' },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Analysis API error:', analysisResponse.status, errorText);
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisResult = await analysisResponse.json();
    let analysisContent = analysisResult.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', analysisContent);
      throw new Error('Invalid analysis response format');
    }

    let report;
    try {
      report = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, jsonMatch[0]);
      throw new Error('Failed to parse analysis response');
    }

    // Add metadata
    report.analysis_metadata = {
      ...report.analysis_metadata,
      analyzed_at: new Date().toISOString(),
      analysis_version: '2.0-deep',
    };

    // If no previous drawings, remove progress_tracking
    if (!previousDrawings || previousDrawings.length === 0) {
      delete report.progress_tracking;
    }

    console.log('Deep analysis complete');

    return new Response(
      JSON.stringify({
        success: true,
        report,
        visualValidation: visualDescription
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
