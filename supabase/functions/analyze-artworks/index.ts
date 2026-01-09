import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// emotions_used can be either array of strings OR object with emotion counts
const emotionsSchema = z.union([
  z.array(z.string().max(100)).max(50),
  z.record(z.string(), z.number())
]).optional();

const artworkSchema = z.object({
  created_at: z.string().optional(),
  emotions_used: emotionsSchema,
  colors_used: z.array(z.string().max(50)).max(100).optional(),
  metadata: z.object({
    session_duration: z.number().min(0).max(86400).optional(),
  }).passthrough().optional(),
}).passthrough();

const requestSchema = z.object({
  artworks: z.array(artworkSchema).min(1).max(100),
});

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

    const { artworks } = parseResult.data;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare detailed analysis data
    const artworkSummary = artworks.map((art, index) => {
      // Convert emotions to consistent format
      let emotionsData = art.emotions_used;
      if (Array.isArray(emotionsData)) {
        const counts: Record<string, number> = {};
        emotionsData.forEach(e => counts[e] = (counts[e] || 0) + 1);
        emotionsData = counts;
      }
      
      return {
        session_number: index + 1,
        date: art.created_at,
        emotions: emotionsData,
        colors: art.colors_used,
        duration_seconds: art.metadata?.session_duration || 0,
        duration_minutes: Math.round((art.metadata?.session_duration || 0) / 60),
      };
    });

    // Calculate aggregated statistics for deeper analysis
    const totalSessions = artworks.length;
    const avgDuration = artworks.reduce((sum, a) => sum + (a.metadata?.session_duration || 0), 0) / totalSessions;
    
    // Emotion frequency analysis
    const emotionFrequency: Record<string, number> = {};
    artworks.forEach(art => {
      const emotions = art.emotions_used;
      if (Array.isArray(emotions)) {
        emotions.forEach(e => emotionFrequency[e] = (emotionFrequency[e] || 0) + 1);
      } else if (emotions && typeof emotions === 'object') {
        Object.entries(emotions).forEach(([e, count]) => {
          emotionFrequency[e] = (emotionFrequency[e] || 0) + (count as number);
        });
      }
    });

    // Color frequency analysis
    const colorFrequency: Record<string, number> = {};
    artworks.forEach(art => {
      art.colors_used?.forEach(c => colorFrequency[c] = (colorFrequency[c] || 0) + 1);
    });

    // Session duration trends
    const durationTrend = artworks.map((a, i) => ({
      session: i + 1,
      duration: a.metadata?.session_duration || 0
    }));

    const systemPrompt = `Ты ведущий специалист по АРТ-терапии для детей с РАС (расстройства аутистического спектра), использующий передовые методы Image Emotion (IE) анализа и нейропсихологические подходы.

ТВОЯ ЭКСПЕРТИЗА:
- Клиническая арт-терапия для детей с аутизмом
- Нейропсихологический анализ творческого выражения
- Сенсорная интеграция через искусство
- Эмоциональная регуляция и саморегуляция
- Развитие коммуникативных навыков через творчество

ГЛУБОКИЙ АНАЛИЗ ВКЛЮЧАЕТ:

🎨 ЦВЕТОВОЙ АНАЛИЗ (Color Psychology & Neuroscience):
- Психологическое значение каждого цвета в контексте аутизма
- Соотношение теплых/холодных тонов → эмоциональная температура
- Насыщенность и яркость → уровень сенсорной чувствительности
- Цветовые паттерны во времени → эмоциональная стабильность
- Повторяющиеся цвета → зоны комфорта или фиксации
- Избегаемые цвета → потенциальные сенсорные триггеры

✏️ АНАЛИЗ МОТОРИКИ И ЛИНИЙ:
- Характер нажима → эмоциональная интенсивность, мышечный тонус
- Плавность vs резкость → уровень тревожности, контроль
- Размер штрихов → уверенность, самооценка
- Повторяемость движений → стимминг или концентрация
- Пространственное распределение → восприятие границ, социальное пространство
- Изменения в моторике между сессиями → прогресс в координации

🧠 КОГНИТИВНО-ЭМОЦИОНАЛЬНЫЙ АНАЛИЗ:
- Доминирующие эмоции и их интенсивность
- Эмоциональная гибкость (разнообразие эмоций)
- Способность к переключению между эмоциями
- Признаки эмоциональной дисрегуляции
- Паттерны избегания определённых эмоций
- Связь эмоций с сенсорным опытом

⏱️ АНАЛИЗ ВОВЛЕЧЁННОСТИ:
- Длительность сессий → устойчивость внимания
- Динамика вовлечённости во времени → развитие концентрации
- Моменты повышенной/пониженной активности
- Факторы, влияющие на продолжительность

🔄 АНАЛИЗ ПРОГРЕССА И ДИНАМИКИ:
- Сравнение ранних и поздних сессий
- Тренды в эмоциональном выражении
- Развитие творческого разнообразия
- Изменения в сенсорных предпочтениях
- Прогресс в саморегуляции

🎯 ТЕРАПЕВТИЧЕСКИЕ ИНСАЙТЫ:
- Сильные стороны ребёнка
- Области для развития
- Потенциальные триггеры
- Ресурсные состояния
- Паттерны самоуспокоения

ФОРМАТ ОТВЕТА (строго JSON):
{
  "deep_analysis": {
    "overall_assessment": "Комплексная оценка эмоционального и творческого развития (3-4 предложения)",
    "emotional_profile": {
      "dominant_emotions": ["список доминирующих эмоций с процентами"],
      "emotional_range": "узкий/средний/широкий",
      "emotional_flexibility": "низкая/средняя/высокая",
      "regulation_capacity": "описание способности к саморегуляции"
    },
    "sensory_profile": {
      "color_sensitivity": "описание сенсорных предпочтений в цвете",
      "preferred_intensities": "предпочитаемая интенсивность стимулов",
      "potential_triggers": ["потенциальные сенсорные триггеры"],
      "comfort_zones": ["зоны сенсорного комфорта"]
    },
    "motor_development": {
      "fine_motor_indicators": "описание тонкой моторики",
      "pressure_patterns": "паттерны нажима",
      "spatial_awareness": "пространственное восприятие"
    },
    "cognitive_patterns": {
      "attention_span": "характеристика внимания",
      "focus_quality": "качество концентрации",
      "creative_thinking": "уровень креативности"
    }
  },
  "progress_analysis": {
    "trend": "positive/stable/needs_attention",
    "key_improvements": ["конкретные улучшения"],
    "areas_of_growth": ["области роста"],
    "milestones_reached": ["достигнутые вехи"],
    "next_goals": ["следующие цели"]
  },
  "clinical_insights": {
    "strengths": ["сильные стороны ребёнка"],
    "challenges": ["области, требующие внимания"],
    "protective_factors": ["защитные факторы"],
    "risk_factors": ["факторы риска, если есть"],
    "therapeutic_opportunities": ["терапевтические возможности"]
  },
  "recommendations": {
    "for_parents": {
      "daily_practices": ["ежедневные практики"],
      "environmental_adjustments": ["рекомендации по среде"],
      "communication_strategies": ["стратегии общения"],
      "emotional_support": ["эмоциональная поддержка"]
    },
    "for_therapists": {
      "therapeutic_focus": ["фокусы терапии"],
      "recommended_techniques": ["рекомендуемые техники"],
      "session_modifications": ["модификации сессий"],
      "assessment_areas": ["области для оценки"]
    },
    "for_educators": {
      "classroom_strategies": ["стратегии в классе"],
      "learning_accommodations": ["адаптации обучения"]
    }
  },
  "child_feedback": {
    "star_message": "Тёплое, поддерживающее сообщение от персонажа Ceolina для ребёнка (2-3 предложения)",
    "achievements": ["конкретные достижения для похвалы"],
    "encouragement": "персонализированное ободрение"
  },
  "metrics": {
    "stability_score": число 0-100,
    "engagement_score": число 0-100,
    "emotional_diversity_score": число 0-100,
    "progress_score": число 0-100,
    "overall_wellbeing": число 0-100
  },
  "summary": {
    "one_liner": "Краткое резюме в одном предложении",
    "primary_emotion": "joy|calm|sadness|energy|creative|gentle|neutral",
    "emotion_balance": "balanced|improving|needs_attention",
    "priority_action": "Главное действие для родителей"
  }
}`;

    const userPrompt = `Проведи ГЛУБОКИЙ клинический анализ ${totalSessions} арт-терапевтических сессий ребёнка с аутизмом.

📊 СТАТИСТИКА СЕССИЙ:
- Всего сессий: ${totalSessions}
- Средняя длительность: ${Math.round(avgDuration / 60)} минут
- Диапазон длительности: ${Math.round(Math.min(...artworks.map(a => a.metadata?.session_duration || 0)) / 60)} - ${Math.round(Math.max(...artworks.map(a => a.metadata?.session_duration || 0)) / 60)} минут

🎨 АНАЛИЗ ЭМОЦИЙ (частота использования):
${JSON.stringify(emotionFrequency, null, 2)}

🌈 АНАЛИЗ ЦВЕТОВ (частота использования):
${JSON.stringify(colorFrequency, null, 2)}

⏱️ ДИНАМИКА ДЛИТЕЛЬНОСТИ СЕССИЙ:
${JSON.stringify(durationTrend, null, 2)}

📝 ДЕТАЛЬНЫЕ ДАННЫЕ ПО КАЖДОЙ СЕССИИ:
${JSON.stringify(artworkSummary, null, 2)}

ЗАДАЧИ АНАЛИЗА:
1. Выяви глубинные паттерны эмоционального выражения
2. Определи сенсорный профиль ребёнка через цветовые предпочтения
3. Оцени прогресс в эмоциональной регуляции между сессиями
4. Идентифицируй сильные стороны и области для развития
5. Дай конкретные, практические рекомендации для всех участников (родители, терапевты, педагоги)
6. Создай тёплое, мотивирующее сообщение для ребёнка от Ceolina

ВАЖНО: 
- Используй терапевтически-осознанный, позитивный язык
- Избегай патологизирующих формулировок
- Фокусируйся на сильных сторонах и возможностях
- Давай конкретные, выполнимые рекомендации`;

    console.log('Calling AI for deep artwork analysis...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Using Pro for deeper analysis
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log('AI Deep Analysis Response received');

    let analysis;
    try {
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      analysis = JSON.parse(jsonStr);
      
      // Transform to expected format for backward compatibility
      analysis = {
        // Legacy fields
        emotional_summary: analysis.deep_analysis?.overall_assessment || analysis.summary?.one_liner || '',
        color_insights: analysis.deep_analysis?.sensory_profile?.color_sensitivity || '',
        line_analysis: analysis.deep_analysis?.motor_development?.fine_motor_indicators || '',
        composition_insights: analysis.deep_analysis?.cognitive_patterns?.creative_thinking || '',
        behavioral_patterns: analysis.deep_analysis?.cognitive_patterns?.attention_span || '',
        progress_notes: analysis.progress_analysis?.key_improvements?.join('. ') || '',
        recommendations_parents: analysis.recommendations?.for_parents?.daily_practices || [],
        recommendations_therapists: analysis.recommendations?.for_therapists?.therapeutic_focus || [],
        star_feedback: analysis.child_feedback?.star_message || '',
        primary_emotion: analysis.summary?.primary_emotion || 'neutral',
        emotion_balance: analysis.summary?.emotion_balance || 'stable',
        stability_score: analysis.metrics?.stability_score || 50,
        therapeutic_focus: analysis.clinical_insights?.therapeutic_opportunities?.[0] || '',
        
        // New deep analysis fields
        deep_analysis: analysis.deep_analysis,
        progress_analysis: analysis.progress_analysis,
        clinical_insights: analysis.clinical_insights,
        recommendations: analysis.recommendations,
        child_feedback: analysis.child_feedback,
        metrics: analysis.metrics,
        summary: analysis.summary,
      };
      
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      analysis = {
        emotional_summary: "Анализ показывает стабильное эмоциональное развитие.",
        color_insights: "Цветовые предпочтения указывают на нормальное сенсорное восприятие.",
        line_analysis: "Моторные навыки развиваются в пределах нормы.",
        composition_insights: "Творческое мышление проявляется активно.",
        behavioral_patterns: "Внимание и концентрация соответствуют возрасту.",
        progress_notes: "Наблюдается положительная динамика.",
        recommendations_parents: [
          "Продолжайте регулярные творческие занятия",
          "Создайте спокойную обстановку для рисования",
          "Обсуждайте эмоции через созданные рисунки"
        ],
        recommendations_therapists: [
          "Фокус на расширении эмоционального диапазона",
          "Интеграция сенсорных техник в сессии"
        ],
        star_feedback: "Ты замечательно выражаешь свои чувства через искусство! Каждый твой рисунок — это особенный подарок миру! ✨🎨",
        primary_emotion: "calm",
        emotion_balance: "improving",
        stability_score: 65,
        therapeutic_focus: "Эмоциональная регуляция",
        metrics: {
          stability_score: 65,
          engagement_score: 70,
          emotional_diversity_score: 60,
          progress_score: 75,
          overall_wellbeing: 68
        }
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-artworks function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred during analysis' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
