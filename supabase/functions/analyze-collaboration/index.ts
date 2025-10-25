import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { sessionData, participantData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Ты Ceolina — добрый AI-персонаж, помогающий детям с аутизмом учиться сотрудничеству через совместное рисование.

АНАЛИЗИРУЙ совместную сессию и давай КОНКРЕТНЫЕ рекомендации:

1. СОТРУДНИЧЕСТВО:
   - Как дети взаимодействуют?
   - Ждут ли они друг друга?
   - Делятся ли пространством на холсте?
   - Есть ли баланс вклада?

2. ЭМОЦИОНАЛЬНАЯ СИНХРОННОСТЬ:
   - Используют ли похожие цвета?
   - Совпадает ли эмоциональный тон?
   - Реагируют ли на рисунки друг друга?

3. СОЦИАЛЬНЫЕ НАВЫКИ:
   - Очерёдность
   - Терпение
   - Эмпатия (реакция на партнёра)
   - Совместное решение задач

ФОРМАТ ОТВЕТА (JSON):
{
  "collaboration_score": число от 0 до 100,
  "emotional_sync": число от 0 до 100,
  "balance_score": число от 0 до 100,
  "strengths": ["сила 1", "сила 2"],
  "areas_for_growth": ["область 1", "область 2"],
  "therapist_notes": "рекомендации для терапевта",
  "encouragement": "позитивное сообщение для детей",
  "next_steps": ["следующий шаг 1", "следующий шаг 2"]
}`;

    const userPrompt = `Проанализируй совместную сессию:

ДАННЫЕ СЕССИИ:
- Длительность: ${sessionData.duration} секунд
- Участников: ${sessionData.participants}
- Тип задачи: ${sessionData.taskType}

УЧАСТНИК 1:
- Количество штрихов: ${participantData.user1.strokeCount}
- Активность: ${participantData.user1.activityRate}%
- Основные цвета: ${participantData.user1.colors.join(', ')}
- Периоды неактивности: ${participantData.user1.inactivePeriods}

УЧАСТНИК 2:
- Количество штрихов: ${participantData.user2.strokeCount}
- Активность: ${participantData.user2.activityRate}%
- Основные цвета: ${participantData.user2.colors.join(', ')}
- Периоды неактивности: ${participantData.user2.inactivePeriods}

Дай развернутый анализ сотрудничества и рекомендации.`;

    console.log('Calling AI for collaboration analysis...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log('AI Response:', aiResponse);

    let analysis;
    try {
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      analysis = {
        collaboration_score: 50,
        emotional_sync: 50,
        balance_score: 50,
        strengths: ["Работа продолжается"],
        areas_for_growth: ["Продолжайте практиковаться"],
        therapist_notes: "Данные анализируются",
        encouragement: "Отличная работа! Продолжайте рисовать вместе!",
        next_steps: ["Попробуйте новую задачу"]
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-collaboration function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
