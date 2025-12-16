/**
 * CLIP Image Analysis Types
 * Types for OpenAI CLIP model analysis results
 */

export interface CLIPLabel {
  label: string;
  score: number;
}

export interface CLIPEmotion {
  emotion: string;
  confidence: number;
}

export interface CLIPAnalysisResult {
  labels: CLIPLabel[];
  emotions: CLIPEmotion[];
  colorAnalysis: string;
  compositionInsights: string;
  therapeuticRecommendations: string[];
  ceolinaFeedback: string;
  overallScore: number;
}

export interface CLIPAnalysisRequest {
  imageData: string; // base64 encoded image
  candidateLabels?: string[]; // optional labels for zero-shot classification
  taskContext?: string; // optional context about the drawing task
}

export interface CLIPAnalysisResponse {
  analysis: CLIPAnalysisResult;
}

export interface CLIPErrorResponse {
  error: string;
}

/**
 * Default emotion labels for children's artwork analysis
 */
export const DEFAULT_EMOTION_LABELS = [
  'happy',
  'sad',
  'angry',
  'calm',
  'excited',
  'peaceful',
  'anxious',
  'joyful',
  'content',
  'frustrated'
] as const;

/**
 * Default theme labels for artwork analysis
 */
export const DEFAULT_THEME_LABELS = [
  'colorful',
  'dark',
  'bright',
  'structured',
  'chaotic',
  'person',
  'animal',
  'nature',
  'house',
  'abstract',
  'geometric',
  'warm colors',
  'cool colors',
  'many details',
  'simple drawing'
] as const;

export type EmotionLabel = typeof DEFAULT_EMOTION_LABELS[number];
export type ThemeLabel = typeof DEFAULT_THEME_LABELS[number];
