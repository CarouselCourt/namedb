/**
 * ============================================================================
 * NAME STORAGE HOOK - useNameStorage
 * ============================================================================
 * 
 * PURPOSE:
 * This hook manages all name data in the application. It handles:
 * - Loading names from localStorage or server
 * - Saving changes to both localStorage AND server (auto-sync)
 * - CRUD operations (Create, Read, Update, Delete)
 * - Import/Export functionality
 * - Retry logic for failed server syncs
 * 
 * DATA FLOW:
 * 1. On mount: Try to fetch from server → If fails, load from localStorage
 * 2. On changes: Save to localStorage immediately → Try to sync to server in background
 * 3. If server fails: Queue changes in "pending" localStorage → Retry every 5 seconds
 * 
 * WHY THIS APPROACH?
 * - localStorage = instant, always works, but only on this device
 * - Server = persistent, accessible from anywhere, but might be offline
 * - Combining both gives the best of both worlds!
 */

import { useState, useEffect } from 'react';

/**
 * ============================================================================
 * RELATED NAME INTERFACE
 * ============================================================================
 * 
 * Defines a name that is related to the primary name entry through various
 * linguistic, cultural, or morphological relationships.
 */
export interface RelatedName {
  type: 'alternateSpelling' | 'diminutive' | 'masculineForm' | 'feminineForm' | 'neutralForm' | 'otherLanguage' | 'fullForm';
  name: string;
  pronunciation?: string;
  script?: string;
  etymology?: string;
  notes?: string;
  gender?: 'masculine' | 'feminine' | 'neutral' | 'any';
  alternateOrigin?: string; // For otherLanguage type - single origin that replaces the origin on the card
  feelings?: string[]; // Alternative feelings specific to this related name form
}

/**
 * Name: The complete data structure for a name entry
 * 
 * CORE FIELDS:
 * - id: Unique identifier (auto-generated)
 * - name: The actual name string (e.g., "Sarah", "김민준")
 * - meanings: Hierarchical categories (e.g., ["Nature > Flowers > Rose"])
 * - meaning: Literal translation (e.g., "moon", "wisdom")
 * - origin: Geographic/linguistic origins (e.g., ["Greek > Ancient Greek"])
 * 
 * EXTENDED FIELDS (for detailed etymology):
 * - roots: Etymological components (e.g., ["Greek: philos (love)"])
 * - etymology: Full historical description
 * - pronunciation: IPA notation (e.g., "/ˈsɛrə/")
 * 
 * RELATIONSHIP FIELDS:
 * - relatedNames: Array of related name forms with their relationship types
 * 
 * STATUS TRACKING:
 * - status: 'available' | 'blocked' | 'used'
 * - usedIn: Where this name was used (if status = 'used')
 * - blockedReason: Why it's blocked (if status = 'blocked')
 */
export interface Name {
  id: string;
  name: string;
  nameType: 'firstName' | 'surname' | 'either';
  script?: string;
  meanings: string[]; // hierarchical categories like "Types of Animals > Types of Birds"
  meaning?: string; // full literal meaning / translation (single string)
  etymology?: string;
  pronunciation?: string;
  origin?: string[];
  gender?: 'masculine' | 'feminine' | 'neutral' | 'any';
  feelings: string[];
  notes?: string;
  // Extended relationship fields
  roots?: string[]; // etymological roots
  relatedNames?: RelatedName[]; // unified related names with relationship types
  // availability status: 'available' (default), 'blocked' (with reason), or 'used' (with usedIn link)
  status?: 'available' | 'blocked' | 'used';
  blockedReason?: string;
  usedIn?: string;
  createdAt: string;
}

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

// localStorage key where we save names on this device
const STORAGE_KEY = 'loreweaver-names';

/**
 * useNameStorage: Main hook for managing name data
 * 
 * RETURNS:
 * - names: Current list of all names
 * - addName: Function to add a new name
 * - updateName: Function to update an existing name
 * - deleteName: Function to delete a name
 * - setStatus: Function to change availability status
 * - toggleUsed: Legacy function to toggle used status
 * - exportNames: Export all names as JSON string
 * - importNames: Import names from JSON
 * - mergeNameEntries: Merge two duplicate name entries
 * - bulkUpdateNames: Update multiple names at once
 */
export const useNameStorage = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // The main list of names (this is what gets displayed in the UI)
  const [names, setNames] = useState<Name[]>([]);
  
  // Is the server available? null = haven't checked yet, true/false = checked
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);

  // Server URL from environment variable (if using external server)
  const serverBase = (import.meta as any).env?.VITE_NAME_SERVER_URL || '';

  // ============================================================================
  // INITIAL DATA LOADING (runs once on component mount)
  // ============================================================================
  
  useEffect(() => {
    // Track if component is still mounted (prevents updating state after unmount)
    let mounted = true;

    /**
     * checkServer: Attempts to load names from server, falls back to localStorage
     * 
     * LOAD STRATEGY:
     * 1. Try to fetch from server API
     * 2. If successful:
     *    - Use server data as source of truth
     *    - Save a copy to localStorage (for offline access)
     * 3. If server fails or is offline:
     *    - Load from localStorage (what was saved last time)
     * 
     * WHY THIS ORDER?
     * Server is the "single source of truth" if available, but localStorage
     * ensures the app still works offline or if server is down.
     */
    const checkServer = async () => {
      try {
        // Build API URL (use environment variable if provided, otherwise relative path)
        const url = serverBase ? `${serverBase.replace(/\/$/, '')}/api/names` : '/api/names';
        
        // Try to fetch from server
        const res = await fetch(url);
        
        // Component was unmounted while waiting for response → abort
        if (!mounted) return;
        
        // Server responded successfully
        if (res.ok) {
          const data = await res.json();
          setServerAvailable(true);
          setNames(Array.isArray(data) ? data : []);
          
          // Save server data to localStorage as backup for offline use
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(data) ? data : []));
          return;
        }
      } catch (err) {
        // Server is not reachable (offline, wrong URL, CORS error, etc.)
        // This is fine - we'll use localStorage instead
      }

      // FALLBACK: Load from localStorage
      // This runs if server fetch failed OR returned non-ok status
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && mounted) {
          setNames(JSON.parse(stored));
        }
      } catch (e) {
        // localStorage data is corrupted or invalid JSON
        console.error('Failed to parse stored names:', e);
        // Leave names as empty array (initial state)
      }

      // Mark server as unavailable
      if (mounted) setServerAvailable(false);
    };

    checkServer();

    // Cleanup: mark component as unmounted
    // This prevents state updates after the component is removed from the page
    return () => { mounted = false; };
  }, []); // Empty dependency array = run once on mount

  // ============================================================================
  // SAVE FUNCTION (internal) - Saves to localStorage + attempts server sync
  // ============================================================================
  
  /**
   * saveNames: Core save function used by all mutation operations
   * 
   * WHAT IT DOES:
   * 1. Sorts names alphabetically (keeps UI consistent)
   * 2. Updates React state (immediate UI update)
   * 3. Saves to localStorage (immediate local backup)
   * 4. Attempts to POST to server (background sync)
   * 5. If server fails, adds to pending queue (will retry later)
   * 
   * WHY THIS APPROACH?
   * - User sees changes instantly (localStorage + state update)
   * - Changes persist even if server is down (localStorage)
   * - Changes eventually sync to server (auto-retry queue)
   * 
   * PENDING QUEUE:
   * When server saves fail, we store the data in "loreweaver-names:pending"
   * A background timer (see next useEffect) retries every 5 seconds until successful.
   */
  const saveNames = (newNames: Name[]) => {
    // Always sort alphabetically by name (case-insensitive, natural number ordering)
    // Example: ["Alice", "Bob", "alice2", "bob1"] → ["Alice", "alice2", "Bob", "bob1"]
    const sortedNames = [...newNames].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    
    // Update React state (this triggers UI re-render with new names)
    setNames(sortedNames);
    
    // Save to localStorage immediately (works even if offline)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedNames));
    
    /**
     * enqueue: Adds current changes to the pending sync queue
     * 
     * WHEN USED:
     * - Server POST fails (network error, server down, etc.)
     * - Server returns non-ok status (500 error, etc.)
     * 
     * HOW IT WORKS:
     * Stores an array of "pending saves" in localStorage under key "loreweaver-names:pending"
     * The background timer will process these one at a time until queue is empty.
     */
    const enqueue = () => {
      try {
        const pendingRaw = localStorage.getItem(STORAGE_KEY + ':pending');
        const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
        pending.push(sortedNames);
        localStorage.setItem(STORAGE_KEY + ':pending', JSON.stringify(pending));
      } catch (e) {
        console.warn('Failed to enqueue pending names', e);
      }
    };

    /**
     * tryPost: Attempts to POST current names to server
     * 
     * SUCCESS: Clears the pending queue (all changes are now on server)
     * FAILURE: Adds to pending queue (will retry in background)
     */
    const tryPost = async () => {
      // Build server API URL
      const url = serverBase ? `${serverBase.replace(/\/$/, '')}/api/names` : '/api/names';
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sortedNames),
        });
        
        if (res.ok) {
          // Success! Server has the latest data
          setServerAvailable(true);
          
          // Clear the pending queue (no need to retry anymore)
          localStorage.removeItem(STORAGE_KEY + ':pending');
        } else {
          // Server returned error status (500, 404, etc.)
          console.warn('Failed to save to server, status:', res.status);
          setServerAvailable(false);
          enqueue(); // Add to pending queue for retry
        }
      } catch (err) {
        // Network error, CORS error, server unreachable, etc.
        console.warn('Failed to save to server, error:', err);
        setServerAvailable(false);
        enqueue(); // Add to pending queue for retry
      }
    };

    // Start the POST attempt (non-blocking, happens in background)
    tryPost();
  };

  // ============================================================================
  // BACKGROUND RETRY LOOP - Syncs pending changes every 5 seconds
  // ============================================================================
  
  /**
   * Auto-retry timer for failed server syncs
   * 
   * HOW IT WORKS:
   * - Every 5 seconds, checks if there's a pending queue in localStorage
   * - If queue exists, tries to POST the first item to server
   * - If successful, removes that item from queue and tries next one
   * - If fails, leaves it in queue and tries again in 5 seconds
   * 
   * WHY NEEDED?
   * If server is temporarily down or user is offline, changes queue up.
   * When connectivity returns, this auto-retries until queue is empty.
   * 
   * USER EXPERIENCE:
   * - User makes changes while offline → saved to localStorage ✓
   * - User reconnects to internet → changes auto-sync to server ✓
   * - No manual "sync" button needed!
   */
  useEffect(() => {
    let mounted = true; // Track if component is still mounted
    
    const interval = setInterval(async () => {
      if (!mounted) return; // Component unmounted, stop processing
      
      // Check if there's a pending sync queue
      const pendingRaw = localStorage.getItem(STORAGE_KEY + ':pending');
      if (!pendingRaw) return; // No pending changes, nothing to do
      
      // Parse the queue (array of Name[] arrays to sync)
      let pending: any[] = [];
      try { 
        pending = JSON.parse(pendingRaw); 
      } catch { 
        // Corrupted pending data, reset to empty
        pending = []; 
      }
      
      if (pending.length === 0) return; // Queue is empty
      
      // Get the first item from queue (FIFO - First In First Out)
      const next = pending[0];
      
      // Build server URL
      const url = serverBase ? `${serverBase.replace(/\/$/, '')}/api/names` : '/api/names';
      
      try {
        // Try to POST to server
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        
        if (res.ok) {
          // Success! Remove this item from queue
          pending.shift(); // Remove first element
          localStorage.setItem(STORAGE_KEY + ':pending', JSON.stringify(pending));
          setServerAvailable(true);
          
          // Next iteration will try the next item in queue (if any)
        } else {
          // Server returned error, leave item in queue to retry later
          setServerAvailable(false);
        }
      } catch (err) {
        // Network error, leave item in queue to retry later
        setServerAvailable(false);
      }
    }, 5000); // Run every 5 seconds

    // Cleanup on unmount
    return () => { 
      mounted = false; 
      clearInterval(interval); 
    };
  }, [serverBase]); // Re-run if server URL changes

  // ============================================================================
  // CRUD OPERATIONS (Create, Read, Update, Delete)
  // ============================================================================
  
  /**
   * addName: Creates a new name entry
   * 
   * PARAMETERS:
   * Takes a Name object WITHOUT id, createdAt, or status (those are auto-generated)
   * 
   * WHAT IT DOES:
   * 1. Generates a unique ID (using crypto.randomUUID())
   * 2. Sets createdAt to current timestamp
   * 3. Sets default status to 'available'
   * 4. Ensures all array fields have default empty arrays
   * 5. Adds to the names list and saves
   * 
   * RETURNS:
   * The complete Name object with generated id and createdAt
   * 
   * EXAMPLE:
   * const sarah = addName({
   *   name: "Sarah",
   *   nameType: "firstName",
   *   meanings: ["Hebrew Names"],
   *   meaning: "princess",
   *   feelings: ["gentle", "classic"]
   * });
   * // sarah.id will be auto-generated UUID
   * // sarah.createdAt will be current timestamp
   * // sarah.status will be 'available'
   */
  const addName = (name: Omit<Name, 'id' | 'createdAt' | 'status'>) => {
    const newName: Name = {
      ...name,
      id: crypto.randomUUID(), // Generate unique ID (e.g., "a3b4c5d6-...")
      createdAt: new Date().toISOString(), // Current timestamp (e.g., "2025-01-15T10:30:00.000Z")
      status: (name as any).status || 'available', // Default to available
      meanings: name.meanings || [], // Default to empty array if not provided
      meaning: (name as any).meaning || (name as any).literalMeaning || undefined, // Support old field name
      feelings: name.feelings || [],
      blockedReason: (name as any).blockedReason || undefined,
      usedIn: (name as any).usedIn || undefined,
      roots: name.roots || [],
      relatedNames: name.relatedNames || [],
    };
    
    console.log('Adding name with categories:', newName.meanings);
    
    // Add to names array and save (this triggers localStorage + server sync)
    saveNames([...names, newName]);
    
    return newName;
  };

  /**
   * updateName: Updates an existing name entry
   * 
   * PARAMETERS:
   * - id: The unique ID of the name to update
   * - updates: Partial Name object with only the fields you want to change
   * 
   * WHAT IT DOES:
   * 1. Finds the name by ID
   * 2. Merges the updates with existing data
   * 3. Preserves array fields (doesn't replace with undefined)
   * 4. Saves the updated list
   * 
   * ARRAY HANDLING:
   * If you don't specify an array field in updates, it keeps the existing array.
   * If you specify an array field, it completely replaces the old array.
   * 
   * EXAMPLES:
   * // Change just the pronunciation
   * updateName("abc123", { pronunciation: "/ˈsærə/" });
   * 
   * // Add a new category (must include ALL categories you want)
   * const name = names.find(n => n.id === "abc123");
   * updateName("abc123", { 
   *   meanings: [...name.meanings, "New Category"] 
   * });
   * 
   * // Change multiple fields at once
   * updateName("abc123", {
   *   meaning: "princess",
   *   etymology: "From Hebrew 'sarah'",
   *   pronunciation: "/ˈsærə/"
   * });
   */
  const updateName = (id: string, updates: Partial<Name>) => {
    const updatedNames = names.map(n => n.id === id ? { 
      ...n,
      ...updates,
      meanings: updates.meanings !== undefined ? updates.meanings : n.meanings,
      feelings: updates.feelings !== undefined ? updates.feelings : n.feelings,
      roots: updates.roots !== undefined ? updates.roots : n.roots,
      relatedNames: updates.relatedNames !== undefined ? updates.relatedNames : n.relatedNames,
    } : n);
    
    console.log('Updating name, categories:', updatedNames.find(n => n.id === id)?.meanings);
    saveNames(updatedNames);
  };

  /**
   * bulkUpdateNames: Updates multiple names at once (more efficient than updating one by one)
   * 
   * PARAMETERS:
   * - updatedNames: Array of complete Name objects with updated data
   * 
   * WHAT IT DOES:
   * 1. Creates a lookup map (ID → Name) for fast searching
   * 2. Goes through existing names and replaces ones that have updates
   * 3. Saves once (instead of saving after each individual update)
   * 
   * WHY USE THIS?
   * If you need to update many names at once (e.g., during import or merge),
   * this is much faster than calling updateName() repeatedly because it only
   * saves to localStorage and syncs to server ONCE instead of N times.
   * 
   * EXAMPLE:
   * // Update 100 names at once
   * const updates = names
   *   .filter(n => n.origin?.includes("Greek"))
   *   .map(n => ({ ...n, feelings: [...n.feelings, "classical"] }));
   * bulkUpdateNames(updates);
   * // This saves only once, instead of 100 times!
   */
  const bulkUpdateNames = (updatedNames: Name[]) => {
    // Create a Map for O(1) lookup time instead of O(n) with .find()
    // Map structure: { "id1": Name1, "id2": Name2, ... }
    const updatesMap = new Map(updatedNames.map(n => [n.id, n]));
    
    // Go through all names, replace ones that have updates
    const newNames = names.map(n => 
      updatesMap.has(n.id) ? updatesMap.get(n.id)! : n
    );
    
    // Save once (much more efficient than N individual saves)
    saveNames(newNames);
  };

  /**
   * deleteName: Removes a name entry (or just a variant spelling)
   * 
   * PARAMETERS:
   * - id: The unique ID of the name
   * - variantSpelling (optional): If provided, only removes this variant, not the whole entry
   * 
   * TWO MODES:
   * 
   * 1. Delete entire name entry:
   *    deleteName("abc123")
   *    → Removes the entire name from the database
   * 
   * 2. Delete only a variant spelling:
   *    deleteName("abc123", "Sara")
   *    → Keeps the name entry, but removes "Sara" from alternateSpellings array
   *    → Useful when you have: "Sarah" with variants ["Sara", "Sahra"]
   *      and you want to remove just "Sara"
   * 
   * WHY TWO MODES?
   * Names can have multiple spelling variants. Sometimes you want to remove
   * just one variant without deleting the whole name entry.
   * 
   * EXAMPLES:
   * // Delete the entire name
   * deleteName("abc123");
   * 
   * // Delete just one variant spelling
   * const name = names.find(n => n.name === "Sarah");
   * deleteName(name.id, "Sara"); // Removes "Sara" from alternateSpellings
   */
  const deleteName = (id: string, variantSpelling?: string) => {
    if (variantSpelling) {
      // MODE 2: Delete only a specific related name form
      const nameEntry = names.find(n => n.id === id);
      if (nameEntry && nameEntry.relatedNames) {
        // Filter out the variant from the relatedNames array
        const updatedRelated = nameEntry.relatedNames.filter(r => r.name !== variantSpelling);
        updateName(id, { relatedNames: updatedRelated });
      }
    } else {
      // MODE 1: Delete the entire name entry
      saveNames(names.filter(n => n.id !== id));
    }
  };

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================
  
  /**
   * setStatus: Changes the availability status of a name
   * 
   * WHAT IS STATUS?
   * Each name can be in one of three states:
   * - 'available': Can be used (default)
   * - 'blocked': Should not be used (with optional reason why)
   * - 'used': Already used somewhere (with optional reference to where)
   * 
   * PARAMETERS:
   * - id: The name's unique ID
   * - status: The new status ('available' | 'blocked' | 'used')
   * - payload: Optional object with:
   *   - usedIn: Where the name was used (if status = 'used')
   *   - blockedReason: Why it's blocked (if status = 'blocked')
   * 
   * EXAMPLES:
   * // Mark a name as used in a story
   * setStatus("abc123", "used", { usedIn: "Chapter 3: The Hero" });
   * 
   * // Block a name with reason
   * setStatus("abc123", "blocked", { blockedReason: "Too similar to Harry Potter" });
   * 
   * // Make a name available again
   * setStatus("abc123", "available");
   */
  const setStatus = (
    id: string, 
    status: 'available' | 'blocked' | 'used', 
    payload?: { usedIn?: string; blockedReason?: string }
  ) => {
    saveNames(names.map(n => 
      n.id === id 
        ? { ...n, status, usedIn: payload?.usedIn, blockedReason: payload?.blockedReason } 
        : n
    ));
  };

  /**
   * toggleUsed: Legacy function for backwards compatibility
   * 
   * WHAT IT DOES:
   * - If name is 'used', marks it as 'available'
   * - If name is not 'used', marks it as 'used'
   * 
   * NOTE: This is kept for backwards compatibility with old code.
   * New code should use setStatus() directly for more control.
   * 
   * EXAMPLE:
   * toggleUsed("abc123", "Chapter 5");
   * // First call: marks as used
   * // Second call: marks as available
   */
  const toggleUsed = (id: string, usedIn?: string) => {
    const target = names.find(n => n.id === id);
    if (!target) return; // Name not found, do nothing
    
    if (target.status === 'used') {
      // Currently used → make available
      setStatus(id, 'available');
    } else {
      // Currently available/blocked → mark as used
      setStatus(id, 'used', { usedIn });
    }
  };

  // ============================================================================
  // IMPORT / EXPORT / MERGE OPERATIONS
  // ============================================================================
  
  /**
   * exportNames: Converts all names to a JSON string for download/backup
   * 
   * WHAT IT DOES:
   * Takes the current names array and converts it to a pretty-printed JSON string.
   * 
   * RETURNS:
   * A JSON string with proper indentation (2 spaces) for readability
   * 
   * HOW TO USE:
   * 1. Call exportNames() to get the JSON string
   * 2. Create a Blob from the string
   * 3. Create a download link with the Blob
   * 4. Trigger the download
   * 
   * EXAMPLE:
   * const json = exportNames();
   * const blob = new Blob([json], { type: 'application/json' });
   * const url = URL.createObjectURL(blob);
   * const link = document.createElement('a');
   * link.href = url;
   * link.download = 'names-backup.json';
   * link.click();
   * 
   * WHY EXPORT?
   * - Backup your name database
   * - Share with others
   * - Edit in external tools
   * - Migrate to another system
   */
  const exportNames = () => {
    return JSON.stringify(names, null, 2); // 2-space indentation
  };

  /**
   * mergeNameEntries: Combines two duplicate name entries into one
   * 
   * USE CASE:
   * Sometimes you accidentally create duplicate entries for the same name,
   * or you have two entries with different information that should be combined.
   * 
   * WHAT IT DOES:
   * 1. Takes two name IDs: primary (the one to keep) and merge (the one to combine and delete)
   * 2. Combines all spelling variants into alternateSpellings
   * 3. Applies field resolutions if provided (choose which version to keep for each field)
   * 4. Updates the primary entry with merged data
   * 5. Deletes the merge entry
   * 
   * PARAMETERS:
   * - primaryId: ID of the name to keep (this one stays)
   * - mergeId: ID of the name to merge in (this one gets deleted)
   * - resolutions: Optional object specifying how to handle conflicting fields
   *   Format: { fieldName: 'primary' | 'merge' | 'combine' }
   *   - 'primary': Keep the value from primary name
   *   - 'merge': Use the value from merge name
   *   - 'combine': Combine both (for arrays, removes duplicates)
   * 
   * SPELLING HANDLING:
   * Both name strings are automatically combined into alternateSpellings:
   * - Primary "Sarah" + Merge "Sara" → name: "Sarah", alternateSpellings: ["Sara"]
   * 
   * EXAMPLES:
   * 
   * Example 1: Simple merge (keep all primary fields)
   * mergeNameEntries("primary-id", "merge-id");
   * // Result: Primary kept, merge name added to alternateSpellings, merge entry deleted
   * 
   * Example 2: Merge with field resolutions
   * mergeNameEntries("primary-id", "merge-id", {
   *   etymology: 'merge',        // Use etymology from merge entry
   *   meanings: 'combine',       // Combine both categories lists
   *   pronunciation: 'primary'   // Keep primary pronunciation
   * });
   * 
   * Example 3: Combine all array fields
   * mergeNameEntries("primary-id", "merge-id", {
   *   meanings: 'combine',
   *   feelings: 'combine',
   *   roots: 'combine',
   *   origin: 'combine'
   * });
   * // Result: All arrays merged with duplicates removed
   */
  const mergeNameEntries = (
    primaryId: string,
    mergeId: string,
    resolutions?: { [field: string]: 'primary' | 'merge' | 'combine' }
  ) => {
    // Find both names
    const primaryName = names.find(n => n.id === primaryId);
    const mergeName = names.find(n => n.id === mergeId);
    
    // If either name doesn't exist, abort
    if (!primaryName || !mergeName) return;
    
    // STEP 1: Combine all related names from both entries
    const allRelatedNames = [
      ...(primaryName.relatedNames || []),
      ...(mergeName.relatedNames || []),
      // Add the merge name itself as a related form if it's not already there
      { type: 'alternateSpelling' as const, name: mergeName.name }
    ];
    
    // Remove duplicates based on name string
    const uniqueRelatedNames = allRelatedNames.filter((related, index, self) =>
      index === self.findIndex(r => r.name === related.name)
    );
    
    // STEP 2: Start with a copy of primary name
    const merged: Partial<Name> = { ...primaryName };
    
    // STEP 3: Apply field resolutions if provided
    if (resolutions) {
      Object.keys(resolutions).forEach(field => {
        const key = field as keyof Name;
        
        if (resolutions[field] === 'merge') {
          // Use value from merge entry
          (merged as any)[key] = mergeName[key];
        }
        
        if (resolutions[field] === 'combine') {
          // For array fields, combine both and remove duplicates
          if (Array.isArray(merged[key]) && Array.isArray(mergeName[key])) {
            (merged as any)[key] = [...new Set([
              ...(merged[key] as any[]), 
              ...(mergeName[key] as any[])
            ])];
          }
        }
        
        // If resolution is 'primary', we don't need to do anything
        // (merged already has primary's values)
      });
    }
    
    // STEP 4: Set the combined relatedNames
    merged.relatedNames = uniqueRelatedNames;
    
    // STEP 5: Update primary entry and delete merge entry
    updateName(primaryId, merged);
    deleteName(mergeId);
  };

  /**
   * importNames: Loads names from a JSON file or object
   * 
   * USE CASES:
   * - Restore from backup
   * - Import shared name databases
   * - Migrate from another system
   * - Bulk add many names at once
   * 
   * PARAMETERS:
   * - imported: The data to import (must be an array of name objects)
   * - options: Configuration object
   *   - mode: 'replace' | 'merge' (default: 'replace')
   *     - 'replace': Deletes all current names and replaces with imported ones
   *     - 'merge': Keeps current names, adds imported names that don't already exist
   * 
   * VALIDATION:
   * The function validates and normalizes imported data:
   * - Generates IDs if missing
   * - Converts all fields to correct types
   * - Supports old field names (literalMeaning → meaning, isUsed → status, etc.)
   * - Ensures arrays are arrays (not single values or missing)
   * - Sets default values for missing fields
   * 
   * BACKWARDS COMPATIBILITY:
   * Supports importing from older versions of the app:
   * - Old field: literalMeaning → New field: meaning
   * - Old field: isUsed → New field: status ('used' or 'available')
   * - Old field: masculineForm (string) → New field: masculineForms (array)
   * - Same for feminineForm and neutralForm
   * 
   * ERROR HANDLING:
   * Throws an error if imported data is not an array
   * 
   * EXAMPLES:
   * 
   * Example 1: Replace all names with imported ones
   * const json = await fetch('/names-backup.json').then(r => r.json());
   * importNames(json, { mode: 'replace' });
   * // Old names deleted, new names loaded
   * 
   * Example 2: Merge imported names with existing ones
   * const json = await fetch('/additional-names.json').then(r => r.json());
   * importNames(json, { mode: 'merge' });
   * // Old names kept, new names added (no duplicates by ID)
   * 
   * Example 3: Import from file upload
   * const file = event.target.files[0];
   * const text = await file.text();
   * const json = JSON.parse(text);
   * importNames(json);
   * // Replaces all names with file contents
   * 
   * HOW MERGE MODE WORKS:
   * - Creates a Set of existing name IDs
   * - Filters imported names to only include ones with new IDs
   * - Appends filtered names to existing list
   * - Saves combined list
   * 
   * Example:
   * Current names: [{ id: "1", name: "Sarah" }, { id: "2", name: "John" }]
   * Imported: [{ id: "2", name: "John Updated" }, { id: "3", name: "Alice" }]
   * Result: [{ id: "1", name: "Sarah" }, { id: "2", name: "John" }, { id: "3", name: "Alice" }]
   * Note: ID "2" already exists, so "John Updated" is NOT imported (original kept)
   */
  const importNames = (
    imported: unknown,
    options: { mode?: 'replace' | 'merge' } = { mode: 'replace' }
  ) => {
    // VALIDATION: Must be an array
    if (!Array.isArray(imported)) {
      throw new Error('Imported data must be an array of names');
    }

    // NORMALIZATION: Convert imported data to valid Name objects
    const parsed: Name[] = imported.map((item: any) => ({
      // ID: Use existing ID or generate new one
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      
      // Required fields with validation
      name: String(item.name || ''),
      nameType: item.nameType === 'surname' ? 'surname' : 
                item.nameType === 'firstName' ? 'firstName' : 'either',
      
      // Optional string fields
      script: item.script,
      etymology: item.etymology,
      pronunciation: item.pronunciation,
      notes: item.notes,
      
      // Categories (array of strings)
      meanings: Array.isArray(item.meanings) ? item.meanings.map(String) : [],
      
      // Literal meaning (support old field name "literalMeaning")
      meaning: typeof item.meaning === 'string' ? item.meaning : 
               (typeof item.literalMeaning === 'string' ? item.literalMeaning : undefined),
      
      // Origin (array or single string converted to array)
      origin: Array.isArray(item.origin) ? item.origin.map(String) : 
              (typeof item.origin === 'string' && item.origin ? [item.origin] : []),
      
      // Gender (validated enum)
      gender: item.gender === 'masculine' || item.gender === 'feminine' || 
              item.gender === 'neutral' || item.gender === 'any' ? item.gender : undefined,
      
      // Feelings (array of strings)
      feelings: Array.isArray(item.feelings) ? item.feelings.map(String) : [],
      
      // Extended relationship fields (all arrays)
      roots: Array.isArray(item.roots) ? item.roots.map(String) : [],
      alternateSpellings: Array.isArray(item.alternateSpellings) ? item.alternateSpellings.map(String) : [],
      variants: Array.isArray(item.variants) ? item.variants.map(String) : [],
      diminutives: Array.isArray(item.diminutives) ? item.diminutives.map(String) : [],
      
      // Gender forms (support both old singular and new plural field names)
      masculineForms: Array.isArray(item.masculineForms) ? item.masculineForms.map(String) : 
                      (typeof item.masculineForm === 'string' && item.masculineForm ? [item.masculineForm] : []),
      feminineForms: Array.isArray(item.feminineForms) ? item.feminineForms.map(String) : 
                     (typeof item.feminineForm === 'string' && item.feminineForm ? [item.feminineForm] : []),
      neutralForms: Array.isArray(item.neutralForms) ? item.neutralForms.map(String) : 
                    (typeof item.neutralForm === 'string' && item.neutralForm ? [item.neutralForm] : []),
      
      // Other languages (array of {language, form} objects)
      otherLanguages: Array.isArray(item.otherLanguages) ? item.otherLanguages : [],
      
      // Status (support old boolean "isUsed" field)
      status: item.status === 'available' || item.status === 'blocked' || item.status === 'used' 
              ? item.status 
              : (item.isUsed ? 'used' : 'available'),
      
      // Status details
      blockedReason: item.blockedReason,
      usedIn: item.usedIn,
      
      // Timestamp (use existing or generate new)
      createdAt: item.createdAt || new Date().toISOString(),
    }));

    // Apply the appropriate import mode
    if (options.mode === 'merge') {
      // MERGE MODE: Add only new names (by ID)
      const existingIds = new Set(names.map(n => n.id));
      const toAdd = parsed.filter(p => !existingIds.has(p.id));
      saveNames([...names, ...toAdd]);
    } else {
      // REPLACE MODE: Delete all existing names, use imported ones
      saveNames(parsed);
    }
  };

  // ============================================================================
  // RETURN API
  // ============================================================================
  
  /**
   * Return all functions and state that components can use
   * 
   * PUBLIC API:
   * - names: Current array of all name entries
   * - addName: Create a new name entry
   * - updateName: Modify an existing name entry
   * - bulkUpdateNames: Update multiple names efficiently
   * - deleteName: Remove a name entry (or just a variant)
   * - toggleUsed: Legacy function to toggle used status
   * - setStatus: Set availability status (available/blocked/used)
   * - exportNames: Get all names as JSON string for download
   * - importNames: Load names from JSON (replace or merge)
   * - mergeNameEntries: Combine two duplicate entries into one
   */
  return {
    names,
    addName,
    updateName,
    bulkUpdateNames,
    deleteName,
    toggleUsed,
    setStatus,
    exportNames,
    importNames,
    mergeNameEntries,
  };
};
