import { supabase } from '@/shared/lib/supabase';
import type { ImageAnalysisResult } from '../types/image-analysis.types';

/**
 * Service for analyzing game result images using Claude Vision API
 * via Supabase Edge Functions
 */
export class ImageAnalysisService {
  /**
   * Analyzes a game results screenshot and extracts player data
   *
   * @param imageBase64 - Base64 encoded image data (without data:image/... prefix)
   * @param playerNames - Array of player names from the group for context
   * @param groupId - ID of the group for rate limiting
   * @param mediaType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
   * @returns Analysis result with extracted player data and confidence level
   * @throws Error if analysis fails or user is not authenticated
   */
  async analyzeGameResults(
    imageBase64: string,
    playerNames: string[],
    groupId: string,
    mediaType?: string
  ): Promise<ImageAnalysisResult> {
    try {
      // Get current session to ensure user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User must be authenticated to analyze images');
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke<ImageAnalysisResult>(
        'analyze-game-results',
        {
          body: {
            imageBase64,
            playerNames,
            groupId,
            mediaType,
          },
        }
      );

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(`Failed to analyze image: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from analysis');
      }

      // Return the analysis result
      return data;
    } catch (error) {
      console.error('Image analysis error:', error);

      // Return a failed result instead of throwing
      return {
        success: false,
        confidence: 'low',
        players: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export a singleton instance
export const imageAnalysisService = new ImageAnalysisService();
