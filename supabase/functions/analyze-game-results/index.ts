import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface PlayerResult {
  name: string;
  stars: number;
  coins: number;
  minigamesWon: number;
  totalStarsEarned?: number;
  totalCoinsEarned?: number;
}

interface AnalysisRequest {
  imageBase64: string;
  playerNames: string[];
  groupId: string;
}

interface AnalysisResponse {
  success: boolean;
  confidence: "high" | "medium" | "low";
  players: PlayerResult[];
  error?: string;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Anthropic API key from environment
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { imageBase64, playerNames, groupId }: AnalysisRequest = await req.json();

    if (!imageBase64 || !playerNames || !Array.isArray(playerNames) || !groupId) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limiting: Check if group has exceeded daily limit (5 successful analyses per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from("image_analysis_logs")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("success", true)
      .gte("analyzed_at", today.toISOString());

    if (countError) {
      console.error("Error checking rate limit:", countError);
      return new Response(
        JSON.stringify({ error: "Error checking rate limit" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (count !== null && count >= 5) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Límite diario alcanzado. Tu grupo ha usado 5 escaneos hoy. Intenta mañana o ingresa los datos manualmente.",
          confidence: "low",
          players: [],
          rateLimitExceeded: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Construct prompt for Claude Vision
    const prompt = `Analyze this Mario Party Superstars final results screen and extract the game statistics for each player.

CRITICAL: The screen has TWO distinct data sources - the LEFT PANEL (small icons) and the RIGHT COLUMNS (large icons).

SCREEN LAYOUT DESCRIPTION:
The screen is divided into two main sections:

**LEFT PANEL - Player List:**
- Shows each player with their avatar/profile picture
- Below each avatar shows the player name
- IMPORTANT: Next to each avatar are TWO SMALL ICONS with numbers:
  * Small star icon ⭐ with a number = FINAL stars
  * Small coin icon 🪙 with a number = FINAL coins
  * These are the FINAL values we need for "stars" and "coins"

**RIGHT SIDE - Large Columns:**
There are multiple large columns with icons at the top:
- **1st large column** (usually yellow/highlighted background, large ⭐ icon): Total stars EARNED during the game
- **2nd large column** (gray background, large 🪙 icon): Total coins EARNED during the game
- **3rd large column** (has fist bump/controller icon 🎮): Minigames won
- (Additional columns exist but we don't need them)

EXACT EXTRACTION INSTRUCTIONS:

For EACH player (read top to bottom in the left panel):

1. **name**: Extract the player name from below their avatar
   - Match with group players: ${playerNames.join(", ")}
   - May appear as character names (Mario, Luigi, Peach, Yoshi, etc.)

2. **stars**: Look at the SMALL star icon ⭐ next to the player's avatar in the LEFT PANEL
   - This is the FINAL stars count
   - DO NOT use the large column value

3. **coins**: Look at the SMALL coin icon 🪙 next to the player's avatar in the LEFT PANEL
   - This is the FINAL coins count
   - DO NOT use the large column value

4. **minigamesWon**: Go to the 3rd LARGE COLUMN (fist bump icon) and read the value in that player's row
   - This shows how many minigames they won

5. **totalStarsEarned** (OPTIONAL): Go to the 1st LARGE COLUMN (yellow background, large ⭐) and read the value in that player's row
   - This is stars earned DURING the game
   - This is DIFFERENT from the final stars

6. **totalCoinsEarned** (OPTIONAL): Go to the 2nd LARGE COLUMN (gray background, large 🪙) and read the value in that player's row
   - This is coins earned DURING the game
   - This is DIFFERENT from the final coins

VALIDATION EXAMPLE (to ensure you understand):
If the screen shows for player "papi":
- Small ⭐ next to avatar: 2
- Small 🪙 next to avatar: 62
- 1st large column value: 2
- 2nd large column value: 212
- 3rd large column value: 3

Then you should extract:
{
  "name": "papi",
  "stars": 2,           ← from SMALL icon next to avatar
  "coins": 62,          ← from SMALL icon next to avatar
  "minigamesWon": 3,    ← from 3rd LARGE column
  "totalStarsEarned": 2,    ← from 1st LARGE column
  "totalCoinsEarned": 212   ← from 2nd LARGE column
}

IMPORTANT NOTES:
- Read players in order from top to bottom
- "totalStarsEarned" and "totalCoinsEarned" are OPTIONAL but extract them if visible
- If you cannot read a value clearly, use 0 as default
- Provide confidence: "high" if all values are clearly visible, "medium" if some uncertain, "low" if image is unclear

RESPONSE FORMAT:
Return ONLY a valid JSON object:
{
  "confidence": "high" | "medium" | "low",
  "players": [
    {
      "name": "player name",
      "stars": number,
      "coins": number,
      "minigamesWon": number,
      "totalStarsEarned": number,
      "totalCoinsEarned": number
    }
  ]
}

Do not include any other text, explanations, or markdown formatting. Only return the JSON object.`;

    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract text response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    let analysisData;
    try {
      // Remove markdown code blocks if present
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }
      analysisData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", textContent.text);
      throw new Error("Invalid JSON response from Claude");
    }

    // Validate and sanitize extracted data
    const sanitizedPlayers: PlayerResult[] = analysisData.players.map(
      (player: any) => {
        const result: PlayerResult = {
          name: String(player.name || "Unknown"),
          stars: Math.max(0, Math.min(99, parseInt(player.stars) || 0)),
          coins: Math.max(0, Math.min(999, parseInt(player.coins) || 0)),
          minigamesWon: Math.max(0, Math.min(99, parseInt(player.minigamesWon) || 0)),
        };

        // Add optional ProBonus fields if present
        if (player.totalStarsEarned !== undefined && player.totalStarsEarned !== null) {
          result.totalStarsEarned = Math.max(0, Math.min(99, parseInt(player.totalStarsEarned) || 0));
        }
        if (player.totalCoinsEarned !== undefined && player.totalCoinsEarned !== null) {
          result.totalCoinsEarned = Math.max(0, Math.min(999, parseInt(player.totalCoinsEarned) || 0));
        }

        return result;
      }
    );

    // Construct response
    const response: AnalysisResponse = {
      success: true,
      confidence: analysisData.confidence || "medium",
      players: sanitizedPlayers,
    };

    // Log successful analysis for rate limiting
    const { error: logError } = await supabase
      .from("image_analysis_logs")
      .insert({
        group_id: groupId,
        user_id: user.id,
        success: true,
      });

    if (logError) {
      console.error("Error logging analysis:", logError);
      // Don't fail the request if logging fails, just log the error
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-game-results:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        confidence: "low",
        players: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
