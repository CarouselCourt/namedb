import { Name } from "@/hooks/useNameStorage";

/**
 * Find all names that share the same name string (false cognates)
 * Excludes the name with the given ID from results
 * Also checks related names
 */
export const findDuplicateNames = (
  targetName: Name,
  allNames: Name[]
): Name[] => {
  const targetNameLower = targetName.name.toLowerCase();
  
  return allNames.filter(n => {
    if (n.id === targetName.id) return false;
    
    // Check primary name
    if (n.name.toLowerCase() === targetNameLower) return true;
    
    // Check related names
    if (n.relatedNames?.some(rn => rn.name.toLowerCase() === targetNameLower)) return true;
    
    return false;
  });
};

/**
 * Check if a name has duplicates in the list
 */
export const hasDuplicates = (targetName: Name, allNames: Name[]): boolean => {
  return findDuplicateNames(targetName, allNames).length > 0;
};

/**
 * Get a short distinguishing label for a name (used when displaying duplicates)
 */
export const getDistinguishingLabel = (name: Name): string => {
  // Priority order: origin, meanings, etymology snippet
  if (name.origin && name.origin.length > 0) {
    // Filter to only show most specific origins
    const mostSpecific = name.origin.filter(origin => {
      const hasMoreSpecific = name.origin?.some(other => 
        other !== origin && 
        other.startsWith(origin + ' > ')
      );
      return !hasMoreSpecific;
    });
    
    // Extract just the final part of each hierarchical origin
    const finalParts = mostSpecific.map(origin => {
      const parts = origin.split(' > ');
      return parts[parts.length - 1];
    });
    
    return finalParts.join(', ');
  }
  
  if (name.meanings && name.meanings.length > 0) {
    // Use first main category
    const mainCategory = name.meanings[0].split(' > ')[0];
    return mainCategory;
  }
  
  if (name.meaning) {
    // Use first few words of meaning
    const words = name.meaning.split(' ').slice(0, 3).join(' ');
    return words.length < name.meaning.length ? words + '...' : words;
  }
  
  return 'No distinguishing info';
};
