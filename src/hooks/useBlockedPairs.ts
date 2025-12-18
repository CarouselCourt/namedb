/**
 * ============================================================================
 * BLOCKED PAIRS HOOK - useBlockedPairs
 * ============================================================================
 * 
 * PURPOSE:
 * Manages combinations of first names and surnames that shouldn't be used together.
 * 
 * USE CASE:
 * Prevents unfortunate name combinations like:
 * - "Harry Potter" (fictional character)
 * - Combinations that sound inappropriate or funny
 * - Names of real people you want to avoid
 * 
 * FUNCTIONALITY:
 * - Add/remove/update blocked pairs
 * - Check if a specific first name + surname combo is blocked
 * - Store reason and notes for why it's blocked
 */

import { useState, useEffect } from 'react';

/**
 * BlockedPair: A first name + surname combination that shouldn't be used
 */
export interface BlockedPair {
  id: string;             // Unique identifier
  firstName: string;      // First name part of the blocked combination
  surname: string;        // Surname part of the blocked combination
  reason?: string;        // Why this combination is blocked (optional)
  notes?: string;         // Additional notes (optional)
  createdAt: string;      // Timestamp when pair was blocked
}

// localStorage key
const STORAGE_KEY = 'loreweaver-blocked-pairs';

// Custom event name for cross-component updates
const BLOCKED_PAIRS_UPDATE_EVENT = 'loreweaver-blocked-pairs-updated';

/**
 * dispatchBlockedPairsUpdate: Notifies other components that blocked pairs changed
 */
const dispatchBlockedPairsUpdate = () => {
  window.dispatchEvent(new CustomEvent(BLOCKED_PAIRS_UPDATE_EVENT));
};

/**
 * useBlockedPairs: Hook for managing blocked name combinations
 * 
 * RETURNS:
 * - blockedPairs: Array of all blocked combinations
 * - addBlockedPair: Block a specific first name + surname combination
 * - removeBlockedPair: Unblock a combination
 * - updateBlockedPair: Update reason or notes for a blocked pair
 * - isPairBlocked: Check if a specific combination is blocked
 */
export const useBlockedPairs = () => {
  const [blockedPairs, setBlockedPairs] = useState<BlockedPair[]>([]);
  const [serverAvailable, setServerAvailable] = useState(false);

  const serverBase = import.meta.env.VITE_SERVER_BASE || '';

  /**
   * loadFromLocalStorage: Loads blocked pairs from browser storage
   */
  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBlockedPairs(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error('Failed to parse blocked pairs:', err);
      }
    }
  };

  // ============================================================================
  // INITIAL DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    const checkServer = async () => {
      const url = serverBase ? `${serverBase.replace(/\/$/, '')}/api/blocked-pairs` : '/api/blocked-pairs';
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setBlockedPairs(Array.isArray(data) ? data : []);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setServerAvailable(true);
          dispatchBlockedPairsUpdate();
          return;
        }
      } catch (err) {
        console.warn('Server not available for blocked pairs, using localStorage');
      }
      
      loadFromLocalStorage();
      setServerAvailable(false);
    };
    
    checkServer();

    const handleUpdate = () => {
      loadFromLocalStorage();
    };

    window.addEventListener(BLOCKED_PAIRS_UPDATE_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(BLOCKED_PAIRS_UPDATE_EVENT, handleUpdate);
    };
  }, [serverBase]);

  // ============================================================================
  // SAVE FUNCTION (internal)
  // ============================================================================
  
  /**
   * saveBlockedPairs: Saves to localStorage and attempts server sync
   */
  const saveBlockedPairs = (newBlockedPairs: BlockedPair[]) => {
    setBlockedPairs(newBlockedPairs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBlockedPairs));
    
    dispatchBlockedPairsUpdate();
    
    const tryPost = async () => {
      const url = serverBase ? `${serverBase.replace(/\/$/, '')}/api/blocked-pairs` : '/api/blocked-pairs';
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBlockedPairs),
        });
        if (res.ok) {
          setServerAvailable(true);
        } else {
          setServerAvailable(false);
        }
      } catch (err) {
        setServerAvailable(false);
      }
    };

    tryPost();
  };

  // ============================================================================
  // BLOCKED PAIR OPERATIONS
  // ============================================================================
  
  /**
   * addBlockedPair: Blocks a specific first name + surname combination
   * 
   * PARAMETERS:
   * - firstName: The first name to block (case-insensitive)
   * - surname: The surname to block (case-insensitive)
   * - reason: Why this combination is blocked (optional)
   * - notes: Additional information (optional)
   * 
   * DUPLICATE PREVENTION:
   * If combination already exists, does nothing
   * 
   * EXAMPLES:
   * addBlockedPair("Harry", "Potter", "Fictional character");
   * addBlockedPair("Donald", "Duck", "Cartoon character", "Too recognizable");
   * addBlockedPair("John", "Doe", "Generic placeholder name");
   */
  const addBlockedPair = (firstName: string, surname: string, reason?: string, notes?: string) => {
    // Check if this combination already exists (case-insensitive)
    const exists = blockedPairs.some(
      bp => bp.firstName.toLowerCase() === firstName.toLowerCase() && 
            bp.surname.toLowerCase() === surname.toLowerCase()
    );
    
    if (exists) return; // Already blocked, do nothing
    
    const newPair: BlockedPair = {
      id: crypto.randomUUID(),
      firstName: firstName.trim(),
      surname: surname.trim(),
      reason: reason?.trim(),
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
    };
    
    saveBlockedPairs([...blockedPairs, newPair]);
  };

  /**
   * removeBlockedPair: Removes a blocked combination
   * 
   * PARAMETERS:
   * - id: The unique ID of the blocked pair to remove
   * 
   * EXAMPLE:
   * removeBlockedPair("abc-123-def");
   */
  const removeBlockedPair = (id: string) => {
    saveBlockedPairs(blockedPairs.filter(bp => bp.id !== id));
  };

  /**
   * updateBlockedPair: Updates the reason or notes for a blocked pair
   * 
   * PARAMETERS:
   * - id: The unique ID of the blocked pair
   * - updates: Partial BlockedPair object with fields to update
   * 
   * EXAMPLE:
   * updateBlockedPair("abc-123", { 
   *   reason: "Updated reason", 
   *   notes: "Additional context" 
   * });
   */
  const updateBlockedPair = (id: string, updates: Partial<BlockedPair>) => {
    saveBlockedPairs(
      blockedPairs.map(bp => bp.id === id ? { ...bp, ...updates } : bp)
    );
  };

  /**
   * isPairBlocked: Checks if a specific combination is blocked
   * 
   * PARAMETERS:
   * - firstName: First name to check (case-insensitive)
   * - surname: Surname to check (case-insensitive)
   * 
   * RETURNS:
   * true if the combination is blocked, false otherwise
   * 
   * USE CASE:
   * Check before generating or suggesting a full name:
   * 
   * EXAMPLE:
   * if (isPairBlocked("Harry", "Potter")) {
   *   console.log("Cannot use this combination!");
   * }
   */
  const isPairBlocked = (firstName: string, surname: string): boolean => {
    return blockedPairs.some(
      bp => bp.firstName.toLowerCase() === firstName.toLowerCase() && 
            bp.surname.toLowerCase() === surname.toLowerCase()
    );
  };

  return {
    blockedPairs,
    addBlockedPair,
    removeBlockedPair,
    updateBlockedPair,
    isPairBlocked,
  };
};
