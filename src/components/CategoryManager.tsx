/**
 * ========================================
 * CATEGORY MANAGER COMPONENT
 * ========================================
 * 
 * This component provides a comprehensive interface for managing the hierarchical
 * category system used to classify names by meaning.
 * 
 * KEY FEATURES:
 * - 3-level hierarchical categories (Main > Sub > Sub-sub)
 * - Add, rename, and delete categories at any level
 * - Shows count of names using each category (UNIQUE names only)
 * - Click category to search for names using it
 * - Persists empty categories for future use
 * - Updates all affected names when categories change
 * 
 * CATEGORY HIERARCHY EXAMPLE:
 * Nature (15 names)
 *   ├─ Sky (8 names)
 *   │   ├─ Light (3 names)
 *   │   └─ Stars (5 names)
 *   └─ Water (7 names)
 * 
 * NAME COUNTING LOGIC:
 * Uses Set to count UNIQUE names only. If "Nature > Sky > Light" and
 * "Nature > Sky > Stars" both apply to the same name, "Nature > Sky"
 * counts that name once, not twice.
 */

import { useState, useMemo } from "react";
import { Name } from "@/hooks/useNameStorage";
import { useCategoryStorage } from "@/hooks/useCategoryStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil } from "lucide-react";

interface CategoryManagerProps {
  names: Name[];                                    // All names in database
  onUpdateNames: (names: Name[]) => void;           // Callback to update names after category changes
  onSearchByCategory?: (category: string) => void;  // Callback to search names by category
}

export const CategoryManager = ({ names, onUpdateNames, onSearchByCategory }: CategoryManagerProps) => {
  const { categories: storedCategories, addCategory: addStoredCategory, deleteCategory: deleteStoredCategory, renameCategory: renameStoredCategory } = useCategoryStorage();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Extract all categories (both from names and stored) and their 3-level hierarchy with UNIQUE NAME COUNTS
  const categoryHierarchy = useMemo(() => {
    const hierarchy = new Map<string, { 
      nameIds: Set<string>; 
      subcategories: Map<string, { nameIds: Set<string>; subsubcategories: Map<string, Set<string>> }> 
    }>();
    
    // First, process all stored categories to ensure they exist in the hierarchy
    storedCategories.forEach(stored => {
      const parts = stored.path.split(' > ');
      const mainCat = parts[0];
      
      if (!hierarchy.has(mainCat)) {
        hierarchy.set(mainCat, { nameIds: new Set(), subcategories: new Map() });
      }
      
      const mainData = hierarchy.get(mainCat)!;
      
      if (parts.length > 1) {
        const subCat = parts[1];
        if (!mainData.subcategories.has(subCat)) {
          mainData.subcategories.set(subCat, { nameIds: new Set(), subsubcategories: new Map() });
        }
        const subData = mainData.subcategories.get(subCat)!;
        
        if (parts.length > 2) {
          const subsubCat = parts[2];
          if (!subData.subsubcategories.has(subsubCat)) {
            subData.subsubcategories.set(subsubCat, new Set());
          }
        }
      }
    });
    
    // Then, process all categories from names and count which names use them
    names.forEach(name => {
      (name.meanings || []).forEach(meaning => {
        const parts = meaning.split(' > ');
        const mainCat = parts[0];
        
        if (!hierarchy.has(mainCat)) {
          hierarchy.set(mainCat, { nameIds: new Set(), subcategories: new Map() });
        }
        
        const mainData = hierarchy.get(mainCat)!;
        mainData.nameIds.add(name.id);
        
        if (parts.length > 1) {
          const subCat = parts[1];
          if (!mainData.subcategories.has(subCat)) {
            mainData.subcategories.set(subCat, { nameIds: new Set(), subsubcategories: new Map() });
          }
          const subData = mainData.subcategories.get(subCat)!;
          subData.nameIds.add(name.id);
          
          if (parts.length > 2) {
            const subsubCat = parts[2];
            if (!subData.subsubcategories.has(subsubCat)) {
              subData.subsubcategories.set(subsubCat, new Set());
            }
            subData.subsubcategories.get(subsubCat)!.add(name.id);
          }
        }
      });
    });
    
    return Array.from(hierarchy.entries())
      .map(([category, data]) => ({
        category,
        count: data.nameIds.size,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, subData]) => ({
            name: subName,
            count: subData.nameIds.size,
            subsubcategories: Array.from(subData.subsubcategories.entries())
              .map(([subsubName, ids]) => ({ name: subsubName, count: ids.size }))
              .sort((a, b) => a.name.localeCompare(b.name))
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [names, storedCategories]);

  const filteredCategories = categoryHierarchy.filter(cat =>
    cat.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.subcategories.some(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ============================================================================
  // CATEGORY MODIFICATION FUNCTIONS
  // ============================================================================
  
  /**
   * renameCategory - Rename a category at any level
   * 
   * CASCADING UPDATE LOGIC:
   * When renaming "Nature > Sky" to "Nature > Atmosphere":
   * 1. Updates stored category: "Nature > Sky" → "Nature > Atmosphere"
   * 2. Updates all names using it:
   *    - "Nature > Sky" → "Nature > Atmosphere"
   *    - "Nature > Sky > Stars" → "Nature > Atmosphere > Stars"
   * 
   * This ensures all child categories and name references stay in sync.
   * 
   * @param oldPath - Current full path (e.g., "Nature > Sky")
   * @param newName - New full path (e.g., "Nature > Atmosphere")
   */
  const renameCategory = (oldPath: string, newName: string) => {
    if (!newName.trim() || oldPath === newName) {
      setEditingCategory(null);
      return;
    }
    
    // Update stored categories
    renameStoredCategory(oldPath, newName);
    
    // Update names that use this category
    const updatedNames = names.map(name => {
      if (!name.meanings) return name;
      
      const updatedMeanings = name.meanings.map(meaning => {
        // Exact match or starts with the path
        if (meaning === oldPath) {
          return newName;
        }
        if (meaning.startsWith(oldPath + ' > ')) {
          return meaning.replace(oldPath, newName);
        }
        return meaning;
      });
      
      return { ...name, meanings: updatedMeanings };
    });
    
    onUpdateNames(updatedNames);
    setEditingCategory(null);
  };

  /**
   * deleteCategory - Delete a category and all its children
   * 
   * CASCADING DELETE LOGIC:
   * When deleting "Nature > Sky":
   * 1. Deletes from stored categories
   * 2. Removes from ALL names that use it:
   *    - Removes "Nature > Sky"
   *    - Removes "Nature > Sky > Stars"
   *    - Removes "Nature > Sky > Light"
   * 
   * User is prompted for confirmation before deletion.
   * 
   * @param categoryPath - Full path to delete (e.g., "Nature > Sky")
   */
  const deleteCategory = (categoryPath: string) => {
    if (!confirm(`Delete category "${categoryPath}"?`)) return;
    
    // Delete from stored categories
    deleteStoredCategory(categoryPath);
    
    // Update names that use this category
    const updatedNames = names.map(name => {
      if (!name.meanings) return name;
      
      const updatedMeanings = name.meanings.filter(
        meaning => meaning !== categoryPath && !meaning.startsWith(categoryPath + ' > ')
      );
      
      return { ...name, meanings: updatedMeanings };
    });
    
    onUpdateNames(updatedNames);
  };

  // ============================================================================
  // STATE FOR ADDING NEW CATEGORIES
  // ============================================================================
  
  /**
   * addingSubcategory: Which main category is currently adding a sub
   *   - null: Nothing being added
   *   - "__NEW_MAIN__": Adding a new main (top-level) category
   *   - "Nature": Adding a sub under "Nature"
   * 
   * addingSubsubcategory: Which sub is currently adding a sub-sub
   *   - null: Nothing being added
   *   - "Nature > Sky": Adding a sub-sub under "Nature > Sky"
   */
  const [addingSubcategory, setAddingSubcategory] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [addingSubsubcategory, setAddingSubsubcategory] = useState<string | null>(null);
  const [newSubsubcategoryName, setNewSubsubcategoryName] = useState("");

  /**
   * addSubcategory - Add a new subcategory under a main category
   * 
   * EXAMPLE:
   * addSubcategory("Nature", "Mountains")
   * Creates: "Nature > Mountains"
   * 
   * Added to stored categories so it persists even if no names use it yet.
   * 
   * @param mainCategory - Parent category name
   * @param subcategoryName - New subcategory name
   */
  const addSubcategory = (mainCategory: string, subcategoryName: string) => {
    if (!subcategoryName.trim()) return;
    
    const newPath = `${mainCategory} > ${subcategoryName.trim()}`;
    
    // Add to stored categories so it persists
    addStoredCategory(newPath);
    
    setAddingSubcategory(null);
    setNewSubcategoryName("");
  };

  /**
   * addSubsubcategory - Add a new sub-subcategory under a subcategory
   * 
   * EXAMPLE:
   * addSubsubcategory("Nature", "Sky", "Clouds")
   * Creates: "Nature > Sky > Clouds"
   * 
   * @param mainCategory - Top-level category
   * @param subcategory - Second-level category
   * @param subsubcategoryName - New third-level category name
   */
  const addSubsubcategory = (mainCategory: string, subcategory: string, subsubcategoryName: string) => {
    if (!subsubcategoryName.trim()) return;
    
    const newPath = `${mainCategory} > ${subcategory} > ${subsubcategoryName.trim()}`;
    
    // Add to stored categories so it persists
    addStoredCategory(newPath);
    
    setAddingSubsubcategory(null);
    setNewSubsubcategoryName("");
  };

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================
  
  return (
    <div className="space-y-6">
      {/* ================================================================
          HEADER & SEARCH SECTION
          ================================================================ */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Category Management</h2>
        
        {/* Search and "Add Main Category" section */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          
          {/* Add Main Category UI */}
          <div className="flex gap-2">
            <Input
              placeholder="Add new main category..."
              value={addingSubcategory === '__NEW_MAIN__' ? newSubcategoryName : ''}
              onChange={(e) => setNewSubcategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSubcategoryName.trim()) {
                  addStoredCategory(newSubcategoryName.trim());
                  setNewSubcategoryName('');
                  setAddingSubcategory(null);
                }
                if (e.key === 'Escape') {
                  setAddingSubcategory(null);
                  setNewSubcategoryName('');
                }
              }}
              className={addingSubcategory === '__NEW_MAIN__' ? '' : 'hidden'}
            />
            <Button
              onClick={() => {
                if (addingSubcategory === '__NEW_MAIN__') {
                  if (newSubcategoryName.trim()) {
                    addStoredCategory(newSubcategoryName.trim());
                    setNewSubcategoryName('');
                  }
                  setAddingSubcategory(null);
                } else {
                  setAddingSubcategory('__NEW_MAIN__');
                  setNewSubcategoryName('');
                }
              }}
              variant={addingSubcategory === '__NEW_MAIN__' ? 'default' : 'outline'}
            >
              <Plus className="mr-1 h-4 w-4" />
              {addingSubcategory === '__NEW_MAIN__' ? 'Add' : 'Add Main Category'}
            </Button>
            {addingSubcategory === '__NEW_MAIN__' && (
              <Button
                variant="outline"
                onClick={() => {
                  setAddingSubcategory(null);
                  setNewSubcategoryName('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          CATEGORY GRID - Main categories displayed as cards
          ================================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map(({ category, count, subcategories }) => (
          <Card key={category} className="hover:shadow-lg transition-all max-h-[500px] flex flex-col">
            {/* MAIN CATEGORY HEADER */}
            <CardHeader className="flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Editing mode for category name */}
                  {editingCategory === category ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameCategory(category, editValue);
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                        className="font-semibold"
                      />
                      <Button size="sm" onClick={() => renameCategory(category, editValue)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Clickable category title to search names */}
                      <CardTitle 
                        className="text-lg cursor-pointer hover:text-primary"
                        onClick={() => onSearchByCategory?.(category)}
                      >
                        {category}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {/* Badge showing unique name count */}
                        <Badge variant="secondary" className="text-xs">{count} names</Badge>
                        {/* Button to add subcategory */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-xs"
                          onClick={() => {
                            setAddingSubcategory(category);
                            setNewSubcategoryName("");
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Subcategory
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Edit and Delete buttons */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingCategory(category);
                      setEditValue(category);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCategory(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Input for adding new subcategory */}
              {addingSubcategory === category && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="New subcategory..."
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addSubcategory(category, newSubcategoryName);
                      if (e.key === 'Escape') setAddingSubcategory(null);
                    }}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={() => addSubcategory(category, newSubcategoryName)}>Add</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingSubcategory(null)}>Cancel</Button>
                </div>
              )}
            </CardHeader>
            
            {/* SUBCATEGORIES LIST (if any) */}
            {subcategories.length > 0 && (
              <CardContent className="space-y-2 overflow-y-auto flex-1">
                {subcategories.map((sub) => (
                  <div key={sub.name} className="border-l-2 border-primary/30 pl-3 space-y-1">
                    {/* SUBCATEGORY ROW */}
                    <div className="flex items-center justify-between">
                      {editingCategory === (category + ' > ' + sub.name) ? (
                        /* Editing subcategory name */
                        <div className="flex gap-1 flex-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameCategory(category + ' > ' + sub.name, category + ' > ' + editValue);
                              if (e.key === 'Escape') setEditingCategory(null);
                            }}
                            className="text-sm h-7"
                          />
                          <Button size="sm" className="h-7 text-xs" onClick={() => renameCategory(category + ' > ' + sub.name, category + ' > ' + editValue)}>Save</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingCategory(null)}>✕</Button>
                        </div>
                      ) : (
                        /* Normal view with clickable name and actions */
                        <>
                          <span 
                            className="font-medium cursor-pointer hover:text-primary text-sm"
                            onClick={() => onSearchByCategory?.(category + ' > ' + sub.name)}
                          >
                            {sub.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">{sub.count}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-xs px-1"
                              onClick={() => {
                                setAddingSubsubcategory(category + ' > ' + sub.name);
                                setNewSubsubcategoryName("");
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Sub
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCategory(category + ' > ' + sub.name);
                                setEditValue(sub.name);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCategory(category + ' > ' + sub.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Input for adding new sub-subcategory */}
                    {addingSubsubcategory === (category + ' > ' + sub.name) && (
                      <div className="flex gap-1 pl-2">
                        <Input
                          placeholder="New sub-sub..."
                          value={newSubsubcategoryName}
                          onChange={(e) => setNewSubsubcategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addSubsubcategory(category, sub.name, newSubsubcategoryName);
                            if (e.key === 'Escape') setAddingSubsubcategory(null);
                          }}
                          className="text-xs h-7"
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={() => addSubsubcategory(category, sub.name, newSubsubcategoryName)}>Add</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingSubsubcategory(null)}>✕</Button>
                      </div>
                    )}

                    {/* SUB-SUBCATEGORIES LIST (if any) */}
                    {sub.subsubcategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-2">
                        {sub.subsubcategories.map((subsub) => (
                          <div key={subsub.name} className="group">
                            {editingCategory === (category + ' > ' + sub.name + ' > ' + subsub.name) ? (
                              /* Editing sub-subcategory */
                              <div className="flex gap-1 items-center">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') renameCategory(category + ' > ' + sub.name + ' > ' + subsub.name, category + ' > ' + sub.name + ' > ' + editValue);
                                    if (e.key === 'Escape') setEditingCategory(null);
                                  }}
                                  className="text-xs h-6 w-24"
                                />
                                <Button size="sm" className="h-6 text-xs px-2" onClick={() => renameCategory(category + ' > ' + sub.name + ' > ' + subsub.name, category + ' > ' + sub.name + ' > ' + editValue)}>Save</Button>
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setEditingCategory(null)}>Cancel</Button>
                              </div>
                            ) : (
                              /* Normal badge with hover actions */
                              <div className="flex items-center gap-1">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
                                  onClick={() => onSearchByCategory?.(category + ' > ' + sub.name + ' > ' + subsub.name)}
                                >
                                  {subsub.name} ({subsub.count})
                                </Badge>
                                {/* Edit/Delete buttons appear on hover */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCategory(category + ' > ' + sub.name + ' > ' + subsub.name);
                                      setEditValue(subsub.name);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteCategory(category + ' > ' + sub.name + ' > ' + subsub.name);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Empty state when search has no results */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No categories found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
};
