/**
 * ========================================
 * NAME GENERATOR COMPONENT (SINGLE NAME)
 * ========================================
 * 
 * This component provides a comprehensive random name generator with extensive filtering options.
 * It's the single-name version, as opposed to the paired generator which generates
 * first name + surname combinations.
 * 
 * HOW IT WORKS:
 * 1. User sets filters (basic, origin, meaning, feeling, phonetic, availability) in collapsible section
 * 2. User clicks "Generate Random Name" button (positioned below the filter card)
 * 3. System filters the name database based on ALL criteria (AND logic)
 * 4. System picks a random name from the filtered set
 * 5. System randomly selects a spelling variant if the name has alternates
 * 6. Displays the generated name with all its details
 * 
 * FILTERS AVAILABLE:
 * - Name Type: First Name, Surname, Either, or Any (positioned first)
 * - Gender: Masculine, Feminine, Neutral, or Any (disabled when Surname is selected)
 * - Availability: Only show names marked as available (not used/blocked)
 * - Origin: Hierarchical multi-select (e.g., European > Spanish > Catalan)
 * - Categories (Meanings): Hierarchical multi-select with AND/OR logic
 * - Literal Meaning: Text search within meaning field
 * - Feelings: Multi-select with AND/OR logic
 * - Syllable Count: Filter by number of syllables (1, 2, 3, etc.)
 * - Phonetic: Starts with, ends with, or rhymes with specific sounds
 * 
 * SPECIAL BEHAVIOR:
 * - When Name Type is set to "Surname", the Gender filter is automatically disabled
 *   and greyed out, since surnames are inherently gender-neutral family names.
 * - Filters are collapsible to save screen space when not actively filtering
 * 
 * KEY FEATURES:
 * - Spelling variants: Can show any alternate spelling of a name
 * - Origin filtering: Smart handling of hierarchical origins (parent/child relationships)
 * - Most specific origin logic: Filters to the most detailed origin available
 * - Category AND/OR logic: Match ALL categories or ANY category
 * - Feeling AND/OR logic: Match ALL feelings or ANY feeling
 * - Phonetic matching: Uses pronunciation strings for sound-based filtering
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Shuffle, ChevronDown, X } from "lucide-react";
import { Name, RelatedName } from "@/hooks/useNameStorage";
import { SeparatedOriginSelector } from "./SeparatedOriginSelector";
import { SeparatedCategorySelector } from "./SeparatedCategorySelector";
import {
  getSyllableCount,
  getUniqueSyllableCounts,
  pronunciationStartsWith,
  pronunciationEndsWith,
  pronunciationsRhyme
} from "@/utils/phoneticUtils";

interface NameGeneratorProps {
  names: Name[]; // Complete database of names to generate from
}

/**
 * CategoryFilterInput Component
 * 
 * Reusable multi-select component for filtering by feelings.
 * Provides search-as-you-type and smart sorting.
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

export const NameGenerator = ({ names }: NameGeneratorProps) => {
  /**
   * Filter State
   * 
   * All the criteria the user can set to narrow down name selection.
   * These work together using AND logic (all filters must be satisfied).
   */
  const [filters, setFilters] = useState({
    gender: "any",                          // Filter by gender assignment
    nameType: "any",                        // Filter by first name vs surname
    onlyAvailable: true,                    // Exclude names marked as used/blocked
    selectedCategories: [] as string[],     // Hierarchical meaning categories
    selectedFeelings: [] as string[],       // Emotional associations
    categoryLogic: "and" as "and" | "any",  // Must match ALL or ANY categories
    feelingLogic: "and" as "and" | "any",   // Must match ALL or ANY feelings
    searchLiteralMeaning: "",               // Text search in meaning field
    syllableFilter: "all",                  // Filter by syllable count
    startsWithSound: "",                    // Phonetic filter: starts with...
    endsWithSound: "",                      // Phonetic filter: ends with...
    rhymesWithSound: "",                    // Phonetic filter: rhymes with...
  });
  
  /**
   * Origin Selection State
   * 
   * Selected origins for filtering. This is separate because it uses a
   * specialized hierarchical selector component.
   */
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  
  /**
   * Generated Name State
   * 
   * The name that was randomly selected and is currently displayed.
   * Null when no name has been generated yet.
   */
  const [generated, setGenerated] = useState<Name | null>(null);

  /**
   * Collapsible filter state - allows users to hide/show advanced filters
   */
  const [filtersOpen, setFiltersOpen] = useState(false);

  /**
   * Extract all unique values for autocomplete/filtering
   */
  const origins = Array.from(new Set(names.flatMap(n => n.origin || []))).sort();
  const allCategories = Array.from(new Set(names.flatMap(n => n.meanings || []))).sort();
  const allFeelings = Array.from(new Set(names.flatMap(n => n.feelings || []))).sort();

  /**
   * Generate Name Function
   * 
   * This is the main logic for the random name generator:
   * 1. Start with all names
   * 2. Apply each filter in sequence (AND logic - all must match)
   * 3. Pick a random name from what remains
   * 4. Randomly select a spelling variant
   * 5. Display the result
   */
  const generateName = () => {
    let filtered = names;

    // FILTER 1: Name Type
    // Match names of the selected type OR names marked as "either"
    if (filters.nameType !== "any") {
      filtered = filtered.filter(n => n.nameType === filters.nameType || n.nameType === "either");
    }

    // FILTER 2: Blocked Status
    // Blocked names should NEVER appear in generation
    filtered = filtered.filter(n => n.status !== 'blocked');

    // FILTER 3: Availability
    // If enabled, exclude names marked as "used"
    if (filters.onlyAvailable) {
      filtered = filtered.filter(n => n.status !== 'used');
    }

    // FILTER 4: Gender
    // Match names of the selected gender OR names marked as "any" gender
    // NOTE: Skip gender filtering for surnames (they should always be treated as gender-neutral)
    if (filters.gender !== "any" && filters.nameType !== "surname") {
      filtered = filtered.filter(n => n.gender === filters.gender || n.gender === "any");
    }

    /**
     * FILTER 5: Origins (with hierarchical logic)
     * 
     * Origin filtering is more complex because origins can be hierarchical:
     * e.g., "European > Spanish > Catalan"
     * 
     * MOST SPECIFIC LOGIC:
     * If the user selects both "European" and "European > Spanish", we only
     * use "European > Spanish" because it's more specific. This prevents
     * redundant filtering and gives more precise results.
     * 
     * Then we match names whose origin either:
     * - Exactly matches a selected origin, OR
     * - Starts with a selected origin (is a child in the hierarchy)
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

    /**
     * FILTER 6: Categories (Meanings)
     * 
     * Multi-select category filtering with AND/OR logic.
     * AND mode: Name must have ALL selected categories
     * OR mode: Name must have AT LEAST ONE selected category
     * Hierarchical matching: selecting "Nature" matches "Nature > Sky > Light"
     */
    if (filters.selectedCategories.length > 0) {
      if (filters.categoryLogic === "and") {
        filtered = filtered.filter(n =>
          filters.selectedCategories.every(cat =>
            n.meanings?.some(m => m === cat || m.startsWith(cat + ' > '))
          )
        );
      } else {
        filtered = filtered.filter(n =>
          filters.selectedCategories.some(cat =>
            n.meanings?.some(m => m === cat || m.startsWith(cat + ' > '))
          )
        );
      }
    }

    /**
     * FILTER 7: Literal Meaning Text Search
     * 
     * Simple substring search in the meaning field.
     * This is independent of categories and searches the full text translation.
     */
    if (filters.searchLiteralMeaning) {
      filtered = filtered.filter(n =>
        n.meaning?.toLowerCase().includes(filters.searchLiteralMeaning.toLowerCase())
      );
    }

    /**
     * FILTER 8: Feelings
     * 
     * Multi-select feeling filtering with AND/OR logic.
     * Works the same as categories but for the feelings array.
     */
    if (filters.selectedFeelings.length > 0) {
      if (filters.feelingLogic === "and") {
        filtered = filtered.filter(n =>
          filters.selectedFeelings.every(feeling =>
            n.feelings?.some(f => f === feeling)
          )
        );
      } else {
        filtered = filtered.filter(n =>
          filters.selectedFeelings.some(feeling =>
            n.feelings?.some(f => f === feeling)
          )
        );
      }
    }

    /**
     * FILTER 9: Phonetic Filters
     * 
     * Note: Phonetic filters are applied to individual variants during
     * random selection (see RANDOM SELECTION section), not here at the
     * primary name level.
     */

    /**
     * RANDOM SELECTION WITH RELATED NAMES
     * 
     * If no names match the filters, set generated to null (shows nothing).
     * Otherwise:
     * 1. Pick a random name from the filtered set
     * 2. Expand into all variants (primary + related names)
     * 3. Apply phonetic filters to each variant
     * 4. Randomly select from phonetically matching variants
     * 5. If showing a related name, apply any overrides (pronunciation, script, etc.)
     */
    if (filtered.length === 0) {
      setGenerated(null);
      return;
    }

    const selectedName = filtered[Math.floor(Math.random() * filtered.length)];
    
    // Create pool of all name variants (primary + all related names)
    const allVariants: Array<{ 
      name: string, 
      source: 'primary' | RelatedName,
      pronunciation?: string 
    }> = [
      { 
        name: selectedName.name, 
        source: 'primary',
        pronunciation: selectedName.pronunciation
      }
    ];
    
    if (selectedName.relatedNames) {
      selectedName.relatedNames.forEach(rn => {
        allVariants.push({ 
          name: rn.name, 
          source: rn,
          pronunciation: rn.pronunciation || selectedName.pronunciation
        });
      });
    }
    
    // Apply phonetic filters to each variant
    const phoneticFilteredVariants = allVariants.filter(variant => {
      // Syllable count filter
      if (filters.syllableFilter !== 'all') {
        const syllableCount = getSyllableCount(variant.pronunciation);
        if (syllableCount !== parseInt(filters.syllableFilter)) return false;
      }

      // Starts with sound filter
      if (filters.startsWithSound) {
        if (!pronunciationStartsWith(variant.pronunciation, filters.startsWithSound)) return false;
      }

      // Ends with sound filter
      if (filters.endsWithSound) {
        if (!pronunciationEndsWith(variant.pronunciation, filters.endsWithSound)) return false;
      }

      // Rhymes with filter
      if (filters.rhymesWithSound) {
        if (!pronunciationsRhyme(variant.pronunciation, filters.rhymesWithSound)) return false;
      }

      return true;
    });
    
    // If no variants match phonetic filters, don't show anything
    if (phoneticFilteredVariants.length === 0) {
      setGenerated(null);
      return;
    }
    
    // Randomly select from phonetically matching variants
    const randomVariant = phoneticFilteredVariants[Math.floor(Math.random() * phoneticFilteredVariants.length)];
    
    // Build the displayed name with appropriate overrides
    if (randomVariant.source === 'primary') {
      // Show primary name as-is
      setGenerated(selectedName);
    } else {
      // Show related name with overrides from the related name object
      const relatedName = randomVariant.source as RelatedName;
      setGenerated({
        ...selectedName,
        name: relatedName.name,
        pronunciation: relatedName.pronunciation || selectedName.pronunciation,
        script: relatedName.script || selectedName.script,
        origin: relatedName.alternateOrigin ? [relatedName.alternateOrigin] : selectedName.origin,
        etymology: relatedName.etymology ? 
          `${selectedName.etymology || ''}${selectedName.etymology ? '\n\n' : ''}${relatedName.etymology}` : 
          selectedName.etymology,
        notes: relatedName.notes ? 
          `${selectedName.notes || ''}${selectedName.notes ? '\n\n' : ''}${relatedName.notes}` : 
          selectedName.notes,
        gender: relatedName.gender || selectedName.gender,
        feelings: relatedName.feelings || selectedName.feelings,
      });
    }
  };

  /**
 * UI RENDERING
 * 
 * The component has three main sections:
 * 1. Filter Card: Where user sets criteria (collapsible for advanced filters)
 * 2. Generate Button: Positioned outside the card to match paired generator layout
 * 3. Generated Name Card: Shows the result (only visible after generation)
   */
  return (
    <div className="space-y-6">
      {/* FILTER CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Generator Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Collapsible Filters Section */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>{filtersOpen ? 'Hide' : 'Show'} Filters</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Basic Filters */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Basic Filters</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Type Selector */}
                  <div>
                    <Label>Name Type</Label>
                    <Select
                      value={filters.nameType}
                      onValueChange={(value) => setFilters({ ...filters, nameType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="firstName">First Name</SelectItem>
                        <SelectItem value="surname">Surname</SelectItem>
                        <SelectItem value="either">Either</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender Selector - Disabled when surname is selected */}
                  <div>
                    <Label>Gender (For First Names)</Label>
                    <Select
                      value={filters.gender}
                      onValueChange={(value) => setFilters({ ...filters, gender: value })}
                      disabled={filters.nameType === "surname"}
                    >
                      <SelectTrigger className={filters.nameType === "surname" ? "opacity-50 cursor-not-allowed" : ""}>
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
                  onSelectionChange={setSelectedOrigins}
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
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Generate Button - Positioned outside card to match paired generator */}
      <Button onClick={generateName} className="w-full" size="lg">
        <Shuffle className="mr-2 h-5 w-5" />
        Generate Random Name
      </Button>

      {/* GENERATED NAME CARD (only shown after generation) */}
      {generated && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-2xl">
              {/* Show native script if available (e.g., 日本, Ελένη) */}
              {generated.script && <div className="text-3xl mb-2">{generated.script}</div>}
              <div>{generated.name}</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Type and Gender Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{generated.nameType === 'firstName' ? 'First Name' : generated.nameType === 'surname' ? 'Surname' : 'Either'}</Badge>
              {generated.gender && generated.gender !== 'any' && (
                <Badge variant="outline" className="capitalize">{generated.gender}</Badge>
              )}
            </div>

            {/* Pronunciation */}
            {generated.pronunciation && (
              <div>
                <span className="font-medium text-muted-foreground">Pronunciation: </span>
                <span className="italic">{generated.pronunciation}</span>
              </div>
            )}
            
            {/* Categories (Hierarchical meanings) */}
            {generated.meanings.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">Categories: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {generated.meanings.map((meaning, idx) => (
                    <Badge key={idx} variant="secondary">{meaning}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Literal Meaning (full translation) */}
            {generated.meaning && (
              <div>
                <span className="font-medium text-muted-foreground">Literal meaning: </span>
                <span className="text-sm">{generated.meaning}</span>
              </div>
            )}
            
            {/* Feelings (emotional associations) */}
            {generated.feelings.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">Feelings: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {generated.feelings.map((feeling, idx) => (
                    <Badge key={idx} variant="outline">{feeling}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Etymology (historical/linguistic origins) */}
            {generated.etymology && (
              <div>
                <span className="font-medium text-muted-foreground">Etymology: </span>
                <span>{generated.etymology}</span>
              </div>
            )}
            
            {/* Origin(s) */}
            {generated.origin && generated.origin.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">Origin: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {generated.origin.map((origin, idx) => (
                    <Badge key={idx} variant="outline">{origin}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Notes */}
            {generated.notes && (
              <div>
                <span className="font-medium text-muted-foreground">Notes: </span>
                <span>{generated.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};