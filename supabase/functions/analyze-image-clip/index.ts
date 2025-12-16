import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CLIPAnalysisRequest {
  imageData: string; // base64 encoded image
  candidateLabels?: string[]; // optional labels for zero-shot classification
  taskContext?: string; // optional context about the drawing task
}

interface CLIPAnalysisResult {
  labels: { label: string; score: number }[];
  emotions: { emotion: string; confidence: number }[];
  colorAnalysis: string;
  compositionInsights: string;
  therapeuticRecommendations: string[];
  ceolinaFeedback: string;
  overallScore: number;
}

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

    const { imageData, candidateLabels, taskContext }: CLIPAnalysisRequest = await req.json();

    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not configured');
    }

    console.log('Analyzing image with CLIP model...');

    // Default emotion and theme labels for children's artwork
    const defaultLabels = candidateLabels || [
      'happy', 'sad', 'angry', 'calm', 'excited', 'peaceful',
      'colorful', 'dark', 'bright', 'structured', 'chaotic',
      'person', 'animal', 'nature', 'house', 'abstract', 'geometric',
      'warm colors', 'cool colors', 'many details', 'simple drawing'
    ];

    // Convert base64 to blob for Hugging Face API
    const base64Data = imageData.includes('base64,')
      ? imageData.split('base64,')[1]
      : imageData;

    // Call Hugging Face CLIP model for zero-shot image classification
    const clipResponse = await fetch(
      'https://api-inference.huggingface.co/models/openai/clip-vit-large-patch14',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: {
            image: base64Data,
            candidates: defaultLabels,
          }
        }),
      }
    );

    if (!clipResponse.ok) {
      const errorText = await clipResponse.text();
      console.error('Hugging Face API error:', clipResponse.status, errorText);

      if (clipResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Hugging Face API error: ${clipResponse.status}`);
    }

    const clipResults = await clipResponse.json();
    console.log('CLIP Results:', clipResults);

    // Process CLIP results
    // CLIP API returns array of scores corresponding to candidate_labels
    let sortedLabels: Array<{ label: string; score: number }> = [];

    if (Array.isArray(clipResults)) {
      // Format: array of scores [0.5, 0.3, 0.2, ...]
      sortedLabels = defaultLabels
        .map((label, idx) => ({
          label,
          score: clipResults[idx] || 0
        }))
        .sort((a, b) => b.score - a.score);
    } else if (clipResults.scores && Array.isArray(clipResults.scores)) {
      // Alternative format: { scores: [...], labels: [...] }
      sortedLabels = clipResults.scores
        .map((score: number, idx: number) => ({
          label: clipResults.labels?.[idx] || defaultLabels[idx],
          score
        }))
        .sort((a: any, b: any) => b.score - a.score);
    } else {
      // Fallback: assume it's already in the right format
      console.warn('Unexpected CLIP response format:', clipResults);
      sortedLabels = Object.entries(clipResults)
        .map(([label, score]) => ({ label, score: score as number }))
        .sort((a, b) => b.score - a.score);
    }

    // Extract emotion-related labels
    const emotionLabels = ['happy', 'sad', 'angry', 'calm', 'excited', 'peaceful'];
    const detectedEmotions = sortedLabels
      .filter((item: any) => emotionLabels.includes(item.label))
      .map((item: any) => ({ emotion: item.label, confidence: item.score }));

    // Extract color-related insights
    const colorLabels = sortedLabels.filter((item: any) =>
      item.label.includes('color') || item.label === 'colorful' ||
      item.label === 'dark' || item.label === 'bright'
    );

    // Extract composition insights
    const compositionLabels = sortedLabels.filter((item: any) =>
      item.label === 'structured' || item.label === 'chaotic' ||
      item.label.includes('details') || item.label.includes('simple')
    );

    // Generate therapeutic analysis
    const topEmotion = detectedEmotions[0]?.emotion || 'neutral';
    const topScore = sortedLabels[0]?.score || 0;

    let colorAnalysis = 'Нейтральная цветовая палитра';
    if (colorLabels.length > 0) {
      const topColor = colorLabels[0];
      if (topColor.label.includes('warm')) {
        colorAnalysis = 'Преобладают теплые цвета, что указывает на позитивное и активное настроение';
      } else if (topColor.label.includes('cool')) {
        colorAnalysis = 'Преобладают холодные цвета, отражающие спокойствие и рефлексию';
      } else if (topColor.label === 'colorful') {
        colorAnalysis = 'Богатая и разнообразная цветовая палитра показывает эмоциональную выразительность';
      } else if (topColor.label === 'bright') {
        colorAnalysis = 'Яркие цвета демонстрируют энергию и жизнерадостность';
      }
    }

    let compositionInsights = 'Сбалансированная композиция';
    if (compositionLabels.length > 0) {
      const topComp = compositionLabels[0];
      if (topComp.label === 'structured') {
        compositionInsights = 'Упорядоченная композиция показывает хороший уровень самоконтроля и организованности';
      } else if (topComp.label === 'chaotic') {
        compositionInsights = 'Динамичная композиция отражает высокую энергию и спонтанность выражения';
      } else if (topComp.label.includes('many details')) {
        compositionInsights = 'Внимание к деталям демонстрирует хорошую концентрацию и вовлеченность';
      }
    }

    // Generate recommendations based on analysis
    const recommendations: string[] = [];
    if (topEmotion === 'calm' || topEmotion === 'peaceful') {
      recommendations.push('Продолжайте создавать спокойную атмосферу во время арт-терапии');
      recommendations.push('Рассмотрите медитативные техники рисования');
    } else if (topEmotion === 'happy' || topEmotion === 'excited') {
      recommendations.push('Поддерживайте позитивный настрой ребенка через творческие активности');
      recommendations.push('Предложите работу с яркими цветами для укрепления радостных эмоций');
    } else if (topEmotion === 'sad' || topEmotion === 'angry') {
      recommendations.push('Обеспечьте безопасное пространство для выражения сложных эмоций');
      recommendations.push('Используйте цветотерапию для эмоциональной регуляции');
    }

    // Add composition-based recommendations
    if (compositionLabels.some((l: any) => l.label === 'chaotic' && l.score > 0.5)) {
      recommendations.push('Попробуйте структурированные задания для развития организации мышления');
    }

    // Generate Ceolina feedback
    let ceolinaFeedback = '';
    if (taskContext) {
      ceolinaFeedback = `Замечательная работа! Я вижу, что ты выразил(а) ${topEmotion === 'happy' ? 'радость' : topEmotion === 'calm' ? 'спокойствие' : 'свои чувства'} через рисунок. `;
    }
    ceolinaFeedback += sortedLabels[0]?.score > 0.6
      ? 'Твой рисунок очень выразительный! Продолжай творить!'
      : 'Отличное начало! Каждый рисунок помогает тебе лучше выражать себя!';

    // Calculate overall score
    const overallScore = Math.round(topScore * 100);

    const analysis: CLIPAnalysisResult = {
      labels: sortedLabels.slice(0, 10), // Top 10 labels
      emotions: detectedEmotions,
      colorAnalysis,
      compositionInsights,
      therapeuticRecommendations: recommendations,
      ceolinaFeedback,
      overallScore,
    };

    console.log('Analysis complete:', analysis);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-image-clip function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});