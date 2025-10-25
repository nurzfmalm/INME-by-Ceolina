import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    
    // Fetch user data for context
    const [artworksRes, sessionsRes, sensoryRes, profileRes] = await Promise.all([
      supabase.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("session_analytics").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("sensory_settings").select("*").eq("user_id", user.id).single(),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    const artworks = artworksRes.data || [];
    const sessions = sessionsRes.data || [];
    const sensory = sensoryRes.data;
    const profile = profileRes.data;

    // Calculate analytics
    const totalSessions = sessions.length;
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / (totalSessions || 1);
    const emotionFreq: Record<string, number> = {};
    const colorFreq: Record<string, number> = {};
    
    artworks.forEach(art => {
      const emotions = art.emotions_used as string[] || [];
      const colors = art.colors_used as string[] || [];
      emotions.forEach(e => emotionFreq[e] = (emotionFreq[e] || 0) + 1);
      colors.forEach(c => colorFreq[c] = (colorFreq[c] || 0) + 1);
    });

    const recentReactionTimes = sessions
      .filter(s => s.reaction_times)
      .flatMap(s => s.reaction_times as number[])
      .slice(0, 50);
    const avgReaction = recentReactionTimes.length > 0
      ? recentReactionTimes.reduce((a, b) => a + b, 0) / recentReactionTimes.length
      : 0;

    const systemPrompt = `Ты — Цеолина, добрый и мудрый ИИ-помощник для арт-терапии детей с особенностями развития.

ДАННЫЕ РЕБЁНКА:
- Имя: ${profile?.child_name || "Ребёнок"}
- Возраст: ${profile?.child_age || "не указан"}
- Всего сессий: ${totalSessions}
- Средняя длительность сессии: ${Math.round(avgDuration / 60)} мин
- Среднее время реакции: ${Math.round(avgReaction)}мс

ЭМОЦИОНАЛЬНАЯ СТАТИСТИКА:
${Object.entries(emotionFreq).map(([e, count]) => `- ${e}: ${count} раз`).join("\n")}

ЦВЕТОВЫЕ ПРЕДПОЧТЕНИЯ:
${Object.entries(colorFreq).map(([c, count]) => `- ${c}: ${count} раз`).join("\n")}

СЕНСОРНЫЕ НАСТРОЙКИ:
- Визуальная интенсивность: ${sensory?.visual_intensity || 50}%
- Скорость анимации: ${sensory?.animation_speed || 50}%
- Звук: ${sensory?.sound_enabled ? "включён" : "выключен"}
- Тихий режим: ${sensory?.quiet_mode ? "да" : "нет"}
- Частота подсказок: ${sensory?.hint_frequency || 50}%

ТВОЯ РОЛЬ:
1. Анализируй прогресс и паттерны в данных
2. Давай рекомендации родителям на основе наблюдений
3. Отвечай тепло, эмпатично, по-русски
4. Используй данные для персонализированных советов
5. Замечай улучшения и хвали успехи
6. Предлагай конкретные упражнения и задания

Будь кратким (2-4 предложения), но информативным.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Необходимо пополнить баланс Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
