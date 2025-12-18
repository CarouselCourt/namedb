/**
 * ========================================
 * CATEGORY AUTOCOMPLETE COMPONENT
 * ========================================
 * 
 * A smart multi-select input with autocomplete that handles hierarchical
 * values. Used for categories, feelings, and origins throughout the app.
 * 
 * KEY FEATURES:
 * - **Autocomplete**: Shows suggestions as you type, sorted by usage count
 * - **Multi-select**: Add multiple values as removable badges
 * - **Hierarchical support**: Automatically adds parent categories when needed
 * - **Smart filtering**: Suggestions exclude already-selected items
 * - **Visual hierarchy**: Shows category paths with chevron separators
 * 
 * HIERARCHICAL LOGIC:
 * When adding "Nature > Sky > Stars":
 * - Automatically adds "Nature" if not present
 * - Automatically adds "Nature > Sky" if not present
 * - Then adds "Nature > Sky > Stars"
 * 
 * This ensures the category tree is always complete and valid.
 * 
 * USAGE PATTERNS:
 * - Categories (meanings): "Nature > Sky > Light"
 * - Feelings: Flat list, no hierarchy (allowHierarchy=false)
 * - Origins: "European > Spanish > Catalan"
 * 
 * DISPLAY MODES:
 * - Full path in dropdown: "Nature > Sky > Stars"
 * - Simplified in badge: "Stars" (just the leaf node)
 * - Only most-specific categories shown (filters out parents if children exist)
 */

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Component Props
 * 
 * @param value - Currently selected values (hierarchical paths)
 * @param onChange - Callback when selection changes
 * @param allOptions - All available options (from existing data)
 * @param predefinedOptions - Options that should always be available (e.g., standard continents)
 * @param placeholder - Input placeholder text
 * @param label - Label for accessibility
 * @param allowHierarchy - Whether to use hierarchical logic (true) or flat list (false)
 */
interface CategoryAutocompleteProps {
  value: string[];
  onChange: (value: string[]) => void;
  allOptions: string[];
  predefinedOptions?: string[];
  placeholder?: string;
  label?: string;
  allowHierarchy?: boolean;
}

/**
 * CategoryAutocomplete Component
 */
export const CategoryAutocomplete = ({
  value,
  onChange,
  allOptions,
  predefinedOptions = [],
  placeholder = "Type to add...",
  label = "Categories",
  allowHierarchy = true,
}: CategoryAutocompleteProps) => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  /**
   * Current text in the input field
   */
  const [inputValue, setInputValue] = useState("");
  
  /**
   * Whether the dropdown is open
   */
  const [open, setOpen] = useState(false);

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================
  
  /**
   * Count occurrences of each option and sort by popularity
   * 
   * This helps users see which categories are most commonly used,
   * making it easier to maintain consistency.
   * 
   * Predefined options are always included first (with count 0 if not used)
   */
  const optionsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allOptions.forEach(opt => {
      counts.set(opt, (counts.get(opt) || 0) + 1);
    });
    
    // Add predefined options with their counts (or 0)
    predefinedOptions.forEach(opt => {
      if (!counts.has(opt)) {
        counts.set(opt, 0);
      }
    });
    
    // Sort: predefined options first (alphabetically), then by usage count
    return Array.from(counts.entries())
      .sort((a, b) => {
        const aIsPredefined = predefinedOptions.includes(a[0]);
        const bIsPredefined = predefinedOptions.includes(b[0]);
        
        if (aIsPredefined && !bIsPredefined) return -1;
        if (!aIsPredefined && bIsPredefined) return 1;
        if (aIsPredefined && bIsPredefined) {
          return a[0].localeCompare(b[0]); // alphabetical for predefined
        }
        return b[1] - a[1]; // sort by count descending for others
      })
      .map(([option, count]) => ({ option, count }));
  }, [allOptions, predefinedOptions]);

  /**
   * Filter suggestions based on current input
   * 
   * - Matches anywhere in the string (not just beginning)
   * - Excludes already-selected values
   * - Returns empty list if no input (shows all options)
   */
  const suggestions = useMemo(() => {
    if (!inputValue) return optionsWithCounts;
    const lower = inputValue.toLowerCase();
    return optionsWithCounts.filter(({ option }) =>
      option.toLowerCase().includes(lower) && !value.includes(option)
    );
  }, [inputValue, optionsWithCounts, value]);

  // ============================================================================
  // HIERARCHICAL LOGIC
  // ============================================================================
  
  /**
   * Add a category with automatic parent creation
   * 
   * EXAMPLES:
   * 
   * Adding "Nature":
   *   → Adds: ["Nature"]
   * 
   * Adding "Nature > Sky":
   *   → Adds: ["Nature", "Nature > Sky"] (if Nature not present)
   *   → Or just: ["Nature > Sky"] (if Nature already present)
   * 
   * Adding "Nature > Sky > Stars":
   *   → Adds: ["Nature", "Nature > Sky", "Nature > Sky > Stars"]
   *   → (Only adds missing parents)
   * 
   * This ensures the category tree is always complete.
   */
  const addCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed || value.includes(trimmed)) return;
    
    // Only auto-add parents if the category being added is hierarchical
    const categoryParts = trimmed.split(' > ');
    const toAdd: string[] = [];
    
    // If it's a subcategory or subsubcategory, only add the necessary parents
    if (categoryParts.length === 2) {
      // Adding a subcategory - add main category if not present
      const mainCat = categoryParts[0];
      if (!value.includes(mainCat)) {
        toAdd.push(mainCat);
      }
      toAdd.push(trimmed);
    } else if (categoryParts.length === 3) {
      // Adding a subsubcategory - add main and sub if not present
      const mainCat = categoryParts[0];
      const subCat = categoryParts.slice(0, 2).join(' > ');
      if (!value.includes(mainCat)) {
        toAdd.push(mainCat);
      }
      if (!value.includes(subCat)) {
        toAdd.push(subCat);
      }
      toAdd.push(trimmed);
    } else {
      // Adding a main category only
      toAdd.push(trimmed);
    }
    
    onChange([...value, ...toAdd]);
    setInputValue("");
    setOpen(false);
  };

  /**
   * Remove a category from selection
   */
  const removeCategory = (category: string) => {
    onChange(value.filter(v => v !== category));
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Handle Enter key to add current input
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory(inputValue);
    }
  };

  // ============================================================================
  // DISPLAY HELPERS
  // ============================================================================
  
  /**
   * Display full hierarchical path with chevron separators
   * Used in dropdown suggestions
   * 
   * Example: "Nature > Sky > Stars" → "Nature ❯ Sky ❯ Stars"
   */
  const displayCategoryFull = (cat: string) => {
    if (allowHierarchy && cat.includes(' > ')) {
      const parts = cat.split(' > ');
      return (
        <span className="flex items-center gap-1">
          {parts.map((part, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3 w-3" />}
              <span>{part}</span>
            </span>
          ))}
        </span>
      );
    }
    return cat;
  };

  /**
   * Display only the leaf node (simplest form)
   * Used in selected badges
   * 
   * Example: "Nature > Sky > Stars" → "Stars"
   */
  const displayCategorySimple = (cat: string) => {
    if (allowHierarchy && cat.includes(' > ')) {
      const parts = cat.split(' > ');
      return parts[parts.length - 1];
    }
    return cat;
  };

  /**
   * Filter out parent categories if their children are present
   * 
   * This keeps the display clean by only showing the most specific
   * categories selected.
   * 
   * Example:
   * Selected: ["Nature", "Nature > Sky", "Nature > Sky > Stars", "Water"]
   * Displayed: ["Nature > Sky > Stars", "Water"]
   */
  const getFilteredValues = () => {
    if (!allowHierarchy) return value;
    return value.filter(cat => {
      const hasMoreSpecific = value.some(other => 
        other !== cat && 
        other.startsWith(cat + ' > ')
      );
      return !hasMoreSpecific;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="flex-1"
          />
          {open && suggestions.length > 0 && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setOpen(false)}
              />
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-1">
                    {suggestions.map(({ option, count }) => (
                      <button
                        key={option}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center justify-between"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addCategory(option);
                        }}
                      >
                        <span className="flex-1">{displayCategoryFull(option)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({count})</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
        <Button
          type="button"
          onClick={() => addCategory(inputValue)}
          disabled={!inputValue.trim()}
        >
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getFilteredValues().map((cat, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1">
              {displayCategorySimple(cat)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeCategory(cat)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
