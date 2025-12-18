/**
 * ========================================
 * SEPARATED CATEGORY SELECTOR COMPONENT
 * ========================================
 * 
 * This component provides a three-column hierarchical category selection UI
 * for filtering names by meaning categories. It's used in the PairedNameGenerator
 * to provide an intuitive way to select categories at different levels of specificity.
 * 
 * KEY FEATURES:
 * - **Three-level hierarchy**: Main → Sub → Sub-sub categories
 * - **Progressive disclosure**: Subcategories only show after selecting a main category
 * - **Multi-select**: Can select multiple categories at each level
 * - **Cross-product selection**: Selecting in multiple columns creates combinations
 * - **Visual feedback**: Selected items shown as removable badges
 * - **Search filtering**: Each column has independent search
 * 
 * HIERARCHY EXAMPLE:
 * Main: "Nature"
 * Sub: "Sky", "Water", "Earth"
 * Sub-sub: "Light", "Stars", "Clouds"
 * 
 * CROSS-PRODUCT LOGIC:
 * If you select:
 * - Main: "Nature", "Emotion"
 * - Sub: "Sky", "Water"
 * 
 * It generates: "Nature > Sky", "Nature > Water", "Emotion > Sky", "Emotion > Water"
 * 
 * This allows powerful filtering combinations with simple selections.
 * 
 * USAGE:
 * Used in PairedNameGenerator's filter controls to allow selecting meaning categories
 * for both first names and surnames independently.
 */

import { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { useCategoryStorage } from "@/hooks/useCategoryStorage";

/**
 * SeparatedCategorySelectorProps Interface
 * 
 * @param allCategories - All available hierarchical category paths from the database
 * @param selectedCategories - Currently selected category paths (output)
 * @param onSelectionChange - Callback when selection changes
 */
interface SeparatedCategorySelectorProps {
  allCategories: string[]; // All hierarchical category paths like "Cat > Sub > Subsub"
  selectedCategories: string[];
  onSelectionChange: (categories: string[]) => void;
}

/**
 * SeparatedCategorySelector Component
 * Main component function
 */

export const SeparatedCategorySelector = ({
  allCategories,
  selectedCategories,
  onSelectionChange,
}: SeparatedCategorySelectorProps) => {
  const { addCategory } = useCategoryStorage();
  const [mainSearch, setMainSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [subsubSearch, setSubsubSearch] = useState("");
  const [selectedMain, setSelectedMain] = useState<string[]>([]);
  const [selectedSub, setSelectedSub] = useState<string[]>([]);

  // Initialize selected main and sub categories from selectedCategories prop
  useEffect(() => {
    const mains = new Set<string>();
    const subs = new Set<string>();
    
    selectedCategories.forEach(cat => {
      const parts = cat.split(' > ');
      if (parts.length >= 1) {
        mains.add(parts[0]);
      }
      if (parts.length >= 2) {
        subs.add(parts[1]);
      }
    });
    
    setSelectedMain(Array.from(mains));
    setSelectedSub(Array.from(subs));
  }, [selectedCategories]);

  // Parse hierarchical categories into separate levels
  const categoryStructure = useMemo(() => {
    const structure = new Map<string, Map<string, Set<string>>>();
    
    allCategories.forEach(path => {
      const parts = path.split(' > ');
      const main = parts[0];
      
      if (!structure.has(main)) {
        structure.set(main, new Map());
      }
      
      if (parts.length > 1) {
        const sub = parts[1];
        const mainMap = structure.get(main)!;
        
        if (!mainMap.has(sub)) {
          mainMap.set(sub, new Set());
        }
        
        if (parts.length > 2) {
          const subsub = parts[2];
          mainMap.get(sub)!.add(subsub);
        }
      }
    });
    
    return structure;
  }, [allCategories]);

  const mainCategories = useMemo(() => 
    Array.from(categoryStructure.keys())
      .filter(cat => cat.toLowerCase().includes(mainSearch.toLowerCase()))
      .sort(),
    [categoryStructure, mainSearch]
  );

  const subCategories = useMemo(() => {
    if (selectedMain.length === 0) return [];
    
    const subs = new Set<string>();
    selectedMain.forEach(main => {
      const mainMap = categoryStructure.get(main);
      if (mainMap) {
        mainMap.forEach((_, sub) => subs.add(sub));
      }
    });
    
    return Array.from(subs)
      .filter(cat => cat.toLowerCase().includes(subSearch.toLowerCase()))
      .sort();
  }, [categoryStructure, selectedMain, subSearch]);

  const subsubCategories = useMemo(() => {
    if (selectedMain.length === 0 || selectedSub.length === 0) return [];
    
    const subsubs = new Set<string>();
    selectedMain.forEach(main => {
      const mainMap = categoryStructure.get(main);
      if (mainMap) {
        selectedSub.forEach(sub => {
          const subSet = mainMap.get(sub);
          if (subSet) {
            subSet.forEach(subsub => subsubs.add(subsub));
          }
        });
      }
    });
    
    return Array.from(subsubs)
      .filter(cat => cat.toLowerCase().includes(subsubSearch.toLowerCase()))
      .sort();
  }, [categoryStructure, selectedMain, selectedSub, subsubSearch]);

  const handleMainToggle = (main: string, checked: boolean) => {
    const newSelectedMain = checked 
      ? [...selectedMain, main]
      : selectedMain.filter(m => m !== main);
    
    setSelectedMain(newSelectedMain);
    
    if (checked) {
      // Save to stored categories and add to selectedCategories if it's not already there
      addCategory(main);
      if (!selectedCategories.includes(main)) {
        onSelectionChange([...selectedCategories, main]);
      }
    } else {
      // If unchecking, clear this main category and all subcategories under it
      const newSelected = selectedCategories.filter(cat => cat !== main && !cat.startsWith(main + ' > '));
      onSelectionChange(newSelected);
    }
  };

  const handleSubToggle = (sub: string, checked: boolean) => {
    const newSelectedSub = checked
      ? [...selectedSub, sub]
      : selectedSub.filter(s => s !== sub);
    
    setSelectedSub(newSelectedSub);
    
    if (checked) {
      // Save to stored categories and add the subcategory paths for all selected main categories
      const pathsToAdd: string[] = [];
      selectedMain.forEach(main => {
        const path = `${main} > ${sub}`;
        addCategory(path); // Save to storage
        if (allCategories.includes(path) && !selectedCategories.includes(path)) {
          pathsToAdd.push(path);
        }
      });
      if (pathsToAdd.length > 0) {
        onSelectionChange([...selectedCategories, ...pathsToAdd]);
      }
    } else {
      // If unchecking, clear subsubcategories for this subcategory
      selectedMain.forEach(main => {
        const prefix = `${main} > ${sub}`;
        const newSelected = selectedCategories.filter(cat => cat !== prefix && !cat.startsWith(prefix + ' > '));
        onSelectionChange(newSelected);
      });
    }
  };

  const handleSubsubToggle = (subsub: string, checked: boolean) => {
    const newPaths: string[] = [];
    
    selectedMain.forEach(main => {
      selectedSub.forEach(sub => {
        const path = `${main} > ${sub} > ${subsub}`;
        if (checked && allCategories.includes(path)) {
          newPaths.push(path);
        }
      });
    });
    
    if (checked) {
      // Save to stored categories
      newPaths.forEach(path => addCategory(path));
      onSelectionChange([...selectedCategories, ...newPaths.filter(p => !selectedCategories.includes(p))]);
    } else {
      const pathsToRemove = new Set(newPaths);
      onSelectionChange(selectedCategories.filter(cat => !pathsToRemove.has(cat)));
    }
  };

  const isSubsubSelected = (subsub: string) => {
    return selectedMain.some(main =>
      selectedSub.some(sub =>
        selectedCategories.includes(`${main} > ${sub} > ${subsub}`)
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Categories */}
        <div>
          <Label>Main Categories</Label>
          <Input
            placeholder="Search main categories..."
            value={mainSearch}
            onChange={(e) => setMainSearch(e.target.value)}
            className="mb-2"
          />
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {mainCategories.map(cat => (
              <div key={cat} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                <Checkbox
                  checked={selectedMain.includes(cat) || selectedCategories.includes(cat)}
                  onCheckedChange={(checked) => handleMainToggle(cat, !!checked)}
                />
                <label className="text-sm cursor-pointer flex-1">{cat}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Subcategories */}
        <div>
          <Label>Subcategories</Label>
          <Input
            placeholder="Search subcategories..."
            value={subSearch}
            onChange={(e) => setSubSearch(e.target.value)}
            className="mb-2"
            disabled={selectedMain.length === 0}
          />
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {subCategories.map(cat => {
              // Check if any main category + this sub exists in selectedCategories
              const isChecked = selectedSub.includes(cat) || 
                selectedMain.some(main => selectedCategories.includes(`${main} > ${cat}`));
              
              return (
                <div key={cat} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => handleSubToggle(cat, !!checked)}
                  />
                  <label className="text-sm cursor-pointer flex-1">{cat}</label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subsubcategories */}
        <div>
          <Label>Sub-subcategories</Label>
          <Input
            placeholder="Search sub-subcategories..."
            value={subsubSearch}
            onChange={(e) => setSubsubSearch(e.target.value)}
            className="mb-2"
            disabled={selectedSub.length === 0}
          />
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {subsubCategories.map(cat => (
              <div key={cat} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                <Checkbox
                  checked={isSubsubSelected(cat)}
                  onCheckedChange={(checked) => handleSubsubToggle(cat, !!checked)}
                />
                <label className="text-sm cursor-pointer flex-1">{cat}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected badges */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map(cat => (
            <Badge
              key={cat}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onSelectionChange(selectedCategories.filter(c => c !== cat))}
            >
              {cat} <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
