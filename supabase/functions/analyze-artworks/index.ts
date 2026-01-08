import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const artworkSchema = z.object({
  created_at: z.string().optional(),
  emotions_used: z.array(z.string().max(100)).max(50).optional(),
  colors_used: z.array(z.string().max(50)).max(100).optional(),
  metadata: z.object({
    session_duration: z.number().min(0).max(86400).optional(),
  }).passthrough().optional(),
}).passthrough();

const requestSchema = z.object({
  artworks: z.array(artworkSchema).min(1).max(100), // Limit to 100 artworks max
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

    // Parse and validate input
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

    // Prepare analysis data
    const artworkSummary = artworks.map((art) => ({
      date: art.created_at,
      emotions: art.emotions_used,
      colors: art.colors_used,
      duration: art.metadata?.session_duration || 0,
    }));

    const systemPrompt = `Ты специалист по АРТ-терапии для детей с аутизмом, использующий Image Emotion (IE) анализ.
Анализируй рисунки детей по РАСШИРЕННЫМ параметрам:

🎨 АНАЛИЗ ЦВЕТА (Color Psychology):
- Доминирующие цвета и их психологическое значение
- Соотношение теплых/холодных тонов (эмоциональная температура)
- Интенсивность и насыщенность (уровень возбуждения)
- Цветовые переходы во времени (эмоциональная динамика)
- Повторяющиеся цвета (паттерны стабильности/тревожности)

✏️ АНАЛИЗ ЛИНИЙ И ШТРИХОВ:
- Давление и нажим (эмоциональная интенсивность)
- Направление линий (фокус, целеустремленность)
- Плавность vs резкость (спокойствие vs напряжение)
- Повторяемость штрихов (навязчивость или концентрация)
- Изменения в качестве линий между сессиями

🧩 АНАЛИЗ ФОРМ И КОМПОЗИЦИИ:
- Узнаваемые объекты (лица, дома, абстракции)
- Симметрия и структура (контроль, порядок)
- Пространственный баланс (хаос vs организация)
- Размеры объектов (уверенность в себе)

💬 ПОВЕДЕНЧЕСКИЙ И КОНТЕКСТНЫЙ АНАЛИЗ:
- Длительность сессии (вовлеченность)
- Паузы и переключения инструментов (концентрация)
- Эмоциональные реакции на подсказки
- Связь рисунков с реальными событиями

ФОРМАТ JSON ОТВЕТА:
{
  "emotional_summary": "холистическое описание эмоционального состояния с учетом всех параметров",
  "color_insights": "детальный анализ цветов: психология, динамика, паттерны",
  "line_analysis": "анализ штрихов: давление, направление, плавность, изменения",
  "composition_insights": "формы, структура, баланс, узнаваемые элементы",
  "behavioral_patterns": "паттерны поведения во время рисования",
  "progress_notes": "конкретные изменения в эмоциональной регуляции, сравнение с прошлыми сессиями",
  "recommendations_parents": ["рекомендация 1", "рекомендация 2", "рекомендация 3"],
  "recommendations_therapists": ["профессиональная рекомендация 1", "рекомендация 2"],
  "star_feedback": "позитивное сообщение для ребенка от персонажа Star",
  "primary_emotion": "joy|calm|sadness|energy|creative|gentle|introspect|neutral",
  "emotion_balance": "balanced|improving|needs_attention",
  "stability_score": число от 0 до 100,
  "therapeutic_focus": "области для терапевтического внимания"
}`;

    const userPrompt = `Проведи глубокий IE (Image Emotion) анализ ${artworks.length} рисунков ребенка:
${JSON.stringify(artworkSummary, null, 2)}

ЗАДАЧИ:
1. Проанализируй цветовую палитру и её психологическое значение
2. Оцени качество и характер линий (нажим, плавность, направление)
3. Определи паттерны эмоций и их динамику во времени
4. Выяви изменения в эмоциональной регуляции
5. Дай конкретные, позитивные рекомендации для родителей и терапевтов
6. Создай вдохновляющее сообщение от Star для ребенка

ВАЖНО: Используй детально-ориентированный, терапевтически-осознанный язык. Избегай негативных диагностических формулировок.`;

    console.log('Calling AI for artwork analysis...');
    
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
    
    console.log('AI Response:', aiResponse);

    // Try to parse JSON from AI response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback structure with expanded fields
      analysis = {
        emotional_summary: aiResponse.substring(0, 200),
        color_insights: "Анализ цветов обрабатывается",
        line_analysis: "Анализ линий обрабатывается",
        composition_insights: "Анализ композиции обрабатывается",
        behavioral_patterns: "Поведенческие паттерны анализируются",
        progress_notes: "Данные о прогрессе обрабатываются",
        recommendations_parents: ["Продолжайте поддерживать творческое выражение", "Создайте безопасное пространство для рисования"],
        recommendations_therapists: ["Отслеживайте динамику эмоций", "Используйте арт-терапию для развития регуляции"],
        star_feedback: "Ты замечательно выражаешь свои эмоции через рисунки! Продолжай творить! ✨",
        primary_emotion: "neutral",
        emotion_balance: "improving",
        stability_score: 50,
        therapeutic_focus: "Эмоциональная регуляция"
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
