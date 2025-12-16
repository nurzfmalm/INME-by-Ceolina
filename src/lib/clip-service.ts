/**
 * CLIP Image Analysis Service
 * Service for analyzing images using OpenAI CLIP model via Hugging Face API
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  CLIPAnalysisRequest,
  CLIPAnalysisResult,
  CLIPErrorResponse,
} from "@/types/clip-analysis";

export class CLIPAnalysisError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = "CLIPAnalysisError";
  }
}

/**
 * Analyzes an image using CLIP model
 * @param imageData - Base64 encoded image data (with or without data URL prefix)
 * @param options - Optional analysis configuration
 * @returns Analysis results
 * @throws CLIPAnalysisError
 */
export async function analyzeCLIP(
  imageData: string,
  options?: {
    candidateLabels?: string[];
    taskContext?: string;
  }
): Promise<CLIPAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "analyze-image-clip",
      {
        body: {
          imageData,
          candidateLabels: options?.candidateLabels,
          taskContext: options?.taskContext,
        } as CLIPAnalysisRequest,
      }
    );

    if (error) {
      throw new CLIPAnalysisError(
        `CLIP analysis failed: ${error.message}`,
        error.status,
        error
      );
    }

    if (!data?.analysis) {
      throw new CLIPAnalysisError("No analysis data received from CLIP API");
    }

    return data.analysis;
  } catch (error) {
    if (error instanceof CLIPAnalysisError) {
      throw error;
    }

    throw new CLIPAnalysisError(
      `Unexpected error during CLIP analysis: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      undefined,
      error
    );
  }
}

/**
 * Analyzes multiple images in batch
 * @param images - Array of base64 encoded images
 * @param options - Optional analysis configuration
 * @returns Array of analysis results
 */
export async function analyzeCLIPBatch(
  images: string[],
  options?: {
    candidateLabels?: string[];
    taskContext?: string;
  }
): Promise<CLIPAnalysisResult[]> {
  const results = await Promise.allSettled(
    images.map((imageData) => analyzeCLIP(imageData, options))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      console.error(`Failed to analyze image ${index}:`, result.reason);
      // Return a default result for failed analyses
      return {
        labels: [],
        emotions: [],
        colorAnalysis: "Анализ не удался",
        compositionInsights: "Анализ не удался",
        therapeuticRecommendations: [],
        ceolinaFeedback: "Попробуйте загрузить изображение снова",
        overallScore: 0,
      };
    }
  });
}

/**
 * Extracts dominant emotion from CLIP analysis
 * @param analysis - CLIP analysis result
 * @returns Dominant emotion or null
 */
export function getDominantEmotion(
  analysis: CLIPAnalysisResult
): { emotion: string; confidence: number } | null {
  if (!analysis.emotions || analysis.emotions.length === 0) {
    return null;
  }

  return analysis.emotions.reduce((prev, current) =>
    prev.confidence > current.confidence ? prev : current
  );
}

/**
 * Checks if image shows positive emotions
 * @param analysis - CLIP analysis result
 * @param threshold - Minimum confidence threshold (0-1)
 * @returns True if positive emotions are detected
 */
export function hasPositiveEmotions(
  analysis: CLIPAnalysisResult,
  threshold: number = 0.5
): boolean {
  const positiveEmotions = ["happy", "excited", "peaceful", "calm", "joyful"];

  return analysis.emotions.some(
    (emotion) =>
      positiveEmotions.includes(emotion.emotion) &&
      emotion.confidence >= threshold
  );
}

/**
 * Gets color theme from analysis
 * @param analysis - CLIP analysis result
 * @returns Color theme (warm/cool/neutral)
 */
export function getColorTheme(
  analysis: CLIPAnalysisResult
): "warm" | "cool" | "neutral" {
  const warmLabel = analysis.labels.find((l) => l.label === "warm colors");
  const coolLabel = analysis.labels.find((l) => l.label === "cool colors");

  if (!warmLabel && !coolLabel) return "neutral";
  if (!warmLabel) return "cool";
  if (!coolLabel) return "warm";

  return warmLabel.score > coolLabel.score ? "warm" : "cool";
}

/**
 * Formats analysis for display
 * @param analysis - CLIP analysis result
 * @returns Formatted analysis object
 */
export function formatAnalysisForDisplay(analysis: CLIPAnalysisResult) {
  const dominantEmotion = getDominantEmotion(analysis);
  const colorTheme = getColorTheme(analysis);
  const isPositive = hasPositiveEmotions(analysis);

  return {
    score: analysis.overallScore,
    primaryEmotion: dominantEmotion?.emotion || "neutral",
    emotionConfidence: dominantEmotion
      ? Math.round(dominantEmotion.confidence * 100)
      : 0,
    colorTheme,
    sentiment: isPositive ? "positive" : "neutral",
    topLabels: analysis.labels.slice(0, 5).map((l) => ({
      label: l.label,
      percentage: Math.round(l.score * 100),
    })),
    feedback: analysis.ceolinaFeedback,
    recommendations: analysis.therapeuticRecommendations,
  };
}

/**
 * Compares two analyses to detect emotional changes
 * @param previous - Previous analysis
 * @param current - Current analysis
 * @returns Comparison result
 */
export function compareAnalyses(
  previous: CLIPAnalysisResult,
  current: CLIPAnalysisResult
) {
  const prevEmotion = getDominantEmotion(previous);
  const currEmotion = getDominantEmotion(current);

  const scoreChange = current.overallScore - previous.overallScore;
  const emotionChanged =
    prevEmotion?.emotion !== currEmotion?.emotion;

  const prevPositive = hasPositiveEmotions(previous);
  const currPositive = hasPositiveEmotions(current);
  const sentimentImproved = !prevPositive && currPositive;
  const sentimentDeclined = prevPositive && !currPositive;

  return {
    scoreChange,
    scoreImprovement: scoreChange > 0,
    emotionChanged,
    previousEmotion: prevEmotion?.emotion || "neutral",
    currentEmotion: currEmotion?.emotion || "neutral",
    sentimentImproved,
    sentimentDeclined,
    summary:
      scoreChange > 10
        ? "Значительное улучшение"
        : scoreChange < -10
        ? "Требует внимания"
        : "Стабильное состояние",
  };
}
