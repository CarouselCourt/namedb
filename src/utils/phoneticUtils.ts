/**
 * ============================================================================
 * PHONETIC UTILITIES
 * ============================================================================
 * 
 * These functions help filter and match names based on how they SOUND rather
 * than how they're spelled. This is useful because:
 * - Names can be spelled many different ways but sound the same
 * - Users might want names that rhyme or have the same rhythm
 * - Syllable count affects how a name "feels" (short vs. long)
 * 
 * PRONUNCIATION FORMAT:
 * We use a simplified phonetic format with hyphens separating syllables:
 * - "BROWN" = 1 syllable
 * - "AY-bruhmz" = 2 syllables (Abrams)
 * - "ih-LIZ-uh-beth" = 4 syllables (Elizabeth)
 * 
 * WHY THIS MATTERS:
 * - "Catherine" and "Katherine" sound the same → users might want both
 * - "Rose" and "Lily" both have 2 syllables → rhythmic similarity
 * - "Kate" and "Nate" rhyme → stylistic pairing
 */

/**
 * getSyllableCount: Counts syllables in a pronunciation string
 * 
 * HOW IT WORKS:
 * Syllables are separated by hyphens, so we count hyphens and add 1.
 * Formula: syllables = hyphens + 1
 * 
 * WHY USE THIS?
 * Syllable count affects the rhythm and "weight" of a name:
 * - 1 syllable: Short, punchy (Kate, John, Rose)
 * - 2 syllables: Balanced, common (Sarah, Nathan, Luna)
 * - 3+ syllables: Formal, elegant (Elizabeth, Alexander, Isabella)
 * 
 * EXAMPLES:
 * getSyllableCount("BROWN") → 1 (no hyphens)
 * getSyllableCount("AY-bruhmz") → 2 (1 hyphen)
 * getSyllableCount("ih-LIZ-uh-beth") → 4 (3 hyphens)
 * getSyllableCount(undefined) → 0 (no pronunciation provided)
 * getSyllableCount("") → 0 (empty string)
 * 
 * RETURNS:
 * Number of syllables, or 0 if pronunciation is missing/empty
 */
export const getSyllableCount = (pronunciation: string | undefined): number => {
  // Handle missing or empty pronunciation
  if (!pronunciation || !pronunciation.trim()) return 0;
  
  // Count hyphens using regex (match all "-" characters)
  // Example: "AY-bruhmz" has 1 hyphen → ["-"] → length = 1
  const hyphenCount = (pronunciation.match(/-/g) || []).length;
  
  // Each hyphen separates two syllables, so add 1
  // Example: 1 hyphen = 2 syllables, 2 hyphens = 3 syllables, etc.
  return hyphenCount + 1;
};

/**
 * normalizePronunciation: Prepares pronunciation strings for comparison
 * 
 * WHAT IT DOES:
 * 1. Converts to lowercase (so "AY" matches "ay")
 * 2. Removes all spaces (so "AY - bruhmz" matches "AY-bruhmz")
 * 
 * WHY NEEDED?
 * Different sources might format pronunciations differently:
 * - "KATE" vs. "kate" → should match
 * - "AY-bruhmz" vs. "AY - bruhmz" → should match
 * - "ih LIZ uh beth" vs. "ih-LIZ-uh-beth" → should match
 * 
 * EXAMPLES:
 * normalizePronunciation("KATE") → "kate"
 * normalizePronunciation("AY - bruhmz") → "ay-bruhmz"
 * normalizePronunciation("  BROWN  ") → "brown"
 * 
 * RETURNS:
 * Lowercase string with all spaces removed
 */
const normalizePronunciation = (text: string): string => {
  return text.toLowerCase().replace(/\s+/g, '');
};

/**
 * pronunciationStartsWith: Checks if a name starts with a specific sound
 * 
 * USE CASES:
 * - Find all names starting with "AY" sound (Aiden, Amy, April)
 * - Find all names starting with "KAY" sound (Kate, Caitlyn, Kayla)
 * - Find all names starting with "SHON" sound (Sean, Shawn, John)
 * 
 * HOW IT WORKS:
 * 1. Normalize both pronunciations (lowercase, remove spaces)
 * 2. Check if the name's pronunciation starts with the search sound
 * 
 * EXAMPLES:
 * pronunciationStartsWith("KAY-tee", "KAY") → true (Katie starts with "KAY")
 * pronunciationStartsWith("KATE", "kay") → true (case-insensitive)
 * pronunciationStartsWith("KATE", "SA") → false (doesn't start with "SA")
 * pronunciationStartsWith(undefined, "KAY") → false (no pronunciation)
 * pronunciationStartsWith("KATE", "") → false (no search term)
 * 
 * RETURNS:
 * true if pronunciation starts with the search sound, false otherwise
 */
export const pronunciationStartsWith = (
  pronunciation: string | undefined,
  search: string
): boolean => {
  // Both values must be provided
  if (!pronunciation || !search) return false;
  
  // Normalize both for comparison
  const normalized = normalizePronunciation(pronunciation);
  const searchNormalized = normalizePronunciation(search);
  
  // Check if normalized pronunciation starts with normalized search
  return normalized.startsWith(searchNormalized);
};

/**
 * pronunciationEndsWith: Checks if a name ends with a specific sound
 * 
 * USE CASES:
 * - Find all names ending with "ah" sound (Sarah, Luna, Emma)
 * - Find all names ending with "lyn" sound (Brooklyn, Carolyn, Evelyn)
 * - Find names with specific endings for stylistic matching
 * 
 * HOW IT WORKS:
 * Same as pronunciationStartsWith, but checks the ending instead
 * 
 * EXAMPLES:
 * pronunciationEndsWith("SA-ruh", "ruh") → true (Sarah ends with "ruh")
 * pronunciationEndsWith("KATE", "ate") → true (Kate ends with "ate")
 * pronunciationEndsWith("SARAH", "ly") → false (Sarah doesn't end with "ly")
 * pronunciationEndsWith(undefined, "ah") → false (no pronunciation)
 * 
 * RETURNS:
 * true if pronunciation ends with the search sound, false otherwise
 */
export const pronunciationEndsWith = (
  pronunciation: string | undefined,
  search: string
): boolean => {
  // Both values must be provided
  if (!pronunciation || !search) return false;
  
  // Normalize both for comparison
  const normalized = normalizePronunciation(pronunciation);
  const searchNormalized = normalizePronunciation(search);
  
  // Check if normalized pronunciation ends with normalized search
  return normalized.endsWith(searchNormalized);
};

/**
 * pronunciationsRhyme: Checks if two names rhyme with each other
 * 
 * WHAT IS A RHYME?
 * Two words rhyme if they:
 * 1. Share the same vowel sound + ending in the last syllable
 * 2. Have DIFFERENT beginning consonants (onset)
 * 
 * WHY THE "DIFFERENT ONSET" RULE?
 * - "Kate" and "Kate" sound identical → NOT a rhyme (same word)
 * - "Kate" and "Nate" share "-ate" but start differently → IS a rhyme
 * - "Kate" and "gate" → IS a rhyme (different onsets)
 * 
 * USE CASES:
 * - Find names that rhyme for siblings or twins (Kate & Nate)
 * - Create poetic or musical name combinations
 * - Avoid rhyming names that might sound too similar
 * 
 * HOW IT WORKS:
 * 1. Normalize both pronunciations
 * 2. Extract the last syllable from each
 * 3. Split each syllable into: onset (consonants) + rhyme (vowel + ending)
 * 4. Check if rhyme parts match but onsets differ
 * 
 * EXAMPLES:
 * 
 * Example 1: Kate and Nate (RHYME)
 * "KATE" → last syllable: "kate" → onset: "k", rhyme: "ate"
 * "NATE" → last syllable: "nate" → onset: "n", rhyme: "ate"
 * → Rhyme parts match ("ate" = "ate") AND onsets differ ("k" ≠ "n") → TRUE
 * 
 * Example 2: Kate and Kate (DO NOT RHYME - identical)
 * "KATE" → onset: "k", rhyme: "ate"
 * "KATE" → onset: "k", rhyme: "ate"
 * → Identical pronunciations → FALSE
 * 
 * Example 3: Rose and Lily (DO NOT RHYME)
 * "ROZE" → last syllable: "roze" → onset: "r", rhyme: "oze"
 * "LIL-ee" → last syllable: "ee" → onset: "", rhyme: "ee"
 * → Rhyme parts don't match ("oze" ≠ "ee") → FALSE
 * 
 * Example 4: Multi-syllable (only last syllable matters)
 * "ih-LIZ-uh-beth" → last syllable: "beth" → onset: "b", rhyme: "eth"
 * "SETH" → last syllable: "seth" → onset: "s", rhyme: "eth"
 * → Rhyme parts match AND onsets differ → TRUE
 * 
 * TECHNICAL DETAILS:
 * - Vowels detected: a, e, i, o, u, y
 * - Minimum rhyme length: 2 characters (prevents weak matches)
 * - Syllable extraction: takes text after last hyphen
 * 
 * EDGE CASES:
 * - Missing pronunciation → false
 * - Syllable too short (<2 chars) → false
 * - No vowel found → uses whole syllable as rhyme
 * 
 * RETURNS:
 * true if names rhyme, false otherwise
 */
export const pronunciationsRhyme = (
  pronunciation1: string | undefined,
  pronunciation2: string | undefined
): boolean => {
  // Both pronunciations must be provided
  if (!pronunciation1 || !pronunciation2) return false;
  
  // Normalize both (lowercase, remove spaces)
  const normalized1 = normalizePronunciation(pronunciation1);
  const normalized2 = normalizePronunciation(pronunciation2);
  
  // Exact match is NOT a rhyme (it's the same word)
  if (normalized1 === normalized2) return false;
  
  /**
   * getLastSyllable: Extracts the final syllable from pronunciation
   * 
   * EXAMPLES:
   * "kate" → "kate" (no hyphens, return whole thing)
   * "il-liz-uh-beth" → "beth" (return after last hyphen)
   * "ay-bruhmz" → "bruhmz" (return after last hyphen)
   */
  const getLastSyllable = (text: string): string => {
    const parts = text.split('-');
    return parts[parts.length - 1]; // Get last element
  };
  
  const lastSyllable1 = getLastSyllable(normalized1);
  const lastSyllable2 = getLastSyllable(normalized2);
  
  // Syllables must be at least 2 characters to form a meaningful rhyme
  // Example: "a" vs "i" is too short to determine if they rhyme
  if (lastSyllable1.length < 2 || lastSyllable2.length < 2) return false;
  
  /**
   * getRhymePart: Splits syllable into onset and rhyme
   * 
   * ONSET: Beginning consonants before the first vowel
   * RHYME: First vowel + everything after it
   * 
   * EXAMPLES:
   * "kate" → onset: "k", rhyme: "ate"
   * "nate" → onset: "n", rhyme: "ate"
   * "beth" → onset: "b", rhyme: "eth"
   * "ate" → onset: "", rhyme: "ate" (starts with vowel)
   * "xyz" → onset: "", rhyme: "xyz" (no vowel found, use whole)
   */
  const getRhymePart = (syllable: string): { onset: string; rhyme: string } => {
    // Regex to find first vowel (including 'y' which can be a vowel)
    const vowelPattern = /[aeiouy]/i;
    const firstVowelIndex = syllable.search(vowelPattern);
    
    if (firstVowelIndex === -1) {
      // No vowel found (unusual, but handle gracefully)
      // Treat entire syllable as the rhyme part
      return { onset: '', rhyme: syllable };
    }
    
    return {
      onset: syllable.substring(0, firstVowelIndex),  // Everything before vowel
      rhyme: syllable.substring(firstVowelIndex)      // Vowel + everything after
    };
  };
  
  const parts1 = getRhymePart(lastSyllable1);
  const parts2 = getRhymePart(lastSyllable2);
  
  // CHECK RHYMING CONDITIONS:
  
  // 1. Rhyme parts must match (vowel + ending sound the same)
  const rhymePartsMatch = parts1.rhyme === parts2.rhyme;
  
  // 2. Onsets must be different (beginning consonants are NOT the same)
  // This distinguishes rhyming from identical words
  const onsetsAreDifferent = parts1.onset !== parts2.onset;
  
  // 3. Rhyme must be substantial (at least 2 characters)
  // This prevents weak rhymes like "a" and "la"
  const rhymeIsSubstantial = parts1.rhyme.length >= 2;
  
  // All three conditions must be true for a proper rhyme
  return rhymePartsMatch && onsetsAreDifferent && rhymeIsSubstantial;
};

/**
 * getUniqueSyllableCounts: Extracts all unique syllable counts from a name list
 * 
 * WHY USEFUL?
 * For creating filter dropdowns in the UI. Instead of hardcoding:
 * "1 syllable, 2 syllables, 3 syllables, ..."
 * 
 * We dynamically generate options based on what's actually in the database:
 * If you only have names with 2, 3, and 5 syllables, the dropdown shows:
 * "2 syllables, 3 syllables, 5 syllables"
 * 
 * HOW IT WORKS:
 * 1. Loop through all names
 * 2. Get syllable count for each primary name (if pronunciation exists)
 * 3. Get syllable count for each related variant (if pronunciation exists)
 * 4. Add to a Set (automatically removes duplicates)
 * 5. Convert Set to Array and sort numerically
 * 
 * EXAMPLES:
 * Names: [
 *   { 
 *     pronunciation: "KATE",      // 1 syllable
 *     relatedNames: [
 *       { pronunciation: "KATH-uh-rin" }  // 3 syllables
 *     ]
 *   },
 *   { pronunciation: "SA-ruh" },    // 2 syllables
 *   { pronunciation: "KATE" },      // 1 syllable (duplicate count)
 *   { pronunciation: undefined },   // No pronunciation (skipped)
 *   { pronunciation: "ih-LIZ-uh-beth" } // 4 syllables
 * ]
 * 
 * Result: [1, 2, 3, 4]  // Sorted, unique counts including related variants
 * 
 * RETURNS:
 * Sorted array of unique syllable counts (e.g., [1, 2, 3, 4])
 * Empty counts (0) are excluded
 */
export const getUniqueSyllableCounts = (names: Array<{ 
  pronunciation?: string;
  relatedNames?: Array<{ pronunciation?: string }>;
}>): number[] => {
  // Use Set to automatically handle duplicates
  const counts = new Set<number>();
  
  // Extract syllable count from each name and its variants
  names.forEach(name => {
    // Add syllable count from primary name
    const count = getSyllableCount(name.pronunciation);
    if (count > 0) {
      counts.add(count);
    }
    
    // Add syllable counts from related variants
    if (name.relatedNames) {
      name.relatedNames.forEach(related => {
        const relatedCount = getSyllableCount(related.pronunciation);
        if (relatedCount > 0) {
          counts.add(relatedCount);
        }
      });
    }
  });
  
  // Convert Set to Array and sort numerically (ascending)
  return Array.from(counts).sort((a, b) => a - b);
};
