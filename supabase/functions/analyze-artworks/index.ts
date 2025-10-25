import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artworks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare analysis data
    const artworkSummary = artworks.map((art: any) => ({
      date: art.created_at,
      emotions: art.emotions_used,
      colors: art.colors_used,
      duration: art.metadata?.session_duration || 0,
    }));

    const systemPrompt = `Ты психолог-специалист по АРТ-терапии для детей с аутизмом и трудностями социализации. 
Анализируй рисунки детей на основе следующих параметров:
1. ЦВЕТА: Выбор цветов (теплые/холодные тона, интенсивность, частота использования)
2. ЭМОЦИИ: Какие эмоции ребенок выражает через рисунки (радость, спокойствие, энергия, грусть)
3. ДИНАМИКА: Изменения в паттернах рисования со временем
4. ПРОГРЕСС: Положительные изменения в эмоциональном балансе

Давай КОНКРЕТНЫЕ, позитивные и поддерживающие инсайты для родителей и терапевтов.
Формат ответа должен быть в JSON:
{
  "emotional_summary": "краткое описание эмоционального состояния",
  "color_insights": "анализ выбора цветов",
  "progress_notes": "заметки о прогрессе",
  "recommendations": ["рекомендация 1", "рекомендация 2", "рекомендация 3"],
  "primary_emotion": "основная эмоция",
  "stability_score": число от 0 до 100
}`;

    const userPrompt = `Проанализируй данные о ${artworks.length} рисунках:
${JSON.stringify(artworkSummary, null, 2)}

Дай развернутый анализ эмоционального состояния ребенка и рекомендации.`;

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
      // Fallback structure
      analysis = {
        emotional_summary: aiResponse.substring(0, 200),
        color_insights: "Анализ цветов недоступен",
        progress_notes: "Данные о прогрессе обрабатываются",
        recommendations: ["Продолжайте заниматься АРТ-терапией", "Отслеживайте эмоциональные изменения"],
        primary_emotion: "neutral",
        stability_score: 50
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-artworks function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
