/**
 * ============================================================================
 * NAME SIMILARITY DETECTION SYSTEM
 * ============================================================================
 * 
 * This file calculates how similar two names are to each other based on multiple
 * linguistic criteria. It's like a smart detective that finds connections between
 * names that a human might notice intuitively.
 * 
 * WHAT IT DOES:
 * - Compares names across 8 different dimensions (roots, pronunciation, etc.)
 * - Assigns points for each type of similarity (more points = stronger connection)
 * - Only shows names that score 60+ points (prevents weak/random matches)
 * - Excludes explicit relationships already shown elsewhere (like diminutives)
 * 
 * SCORING TIERS:
 * - TIER 1 (70-80 points): Strong linguistic connections (shared roots, pronunciation)
 * - TIER 2 (40-60 points): Meaningful similarities (same category, similar meaning)
 * - TIER 3 (8-30 points): Supporting evidence (same feeling, distant origin)
 * 
 * EXAMPLE:
 * "Philip" and "Philomena" both share the Greek root "philos" (love)
 * → They get 80 points for shared root → They appear as similar names
 * 
 * "Lily" and "Rose" are both in "Nature > Botanical > Flowers"
 * → They get 40 points for sibling categories → They appear as similar names
 * 
 * "River" and "Rose" only share the top-level "Nature" category
 * → They get 10 points → They DON'T appear (below 60-point threshold)
 */

import { Name } from "@/hooks/useNameStorage";

// ============= HELPER TYPES =============

/**
 * ParsedRootElement: Breaks down a compound root into its parts
 * 
 * WHAT IS A ROOT?
 * A root is the original word or syllable a name comes from. For example:
 * - "Greek: philos (love)" → identifier: "philos", explanation: "love"
 * - "De (Dutch 'the')" → identifier: "De", explanation: "Dutch 'the'"
 * - "아 (a, 'elegant')" → identifier: "아", explanation: "a, 'elegant'"
 * 
 * WHY SPLIT IT?
 * Some roots have the same identifier but different meanings (homographs):
 * - "De (Dutch 'the')" and "De (French 'of')" both use "De" but mean different things
 * By splitting, we can detect: same identifier (50 pts) vs identical root (80 pts)
 */
interface ParsedRootElement {
  identifier: string;      // The actual root word/syllable (normalized: lowercase, trimmed)
  explanation?: string;    // What the root means (normalized: lowercase, no quotes)
  fullText: string;        // Original text for reference/display
}

// ============= LEVENSHTEIN DISTANCE =============

/**
 * levenshteinDistance: Measures how different two strings are
 * 
 * WHAT IS LEVENSHTEIN DISTANCE?
 * It counts the minimum number of single-character edits (insertions, deletions,
 * or substitutions) needed to change one word into another.
 * 
 * EXAMPLES:
 * - "cat" → "bat" = 1 edit (substitute 'c' with 'b')
 * - "sitting" → "kitten" = 3 edits
 * - "sunday" → "saturday" = 3 edits
 * 
 * WHY USE IT?
 * It helps us find names that sound similar because they're spelled similarly:
 * - "Lily" and "Lilly" (1 edit) → Very similar!
 * - "Sarah" and "Sara" (1 edit) → Very similar!
 * - "John" and "Jane" (3 edits) → Not similar
 * 
 * HOW IT WORKS:
 * Uses a matrix (grid) where each cell represents the cost of transforming
 * one substring into another. The bottom-right cell gives the final distance.
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];

  // Initialize first column (cost of inserting characters from str2)
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row (cost of inserting characters from str1)
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        // Characters match, no edit needed
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Characters don't match, choose minimum cost from:
        // 1. Substitute (diagonal)
        // 2. Insert (left)
        // 3. Delete (top)
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitute
          matrix[i][j - 1] + 1,     // Insert
          matrix[i - 1][j] + 1      // Delete
        );
      }
    }
  }

  // Return the bottom-right cell (total edit distance)
  return matrix[str2.length][str1.length];
};

// ============= SIMPLE LEGACY HELPERS (kept for fallback) =============

/**
 * getSoundSimilarity: Checks if two names sound similar based on spelling
 * 
 * WHAT IT DOES:
 * Uses Levenshtein distance to determine if two names are spelled similarly enough
 * to be considered "sound-alike" names.
 * 
 * SCORING: 50 points (if returns true)
 * 
 * RULES:
 * 1. Names must be within 3 characters of each other in length
 *    (prevents matching "Al" with "Alexander")
 * 2. Edit distance must be ≤30% of the longer name's length
 *    (prevents weak matches like "Anne" and "Jane")
 * 3. Must NOT be identical (distance > 0)
 *    (identical names are handled by exact string comparison elsewhere)
 * 
 * EXAMPLES:
 * ✅ "Sarah" and "Sara" → 1 edit, length diff = 1 → TRUE (50 points)
 * ✅ "Katherine" and "Catherine" → 1 edit, length diff = 0 → TRUE (50 points)
 * ❌ "Al" and "Alexander" → Length diff = 7 → FALSE (0 points)
 * ❌ "Anne" and "Jane" → 2 edits, 50% different → FALSE (0 points)
 */
const getSoundSimilarity = (name1: string, name2: string): boolean => {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();
  
  // Check if names are too different in length (prevents "Al" matching "Alexander")
  if (Math.abs(n1.length - n2.length) > 3) return false;
  
  // Calculate edit distance using Levenshtein algorithm
  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  
  // Similar if distance is less than 30% of the longer name (and not identical)
  return distance <= maxLength * 0.3 && distance > 0;
};

/**
 * getOriginSimilarity: Checks for any exact origin match (legacy function)
 * 
 * WHAT IT DOES:
 * Simple check: Do these two names share at least one exact origin string?
 * 
 * NOTE: This is a legacy function used only for "false cognate" detection
 * (names spelled the same but from different origins). The main similarity
 * scoring uses getHierarchicalOriginSimilarity instead (more advanced).
 * 
 * EXAMPLES:
 * ✅ ["Greek", "Ancient"] and ["Greek"] → TRUE (both have "Greek")
 * ❌ ["Greek"] and ["Latin"] → FALSE (no matches)
 */
const getOriginSimilarity = (origin1?: string[], origin2?: string[]): boolean => {
  if (!origin1 || !origin2 || origin1.length === 0 || origin2.length === 0) return false;
  return origin1.some(o1 => origin2.some(o2 => o1.toLowerCase() === o2.toLowerCase()));
};

/**
 * getFeelingsSimilarity: Checks if names share similar emotional associations
 * 
 * WHAT ARE FEELINGS?
 * Feelings are tags describing the emotional vibe of a name:
 * - "strong", "gentle", "mystical", "regal", "earthy", etc.
 * 
 * SCORING: 8 points (supporting evidence only)
 * 
 * HOW IT WORKS:
 * Returns true if there's any overlap in feelings, including partial matches:
 * - "strong" matches "strong" (exact)
 * - "mystical" matches "mystic" (one contains the other)
 * 
 * WHY LOW POINTS?
 * Feelings are subjective and broad. Many names can feel "strong" or "gentle"
 * without being linguistically related, so we give minimal points.
 * 
 * EXAMPLES:
 * ✅ ["strong", "warrior"] and ["strong", "brave"] → TRUE (share "strong")
 * ✅ ["mystical"] and ["mystic", "magical"] → TRUE ("mystical" contains "mystic")
 * ❌ ["gentle"] and ["strong"] → FALSE (no overlap)
 */
const getFeelingsSimilarity = (feelings1: string[], feelings2: string[]): boolean => {
  if (feelings1.length === 0 || feelings2.length === 0) return false;
  
  return feelings1.some(f1 => 
    feelings2.some(f2 => 
      f1.toLowerCase() === f2.toLowerCase() ||            // Exact match
      f1.toLowerCase().includes(f2.toLowerCase()) ||      // f1 contains f2
      f2.toLowerCase().includes(f1.toLowerCase())         // f2 contains f1
    )
  );
};

// ============= ROOT PARSING & COMPARISON =============

/**
 * parseRootElement: Breaks a root string into identifier and explanation
 * 
 * WHAT IT DOES:
 * Takes a root element like "De (Dutch 'the')" and separates it into:
 * - identifier: "de" (the actual root word/syllable)
 * - explanation: "dutch 'the'" (what it means)
 * 
 * WHY SEPARATE THEM?
 * This lets us score different types of matches:
 * 1. Exact match: Same identifier + same explanation → 80 points
 * 2. Homograph: Same identifier + different explanation → 50 points
 * 3. Partial: Same identifier + one missing explanation → 60 points
 * 
 * PATTERN IT RECOGNIZES:
 * - "identifier (explanation)" → splits into both parts
 * - "identifier" → just the identifier (no explanation)
 * 
 * EXAMPLES:
 * Input: "De (Dutch 'the')"
 * Output: { identifier: "de", explanation: "dutch 'the'", fullText: "De (Dutch 'the')" }
 * 
 * Input: "Greek: philos"
 * Output: { identifier: "greek: philos", explanation: undefined, fullText: "Greek: philos" }
 * 
 * Input: "아 (a, 'elegant, graceful')"
 * Output: { identifier: "아", explanation: "a, 'elegant, graceful'", fullText: "아 (a, 'elegant, graceful')" }
 */
const parseRootElement = (element: string): ParsedRootElement => {
  // Regex pattern explained:
  // ^([^(]+?)       - Capture everything before the first '(' (identifier)
  // (?:\s*\((.+)\))? - Optionally capture text inside parentheses (explanation)
  // $               - End of string
  const match = element.trim().match(/^([^(]+?)(?:\s*\((.+)\))?$/);
  
  if (match) {
    return {
      identifier: match[1].trim().toLowerCase(),  // Normalize: lowercase + trim
      explanation: match[2]?.trim().toLowerCase(), // Normalize if present
      fullText: element.trim()                     // Keep original for display
    };
  }
  
  // Fallback: treat entire string as identifier
  return {
    identifier: element.trim().toLowerCase(),
    fullText: element.trim()
  };
};

/**
 * compareRootElements: Scores how well two parsed root elements match
 * 
 * WHAT IT DOES:
 * Compares two root elements and returns a score based on how similar they are.
 * 
 * SCORING RULES:
 * - Different identifiers → 0 points (not a match at all)
 * - Same identifier + same explanation → 80 points (perfect match!)
 * - Same identifier + similar explanation → 70 points (close variant)
 * - Same identifier + different explanation → 50 points (homograph)
 * - Same identifier + one missing explanation → 60 points (partial match)
 * 
 * WHAT ARE HOMOGRAPHS?
 * Words spelled the same but with different meanings. Example:
 * - "De (Dutch 'the')" vs "De (French 'of')" → Same "De" but different meanings
 * 
 * EXAMPLES:
 * 1. "De (Dutch 'the')" vs "De (Dutch the)"
 *    → Same identifier, equivalent explanations → 80 points
 * 
 * 2. "지 (ji, hanja 智 'wisdom')" vs "지 (ji, hanja 智 'wise')"
 *    → Same identifier, similar explanations (one contains other) → 70 points
 * 
 * 3. "De (Dutch 'the')" vs "De (French 'of')"
 *    → Same identifier, different meanings (homograph) → 50 points
 * 
 * 4. "De (Dutch 'the')" vs "De"
 *    → Same identifier, one missing explanation → 60 points
 * 
 * 5. "De" vs "La"
 *    → Different identifiers → 0 points
 */
const compareRootElements = (elem1: ParsedRootElement, elem2: ParsedRootElement): number => {
  // First rule: identifiers must match (e.g., both must be "De" or both "아")
  if (elem1.identifier !== elem2.identifier) return 0;
  
  // Both have explanations - compare them for deeper matching
  if (elem1.explanation && elem2.explanation) {
    // Remove quotes for fair comparison: "dutch 'the'" → "dutch the"
    const exp1 = elem1.explanation.replace(/['"]/g, '').trim();
    const exp2 = elem2.explanation.replace(/['"]/g, '').trim();
    
    if (exp1 === exp2) return 80; // Exact match: "dutch the" = "dutch the"
    
    // Check for substantial overlap: "wisdom" contains "wise"
    if (exp1.includes(exp2) || exp2.includes(exp1)) return 70;
    
    // Same identifier but completely different meanings (homographs)
    return 50;
  }
  
  // One or both missing explanation - can only verify identifier match
  return 60;
};

/**
 * extractRootElements: Splits a compound root into individual elements
 * 
 * WHAT ARE COMPOUND ROOTS?
 * Some names are built from multiple root elements combined together.
 * 
 * EXAMPLES:
 * - "아 (a, 'elegant') + 영 (yeong, 'flower')" → 2 elements
 * - "De (Dutch 'the') / La (French 'the')" → 2 elements
 * - "Greek: philos" → 1 element (no separators)
 * 
 * SEPARATORS WE RECOGNIZE:
 * - "+" means elements combine to form the name (e.g., Korean compound names)
 * - "/" means alternative forms or variants
 * 
 * WHY EXTRACT THEM?
 * So we can match names that share only some elements:
 * - "아영" (a-yeong) shares "아" with "아린" (a-rin) → Partial match!
 * 
 * RETURN VALUE:
 * Array of ParsedRootElement objects, one for each component
 */
const extractRootElements = (root: string): ParsedRootElement[] => {
  // Split on + and / (with optional whitespace around them)
  // Regex: \s*[+/]\s*  means "optional spaces, then + or /, then optional spaces"
  const parts = root.split(/\s*[+/]\s*/);
  
  // Parse each part into { identifier, explanation, fullText }
  return parts.map(parseRootElement);
};

/**
 * checkSharedRoots: Finds the best root match between two names' root lists
 * 
 * THIS IS THE CORE OF ROOT MATCHING!
 * It compares every root from name1 against every root from name2, and returns
 * the best match found (highest score).
 * 
 * HOW IT WORKS:
 * 1. Try exact string match first (fastest check for simple roots)
 * 2. If no exact match, parse roots into elements and compare piece by piece
 * 3. Calculate match ratio: how many elements matched vs total elements
 * 4. Scale score based on match quality
 * 
 * SCORING BASED ON MATCH RATIO:
 * - 80%+ elements match → Average element score (usually 60-80 points)
 * - 50-79% elements match → Average element score × 0.75 (usually 45-60 points)
 * - <50% match (single element) → Scaled to 30-50 points
 * 
 * EXAMPLES:
 * 
 * Example 1: Simple exact match
 * Name1 roots: ["Greek: philos"]
 * Name2 roots: ["Greek: philos"]
 * → Exact string match → 80 points → "philos"
 * 
 * Example 2: Compound with full match
 * Name1 roots: ["아 (a, 'elegant') + 영 (yeong, 'flower')"]
 * Name2 roots: ["아 (a, 'elegant') + 린 (rin, 'unicorn')"]
 * → 2 elements each, 1 matches perfectly (아)
 * → Match ratio: 1/2 = 50% → 60 points (scaled) → "아"
 * 
 * Example 3: Compound with partial match
 * Name1 roots: ["아 + 영 + 미"]  (3 elements)
 * Name2 roots: ["아 + 린"]      (2 elements)
 * → 3 elements max, 1 matches (아)
 * → Match ratio: 1/3 = 33% → 30-50 points (scaled) → "아"
 * 
 * Example 4: Homograph (same identifier, different meaning)
 * Name1 roots: ["De (Dutch 'the')"]
 * Name2 roots: ["De (French 'of')"]
 * → Elements match with score 50 (homograph)
 * → Match ratio: 1/1 = 100% → 50 points → "de"
 * 
 * Example 5: No match
 * Name1 roots: ["Greek: philos"]
 * Name2 roots: ["Latin: aqua"]
 * → No elements match → null
 * 
 * RETURN VALUE:
 * - { score: number, sharedRoot: string } if a match is found
 * - null if no matches at all
 */
const checkSharedRoots = (roots1: string[], roots2: string[]): { score: number; sharedRoot: string } | null => {
  let maxScore = 0;
  let bestMatch = '';
  
  // Compare every root from name1 against every root from name2
  for (const root1 of roots1) {
    for (const root2 of roots2) {
      // FAST PATH: Check for exact string match first (simple roots)
      const normalized1 = root1.toLowerCase().trim();
      const normalized2 = root2.toLowerCase().trim();
      
      if (normalized1 === normalized2) {
        if (80 > maxScore) {
          maxScore = 80;
          // Extract just the identifier part for display (remove explanation)
          bestMatch = root1.split('(')[0].trim();
        }
        continue; // Move to next pair
      }
      
      // DETAILED PATH: Parse compound roots into elements
      const elements1 = extractRootElements(root1);
      const elements2 = extractRootElements(root2);
      
      // Find all matching elements and their individual scores
      const matches: number[] = [];           // Scores of each matched element
      const matchedElements: string[] = [];  // Identifiers of matched elements
      
      for (const elem1 of elements1) {
        for (const elem2 of elements2) {
          const elementScore = compareRootElements(elem1, elem2);
          if (elementScore > 0) {
            matches.push(elementScore);
            matchedElements.push(elem1.identifier);
          }
        }
      }
      
      // No elements matched at all → skip this root pair
      if (matches.length === 0) continue;
      
      // Calculate overall score based on match quality
      const totalElements = Math.max(elements1.length, elements2.length);
      const matchRatio = matches.length / totalElements;
      
      let score = 0;
      if (matchRatio >= 0.8) {
        // Strong match: 80%+ of elements matched
        // Use average of element scores (usually 60-80)
        score = Math.round(matches.reduce((a, b) => a + b, 0) / matches.length);
      } else if (matchRatio >= 0.5) {
        // Medium match: 50-79% of elements matched
        // Use average but scale down by 25%
        score = Math.round((matches.reduce((a, b) => a + b, 0) / matches.length) * 0.75);
      } else {
        // Weak match: <50% of elements matched (usually just 1 element)
        // Scale the best element score down to 30-50 range
        const maxElementScore = Math.max(...matches);
        score = Math.min(50, Math.max(30, Math.round(maxElementScore * 0.6)));
      }
      
      // Keep track of the best match found so far
      if (score > maxScore) {
        maxScore = score;
        bestMatch = matchedElements[0] || elements1[0]?.identifier || root1;
      }
    }
  }
  
  // Return the best match, or null if nothing matched
  return maxScore > 0 ? { score: maxScore, sharedRoot: bestMatch } : null;
};

// ============= PRONUNCIATION SIMILARITY =============

/**
 * getPronunciationSimilarity: Scores pronunciation similarity using IPA notation
 * 
 * WHAT IS IPA?
 * International Phonetic Alphabet - a standard way to write how words sound.
 * Example: "Sarah" might be /ˈsɛrə/ or /ˈsærə/ depending on accent
 * 
 * WHY CHECK PRONUNCIATION?
 * Names can be spelled differently but sound the same or very similar:
 * - "Catherine" /ˈkæθrɪn/ and "Katherine" /ˈkæθrɪn/ → Same sound!
 * - "Sean" /ʃɔːn/ and "Shawn" /ʃɔːn/ → Same sound!
 * 
 * SCORING:
 * - Exact match: 80 points (pronounced identically)
 * - Very close (≤20% different): 60 points
 * - Somewhat close (≤40% different): 40 points
 * - Too different (>40%): 0 points
 * 
 * HOW IT WORKS:
 * 1. Clean up the IPA notation (remove formatting characters like / [ ])
 * 2. Check for exact match
 * 3. Use Levenshtein distance to measure how different they are
 * 4. Score based on percentage difference
 * 
 * EXAMPLES:
 * "Sarah" /ˈsɛrə/ vs "Sara" /ˈsɛrə/
 * → Exact match → 80 points
 * 
 * "Sean" /ʃɔːn/ vs "Shawn" /ʃɔːn/
 * → Exact match → 80 points
 * 
 * "Lily" /ˈlɪli/ vs "Lila" /ˈlaɪlə/
 * → 2 edits, 5 chars max, 40% different → 40 points
 */
const getPronunciationSimilarity = (pronunciation1?: string, pronunciation2?: string): number => {
  // Both pronunciations must exist to compare
  if (!pronunciation1 || !pronunciation2) return 0;
  
  // Clean up IPA notation: remove slashes, brackets, normalize case
  const p1 = pronunciation1.toLowerCase().replace(/[\/\[\]]/g, '').trim();
  const p2 = pronunciation2.toLowerCase().replace(/[\/\[\]]/g, '').trim();
  
  // Exact pronunciation match → highest score
  if (p1 === p2) return 80;
  
  // Calculate edit distance between pronunciations
  const distance = levenshteinDistance(p1, p2);
  const maxLength = Math.max(p1.length, p2.length);
  
  // Edge case: both empty after cleanup
  if (maxLength === 0) return 0;
  
  // Score based on how different they are (as percentage)
  if (distance <= maxLength * 0.2) return 60;  // ≤20% different → Very similar
  if (distance <= maxLength * 0.4) return 40;  // ≤40% different → Somewhat similar
  
  return 0; // >40% different → Not similar enough
};

// ============= ETYMOLOGY DESCRIPTION SIMILARITY =============

/**
 * getEtymologySimilarity: Scores similarity based on etymology descriptions
 * 
 * WHAT IS ETYMOLOGY?
 * Etymology is the story of where a name came from and how it evolved.
 * Example: "Philip comes from Greek 'philippos' meaning 'lover of horses',
 * combining 'philos' (love) and 'hippos' (horse)"
 * 
 * WHY CHECK ETYMOLOGY?
 * Names with similar historical backgrounds often share linguistic connections.
 * If two etymology descriptions mention the same key words, the names are
 * probably related even if they look different now.
 * 
 * SCORING:
 * - 3+ shared meaningful words: 75 points (strong etymological connection)
 * - 2 shared meaningful words: 50 points (moderate connection)
 * - 1 shared meaningful word: 25 points (weak connection)
 * - 0 shared words: 0 points (no connection)
 * 
 * WHAT ARE "MEANINGFUL WORDS"?
 * Words that carry semantic meaning, excluding common "stop words" like:
 * "the", "a", "from", "of", "and", etc.
 * 
 * We also filter out very short words (≤3 chars) to avoid false matches.
 * 
 * HOW IT WORKS:
 * 1. Extract meaningful words from both etymology descriptions
 * 2. Count how many words appear in both lists
 * 3. Score based on the count
 * 
 * EXAMPLES:
 * Etymology 1: "From Greek philos (love) and hippos (horse)"
 * Etymology 2: "From Greek philos (love) and sophia (wisdom)"
 * → Shared words: "greek", "philos", "love" (3 words) → 75 points
 * 
 * Etymology 1: "From Latin aqua meaning water"
 * Etymology 2: "From Latin aquila meaning eagle"
 * → Shared words: "latin" (1 word) → 25 points
 * 
 * Etymology 1: "From Old English meaning bright"
 * Etymology 2: "From Greek meaning dark"
 * → Shared words: none → 0 points
 */
const getEtymologySimilarity = (etymology1?: string, etymology2?: string): number => {
  // Both etymologies must exist to compare
  if (!etymology1 || !etymology2) return 0;
  
  const e1 = etymology1.toLowerCase();
  const e2 = etymology2.toLowerCase();
  
  // Define common stop words to ignore (they don't indicate similarity)
  const stopWords = ['the', 'a', 'an', 'from', 'of', 'in', 'to', 'and', 'or', 'via', 'through'];
  
  // Extract meaningful words: split on whitespace, filter stop words and short words
  const getWords = (text: string) => 
    text.split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));
  
  const words1 = getWords(e1);
  const words2 = getWords(e2);
  
  // Edge case: one or both have no meaningful words
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Find words that appear in both etymologies
  const sharedWords = words1.filter(w => words2.includes(w));
  
  // Score based on number of shared words
  if (sharedWords.length >= 3) return 75; // Strong connection
  if (sharedWords.length === 2) return 50; // Moderate connection
  if (sharedWords.length === 1) return 25; // Weak connection
  
  return 0; // No shared words
};

// ============= LITERAL MEANING SIMILARITY =============

/**
 * getLiteralMeaningSimilarity: Scores based on literal meaning/translation
 * 
 * WHAT IS LITERAL MEANING?
 * The direct translation of what a name means in its original language.
 * Examples:
 * - "Philip" → literal meaning: "lover of horses"
 * - "Sophia" → literal meaning: "wisdom"
 * - "Luna" → literal meaning: "moon"
 * 
 * NOTE: This is different from etymology (which is the full historical story)
 * and different from categories (which group names by theme).
 * 
 * SCORING:
 * - Exact match: 60 points (same literal meaning)
 * - Partial overlap: 40 points (one meaning contains the other)
 * - No match: 0 points
 * 
 * EXAMPLES:
 * "moon" vs "moon"
 * → Exact match → 60 points
 * 
 * "bright moon" vs "moon"
 * → One contains the other → 40 points
 * 
 * "moon" vs "sun"
 * → No overlap → 0 points
 * 
 * WHY MODERATE SCORING?
 * Literal meanings are helpful but not as strong as shared roots or pronunciation.
 * Many unrelated names can share similar meanings (e.g., many names mean "warrior").
 */
const getLiteralMeaningSimilarity = (meaning1?: string, meaning2?: string): number => {
  // Both meanings must exist to compare
  if (!meaning1 || !meaning2) return 0;
  
  // Normalize: lowercase and trim whitespace
  const m1 = meaning1.toLowerCase().trim();
  const m2 = meaning2.toLowerCase().trim();
  
  // Exact match
  if (m1 === m2) return 60;
  
  // Check for substantial overlap (one contains the other)
  // Example: "bright moon" contains "moon"
  if (m1.includes(m2) || m2.includes(m1)) return 40;
  
  return 0; // No similarity
};

// ============= HIERARCHICAL CATEGORY MATCHING =============

/**
 * getCategoryHierarchy: Generates all ancestor categories from a full path
 * 
 * WHAT ARE HIERARCHICAL CATEGORIES?
 * Categories organized in a tree structure from general to specific.
 * Example: "Nature Names > Botanical Names > Flowers > Rose"
 * 
 * HIERARCHY LEVELS:
 * 1. "Nature Names" (root/top-level)
 * 2. "Nature Names > Botanical Names" (parent)
 * 3. "Nature Names > Botanical Names > Flowers" (grandparent of Rose)
 * 4. "Nature Names > Botanical Names > Flowers > Rose" (leaf/specific)
 * 
 * WHY GENERATE THIS?
 * To find the "deepest common ancestor" between two categories.
 * This tells us how closely related they are.
 * 
 * EXAMPLES:
 * Input: "Nature Names > Botanical Names > Flowers > Rose"
 * Output: [
 *   "Nature Names",
 *   "Nature Names > Botanical Names",
 *   "Nature Names > Botanical Names > Flowers",
 *   "Nature Names > Botanical Names > Flowers > Rose"
 * ]
 * 
 * Input: "Celestial Names > Moon Names"
 * Output: [
 *   "Celestial Names",
 *   "Celestial Names > Moon Names"
 * ]
 */
const getCategoryHierarchy = (category: string): string[] => {
  // Split on " > " separator and trim each part
  const parts = category.split(' > ').map(p => p.trim());
  
  // Generate cumulative paths: each entry includes all ancestors
  return parts.map((_, i) => parts.slice(0, i + 1).join(' > '));
};

/**
 * getHierarchicalCategorySimilarity: Scores category similarity with exponential specificity
 * 
 * WHAT IT DOES:
 * Compares two lists of categories and finds the best match, scoring based on
 * how deep in the hierarchy the match is (deeper = more specific = more points).
 * 
 * SCORING RULES:
 * - Exact match (same leaf category): 70 points
 *   Example: Both are "Flowers > Rose"
 * 
 * - Siblings (same parent, different leaf): 40 points
 *   Example: "Flowers > Rose" vs "Flowers > Lily"
 * 
 * - Parent-child (one is ancestor of other): 30 points
 *   Example: "Flowers" vs "Flowers > Rose"
 * 
 * - Same grandparent (2 levels up): 10 points
 *   Example: "Botanical > Flowers > Rose" vs "Botanical > Trees > Oak"
 * 
 * - Same great-grandparent (3+ levels up): 0 points
 *   Example: "Nature > Botanical > Flowers" vs "Nature > Elemental > Water"
 *   (These are too distantly related to be meaningful)
 * 
 * WHY EXPONENTIAL DECAY?
 * The more specific the shared category, the more meaningful the connection.
 * Sharing "Flowers" (specific) is much more significant than sharing just "Nature" (broad).
 * 
 * EXAMPLES:
 * 
 * Example 1: Exact match
 * Name1: ["Nature > Botanical > Flowers > Rose"]
 * Name2: ["Nature > Botanical > Flowers > Rose"]
 * → Same leaf category → 70 points
 * 
 * Example 2: Siblings (most common case)
 * Name1: ["Nature > Botanical > Flowers > Rose"]
 * Name2: ["Nature > Botanical > Flowers > Lily"]
 * → Share "Flowers" parent, different leaf → 40 points
 * 
 * Example 3: Parent-child
 * Name1: ["Nature > Botanical > Flowers"]
 * Name2: ["Nature > Botanical > Flowers > Rose"]
 * → One is parent of other → 30 points
 * 
 * Example 4: Cousins (same grandparent)
 * Name1: ["Nature > Botanical > Flowers > Rose"]
 * Name2: ["Nature > Botanical > Trees > Oak"]
 * → Share "Botanical" grandparent → 10 points
 * 
 * Example 5: Too distant
 * Name1: ["Nature > Botanical > Flowers"]
 * Name2: ["Nature > Elemental > Water"]
 * → Only share "Nature" (2 levels up from shortest path) → 0 points
 * 
 * HOW IT WORKS:
 * 1. Generate hierarchy arrays for both categories
 * 2. Find the deepest level where they still match (common ancestor)
 * 3. Compare common depth to path lengths to determine relationship
 * 4. Score based on relationship type
 */
const getHierarchicalCategorySimilarity = (meanings1: string[], meanings2: string[]): number => {
  // Must have at least one category each to compare
  if (meanings1.length === 0 || meanings2.length === 0) return 0;
  
  let maxScore = 0;
  
  // Compare every category from name1 against every category from name2
  for (const cat1 of meanings1) {
    for (const cat2 of meanings2) {
      // Get full hierarchy arrays for both categories
      const h1 = getCategoryHierarchy(cat1);
      const h2 = getCategoryHierarchy(cat2);
      
      // Find the deepest common ancestor
      // commonDepth = how many levels they share before diverging
      let commonDepth = 0;
      for (let i = 0; i < Math.min(h1.length, h2.length); i++) {
        if (h1[i] === h2[i]) commonDepth = i + 1;
        else break; // Stop at first mismatch
      }
      
      // No common ancestor at all → not related
      if (commonDepth === 0) continue;
      
      let score = 0;
      
      // Determine relationship type and assign score
      if (cat1 === cat2) {
        // EXACT MATCH: Both categories are identical (same leaf node)
        score = 70;
      } else if (commonDepth === Math.min(h1.length, h2.length)) {
        // They match all the way down one of the paths
        if (h1.length === h2.length) {
          // SIBLINGS: Same depth, same parent, different leaf
          // Example: "Flowers > Rose" vs "Flowers > Lily"
          score = 40;
        } else {
          // PARENT-CHILD: One category is an ancestor of the other
          // Example: "Flowers" vs "Flowers > Rose"
          score = 30;
        }
      } else if (commonDepth === Math.min(h1.length, h2.length) - 1) {
        // COUSINS: Share grandparent (common depth is one less than shortest path)
        // Example: "Botanical > Flowers > Rose" vs "Botanical > Trees > Oak"
        score = 10;
      }
      // If common depth is even further back (great-grandparent, etc.), score = 0
      // These relationships are too distant to be meaningful
      
      // Keep track of the best score found
      maxScore = Math.max(maxScore, score);
    }
  }
  
  return maxScore;
};

// ============= HIERARCHICAL ORIGIN MATCHING =============

/**
 * getHierarchicalOriginSimilarity: Scores origin similarity (geographic/linguistic)
 * 
 * WHAT ARE ORIGINS?
 * Geographic and linguistic sources of names, organized hierarchically.
 * Examples:
 * - "European > Germanic > German"
 * - "European > Romance > French"
 * - "Asian > East Asian > Korean"
 * 
 * WHY SCORE ORIGINS?
 * Names from related origins often share linguistic features.
 * German and Dutch names (both Germanic) have more in common than German and French.
 * 
 * SCORING RULES (lower than categories because origin is less specific):
 * - Exact origin match: 45 points
 *   Example: Both "Greek > Ancient Greek"
 * 
 * - Siblings (same parent origin): 25 points
 *   Example: "Germanic > German" vs "Germanic > Dutch"
 * 
 * - Parent-child: 20 points
 *   Example: "Germanic" vs "Germanic > German"
 * 
 * - Same grandparent: 8 points
 *   Example: "European > Germanic > German" vs "European > Romance > French"
 * 
 * - Same great-grandparent or further: 0 points
 *   (Too broad to be meaningful)
 * 
 * WHY LOWER SCORES THAN CATEGORIES?
 * Origin is more about geographic/linguistic background, which is less specific
 * than thematic categories. Many names from the same origin can be completely
 * unrelated in meaning and sound.
 * 
 * EXAMPLES:
 * 
 * Example 1: Exact match
 * Name1: ["Greek > Ancient Greek"]
 * Name2: ["Greek > Ancient Greek"]
 * → Exact match → 45 points
 * 
 * Example 2: Siblings
 * Name1: ["European > Germanic > German"]
 * Name2: ["European > Germanic > Dutch"]
 * → Share "Germanic" parent → 25 points
 * 
 * Example 3: Parent-child
 * Name1: ["European > Germanic"]
 * Name2: ["European > Germanic > German"]
 * → One is parent of other → 20 points
 * 
 * Example 4: Cousins
 * Name1: ["European > Germanic > German"]
 * Name2: ["European > Romance > French"]
 * → Share "European" grandparent → 8 points
 * 
 * Example 5: Too distant
 * Name1: ["European > Germanic"]
 * Name2: ["Asian > East Asian"]
 * → No shared ancestor → 0 points
 * 
 * HOW IT WORKS:
 * Uses the same hierarchical matching logic as categories, but with lower scores
 * to reflect that geographic origin is less definitive than semantic categories.
 */
const getHierarchicalOriginSimilarity = (origin1?: string[], origin2?: string[]): number => {
  // Must have origins to compare
  if (!origin1 || !origin2 || origin1.length === 0 || origin2.length === 0) return 0;
  
  let maxScore = 0;
  
  // Compare every origin from name1 against every origin from name2
  for (const o1 of origin1) {
    for (const o2 of origin2) {
      // Get full hierarchy for both origins
      const h1 = getCategoryHierarchy(o1);  // Reusing the same function
      const h2 = getCategoryHierarchy(o2);
      
      // Find deepest common ancestor
      let commonDepth = 0;
      for (let i = 0; i < Math.min(h1.length, h2.length); i++) {
        if (h1[i] === h2[i]) commonDepth = i + 1;
        else break;
      }
      
      // No common ancestor → not related
      if (commonDepth === 0) continue;
      
      let score = 0;
      
      // Determine relationship and assign score
      if (o1 === o2) {
        // Exact origin match
        score = 45;
      } else if (commonDepth === Math.min(h1.length, h2.length)) {
        // Match all the way down one path
        if (h1.length === h2.length) {
          // Siblings: same parent origin
          score = 25;
        } else {
          // Parent-child: one is ancestor of other
          score = 20;
        }
      } else if (commonDepth === Math.min(h1.length, h2.length) - 1) {
        // Cousins: same grandparent origin
        score = 8;
      }
      // Great-grandparent or further → 0 points
      
      maxScore = Math.max(maxScore, score);
    }
  }
  
  return maxScore;
};

// ============= MAIN EXPORT TYPES =============

/**
 * SimilarName: Result object for a similar name match
 * 
 * PROPERTIES:
 * - name: The Name object that was found to be similar
 * - reason: Human-readable explanation of why it's similar
 *   Example: "shared root (philos), similar pronunciation"
 * - score: Numeric score indicating strength of similarity (optional for display)
 */
export interface SimilarName {
  name: Name;
  reason: string;
  score?: number;
}

// ============= MAIN SIMILARITY FINDING FUNCTION =============

/**
 * findSimilarNames: THE MAIN FUNCTION - Finds all names similar to a target name
 * 
 * WHAT IT DOES:
 * 1. Loops through all names in the database
 * 2. Calculates a similarity score for each name based on 8 different criteria
 * 3. Excludes names that are already shown in other sections (diminutives, etc.)
 * 4. Returns only names that score above the threshold (default: 60 points)
 * 5. Sorts results by score (highest first), then alphabetically
 * 
 * PARAMETERS:
 * @param name - The target name to find similar names for
 * @param allNames - The full list of names to search through
 * @param threshold - Minimum score to be considered similar (default: 60)
 * 
 * RETURNS:
 * Array of SimilarName objects, sorted by score descending, then alphabetically
 * 
 * EXCLUSION LOGIC:
 * Names are excluded if they're already shown in dedicated card sections:
 * - Alternate spellings (variants)
 * - Diminutives (nicknames)
 * - Gender forms (masculine/feminine/neutral)
 * - Other language forms
 * 
 * WHY EXCLUDE THEM?
 * These are explicit, direct relationships that have their own UI sections.
 * The "Similar Names" section is for *discovered* patterns, not explicit links.
 * 
 * SCORING SYSTEM SUMMARY:
 * TIER 1 (70-80 points): Strong linguistic connections
 *   - Shared etymological roots: 30-80 pts (based on match quality)
 *   - Exact pronunciation: 80 pts, similar: 40-60 pts
 *   - Etymology description overlap: 25-75 pts
 *   - Exact category match: 70 pts
 * 
 * TIER 2 (40-60 points): Meaningful similarities
 *   - Exact literal meaning: 60 pts, partial: 40 pts
 *   - Similar spelling (Levenshtein): 50 pts
 *   - Exact origin: 45 pts
 *   - Sibling categories: 40 pts
 * 
 * TIER 3 (8-30 points): Supporting evidence
 *   - Parent-child categories: 30 pts
 *   - Sibling origins: 25 pts
 *   - Parent-child origins: 20 pts
 *   - Same grandparent category: 10 pts
 *   - Same grandparent origin: 8 pts
 *   - Similar feelings: 8 pts
 * 
 * EXAMPLES:
 * 
 * Example 1: Strong root match
 * Target: "Philip" (root: "Greek: philos")
 * Candidate: "Philomena" (root: "Greek: philos")
 * → Root match: 80 pts → APPEARS with reason "shared root (philos)"
 * 
 * Example 2: Multiple medium signals
 * Target: "Lily" (category: "Nature > Botanical > Flowers > Lily")
 * Candidate: "Rose" (category: "Nature > Botanical > Flowers > Rose")
 * → Category siblings: 40 pts
 * → If they also share origin: +45 pts = 85 pts total
 * → APPEARS with reason "similar category, related origin"
 * 
 * Example 3: Weak signals don't add up
 * Target: "River" (category: "Nature > Elemental > Water")
 * Candidate: "Rose" (category: "Nature > Botanical > Flowers")
 * → Only share "Nature" grandparent: 10 pts
 * → Below 60 threshold → DOES NOT APPEAR
 * 
 * Example 4: Excluded despite high score
 * Target: "Katherine"
 * Candidate: "Catherine" (listed as alternate spelling of Katherine)
 * → Would score high (similar spelling: 50 pts, etc.)
 * → But EXCLUDED because it's an alternate spelling
 */
export const findSimilarNames = (
  name: Name, 
  allNames: Name[], 
  threshold = 60
): SimilarName[] => {
  const similar: SimilarName[] = [];
  const currentName = name;

  // Loop through every name in the database
  allNames.forEach(otherName => {
    // EXCLUSION RULE 1: Skip comparing a name to itself
    if (otherName.id === currentName.id) return;
    
    // EXCLUSION RULE 2: Skip related name forms
    // These are shown in the "Related Forms & Relationships" section
    const currentRelatedNames = currentName.relatedNames?.map(r => r.name) || [];
    const otherRelatedNames = otherName.relatedNames?.map(r => r.name) || [];
    
    if (currentRelatedNames.includes(otherName.name) || 
        otherRelatedNames.includes(currentName.name)) {
      return;
    }

    // Initialize scoring variables
    const reasons: string[] = [];  // Human-readable reasons for similarity
    let score = 0;                  // Numeric score (sum of all matched criteria)

    // FALSE COGNATE DETECTION: Names spelled the same but from different origins
    // Example: "Kim" (Korean) vs "Kim" (German) - same spelling, unrelated origins
    // We'll use this flag to avoid scoring spelling similarity for false cognates
    const isFalseCognate = currentName.name.toLowerCase() === otherName.name.toLowerCase() &&
                           !getOriginSimilarity(currentName.origin, otherName.origin);

    // ====================================================================
    // TIER 1: STRONG LINGUISTIC RELATIONSHIPS (70-80 points)
    // ====================================================================
    // These are the most reliable indicators of name similarity, based on
    // deep linguistic connections like shared origins and pronunciation.

    // 1. SHARED ETYMOLOGICAL ROOTS (30-80 points based on match quality)
    // This is the strongest indicator of linguistic relationship.
    // Names that share roots usually have a common linguistic ancestor.
    if (currentName.roots && otherName.roots) {
      const rootMatch = checkSharedRoots(currentName.roots, otherName.roots);
      if (rootMatch) {
        reasons.push(`shared root (${rootMatch.sharedRoot})`);
        score += rootMatch.score;
      }
    }

    // 2. PRONUNCIATION SIMILARITY (40-80 points)
    // Names that sound alike are often variants of each other or from
    // the same linguistic family, even if spelled differently.
    const pronunciationScore = getPronunciationSimilarity(currentName.pronunciation, otherName.pronunciation);
    if (pronunciationScore > 0) {
      reasons.push("similar pronunciation");
      score += pronunciationScore;
    }

    // 3. ETYMOLOGY DESCRIPTION SIMILARITY (25-75 points)
    // If etymology descriptions share multiple meaningful words, the names
    // likely have related linguistic histories.
    const etymologyScore = getEtymologySimilarity(currentName.etymology, otherName.etymology);
    if (etymologyScore > 0) {
      reasons.push("shared etymology");
      score += etymologyScore;
    }

    // 4. HIERARCHICAL CATEGORY MATCH (10-70 points)
    // Names in closely related categories (siblings or same leaf) are
    // thematically similar and often have linguistic connections.
    const categoryScore = getHierarchicalCategorySimilarity(currentName.meanings, otherName.meanings);
    if (categoryScore > 0) {
      reasons.push("similar category");
      score += categoryScore;
    }

    // ====================================================================
    // TIER 2: MEANINGFUL SIMILARITIES (40-60 points)
    // ====================================================================
    // These indicate moderate linguistic or semantic connections.

    // 5. LITERAL MEANING SIMILARITY (40-60 points)
    // Names with the same or overlapping literal meanings may come from
    // different languages but express the same concept.
    const meaningScore = getLiteralMeaningSimilarity(currentName.meaning, otherName.meaning);
    if (meaningScore > 0) {
      reasons.push("similar literal meaning");
      score += meaningScore;
    }

    // 6. SOUND SIMILARITY - SPELLING (50 points)
    // Names spelled similarly often have a common origin or are variants.
    // SPECIAL CASE: Don't score false cognates on spelling alone.
    if (getSoundSimilarity(currentName.name, otherName.name)) {
      // Only add points if:
      // - NOT a false cognate (different origins, same spelling), OR
      // - IS a false cognate BUT has other meaningful similarities
      if (!isFalseCognate || score > 0) {
        reasons.push("similar spelling");
        score += 50;
      }
    }

    // 7. HIERARCHICAL ORIGIN SIMILARITY (8-45 points)
    // Names from related geographic/linguistic origins often share
    // linguistic features and structures.
    const originScore = getHierarchicalOriginSimilarity(currentName.origin, otherName.origin);
    if (originScore > 0) {
      reasons.push("related origin");
      score += originScore;
    }

    // ====================================================================
    // TIER 3: SUPPORTING SIMILARITIES (8-30 points)
    // ====================================================================
    // These provide additional context but are not strong enough alone.

    // 8. FEELINGS SIMILARITY (8 points)
    // Shared emotional associations (e.g., both "strong" or both "gentle").
    // This is subjective and many unrelated names can share feelings,
    // so it only provides minimal supporting evidence.
    if (getFeelingsSimilarity(currentName.feelings, otherName.feelings)) {
      reasons.push("similar feeling");
      score += 8;
    }

    // ====================================================================
    // FINAL DECISION: Add to results if above threshold
    // ====================================================================
    // Only include this name if:
    // 1. We found at least one reason for similarity
    // 2. The total score meets or exceeds the threshold (default: 60)
    if (reasons.length > 0 && score >= threshold) {
      similar.push({
        name: otherName,
        reason: reasons.join(", "),  // Comma-separated list of reasons
        score,                        // Total numeric score
      });
    }
  });

  // ====================================================================
  // SORT RESULTS
  // ====================================================================
  // 1. Sort by score descending (highest similarity first)
  // 2. If scores are tied, sort alphabetically (A-Z)
  return similar.sort((a, b) => {
    // Primary sort: score (higher first)
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    
    // Secondary sort: alphabetical (case-insensitive, natural number ordering)
    const aName = (a.name.name || '').toLowerCase();
    const bName = (b.name.name || '').toLowerCase();
    return aName.localeCompare(bName, undefined, { sensitivity: 'base', numeric: true });
  });
};
