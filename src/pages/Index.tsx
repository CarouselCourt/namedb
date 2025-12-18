/**
 * ============================================================================
 * INDEX PAGE - MAIN APPLICATION
 * ============================================================================
 * 
 * This is the heart of the FatedMagic Names application. It provides:
 * - A searchable, filterable library of names
 * - Name generation tools for finding character names
 * - Category management for organizing names
 * 
 * MAIN FEATURES:
 * 1. NAME LIBRARY: Browse, search, and filter all names
 * 2. RANDOM GENERATOR: Generate names with two modes:
 *    - Single Name: Generate individual names with name type filter (NameGenerator component)
 *    - Paired Name: Generate first name + surname combinations (PairedNameGenerator component)
 * 3. CATEGORY MANAGER: Organize and manage name categories
 * 
 * DATA FLOW:
 * - Names stored in: useNameStorage hook (localStorage + server sync)
 * - Categories stored in: useCategoryStorage hook
 * - UI state: Local component state (filters, dialogs, etc.)
 * 
 * FILTERING SYSTEM:
 * Names can be filtered by:
 * - Text search (name, meaning, etymology, origin)
 * - Name Type (first name, surname, either)
 * - Gender (masculine, feminine, neutral, any) - disabled when surname is selected
 * - Origin (geographic/linguistic source)
 * - Status (available, used, blocked)
 * - Categories (hierarchical: category > subcategory > subsubcategory)
 * - Feelings (emotional associations)
 * - Phonetics (syllable count, starts with, ends with, rhymes with)
 * 
 * SPECIAL BEHAVIOR:
 * - Gender filter is disabled when Name Type is set to "surname" since surnames
 *   are inherently gender-neutral family names
 */

import { FolderTree, Shuffle, Library, RotateCcw, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useNameStorage, Name } from "@/hooks/useNameStorage";
import { useCategoryStorage } from "@/hooks/useCategoryStorage";
import { NameCard } from "@/components/NameCard";
import { NameDialog } from "@/components/NameDialog";
import { NameGenerator } from "@/components/NameGenerator";
import { PairedNameGenerator } from "@/components/PairedNameGenerator";
import { CategoryManager } from "@/components/CategoryManager";
import { SeparatedOriginSelector } from "@/components/SeparatedOriginSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, BookOpen } from "lucide-react";
import { findSimilarNames } from "@/utils/nameSimilarity";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
 * Index: Main application component
 * 
 * COMPONENT STRUCTURE:
 * - Header: App title and branding
 * - Tabs: Library | Random Generator | Category Manager
 * - Random Generator tab includes:
 *   - Mode switcher: Single Name vs Paired Name
 *   - Single Name mode: Shows NameGenerator component with name type filter
 *   - Paired Name mode: Shows PairedNameGenerator component
 * - Filters: Search, dropdowns, checkboxes (collapsible on mobile)
 * - Name Grid: Cards displaying filtered names
 * - Dialogs: Add/edit name form
 */
const Index = () => {
  // ============================================================================
  // DATA HOOKS
  // ============================================================================
  
  /**
   * Main data hooks for accessing and modifying names and categories
   * 
   * useNameStorage: CRUD operations for names (create, read, update, delete)
   * useCategoryStorage: Get list of saved categories for autocomplete
   * useToast: Display notifications to user
   */
  const { names, addName, updateName, bulkUpdateNames, deleteName, toggleUsed, setStatus, mergeNameEntries } = useNameStorage();
  const { categories: storedCategories } = useCategoryStorage();
  const { toast } = useToast();
  
  // ============================================================================
  // UI STATE
  // ============================================================================
  
  /**
   * Dialog state for add/edit name form
   * - dialogOpen: Is the dialog visible?
   * - editingName: If editing, which name? (undefined = adding new)
   */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<Name | undefined>();
  
  /**
   * Tab navigation state
   * - library: Browse all names
   * - generator: Generate individual names
   * - paired: Generate first name + surname pairs
   * - categories: Manage category organization
   */
  const [activeTab, setActiveTab] = useState("library");
  
  /**
   * Generator mode toggle (single vs paired)
   * Controls whether to show the single name generator or paired name generator.
   * - 'single': Shows NameGenerator component with name type filter
   * - 'paired': Shows PairedNameGenerator component for first name + surname pairs
   */
  const [generatorMode, setGeneratorMode] = useState<'single' | 'paired'>('single');
  
  // ============================================================================
  // FILTER STATE (controls which names are displayed)
  // ============================================================================
  
  /**
   * TEXT SEARCH FILTERS
   * - searchTerm: Search across name, etymology, origins, categories
   * - searchLiteralMeaning: Search in the literal meaning/translation field
   */
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLiteralMeaning, setSearchLiteralMeaning] = useState("");
  
  /**
   * BASIC FILTERS
   * - genderFilter: "all" | "masculine" | "feminine" | "neutral" | "any"
   * - usedFilter: "all" | "available" | "used" | "blocked"
   * - nameTypeFilter: "all" | "firstName" | "surname" | "either"
   */
  const [genderFilter, setGenderFilter] = useState("all");
  const [usedFilter, setUsedFilter] = useState("all");
  const [nameTypeFilter, setNameTypeFilter] = useState("all");
  
  /**
   * ORIGIN FILTER (multi-select)
   * Array of selected origin strings
   * Example: ["Greek > Ancient Greek", "Latin"]
   */
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  
  /**
   * HIERARCHICAL CATEGORY FILTERS
   * Categories are organized in a 3-level hierarchy:
   * Main Category > Subcategory > Sub-subcategory
   * Example: "Nature Names > Botanical Names > Flowers"
   * 
   * - meaningFilter: Main category (e.g., "Nature Names")
   * - subcategoryFilter: Second level (e.g., "Botanical Names")
   * - subsubcategoryFilter: Third level (e.g., "Flowers")
   */
  const [meaningFilter, setMeaningFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [subsubcategoryFilter, setSubsubcategoryFilter] = useState("all");
  
  /**
   * FEELINGS FILTER (multi-select)
   * Array of selected feeling strings
   * Example: ["strong", "gentle", "mystical"]
   */
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  
  /**
   * PHONETIC FILTERS
   * Filter names based on how they sound
   * 
   * - syllableFilter: "all" or specific count ("1", "2", "3", etc.)
   * - startsWithSound: Names starting with this sound (e.g., "KAY")
   * - endsWithSound: Names ending with this sound (e.g., "ruh")
   * - rhymesWithSound: Names that rhyme with this pronunciation (e.g., "KATE")
   */
  const [syllableFilter, setSyllableFilter] = useState("all");
  const [startsWithSound, setStartsWithSound] = useState("");
  const [endsWithSound, setEndsWithSound] = useState("");
  const [rhymesWithSound, setRhymesWithSound] = useState("");

  /**
   * MOBILE UI STATE
   * - filtersOpen: Are filter controls visible? (collapsible on mobile)
   */
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ============================================================================
  // COMPUTED LISTS FOR FILTER DROPDOWNS
  // ============================================================================
  
  /**
   * Extract unique values from the name database for filter dropdowns
   * All lists are sorted alphabetically for consistent UI
   */
  
  /**
   * ORIGINS LIST
   * Get all unique origin strings from all names
   * Example: ["Greek", "Latin", "Hebrew > Ancient Hebrew", ...]
   */
  const origins = Array.from(new Set(names.flatMap(n => n.origin || [])))
    .sort((a,b) => String(a).localeCompare(String(b), undefined, { 
      sensitivity: 'base',  // Case-insensitive
      numeric: true         // Handles numbers in strings correctly
    }));
  
  /**
   * MAIN CATEGORIES LIST
   * Extract top-level categories from both:
   * 1. Names that have been added (n.meanings)
   * 2. Stored category list (for empty categories)
   * 
   * Example category: "Nature Names > Botanical Names > Flowers"
   * This extracts: "Nature Names"
   */
  const mainCategories = Array.from(new Set([
    // From names: take first part of each meaning before first " > "
    ...names.flatMap(n => n.meanings || []).map(m => m.split(' > ')[0]),
    // From stored categories: take first part of each path
    ...storedCategories.map(c => c.path.split(' > ')[0])
  ].filter(Boolean)))  // Remove empty strings
    .sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true }));

  /**
   * SUBCATEGORIES LIST (depends on selected main category)
   * 
   * REACTIVITY: useMemo re-calculates when meaningFilter or names change
   * 
   * HOW IT WORKS:
   * 1. If no main category selected → empty list
   * 2. Filter to categories starting with "MainCategory > "
   * 3. Extract the second level (text between first and second " > ")
   * 
   * Example:
   * Main category: "Nature Names"
   * Full categories: [
   *   "Nature Names > Botanical Names > Flowers",
   *   "Nature Names > Botanical Names > Trees",
   *   "Nature Names > Elemental Names > Water"
   * ]
   * Subcategories extracted: ["Botanical Names", "Elemental Names"]
   */
  const subcategories = useMemo(() => {
    if (meaningFilter === 'all') return [];
    
    return Array.from(new Set([
      // From names with this category
      ...names.flatMap(n => n.meanings || [])
        .filter(m => m.startsWith(meaningFilter + ' > '))
        .map(m => {
          const parts = m.split(' > ');
          return parts.length > 1 ? parts[1] : '';
        }),
      // From stored categories with this prefix
      ...storedCategories.map(c => c.path)
        .filter(m => m.startsWith(meaningFilter + ' > '))
        .map(m => {
          const parts = m.split(' > ');
          return parts.length > 1 ? parts[1] : '';
        })
    ].filter(Boolean)))
      .sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true }));
  }, [meaningFilter, names, storedCategories]);

  /**
   * SUB-SUBCATEGORIES LIST (depends on main category + subcategory)
   * 
   * REACTIVITY: Re-calculates when meaningFilter, subcategoryFilter, or names change
   * 
   * HOW IT WORKS:
   * Similar to subcategories, but extracts third level
   * 
   * Example:
   * Main: "Nature Names"
   * Sub: "Botanical Names"
   * Full: "Nature Names > Botanical Names > Flowers"
   * Sub-sub extracted: "Flowers"
   */
  const subsubcategories = useMemo(() => {
    if (meaningFilter === 'all' || subcategoryFilter === 'all') return [];
    
    const prefix = meaningFilter + ' > ' + subcategoryFilter + ' > ';
    
    return Array.from(new Set([
      ...names.flatMap(n => n.meanings || [])
        .filter(m => m.startsWith(prefix))
        .map(m => {
          const parts = m.split(' > ');
          return parts.length > 2 ? parts[2] : '';
        }),
      ...storedCategories.map(c => c.path)
        .filter(m => m.startsWith(prefix))
        .map(m => {
          const parts = m.split(' > ');
          return parts.length > 2 ? parts[2] : '';
        })
    ].filter(Boolean)))
      .sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true }));
  }, [meaningFilter, subcategoryFilter, names, storedCategories]);

  /**
   * FEELINGS LIST
   * All unique feeling tags from all names
   * Example: ["strong", "gentle", "mystical", "regal", ...]
   */
  const feelings = Array.from(new Set(names.flatMap(n => n.feelings || []).filter(Boolean)))
    .sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })) as string[];

  /**
   * SYLLABLE COUNTS LIST
   * Extract unique syllable counts from names that have pronunciations
   * 
   * REACTIVITY: Re-calculates when names change
   * 
   * Example: If names have 1, 2, 2, 3, 4 syllables → [1, 2, 3, 4]
   * Used to populate syllable filter dropdown dynamically
   */
  const syllableCounts = useMemo(() => {
    return getUniqueSyllableCounts(names);
  }, [names]);

  // ============================================================================
  // NAME FILTERING LOGIC
  // ============================================================================
  
  /**
   * filteredNames: Apply ALL active filters to the name list
   * 
   * FILTER COMBINATION:
   * All filters use AND logic - a name must pass ALL active filters to appear.
   * If a filter is inactive (e.g., genderFilter === "all"), it's ignored (always passes).
   * 
   * FILTERS APPLIED (in order):
   * 1. Text search (across multiple fields)
   * 2. Gender
   * 3. Origin (hierarchical matching)
   * 4. Status (available/used/blocked)
   * 5. Name type (first name/surname/either)
   * 6. Categories (3-level hierarchy)
   * 7. Literal meaning
   * 8. Feelings (all selected feelings must be present)
   * 9. Phonetics (syllables, starts with, ends with, rhymes with)
   */
  const filteredNames = names.filter(name => {
    // -------------------------------------------------------------------------
    // FILTER 1: TEXT SEARCH
    // -------------------------------------------------------------------------
    /**
     * Search across multiple fields (case-insensitive)
     * A match in ANY field passes the filter
     * 
     * Fields searched:
     * - Name string itself
     * - Script (e.g., Korean characters)
     * - Categories/meanings
     * - Etymology description
     * - Origins
     * - Feelings
     */
    const displayName = name.name;
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.script?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (name.meanings || []).some(m => m.toLowerCase().includes(searchTerm.toLowerCase())) ||
      name.etymology?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.origin?.some(o => o.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (name.feelings || []).some(f => f.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (name.relatedNames || []).some(rn => rn.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // -------------------------------------------------------------------------
    // FILTER 2: GENDER
    // -------------------------------------------------------------------------
    /**
     * Match exact gender or "all" (no filter)
     * Example: genderFilter = "feminine" → only feminine names pass
     * 
     * NOTE: Gender filter is automatically disabled in the UI when surname is selected,
     * since surnames are gender-neutral. However, we keep this logic for robustness.
     */
    const matchesGender = genderFilter === "all" || name.gender === genderFilter;
    
    // -------------------------------------------------------------------------
    // FILTER 3: ORIGIN (hierarchical)
    // -------------------------------------------------------------------------
    /**
     * HIERARCHICAL ORIGIN MATCHING
     * 
     * Problem: If user selects both "Greek" and "Greek > Ancient Greek",
     * we should only check "Greek > Ancient Greek" (most specific).
     * 
     * Solution: Filter selectedOrigins to remove parents when children exist
     * 
     * Example:
     * Selected: ["European", "European > Greek", "European > Greek > Ancient Greek"]
     * Most specific: ["European > Greek > Ancient Greek"]
     * 
     * MATCHING LOGIC:
     * A name's origin matches if it equals OR is more specific than selected origin
     * - Name: "European > Greek > Ancient Greek"
     * - Selected: "European > Greek"
     * - Result: MATCH (name is more specific)
     */
    const mostSpecificOrigins = selectedOrigins.filter(origin => 
      !selectedOrigins.some(other => other !== origin && other.startsWith(origin + ' > '))
    );
    
    const matchesOrigin = mostSpecificOrigins.length === 0 ||  // No origin filter active
      (name.origin || []).some(origin => 
        mostSpecificOrigins.some(selected => 
          origin === selected ||                    // Exact match
          origin.startsWith(selected + ' > ')       // Name is more specific
        )
      );
    
    // -------------------------------------------------------------------------
    // FILTER 4: STATUS (available/used/blocked)
    // -------------------------------------------------------------------------
    /**
     * Check if name's status matches selected filter
     * Default status is 'available' if not set
     */
    const status = name.status || 'available';
    const matchesUsed =
      usedFilter === 'all' ||
      (usedFilter === 'used' && status === 'used') ||
      (usedFilter === 'available' && status === 'available') ||
      (usedFilter === 'blocked' && status === 'blocked');
    
    // -------------------------------------------------------------------------
    // FILTER 5: NAME TYPE (first name/surname/either)
    // -------------------------------------------------------------------------
    /**
     * Special handling for "either" type:
     * Names marked "either" should appear in both firstName and surname filters
     */
    const matchesNameType = 
      nameTypeFilter === "all" || 
      name.nameType === nameTypeFilter ||
      name.nameType === "either";  // "either" matches all filters
    
    // -------------------------------------------------------------------------
    // FILTER 6: HIERARCHICAL CATEGORIES (3 levels)
    // -------------------------------------------------------------------------
    /**
     * THREE-LEVEL CATEGORY FILTERING
     * 
     * Level 1 (Main): "Nature Names"
     * - Matches: "Nature Names" OR anything starting with "Nature Names > "
     * 
     * Level 2 (Sub): "Botanical Names"
     * - Requires Level 1 to be set
     * - Matches: "Nature Names > Botanical Names" OR 
     *            "Nature Names > Botanical Names > ..."
     * 
     * Level 3 (Sub-sub): "Flowers"
     * - Requires Level 1 and 2 to be set
     * - Matches: "Nature Names > Botanical Names > Flowers" OR
     *            "Nature Names > Botanical Names > Flowers > ..."
     */
    const matchesMeaning = meaningFilter === 'all' || 
      (name.meanings || []).some(m => 
        m === meaningFilter ||                    // Exact match
        m.startsWith(meaningFilter + ' > ')       // More specific
      );
    
    const matchesSubcategory = subcategoryFilter === 'all' || 
      (name.meanings || []).some(m => 
        m === meaningFilter + ' > ' + subcategoryFilter || 
        m.startsWith(meaningFilter + ' > ' + subcategoryFilter + ' > ')
      );
    
    const matchesSubsubcategory = subsubcategoryFilter === 'all' || 
      (name.meanings || []).some(m => 
        m === meaningFilter + ' > ' + subcategoryFilter + ' > ' + subsubcategoryFilter || 
        m.startsWith(meaningFilter + ' > ' + subcategoryFilter + ' > ' + subsubcategoryFilter + ' > ')
      );
    
    // -------------------------------------------------------------------------
    // FILTER 7: LITERAL MEANING
    // -------------------------------------------------------------------------
    /**
     * Search within the literal meaning/translation field
     * Example: search "moon" finds names meaning "moon", "moonlight", etc.
     */
    const matchesLiteralMeaning = !searchLiteralMeaning || 
      name.meaning?.toLowerCase().includes(searchLiteralMeaning.toLowerCase());
    
    // -------------------------------------------------------------------------
    // FILTER 8: FEELINGS (all selected must be present)
    // -------------------------------------------------------------------------
    /**
     * AND logic for feelings: ALL selected feelings must be present on the name
     * 
     * Example:
     * Selected feelings: ["strong", "mystical"]
     * Name feelings: ["strong", "mystical", "ancient"]
     * → MATCH (name has both selected feelings)
     * 
     * Name feelings: ["strong", "gentle"]
     * → NO MATCH (missing "mystical")
     */
    const matchesFeelings = selectedFeelings.length === 0 ||  // No filter active
      selectedFeelings.every(feeling => name.feelings?.includes(feeling));

    // Note: Phonetic filters (syllables, starts with, ends with, rhymes with) are 
    // applied AFTER expansion in expandedNames, so each variant is checked individually

    // -------------------------------------------------------------------------
    // COMBINE ALL FILTERS (AND logic)
    // -------------------------------------------------------------------------
    /**
     * Name must pass ALL active filters to be included in results
     */
    return matchesSearch && matchesGender && matchesOrigin && matchesUsed && 
           matchesNameType && matchesMeaning && matchesSubcategory && 
           matchesSubsubcategory && matchesLiteralMeaning && matchesFeelings;
  });

  // ============================================================================
  // SPELLING VARIANT EXPANSION
  // ============================================================================
  
  /**
   * expandedNames: Expands each name into separate cards for each spelling
   * 
   * WHY EXPAND?
   * A single name entry might have multiple spellings:
   * - Primary: "Sarah"
   * - Variants: ["Sara", "Sahra", "Zarah"]
   * 
   * We want to show a separate card for each spelling so users can:
   * 1. Find names when searching for any spelling variant
   * 2. See each spelling with its similar names
   * 3. Browse alphabetically by any spelling
   * 
   * HOW IT WORKS:
   * 1. For each name, create an array of all spellings (primary + alternates)
   * 2. Map each spelling to a new object with displayName and isPrimarySpelling flag
   * 3. Flatten all arrays into a single list
   * 4. Apply phonetic filters to each expanded entry individually
   * 5. Sort alphabetically by displayName
   * 
   * REACTIVITY: Re-calculates when filteredNames or phonetic filters change
   * 
   * EXAMPLE:
   * Input: [
   *   { id: "1", name: "Sarah", alternateSpellings: ["Sara", "Sahra"] }
   * ]
   * 
   * Output: [
   *   { id: "1", name: "Sarah", displayName: "Sara", isPrimarySpelling: false },
   *   { id: "1", name: "Sarah", displayName: "Sarah", isPrimarySpelling: true },
   *   { id: "1", name: "Sarah", displayName: "Sahra", isPrimarySpelling: false }
   * ]
   * (sorted alphabetically by displayName)
   */
  const expandedNames = useMemo(() => {
    // Step 1: Expand each name into multiple entries (one per name form)
    const expanded = filteredNames.flatMap(name => {
      // Start with the primary name entry
      const entries = [{
        ...name,
        displayName: name.name,
        isPrimarySpelling: true
      }];
      
      // Add entries for each related name form
      if (name.relatedNames) {
        name.relatedNames.forEach(related => {
          entries.push({
            ...name,
            displayName: related.name,
            isPrimarySpelling: false,
            // Override with related name's specific fields if provided
            pronunciation: related.pronunciation || name.pronunciation,
            script: related.script || name.script,
            etymology: related.etymology || name.etymology,
            gender: related.gender || name.gender,
          });
        });
      }
      
      return entries;
    });
    
    // Step 2: Apply phonetic filters to each expanded entry
    const phoneticFiltered = expanded.filter(entry => {
      // Syllable count filter
      const matchesSyllables = syllableFilter === 'all' || 
        getSyllableCount(entry.pronunciation) === parseInt(syllableFilter);
      
      // Starts with sound filter
      const matchesStartsWithSound = !startsWithSound || 
        pronunciationStartsWith(entry.pronunciation, startsWithSound);
      
      // Ends with sound filter
      const matchesEndsWithSound = !endsWithSound || 
        pronunciationEndsWith(entry.pronunciation, endsWithSound);
      
      // Rhymes with filter
      const matchesRhymesWithSound = !rhymesWithSound || 
        pronunciationsRhyme(entry.pronunciation, rhymesWithSound);
      
      return matchesSyllables && matchesStartsWithSound && 
             matchesEndsWithSound && matchesRhymesWithSound;
    });
    
    // Step 3: Sort all filtered entries alphabetically by displayed spelling
    return phoneticFiltered.sort((a, b) => {
      const aKey = (a.displayName || a.name || '').toLowerCase();
      const bKey = (b.displayName || b.name || '').toLowerCase();
      
      // Natural sort: case-insensitive, handles numbers correctly
      return aKey.localeCompare(bKey, undefined, { 
        sensitivity: 'base',  // Ignore case
        numeric: true         // "Name2" comes before "Name10"
      });
    });
  }, [filteredNames, syllableFilter, startsWithSound, endsWithSound, rhymesWithSound]);

  // ============================================================================
  // SIMILAR NAMES CALCULATION
  // ============================================================================
  
  /**
   * namesWithSimilar: Pairs each name with its similar names
   * 
   * WHY CALCULATE THIS?
   * The NameCard component displays similar names below each name.
   * We pre-calculate all similarities here so the NameCard just renders them.
   * 
   * HOW IT WORKS:
   * For each expanded name, run findSimilarNames() to get linguistically
   * similar names based on roots, pronunciation, categories, etc.
   * 
   * THRESHOLD: 60 points minimum (set in findSimilarNames call)
   * This prevents weak similarities from appearing.
   * 
   * SELF-EXCLUSION:
   * Filter out the name itself (by ID) from its similar names list.
   * This prevents "Sarah" from showing "Sara" (same name, different spelling).
   * 
   * REACTIVITY: Re-calculates when expandedNames or names change
   * 
   * PERFORMANCE NOTE:
   * This can be expensive for large databases (N * M comparisons).
   * useMemo caches the results until dependencies change.
   * 
   * EXAMPLE OUTPUT:
   * [
   *   {
   *     name: { id: "1", displayName: "Sarah", ... },
   *     similar: [
   *       { name: { id: "2", name: "Sara" }, reason: "similar pronunciation", score: 80 },
   *       { name: { id: "3", name: "Zara" }, reason: "similar spelling", score: 50 }
   *     ]
   *   },
   *   ...
   * ]
   */
  const namesWithSimilar = useMemo(() => {
    return expandedNames.map(expandedName => ({
      name: expandedName,
      similar: findSimilarNames(
        expandedName,      // The name to find similarities for
        names,             // Full name database to search
        60                 // Minimum similarity threshold (60 points)
      ).filter(s => s.name.id !== expandedName.id),  // Exclude self
    }));
  }, [expandedNames, names]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * handleSave: Processes form submission from NameDialog
   * 
   * TWO MODES:
   * 1. EDITING: If editingName exists, update the existing name
   * 2. ADDING: If editingName is undefined, create a new name
   * 
   * BACKGROUND SYNC:
   * Changes are saved to localStorage immediately.
   * Server synchronization happens in the background (see useNameStorage).
   * If server is down, changes queue up and retry automatically.
   * 
   * WHY SILENT SAVE?
   * We don't show a success toast because:
   * - Saves are instant (localStorage)
   * - Server sync is automatic/background
   * - Reduces notification noise for frequent saves
   */
  const handleSave = (nameData: Omit<Name, 'id' | 'createdAt' | 'isUsed'>) => {
    if (editingName) {
      // EDIT MODE: Update existing name
      updateName(editingName.id, nameData);
      setEditingName(undefined);  // Clear editing state
    } else {
      // ADD MODE: Create new name
      addName(nameData);
    }
    // Note: No toast notification - silent save with background sync
  };

  /**
   * handleEdit: Opens the edit dialog for a specific name
   * 
   * WHAT IT DOES:
   * 1. Sets editingName to the selected name (signals edit mode)
   * 2. Opens the dialog
   * 
   * The NameDialog component detects editingName and pre-fills the form.
   */
  const handleEdit = (name: Name) => {
    setEditingName(name);
    setDialogOpen(true);
  };

  /**
   * handleAddNew: Opens the add new name dialog
   * 
   * WHAT IT DOES:
   * 1. Clears editingName (signals add mode, not edit mode)
   * 2. Opens the dialog
   * 
   * The NameDialog component shows an empty form when editingName is undefined.
   */
  const handleAddNew = () => {
    setEditingName(undefined);
    setDialogOpen(true);
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-serif font-bold text-foreground">FatedMagic Names</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto mb-8 grid-cols-3">
            <TabsTrigger value="library">
              <Library className="mr-2 h-4 w-4" />
              Name Library
            </TabsTrigger>
            <TabsTrigger value="categories">
              <FolderTree className="mr-2 h-4 w-4" />
              Category Management
            </TabsTrigger>
            <TabsTrigger value="generator">
              <Shuffle className="mr-2 h-4 w-4" />
              Random Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search names, categories, origins, feelings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Name
              </Button>
            </div>

            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleContent>
                <div className="space-y-6">
                  {/* Basic Filters */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground">Basic Filters</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Name Type</label>
                      <Select value={nameTypeFilter} onValueChange={setNameTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="firstName">First Name</SelectItem>
                          <SelectItem value="surname">Surname</SelectItem>
                          <SelectItem value="either">Either</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
                      <Select 
                        value={genderFilter} 
                        onValueChange={setGenderFilter}
                        disabled={nameTypeFilter === "surname"}
                      >
                        <SelectTrigger className={nameTypeFilter === "surname" ? "opacity-50 cursor-not-allowed" : ""}>
                          <SelectValue placeholder="Filter by gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Genders</SelectItem>
                          <SelectItem value="masculine">Masculine</SelectItem>
                          <SelectItem value="feminine">Feminine</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>


                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Availability</label>
                      <Select value={usedFilter} onValueChange={setUsedFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Names</SelectItem>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Main Category</label>
                      <Select value={meaningFilter} onValueChange={(value) => {
                        setMeaningFilter(value);
                        setSubcategoryFilter('all');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="all">All Categories</SelectItem>
                          {mainCategories.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Subcategory</label>
                      <Select 
                        value={subcategoryFilter} 
                        onValueChange={(value) => {
                          setSubcategoryFilter(value);
                          setSubsubcategoryFilter('all');
                        }}
                        disabled={meaningFilter === 'all' || subcategories.length === 0}
                      >
                        <SelectTrigger className={meaningFilter === 'all' || subcategories.length === 0 ? 'text-muted-foreground' : ''}>
                          <SelectValue placeholder="All Subcategories" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="all">All Subcategories</SelectItem>
                          {subcategories.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Sub-subcategory</label>
                      <Select 
                        value={subsubcategoryFilter} 
                        onValueChange={setSubsubcategoryFilter}
                        disabled={meaningFilter === 'all' || subcategoryFilter === 'all' || subsubcategories.length === 0}
                      >
                        <SelectTrigger className={meaningFilter === 'all' || subcategoryFilter === 'all' || subsubcategories.length === 0 ? 'text-muted-foreground' : ''}>
                          <SelectValue placeholder="All Sub-Subcategories" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="all">All Sub-Subcategories</SelectItem>
                          {subsubcategories.map(subsub => (
                            <SelectItem key={subsub} value={subsub}>{subsub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Literal Meaning (contains)</label>
                    <Input
                      placeholder="Search within meaning field..."
                      value={searchLiteralMeaning}
                      onChange={(e) => setSearchLiteralMeaning(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Feelings (tags)</label>
                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
                      {feelings.map(feeling => (
                        <div key={feeling} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                          <Checkbox
                            checked={selectedFeelings.includes(feeling)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFeelings([...selectedFeelings, feeling]);
                              } else {
                                setSelectedFeelings(selectedFeelings.filter(f => f !== feeling));
                              }
                            }}
                          />
                          <label className="text-sm cursor-pointer flex-1">{feeling}</label>
                        </div>
                      ))}
                    </div>
                    {selectedFeelings.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedFeelings.map(feeling => (
                          <Badge 
                            key={feeling} 
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => setSelectedFeelings(selectedFeelings.filter(f => f !== feeling))}
                          >
                            {feeling} <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>

                  {/* Phonetic & Syllable Filters */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground">Phonetic & Syllable Filters</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Syllable Count</label>
                      <Select value={syllableFilter} onValueChange={setSyllableFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by syllables" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Syllables</SelectItem>
                          {syllableCounts.map(count => (
                            <SelectItem key={count} value={count.toString()}>
                              {count} {count === 1 ? 'syllable' : 'syllables'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Starts With Sound</label>
                      <Input
                        placeholder="e.g., AY, BRO"
                        value={startsWithSound}
                        onChange={(e) => setStartsWithSound(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Ends With Sound</label>
                      <Input
                        placeholder="e.g., AN, EL"
                        value={endsWithSound}
                        onChange={(e) => setEndsWithSound(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Rhymes With (pronunciation)</label>
                      <Input
                        placeholder="e.g., BROWN, AY-lee"
                        value={rhymesWithSound}
                        onChange={(e) => setRhymesWithSound(e.target.value)}
                      />
                    </div>
                  </div>
                  </div>
                </div>
              </CollapsibleContent>

              {/* Clear Filters and Show/Hide Filters Buttons */}
              <div className="border-t pt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNameTypeFilter('all');
                    setGenderFilter('all');
                    setSelectedOrigins([]);
                    setUsedFilter('all');
                    setMeaningFilter('all');
                    setSubcategoryFilter('all');
                    setSubsubcategoryFilter('all');
                    setSelectedFeelings([]);
                    setSearchTerm('');
                    setSearchLiteralMeaning('');
                    setSyllableFilter('all');
                    setStartsWithSound('');
                    setEndsWithSound('');
                    setRhymesWithSound('');
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
                
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                    <span className="ml-2">{filtersOpen ? 'Hide' : 'Show'} Filters</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </Collapsible>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {namesWithSimilar.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    {names.length === 0 
                      ? "No names yet. Add your first name to get started!"
                      : "No names match your filters."}
                  </p>
                </div>
              ) : (
                namesWithSimilar.map(({ name, similar }) => (
                  <NameCard
                    key={name.id}
                    name={name}
                    onEdit={handleEdit}
                    onDelete={deleteName}
                    onToggleUsed={toggleUsed}
                    onSetStatus={setStatus}
                    similarNames={similar}
                    allNames={names}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager
              names={names}
              onUpdateNames={(updatedNames) => {
                // Bulk update all names at once to avoid race conditions
                bulkUpdateNames(updatedNames);
              }}
              onSearchByCategory={(category: string) => {
                // Parse the category path and set filters
                const parts = category.split(' > ');
                setMeaningFilter(parts[0] || 'all');
                setSubcategoryFilter(parts[1] || 'all');
                setSubsubcategoryFilter(parts[2] || 'all');
                
                // Switch to library tab
                setActiveTab('library');
              }}
            />
          </TabsContent>

          <TabsContent value="generator">
            <div className="space-y-6">
              {/* Mode Switcher Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Generator Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={generatorMode} onValueChange={(v: any) => setGeneratorMode(v)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="single">Single Name</TabsTrigger>
                      <TabsTrigger value="paired">Paired Name (First + Surname)</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Conditional Generator Rendering */}
              {generatorMode === 'single' ? (
                <NameGenerator names={names} />
              ) : (
                <PairedNameGenerator 
                  names={names} 
                  mode={generatorMode}
                  onModeChange={setGeneratorMode}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <NameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editingName={editingName}
        allNames={names}
        onRequestMerge={(existingName, newSpelling) => {
          // Close the current dialog and trigger merge
          if (editingName) {
            mergeNameEntries(editingName.id, existingName.id);
            toast({
              title: "Names Merged",
              description: `Successfully merged "${existingName.name}" into "${editingName.name}"`,
            });
            setDialogOpen(false);
            setEditingName(undefined);
          }
        }}
      />
    </div>
  );
};

export default Index;
