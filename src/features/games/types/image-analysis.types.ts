/**
 * Types for image analysis and auto-fill functionality
 */

/**
 * Confidence level for the analysis results
 */
export type AnalysisConfidence = "high" | "medium" | "low";

/**
 * Result for a single player extracted from the image
 */
export interface ScannedPlayerResult {
  name: string;
  stars: number;
  coins: number;
  minigamesWon: number;
  // Optional fields for ProBonus rule set (stars/coins earned during game)
  totalStarsEarned?: number;
  totalCoinsEarned?: number;
}

/**
 * Complete analysis result from the Edge Function
 */
export interface ImageAnalysisResult {
  success: boolean;
  confidence: AnalysisConfidence;
  players: ScannedPlayerResult[];
  error?: string;
}

/**
 * Data for the uploaded image (stored in component state)
 */
export interface ImageUploadData {
  file: File;
  base64: string;
  preview: string;
}
