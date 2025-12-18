/**
 * ============================================================================
 * CATEGORY STORAGE HOOK - useCategoryStorage
 * ============================================================================
 * 
 * PURPOSE:
 * Manages the list of categories for autocomplete suggestions when adding names.
 * 
 * HOW IT WORKS:
 * - Loads categories from server or localStorage on mount
 * - Saves new categories when users create them
 * - Supports hierarchical categories (e.g., "Nature > Botanical > Flowers")
 * - Auto-syncs with server in background (same pattern as useNameStorage)
 * 
 * CATEGORY FORMAT:
 * Categories use " > " as separator for hierarchy:
 * "Nature Names > Botanical Names > Flowers > Rose"
 * This creates a tree structure for better organization.
 */

import { useState, useEffect } from 'react';

/**
 * StoredCategory: A saved category for autocomplete
 */
export interface StoredCategory {
  id: string;              // Unique identifier
  path: string;           // Hierarchical category path (e.g., "Nature Names > Botanical Names > Flowers")
  createdAt: string;      // Timestamp when category was created
}

// localStorage key where categories are saved on this device
const STORAGE_KEY = 'loreweaver-categories';

// Custom event name for cross-component updates
const CATEGORY_UPDATE_EVENT = 'loreweaver-categories-updated';

/**
 * dispatchCategoryUpdate: Notifies other components that categories changed
 * 
 * WHY NEEDED?
 * Multiple components might display category autocomplete at the same time.
 * When one component adds a category, others need to know to refresh their lists.
 * 
 * HOW IT WORKS:
 * Dispatches a custom browser event that other components listen for.
 */
const dispatchCategoryUpdate = () => {
  window.dispatchEvent(new CustomEvent(CATEGORY_UPDATE_EVENT));
};

/**
 * useCategoryStorage: Hook for managing category data
 * 
 * RETURNS:
 * - categories: Array of all saved categories
 * - addCategory: Function to add a new category
 * - deleteCategory: Function to remove a category
 * - renameCategory: Function to rename a category
 */
export const useCategoryStorage = () => {
  // Current list of categories
  const [categories, setCategories] = useState<StoredCategory[]>([]);
  
  // Is server available for syncing?
  const [serverAvailable, setServerAvailable] = useState(false);

  // Server URL (if using external server)
  const serverBase = import.meta.env.VITE_SERVER_BASE || '';

  /**
   * loadFromLocalStorage: Loads categories from browser storage
   * 
   * WHEN CALLED:
   * - On component mount (as fallback if server unavailable)
   * - When receiving category update events from other components
   */
  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error('Failed to parse categories:', err);
      }
    }
  };

  // ============================================================================
  // INITIAL DATA LOADING
  // ============================================================================
  
  /**
   * On mount: Try to load from server first, fallback to localStorage
   * Also set up event listener for updates from other components
   */
  useEffect(() => {
    const checkServer = async () => {
      const url = serverBase ? `${serverBase.replace(/\/$/, '')}/api/categories` : '/api/categories';
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : []);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setServerAvailable(true);
          console.log('Loaded categories from server:', data.length);
          dispatchCategoryUpdate();
          return;
        }
      } catch (err) {
        console.warn('Server not available for categories, using localStorage');
      }
      
      // Fallback to localStorage
      loadFromLocalStorage();
      setServerAvailable(false);
    };
    
    checkServer();

    // Listen for category updates from other components
    const handleCategoryUpdate = () => {
      loadFromLocalStorage();
    };

    window.addEventListener(CATEGORY_UPDATE_EVENT, handleCategoryUpdate);

    // Cleanup on unmount
    return () => {
      window.removeEventListener(CATEGORY_UPDATE_EVENT, handleCategoryUpdate);
    };
  }, [serverBase]);

  // ============================================================================
  // SAVE FUNCTION (internal)
  // ============================================================================
  
  /**
   * saveCategories: Saves to localStorage and attempts server sync
   * 
   * SIMILAR TO useNameStorage, but for categories:
   * 1. Updates React state
   * 2. Saves to localStorage
   * 3. Notifies other components
   * 4. Attempts server sync (best effort, no retry queue)
   */
  const saveCategories = (newCategories: StoredCategory[]) => {
    console.log('Saving categories, total count:', newCategories.length);
    setCategories(newCategories);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCategories));
    
    // Notify other components
    dispatchCategoryUpdate();
    
    // Try to POST to server (best effort, fire-and-forget)
    const tryPost = async () => {
      const url = serverBase ? `${serverBase.replace(/\/$/, '')}/api/categories` : '/api/categories';
      try {
        console.log('Posting categories to server:', url);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCategories),
        });
        if (res.ok) {
          console.log('Successfully saved categories to server');
          setServerAvailable(true);
        } else {
          console.warn('Failed to save categories to server, status:', res.status);
          setServerAvailable(false);
        }
      } catch (err) {
        console.warn('Failed to save categories to server, error:', err);
        setServerAvailable(false);
      }
    };

    tryPost();
  };

  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================
  
  /**
   * addCategory: Creates a new category
   * 
   * PARAMETERS:
   * - path: Hierarchical category path (e.g., "Nature Names > Flowers > Rose")
   * 
   * DUPLICATE PREVENTION:
   * If category already exists, does nothing
   * 
   * ID GENERATION:
   * Uses timestamp + random string for unique ID
   * 
   * EXAMPLE:
   * addCategory("Celestial Names > Moon Names");
   * // Creates new category with auto-generated ID and timestamp
   */
  const addCategory = (path: string) => {
    const trimmed = path.trim();
    
    // Don't add if empty or already exists
    if (!trimmed || categories.some(c => c.path === trimmed)) return;
    
    const newCategory: StoredCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path: trimmed,
      createdAt: new Date().toISOString(),
    };
    
    console.log('Adding category:', trimmed);
    saveCategories([...categories, newCategory]);
  };

  /**
   * deleteCategory: Removes a category and all its subcategories
   * 
   * WHAT IT DOES:
   * Removes the specified category AND any categories that start with it
   * 
   * WHY?
   * If you delete "Nature Names", you probably want to delete
   * "Nature Names > Botanical Names" and all other subcategories too.
   * 
   * EXAMPLES:
   * deleteCategory("Nature Names");
   * // Removes:
   * // - "Nature Names"
   * // - "Nature Names > Botanical Names"
   * // - "Nature Names > Botanical Names > Flowers"
   * // - etc.
   * 
   * deleteCategory("Nature Names > Flowers");
   * // Removes only:
   * // - "Nature Names > Flowers"
   * // - "Nature Names > Flowers > Rose"
   * // Does NOT remove "Nature Names" or "Nature Names > Botanical Names"
   */
  const deleteCategory = (path: string) => {
    console.log('Deleting category:', path);
    saveCategories(
      categories.filter(c => 
        c.path !== path &&                    // Not exact match
        !c.path.startsWith(path + ' > ')      // Not a subcategory
      )
    );
  };

  /**
   * renameCategory: Changes a category path and updates all subcategories
   * 
   * WHAT IT DOES:
   * 1. Renames the specified category
   * 2. Updates all subcategories to use the new parent path
   * 
   * WHY NEEDED?
   * If you rename "Nature Names" to "Natural Names", you want:
   * - "Nature Names > Flowers" to become "Natural Names > Flowers"
   * - "Nature Names > Botanical > Trees" to become "Natural Names > Botanical > Trees"
   * - etc.
   * 
   * EXAMPLES:
   * renameCategory("Nature Names", "Natural Names");
   * // Before:
   * // - "Nature Names"
   * // - "Nature Names > Botanical Names"
   * // - "Nature Names > Botanical Names > Flowers"
   * // After:
   * // - "Natural Names"
   * // - "Natural Names > Botanical Names"
   * // - "Natural Names > Botanical Names > Flowers"
   * 
   * renameCategory("Nature > Flowers", "Nature > Floral");
   * // Changes "Nature > Flowers" to "Nature > Floral"
   * // Changes "Nature > Flowers > Rose" to "Nature > Floral > Rose"
   * // Does NOT change "Nature > Trees"
   */
  const renameCategory = (oldPath: string, newPath: string) => {
    const trimmed = newPath.trim();
    
    // Don't rename if new path is empty or same as old
    if (!trimmed || oldPath === trimmed) return;
    
    console.log('Renaming category from', oldPath, 'to', trimmed);
    saveCategories(
      categories.map(c => {
        if (c.path === oldPath) {
          // Exact match: rename this category
          return { ...c, path: trimmed };
        }
        if (c.path.startsWith(oldPath + ' > ')) {
          // Subcategory: update parent reference
          return { ...c, path: c.path.replace(oldPath, trimmed) };
        }
        // Unrelated category: keep as-is
        return c;
      })
    );
  };

  return {
    categories,
    addCategory,
    deleteCategory,
    renameCategory,
  };
};