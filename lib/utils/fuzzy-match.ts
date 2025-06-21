/**
 * Fuzzy string matching utilities for ingredient matching
 */

// Calculate Levenshtein distance between two strings
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity score between 0 and 1
export function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Calculate edit distance
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  const similarity = 1 - (distance / maxLen);
  
  return Math.max(0, similarity);
}

// Token-based matching for multi-word strings
export function tokenMatch(searchTerm: string, target: string): number {
  const searchTokens = searchTerm.toLowerCase().split(/\s+/);
  const targetTokens = target.toLowerCase().split(/\s+/);
  
  let matchScore = 0;
  let totalTokens = searchTokens.length;
  
  for (const searchToken of searchTokens) {
    let bestMatch = 0;
    
    for (const targetToken of targetTokens) {
      if (targetToken === searchToken) {
        bestMatch = 1.0;
        break;
      } else if (targetToken.includes(searchToken) || searchToken.includes(targetToken)) {
        bestMatch = Math.max(bestMatch, 0.8);
      } else {
        const similarity = similarityScore(searchToken, targetToken);
        if (similarity > 0.7) {
          bestMatch = Math.max(bestMatch, similarity * 0.7);
        }
      }
    }
    
    matchScore += bestMatch;
  }
  
  return matchScore / totalTokens;
}

// Enhanced fuzzy matching with category awareness
export function fuzzyMatchIngredient(
  searchTerm: string, 
  productName: string,
  productCategory?: string
): number {
  let score = 0;
  
  // Direct name matching
  const nameScore = tokenMatch(searchTerm, productName);
  score = nameScore * 0.7; // 70% weight for name match
  
  // Category bonus
  if (productCategory) {
    const categoryTokens = productCategory.toLowerCase().split(/[,\s]+/);
    const searchTokens = searchTerm.toLowerCase().split(/\s+/);
    
    for (const searchToken of searchTokens) {
      if (categoryTokens.some(cat => cat.includes(searchToken))) {
        score += 0.2; // 20% bonus for category match
        break;
      }
    }
  }
  
  // Common abbreviation handling
  const abbreviations: Record<string, string[]> = {
    'lb': ['pound', 'pounds'],
    'oz': ['ounce', 'ounces'],
    'pkg': ['package'],
    'doz': ['dozen'],
    'ct': ['count'],
  };
  
  for (const [abbr, expansions] of Object.entries(abbreviations)) {
    if (searchTerm.includes(abbr)) {
      for (const expansion of expansions) {
        if (productName.includes(expansion)) {
          score += 0.1; // 10% bonus for abbreviation match
          break;
        }
      }
    }
  }
  
  return Math.min(1.0, score);
}

// Find best matches from a list of products
export function findBestMatches<T extends { name: string; category?: string }>(
  searchTerm: string,
  products: T[],
  threshold: number = 0.5,
  maxResults: number = 5
): Array<{ product: T; score: number }> {
  const scored = products
    .map(product => ({
      product,
      score: fuzzyMatchIngredient(searchTerm, product.name, product.category)
    }))
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  
  return scored;
}