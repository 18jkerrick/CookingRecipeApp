/**
 * Extract video title from platform data or captions
 */
export function extractVideoTitle(captions: string, platform: string, url: string): string | null {
  try {
      // Clean the captions for title extraction
  const cleanedCaptions = captions
    .replace(/🍋‍🟩|🔥|❤️|😍|🤤|👌|💯|✨/g, '') // Remove emojis
    .replace(/\s+for\s+(a\s+)?(top\s+tier|great|perfect|amazing|delicious).*$/i, '') // Remove promotional endings
    .replace(/\s+on\s+(a\s+)?(sunny|rainy|cold|hot|warm|beautiful).*$/i, '') // Remove weather/time references
    .replace(/\s+(makes?\s+)?\d+\s+servings.*$/i, '') // Remove serving info
    .replace(/\s+ready\s+in.*$/i, '') // Remove time info
    .replace(/\s+prep\s+time.*$/i, '') // Remove prep time
    .replace(/full recipe on.*$/i, '') // Remove "full recipe on..." trailing text
    .replace(/recipe in bio.*$/i, '') // Remove "recipe in bio" trailing text
    .replace(/link in bio.*$/i, '') // Remove "link in bio" trailing text
    .replace(/check out.*$/i, '') // Remove "check out..." trailing text
    .replace(/follow for more.*$/i, '') // Remove "follow for more" trailing text
    .replace(/#\w+/g, '') // Remove hashtags
    .trim();

    // Extract title patterns based on platform
    if (platform === 'TikTok' || platform === 'Instagram') {
      return extractFromCaptions(cleanedCaptions);
    } else if (platform === 'YouTube') {
      return extractFromCaptions(cleanedCaptions);
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting video title:', error);
    return null;
  }
}

/**
 * Extract title from caption text using common patterns
 */
function extractFromCaptions(text: string): string | null {
  if (!text || text.length < 10) return null;
  
  // Common title patterns to look for
  const patterns = [
    // Look for food descriptions at the start
    /^([^.!?]+(?:chicken|beef|pork|fish|salmon|pasta|rice|noodles|soup|curry|stir.fry|salad|sandwich|burger|pizza|tacos|bread|cake|cookies|pie)[^.!?]*)/i,
    
    // Look for cooking method + food
    /^([^.!?]*(?:baked|grilled|fried|roasted|sautéed|steamed|braised|slow.cooked|instant.pot)[^.!?]+)/i,
    
    // Look for descriptive food phrases (adjective + food)
    /^([^.!?]*(?:crispy|creamy|spicy|tender|juicy|flaky|cheesy|savory|sweet|tangy|smoky)[^.!?]+(?:chicken|beef|pork|fish|pasta|rice|soup|curry|salad)[^.!?]*)/i,
    
    // First sentence if it describes food
    /^([^.!?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      
      // Validate it looks like a food title
      if (isValidFoodTitle(candidate)) {
        return cleanTitle(candidate);
      }
    }
  }
  
  return null;
}

/**
 * Check if text looks like a valid food title
 */
function isValidFoodTitle(text: string): boolean {
  if (text.length < 5 || text.length > 100) return false;
  
  // Must contain food-related words
  const foodWords = /chicken|beef|pork|fish|salmon|pasta|rice|noodles|soup|curry|stir.fry|salad|sandwich|burger|pizza|tacos|bread|cake|cookies|pie|vegetables|beans|tofu|quinoa|avocado|mushrooms/i;
  
  // Should not contain these non-title phrases
  const excludeWords = /follow|subscribe|like|comment|share|bio|link|website|recipe on|check out|don't forget|make sure|if you|let me know/i;
  
  return foodWords.test(text) && !excludeWords.test(text);
}

/**
 * Clean and format the extracted title
 */
function cleanTitle(title: string): string {
  return title
    .replace(/^(a|an|the)\s+/i, '') // Remove articles at start
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title case
    .join(' ');
} 