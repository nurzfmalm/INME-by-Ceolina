import { supabase } from "@/integrations/supabase/client";

export interface AssessmentData {
  assessment_data: {
    responses?: Array<{
      question: string;
      answer: string;
      category?: string;
    }>;
  };
}

export interface LearningPathWeek {
  week: number;
  theme: string;
  focus: string;
  activities: Array<{
    title: string;
    description: string;
    duration: string;
    materials: string[];
  }>;
  goals: string[];
}

export async function generateLearningPath(
  assessmentData: AssessmentData,
  childName: string = "ребёнок",
  childAge: number = 6,
  assessmentId?: string,
  userId?: string
): Promise<{ weeks: LearningPathWeek[] }> {
  try {
    // Use edge function with Lovable AI
    const { data, error } = await supabase.functions.invoke('generate-learning-path', {
      body: {
        assessmentId: assessmentId || `assessment-${Date.now()}`,
        userId: userId,
        assessmentData: assessmentData.assessment_data,
        childName,
        childAge
      }
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(error.message || "Ошибка генерации программы");
    }

    if (!data?.learningPath?.path_data) {
      console.error("Invalid response from edge function:", data);
      throw new Error("Не удалось получить программу обучения");
    }

    return data.learningPath.path_data;
  } catch (error) {
    console.error("Error generating learning path:", error);
    throw error;
  }
}

export async function analyzDrawing(imageBase64: string, context?: string): Promise<string> {
  try {
    // Use CLIP analysis edge function
    const { data, error } = await supabase.functions.invoke('analyze-image-clip', {
      body: {
        imageData: imageBase64,
        taskContext: context || 'Анализ детского рисунка для арт-терапии'
      }
    });

    if (error) {
      console.error("CLIP analysis error:", error);
      throw error;
    }

    // Format the CLIP analysis into readable text
    const analysis = data?.analysis;
    if (!analysis) {
      return "Не удалось проанализировать рисунок";
    }

    let result = `🎨 **Анализ рисунка**\n\n`;
    result += `**Цветовая палитра:** ${analysis.colorAnalysis}\n\n`;
    result += `**Композиция:** ${analysis.compositionInsights}\n\n`;
    
    if (analysis.emotions?.length > 0) {
      result += `**Обнаруженные эмоции:**\n`;
      analysis.emotions.forEach((e: any) => {
        result += `- ${e.emotion}: ${Math.round(e.confidence * 100)}%\n`;
      });
      result += `\n`;
    }
    
    if (analysis.therapeuticRecommendations?.length > 0) {
      result += `**Рекомендации:**\n`;
      analysis.therapeuticRecommendations.forEach((rec: string) => {
        result += `- ${rec}\n`;
      });
      result += `\n`;
    }
    
    result += `✨ ${analysis.starFeedback}`;
    
    return result;
  } catch (error) {
    console.error("Error analyzing drawing:", error);
    throw error;
  }
}
