/**
 * ========================================
 * PAIRED NAME GENERATOR COMPONENT
 * ========================================
 * 
 * This is the advanced name generator that creates first name + surname
 * combinations with extensive filtering options and intelligent pairing.
 * 
 * KEY FEATURES:
 * 1. **Paired Generation**: Generates first name + surname combinations
 * 2. **Separate Filters**: Independent filters for first names and surnames
 * 3. **Advanced Filters**: Phonetic matching, syllable counts, category logic (AND/OR)
 * 4. **Blocked Pairs**: Prevents generating unwanted combinations (e.g., "Harry Potter")
 * 5. **Lock/Unlock**: Can lock one name and regenerate just the other
 * 6. **Manual Selection**: Can manually choose one name and generate a match
 * 7. **Spelling Variants**: Randomly selects from alternate spellings
 * 
 * NOTE: Mode switching (single vs paired) is now handled by the parent Index.tsx component.
 * 
 * FILTERING SYSTEM:
 * - Basic: Gender, availability, name type
 * - Origin: Hierarchical selection with smart parent/child logic
 * - Meaning: Category-based (AND/OR logic) + literal text search
 * - Feeling: Multi-select with AND/OR logic
 * - Phonetic: Starts with, ends with, rhymes with, syllable count
 * 
 * BLOCKED PAIRS SYSTEM:
 * The generator checks against a blacklist of first name + surname combinations
 * that should never be suggested (e.g., famous characters, real people).
 * It tries up to 100 times to find a non-blocked combination before giving up.
 * 
 * LOCK/UNLOCK FEATURE:
 * When a user likes one name in a pair, they can "lock" it to keep it fixed
 * while regenerating just the other name. This is useful for finding the perfect
 * match for a name you already like.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shuffle, Lock, Unlock, RefreshCw, X, ShieldX, Ban, ChevronDown } from "lucide-react";
import { Name } from "@/hooks/useNameStorage";
import { Checkbox } from "@/components/ui/checkbox";
import { SeparatedCategorySelector } from "./SeparatedCategorySelector";
import { SeparatedOriginSelector } from "./SeparatedOriginSelector";
import { useBlockedPairs } from "@/hooks/useBlockedPairs";
import { BlockedPairsDialog } from "./BlockedPairsDialog";
import {
  getSyllableCount,
  getUniqueSyllableCounts,
  pronunciationStartsWith,
  pronunciationEndsWith,
  pronunciationsRhyme
} from "@/utils/phoneticUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * CategoryFilterInput Component
 * 
 * This is a reusable multi-select checkbox component for filtering by categories
 * or feelings. It provides search-as-you-type functionality and smart sorting.
 * 
 * FEATURES:
 * - Real-time search filtering
 * - Checkbox-based multi-select
 * - Smart sorting: matches that start with search term appear first
 * - Selected items shown as removable badges
 * - Scrollable list for many items
 * 
 * NOTE: This is for FILTERING existing values, not adding new ones.
 */
const CategoryFilterInput = ({
  allItems, 
  selectedItems, 
  onSelectionChange,
  placeholder 
}: { 
  allItems: string[]; 
  selectedItems: string[]; 
  onSelectionChange: (items: string[]) => void;
  placeholder: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Prioritize items that start with search term, then items that contain it
  const filteredItems = allItems
    .filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const aStarts = aLower.startsWith(searchLower);
      const bStarts = bLower.startsWith(searchLower);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aLower.localeCompare(bLower);
    });

  return (
    <>
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />
      <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
        {filteredItems.map(item => (
          <div key={item} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
            <Checkbox
              checked={selectedItems.includes(item)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectionChange([...selectedItems, item]);
                } else {
                  onSelectionChange(selectedItems.filter(i => i !== item));
                }
              }}
            />
            <label className="text-sm cursor-pointer flex-1">{item}</label>
          </div>
        ))}
      </div>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedItems.map(item => (
            <Badge 
              key={item} 
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onSelectionChange(selectedItems.filter(i => i !== item))}
            >
              {item} <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </>
  );
};

/**
 * Component Props
 */
interface PairedNameGeneratorProps {
  names: Name[];                                    // Complete name database
  mode: 'single' | 'paired';                        // Current generator mode
  onModeChange: (mode: 'single' | 'paired') => void; // Callback to switch modes
}

export const PairedNameGenerator = ({ names, mode, onModeChange }: PairedNameGeneratorProps) => {
  // ============================================================================
  // BLOCKED PAIRS SYSTEM
  // ============================================================================
  
  /**
   * useBlockedPairs Hook
   * 
   * Provides access to the blocked pairs database and functions to:
   * - Check if a first name + surname combo is blocked
   * - Add new blocked pairs
   * - Manage the blocked pairs list
   */
  const { isPairBlocked, addBlockedPair } = useBlockedPairs();
  const [blockedPairsDialogOpen, setBlockedPairsDialogOpen] = useState(false);
  
  // UI state for collapsible filter sections
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // ============================================================================
  // FILTER STATE (FIRST NAMES)
  // ============================================================================
  
  /**
   * First Name Filters
   * 
   * Complete set of filters for first name selection:
   * - Basic: gender, availability
   * - Semantic: categories (meanings), feelings, literal meaning text
   * - Phonetic: syllable count, starts with, ends with, rhymes with
   * - Logic: AND/OR for categories and feelings
   */
  const [firstNameFilters, setFirstNameFilters] = useState({
    gender: "any",                          // Masculine, Feminine, Neutral, or Any
    onlyAvailable: true,                    // Exclude used/blocked names
    selectedCategories: [] as string[],     // Hierarchical meaning categories
    selectedFeelings: [] as string[],       // Emotional associations
    searchMode: "categories" as "categories" | "literal", // How to search meanings
    categoryLogic: "and" as "and" | "any",  // Must match ALL or ANY categories
    feelingLogic: "and" as "and" | "any",   // Must match ALL or ANY feelings
    searchLiteralMeaning: "",               // Text search in meaning field
    syllableFilter: "all",                  // Filter by syllable count
    startsWithSound: "",                    // Phonetic filter: starts with...
    endsWithSound: "",                      // Phonetic filter: ends with...
    rhymesWithSound: "",                    // Phonetic filter: rhymes with...
  });

  // ============================================================================
  // FILTER STATE (SURNAMES)
  // ============================================================================
  
  /**
   * Surname Filters
   * 
   * Identical structure to first name filters, but applied independently
   * to surname selection. This allows creating matched or contrasting pairs.
   */
  const [surnameFilters, setSurnameFilters] = useState({
    gender: "any",
    onlyAvailable: true,
    selectedCategories: [] as string[],
    selectedFeelings: [] as string[],
    searchMode: "categories" as "categories" | "literal",
    categoryLogic: "and" as "and" | "any",
    feelingLogic: "and" as "and" | "any",
    searchLiteralMeaning: "",
    syllableFilter: "all",
    startsWithSound: "",
    endsWithSound: "",
    rhymesWithSound: "",
  });

  // Origin selection (hierarchical, separate for first names and surnames)
  const [firstNameSelectedOrigins, setFirstNameSelectedOrigins] = useState<string[]>([]);
  const [surnameSelectedOrigins, setSurnameSelectedOrigins] = useState<string[]>([]);

  // ============================================================================
  // GENERATED NAME STATE
  // ============================================================================
  
  /**
   * Generated names and their lock states
   * 
   * - generatedFirst/Surname: The currently displayed names
   * - lockFirst/Surname: Whether each name is locked (won't regenerate)
   * - manualFirst/SurnameSelect: Manual selection from dropdown (overrides random)
   */
  const [generatedFirst, setGeneratedFirst] = useState<Name | null>(null);
  const [generatedSurname, setGeneratedSurname] = useState<Name | null>(null);
  const [lockFirst, setLockFirst] = useState(false);
  const [lockSurname, setLockSurname] = useState(false);
  const [manualFirstSelect, setManualFirstSelect] = useState<string>("");
  const [manualSurnameSelect, setManualSurnameSelect] = useState<string>("");

  // ============================================================================
  // AUTOCOMPLETE DATA
  // ============================================================================
  
  /**
   * Extract all unique values for autocomplete/filtering
   * These are derived from the complete name database.
   */
  const origins = Array.from(new Set(names.flatMap(n => n.origin || []))).sort();
  const allCategories = Array.from(new Set(names.flatMap(n => n.meanings || []))).sort();
  const allFeelings = Array.from(new Set(names.flatMap(n => n.feelings || []))).sort();

  // ============================================================================
  // FILTER NAMES FUNCTION
  // ============================================================================
  
  /**
   * filterNames - The main filtering logic
   * 
   * Takes a set of filters and returns names that match ALL criteria.
   * This function is used for both first names and surnames.
   * 
   * FILTER LOGIC:
   * 1. ALWAYS exclude blocked names
   * 2. Optionally exclude used names (if onlyAvailable is true)
   * 3. Match gender (or "any")
   * 4. Match hierarchical origins
   * 5. Match categories (with AND/OR logic)
   * 6. Match literal meaning text search
   * 7. Match feelings (with AND/OR logic)
   * 8. Match phonetic filters (syllables, starts/ends/rhymes)
   * 
   * @param filters - The filter criteria to apply
   * @param requiredType - 'firstName' or 'surname' to filter by name type
   * @param selectedOrigins - Hierarchical origin selections
   * @returns Array of names that match all criteria
   */
  const filterNames = (filters: typeof firstNameFilters, requiredType: 'firstName' | 'surname', selectedOrigins: string[]) => {
    let filtered = names.filter(n => 
      n.nameType === requiredType || n.nameType === 'either'
    );

    // ===== FILTER 1: BLOCKED STATUS =====
    // Blocked names should NEVER appear in generation, regardless of other filters
    filtered = filtered.filter(n => n.status !== 'blocked');

    // ===== FILTER 2: AVAILABILITY =====
    // Used names are excluded only if user wants "available only"
    if (filters.onlyAvailable) {
      filtered = filtered.filter(n => n.status !== 'used');
    }

    // ===== FILTER 3: GENDER =====
    // Match the selected gender OR names marked as "any" gender
    // NOTE: Surnames are always treated as gender-neutral, so skip this filter for surnames
    if (filters.gender !== "any" && requiredType !== 'surname') {
      filtered = filtered.filter(n => n.gender === filters.gender || n.gender === "any");
    }

    // ===== FILTER 4: HIERARCHICAL ORIGINS =====
    /**
     * Smart origin filtering with parent/child relationship handling.
     * 
     * EXAMPLE:
     * If user selects: ["European", "European > Spanish", "European > Spanish > Catalan"]
     * We only use: ["European > Spanish > Catalan"] (most specific)
     * 
     * Then we match names where ANY origin:
     * - Exactly equals "European > Spanish > Catalan", OR
     * - Starts with "European > Spanish > Catalan > " (a descendant)
     */
    const mostSpecificOrigins = selectedOrigins.filter(origin => 
      !selectedOrigins.some(other => other !== origin && other.startsWith(origin + ' > '))
    );
    
    if (mostSpecificOrigins.length > 0) {
      filtered = filtered.filter(n => 
        (n.origin || []).some(origin => 
          mostSpecificOrigins.some(selected => origin === selected || origin.startsWith(selected + ' > '))
        )
      );
    }

    // ===== FILTER 5: CATEGORIES (MEANINGS) =====
    /**
     * Multi-select category filtering with AND/OR logic.
     * 
     * AND mode: Name must have ALL selected categories
     * OR mode: Name must have AT LEAST ONE selected category
     * 
     * Hierarchical matching: selecting "Nature" matches "Nature > Sky > Light"
     */
    if (filters.selectedCategories.length > 0) {
      if (filters.searchMode === "categories") {
        if (filters.categoryLogic === "and") {
          // Must match ALL categories
          filtered = filtered.filter(n =>
            filters.selectedCategories.every(cat =>
              n.meanings?.some(m => m === cat || m.startsWith(cat + ' > '))
            )
          );
        } else {
          // Must match AT LEAST ONE category
          filtered = filtered.filter(n =>
            filters.selectedCategories.some(cat =>
              n.meanings?.some(m => m === cat || m.startsWith(cat + ' > '))
            )
          );
        }
      }
    }

    // ===== FILTER 6: LITERAL MEANING TEXT SEARCH =====
    /**
     * Simple substring search in the meaning field.
     * This is independent of categories and searches the full text translation.
     */
    if (filters.searchLiteralMeaning) {
      filtered = filtered.filter(n =>
        n.meaning?.toLowerCase().includes(filters.searchLiteralMeaning.toLowerCase())
      );
    }

    // ===== FILTER 7: FEELINGS =====
    /**
     * Multi-select feeling filtering with AND/OR logic.
     * Works the same as categories but for the feelings array.
     */
    if (filters.selectedFeelings.length > 0) {
      if (filters.feelingLogic === "and") {
        // Must have ALL selected feelings
        filtered = filtered.filter(n =>
          filters.selectedFeelings.every(feeling =>
            n.feelings?.some(f => f === feeling)
          )
        );
      } else {
        // Must have AT LEAST ONE selected feeling
        filtered = filtered.filter(n =>
          filters.selectedFeelings.some(feeling =>
            n.feelings?.some(f => f === feeling)
          )
        );
      }
    }

    // ===== FILTER 8: PHONETIC FILTERS =====
    /**
     * Note: Phonetic filters are applied to individual variants during
     * random selection (see generation functions), not here at the
     * primary name level.
     */

    return filtered;
  };

  // ============================================================================
  // PAIRED NAME GENERATION
  // ============================================================================
  
  /**
   * generatePaired - Generate a first name + surname combination
   * 
   * This function is complex because it needs to:
   * 1. Handle manual selections and locked names
   * 2. Avoid blocked pairs (tries up to 100 times)
   * 3. Randomly select spelling variants
   * 4. Coordinate between first name and surname generation
   * 
   * GENERATION LOGIC:
   * - If a name is locked: Keep it
   * - If a name is manually selected: Use that specific name
   * - Otherwise: Filter database and pick random name
   * - Always check against blocked pairs before finalizing
   * - Try up to 100 times to find a non-blocked combination
   */
  const generatePaired = () => {
    const maxAttempts = 100;
    
    // Generate first name (or use locked/manual)
    let newFirst: Name | null = null;
    if (lockFirst) {
      newFirst = generatedFirst;
    } else if (manualFirstSelect && manualFirstSelect !== "__random__") {
      newFirst = names.find(n => n.id === manualFirstSelect) || null;
    } else {
      const firstFiltered = filterNames(firstNameFilters, 'firstName', firstNameSelectedOrigins);
      if (firstFiltered.length > 0) {
        // Try up to maxAttempts to find a non-blocked combination
        for (let i = 0; i < maxAttempts; i++) {
          const randomIndex = Math.floor(Math.random() * firstFiltered.length);
          const candidate = firstFiltered[randomIndex];
          
          // Create all possible forms (primary + related names)
          const allForms = [
            { name: candidate.name, ...candidate },
            ...(candidate.relatedNames || []).map(r => ({ 
              ...candidate, 
              name: r.name, 
              pronunciation: r.pronunciation || candidate.pronunciation, 
              script: r.script || candidate.script,
              feelings: r.feelings || candidate.feelings
            }))
          ];
          
          // Apply phonetic filters to each form
          const phoneticFilteredForms = allForms.filter(form => {
            // Syllable count
            if (firstNameFilters.syllableFilter !== 'all') {
              if (getSyllableCount(form.pronunciation) !== parseInt(firstNameFilters.syllableFilter)) return false;
            }
            // Starts with sound
            if (firstNameFilters.startsWithSound) {
              if (!pronunciationStartsWith(form.pronunciation, firstNameFilters.startsWithSound)) return false;
            }
            // Ends with sound
            if (firstNameFilters.endsWithSound) {
              if (!pronunciationEndsWith(form.pronunciation, firstNameFilters.endsWithSound)) return false;
            }
            // Rhymes with
            if (firstNameFilters.rhymesWithSound) {
              if (!pronunciationsRhyme(form.pronunciation, firstNameFilters.rhymesWithSound)) return false;
            }
            return true;
          });
          
          // Skip if no forms match phonetic filters
          if (phoneticFilteredForms.length === 0) continue;
          
          // Randomly select from phonetically matching forms
          const randomForm = phoneticFilteredForms[Math.floor(Math.random() * phoneticFilteredForms.length)];
          const candidateWithForm = randomForm;
          
          // If surname is locked, check if this combo is blocked
          if (lockSurname && generatedSurname) {
            if (!isPairBlocked(candidateWithForm.name, generatedSurname.name)) {
              newFirst = candidateWithForm;
              break;
            }
          } else {
            // Surname will be generated separately, just pick any first name
            newFirst = candidateWithForm;
            break;
          }
        }
        // If we couldn't find a non-blocked combo after maxAttempts, use the last candidate
        if (!newFirst && firstFiltered.length > 0) {
          newFirst = firstFiltered[Math.floor(Math.random() * firstFiltered.length)];
        }
      }
    }

    // Generate surname (or use locked/manual)
    let newSurname: Name | null = null;
    if (lockSurname) {
      newSurname = generatedSurname;
    } else if (manualSurnameSelect && manualSurnameSelect !== "__random__") {
      newSurname = names.find(n => n.id === manualSurnameSelect) || null;
    } else {
      const surnameFiltered = filterNames(surnameFilters, 'surname', surnameSelectedOrigins);
      if (surnameFiltered.length > 0) {
        // Try up to maxAttempts to find a non-blocked combination
        for (let i = 0; i < maxAttempts; i++) {
          const randomIndex = Math.floor(Math.random() * surnameFiltered.length);
          const candidate = surnameFiltered[randomIndex];
          
          // Create all possible forms (primary + related names)
          const allForms = [
            { name: candidate.name, ...candidate },
            ...(candidate.relatedNames || []).map(r => ({ 
              ...candidate, 
              name: r.name, 
              pronunciation: r.pronunciation || candidate.pronunciation, 
              script: r.script || candidate.script,
              feelings: r.feelings || candidate.feelings
            }))
          ];
          
          // Apply phonetic filters to each form
          const phoneticFilteredForms = allForms.filter(form => {
            // Syllable count
            if (surnameFilters.syllableFilter !== 'all') {
              if (getSyllableCount(form.pronunciation) !== parseInt(surnameFilters.syllableFilter)) return false;
            }
            // Starts with sound
            if (surnameFilters.startsWithSound) {
              if (!pronunciationStartsWith(form.pronunciation, surnameFilters.startsWithSound)) return false;
            }
            // Ends with sound
            if (surnameFilters.endsWithSound) {
              if (!pronunciationEndsWith(form.pronunciation, surnameFilters.endsWithSound)) return false;
            }
            // Rhymes with
            if (surnameFilters.rhymesWithSound) {
              if (!pronunciationsRhyme(form.pronunciation, surnameFilters.rhymesWithSound)) return false;
            }
            return true;
          });
          
          // Skip if no forms match phonetic filters
          if (phoneticFilteredForms.length === 0) continue;
          
          // Randomly select from phonetically matching forms
          const randomForm = phoneticFilteredForms[Math.floor(Math.random() * phoneticFilteredForms.length)];
          const candidateWithForm = randomForm;
          
          // Check if this combo is blocked with the first name
          if (newFirst && !isPairBlocked(newFirst.name, candidateWithForm.name)) {
            newSurname = candidateWithForm;
            break;
          } else if (!newFirst) {
            // No first name yet, just pick any surname
            newSurname = candidateWithForm;
            break;
          }
        }
        // If we couldn't find a non-blocked combo after maxAttempts, use the last candidate
        if (!newSurname && surnameFiltered.length > 0) {
          newSurname = surnameFiltered[Math.floor(Math.random() * surnameFiltered.length)];
        }
      }
    }
    
    // Set state only after checking for blocked pairs
    if (newFirst) setGeneratedFirst(newFirst);
    if (newSurname) setGeneratedSurname(newSurname);
  };

  const generateSingle = () => {
    const filtered = filterNames(firstNameFilters, 'firstName', firstNameSelectedOrigins);
    if (filtered.length > 0) {
      const randomIndex = Math.floor(Math.random() * filtered.length);
      const selected = filtered[randomIndex];
      
      // Create all possible forms (primary + related names)
      const allForms = [
        { name: selected.name, ...selected },
        ...(selected.relatedNames || []).map(r => ({ 
          ...selected, 
          name: r.name, 
          pronunciation: r.pronunciation || selected.pronunciation, 
          script: r.script || selected.script,
          feelings: r.feelings || selected.feelings
        }))
      ];
      
      // Apply phonetic filters to each form
      const phoneticFilteredForms = allForms.filter(form => {
        // Syllable count
        if (firstNameFilters.syllableFilter !== 'all') {
          if (getSyllableCount(form.pronunciation) !== parseInt(firstNameFilters.syllableFilter)) return false;
        }
        // Starts with sound
        if (firstNameFilters.startsWithSound) {
          if (!pronunciationStartsWith(form.pronunciation, firstNameFilters.startsWithSound)) return false;
        }
        // Ends with sound
        if (firstNameFilters.endsWithSound) {
          if (!pronunciationEndsWith(form.pronunciation, firstNameFilters.endsWithSound)) return false;
        }
        // Rhymes with
        if (firstNameFilters.rhymesWithSound) {
          if (!pronunciationsRhyme(form.pronunciation, firstNameFilters.rhymesWithSound)) return false;
        }
        return true;
      });
      
      // If no forms match phonetic filters, use primary name
      const randomForm = phoneticFilteredForms.length > 0
        ? phoneticFilteredForms[Math.floor(Math.random() * phoneticFilteredForms.length)]
        : allForms[0];
      
      setGeneratedFirst(randomForm);
      setGeneratedSurname(null);
    }
  };

  /**
   * FilterSection: Reusable filter UI component for both first names and surnames
   * 
   * @param showGenderFilter - Whether to show the gender filter (false for surnames since they're gender-neutral)
   */
  const FilterSection = ({ 
    filters, 
    setFilters, 
    selectedOrigins,
    onOriginsChange,
    title,
    showGenderFilter = true
  }: { 
    filters: typeof firstNameFilters, 
    setFilters: (f: typeof firstNameFilters) => void,
    selectedOrigins: string[],
    onOriginsChange: (origins: string[]) => void,
    title?: string,
    showGenderFilter?: boolean
  }) => (
    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="font-semibold text-lg">{title}</h3>}
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            <span className="ml-2">{filtersOpen ? 'Hide' : 'Show'} Filters</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="space-y-6">
          {/* Basic Filters */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Basic Filters</h4>
            {showGenderFilter && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <Label>Gender</Label>
                <Select
                  value={filters.gender}
                  onValueChange={(value) => setFilters({ ...filters, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="masculine">Masculine</SelectItem>
                    <SelectItem value="feminine">Feminine</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.onlyAvailable}
                onCheckedChange={(checked) => setFilters({ ...filters, onlyAvailable: !!checked })}
              />
              <Label className="cursor-pointer">Only show available names</Label>
            </div>
          </div>

          {/* Origin Filters */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Origin Filters</h4>
            <SeparatedOriginSelector
              allOrigins={origins}
              selectedOrigins={selectedOrigins}
              onSelectionChange={onOriginsChange}
            />
          </div>

          {/* Meaning Filters */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Meaning Filters</h4>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Categories (hierarchical, all 3 levels)</Label>
              <Tabs 
                value={filters.categoryLogic} 
                onValueChange={(v: any) => setFilters({ ...filters, categoryLogic: v })}
                className="w-auto"
              >
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="and">Match ALL (AND)</TabsTrigger>
                  <TabsTrigger value="any">Match ANY (OR)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <SeparatedCategorySelector
              allCategories={allCategories}
              selectedCategories={filters.selectedCategories}
              onSelectionChange={(selected) => setFilters({ ...filters, selectedCategories: selected })}
            />
          </div>

          <div>
            <Label>Literal Meaning Search (contains text)</Label>
            <Input
              placeholder="Search text within meaning field..."
              value={filters.searchLiteralMeaning}
              onChange={(e) => setFilters({ ...filters, searchLiteralMeaning: e.target.value })}
            />
          </div>

          <div>
            <Label>Feelings</Label>
            <div className="flex items-center gap-2 mb-2">
              <Tabs 
                value={filters.feelingLogic} 
                onValueChange={(v: any) => setFilters({ ...filters, feelingLogic: v })}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="and">Match ALL (AND)</TabsTrigger>
                  <TabsTrigger value="any">Match ANY (OR)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <CategoryFilterInput
              allItems={allFeelings}
              selectedItems={filters.selectedFeelings}
              onSelectionChange={(selected) => setFilters({ ...filters, selectedFeelings: selected })}
              placeholder="Type to filter feelings..."
            />
          </div>
          </div>

          {/* Phonetic & Syllable Filters */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Phonetic & Syllable Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Syllable Count</Label>
              <Select 
                value={filters.syllableFilter} 
                onValueChange={(value) => setFilters({ ...filters, syllableFilter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by syllables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Syllables</SelectItem>
                  {getUniqueSyllableCounts(names).map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} {count === 1 ? 'syllable' : 'syllables'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Starts With Sound</Label>
              <Input
                placeholder="e.g., AY, BRO"
                value={filters.startsWithSound}
                onChange={(e) => setFilters({ ...filters, startsWithSound: e.target.value })}
              />
            </div>

            <div>
              <Label>Ends With Sound</Label>
              <Input
                placeholder="e.g., AN, EL"
                value={filters.endsWithSound}
                onChange={(e) => setFilters({ ...filters, endsWithSound: e.target.value })}
              />
            </div>

            <div>
              <Label>Rhymes With (pronunciation)</Label>
              <Input
                placeholder="e.g., BROWN, AY-lee"
                value={filters.rhymesWithSound}
                onChange={(e) => setFilters({ ...filters, rhymesWithSound: e.target.value })}
              />
            </div>
          </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="space-y-6">
      {mode === 'paired' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>First Name</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Manual Selection (optional)</Label>
                  <Select value={manualFirstSelect || "__random__"} onValueChange={setManualFirstSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Random or select manually..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="__random__">Random</SelectItem>
                      {names
                        .filter(n => (n.nameType === 'firstName' || n.nameType === 'either') && n.id)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <FilterSection 
                  filters={firstNameFilters} 
                  setFilters={setFirstNameFilters}
                  selectedOrigins={firstNameSelectedOrigins}
                  onOriginsChange={setFirstNameSelectedOrigins}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Surname</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Manual Selection (optional)</Label>
                  <Select value={manualSurnameSelect || "__random__"} onValueChange={setManualSurnameSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Random or select manually..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="__random__">Random</SelectItem>
                      {names
                        .filter(n => (n.nameType === 'surname' || n.nameType === 'either') && n.id)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <FilterSection 
                  filters={surnameFilters} 
                  setFilters={setSurnameFilters}
                  selectedOrigins={surnameSelectedOrigins}
                  onOriginsChange={setSurnameSelectedOrigins}
                  showGenderFilter={false}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button onClick={generatePaired} className="flex-1" size="lg">
              <Shuffle className="mr-2 h-5 w-5" />
              Generate Paired Name
            </Button>
            <Button 
              onClick={() => setBlockedPairsDialogOpen(true)} 
              variant="outline" 
              size="lg"
            >
              <ShieldX className="mr-2 h-5 w-5" />
              Blocked Pairs
            </Button>
          </div>

          {(generatedFirst || generatedSurname) && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-3xl">
                    {generatedFirst && generatedFirst.name}{' '}
                    {generatedSurname && generatedSurname.name}
                  </CardTitle>
                  {generatedFirst && generatedSurname && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isPairBlocked(generatedFirst.name, generatedSurname.name)) {
                          alert('This pair is already blocked');
                        } else {
                          addBlockedPair(generatedFirst.name, generatedSurname.name, 'Popular Media', '');
                        }
                      }}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Block This Pair
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {generatedFirst && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">First Name</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLockFirst(!lockFirst)}
                        >
                          {lockFirst ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const filtered = filterNames(firstNameFilters, 'firstName', firstNameSelectedOrigins);
                            if (filtered.length > 0) {
                              const randomIndex = Math.floor(Math.random() * filtered.length);
                              setGeneratedFirst(filtered[randomIndex]);
                            }
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <NameDisplay name={generatedFirst} />
                  </div>
                )}

                {generatedSurname && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Surname</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLockSurname(!lockSurname)}
                        >
                          {lockSurname ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const filtered = filterNames(surnameFilters, 'surname', surnameSelectedOrigins);
                            if (filtered.length > 0) {
                              const randomIndex = Math.floor(Math.random() * filtered.length);
                              setGeneratedSurname(filtered[randomIndex]);
                            }
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <NameDisplay name={generatedSurname} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <FilterSection
                filters={firstNameFilters} 
                setFilters={setFirstNameFilters}
                selectedOrigins={firstNameSelectedOrigins}
                onOriginsChange={setFirstNameSelectedOrigins}
              />
            </CardContent>
          </Card>

          <Button onClick={generateSingle} className="w-full" size="lg">
            <Shuffle className="mr-2 h-5 w-5" />
            Generate Random Name
          </Button>

          {generatedFirst && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-3xl">
                  {generatedFirst.script && <div className="text-4xl mb-2">{generatedFirst.script}</div>}
                  {generatedFirst.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NameDisplay name={generatedFirst} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <BlockedPairsDialog 
        open={blockedPairsDialogOpen}
        onOpenChange={setBlockedPairsDialogOpen}
        names={names}
      />
    </div>
  );
};

const NameDisplay = ({ name }: { name: Name }) => (
  <div className="space-y-2 text-sm">
    {name.script && <div className="text-2xl mb-2">{name.script}</div>}
    <div className="flex gap-2 flex-wrap">
      <Badge variant="secondary">{name.nameType === 'firstName' ? 'First Name' : name.nameType === 'surname' ? 'Surname' : 'Either'}</Badge>
      {name.gender && name.gender !== 'any' && (
        <Badge variant="outline" className="capitalize">{name.gender}</Badge>
      )}
      {name.origin && name.origin.length > 0 && name.origin.map((origin, idx) => (
        <Badge key={idx} variant="outline">{origin}</Badge>
      ))}
    </div>
    {name.pronunciation && (
      <div>
        <span className="font-medium text-muted-foreground">Pronunciation: </span>
        <span className="italic">{name.pronunciation}</span>
      </div>
    )}
    {name.meanings && name.meanings.length > 0 && (
      <div>
        <span className="font-medium text-muted-foreground">Categories: </span>
        <div className="flex flex-wrap gap-1 mt-1">
          {name.meanings.map((m, idx) => (
            <Badge key={idx} variant="secondary">{m}</Badge>
          ))}
        </div>
      </div>
    )}
    {name.meaning && (
      <div>
        <span className="font-medium text-muted-foreground">Literal meaning: </span>
        <span>{name.meaning}</span>
      </div>
    )}
    {name.feelings && name.feelings.length > 0 && (
      <div>
        <span className="font-medium text-muted-foreground">Feelings: </span>
        <div className="flex flex-wrap gap-1 mt-1">
          {name.feelings.map((f, idx) => (
            <Badge key={idx} variant="outline">{f}</Badge>
          ))}
        </div>
      </div>
    )}
    {name.etymology && (
      <div>
        <span className="font-medium text-muted-foreground">Etymology: </span>
        <span>{name.etymology}</span>
      </div>
    )}
  </div>
);
