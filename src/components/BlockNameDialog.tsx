/**
 * ========================================
 * BLOCK NAME DIALOG COMPONENT
 * ========================================
 * 
 * This dialog provides a user interface for blocking a name and recording
 * the reason(s) why it's being blocked. Users can select multiple reasons
 * and add optional notes for each.
 * 
 * KEY FEATURES:
 * - Multi-select reasons via checkboxes
 * - Optional notes for each reason
 * - Structured reason types for better organization
 * - Combines all reasons into a formatted string
 * 
 * REASON CATEGORIES:
 * 1. **Inappropriate**: Names with offensive or inappropriate meanings
 * 2. **Personally Loaded**: Names with personal negative associations
 * 3. **Popular Media**: Names strongly associated with famous characters/people
 * 4. **Other**: Any other reason not covered above
 * 
 * USAGE:
 * When a user wants to permanently mark a name as blocked (e.g., "Harry" 
 * because of Harry Potter), this dialog collects structured information
 * about why. The reasons are stored with the name so the user can remember
 * their decision later.
 * 
 * DATA FLOW:
 * 1. User clicks "Block" on a name card
 * 2. This dialog opens with the name to be blocked
 * 3. User selects reason(s) and optionally adds notes
 * 4. On confirm, all reasons are formatted and sent back to parent
 * 5. Parent component updates the name's status and blockedReason field
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * BlockReason Interface
 * 
 * Represents a single reason for blocking a name.
 * Can have optional notes for additional context.
 */
interface BlockReason {
  type: 'Inappropriate' | 'Personally Loaded' | 'Popular Media' | 'Other';
  notes?: string;
}

/**
 * Component Props
 * 
 * @param open - Controls dialog visibility
 * @param onOpenChange - Callback when dialog opens/closes
 * @param onConfirm - Callback with formatted reasons when user confirms
 * @param nameName - The name being blocked (for display in dialog title)
 */
interface BlockNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasons: BlockReason[]) => void;
  nameName: string;
}

/**
 * Available blocking reason types
 * These are the predefined categories users can choose from
 */
const REASON_OPTIONS: BlockReason['type'][] = [
  'Inappropriate',
  'Personally Loaded',
  'Popular Media',
  'Other'
];

/**
 * BlockNameDialog Component
 */
export const BlockNameDialog = ({ open, onOpenChange, onConfirm, nameName }: BlockNameDialogProps) => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  /**
   * Selected reason types (Set for efficient lookup)
   * Using a Set because each reason can only be selected once
   */
  const [selectedReasons, setSelectedReasons] = useState<Set<BlockReason['type']>>(new Set());
  
  /**
   * Notes for each selected reason
   * Key: reason type, Value: user's notes text
   */
  const [notes, setNotes] = useState<Record<string, string>>({});

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Toggle a reason on/off
   * 
   * When unchecking a reason, we also clear any notes associated with it
   * to avoid leaving orphaned data.
   */
  const handleToggleReason = (reason: BlockReason['type'], checked: boolean) => {
    const newSelected = new Set(selectedReasons);
    if (checked) {
      newSelected.add(reason);
    } else {
      newSelected.delete(reason);
      // Clear notes for unchecked reason
      const newNotes = { ...notes };
      delete newNotes[reason];
      setNotes(newNotes);
    }
    setSelectedReasons(newSelected);
  };

  /**
   * Update notes for a specific reason
   */
  const handleNotesChange = (reason: BlockReason['type'], value: string) => {
    setNotes({ ...notes, [reason]: value });
  };

  /**
   * Confirm blocking the name
   * 
   * Formats selected reasons and notes into a structured array
   * and passes it back to the parent component. Then resets the form.
   */
  const handleConfirm = () => {
    const reasons: BlockReason[] = Array.from(selectedReasons).map(type => ({
      type,
      notes: notes[type] || undefined
    }));
    onConfirm(reasons);
    // Reset state for next use
    setSelectedReasons(new Set());
    setNotes({});
    onOpenChange(false);
  };

  /**
   * Cancel blocking
   * 
   * Resets the form without saving anything
   */
  const handleCancel = () => {
    // Reset state
    setSelectedReasons(new Set());
    setNotes({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Block Name: {nameName}</DialogTitle>
          <DialogDescription>
            Select one or more reasons for blocking this name. You can add optional notes for each reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {REASON_OPTIONS.map((reason) => (
            <div key={reason} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`reason-${reason}`}
                  checked={selectedReasons.has(reason)}
                  onCheckedChange={(checked) => handleToggleReason(reason, checked as boolean)}
                />
                <Label
                  htmlFor={`reason-${reason}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {reason}
                </Label>
              </div>
              
              {selectedReasons.has(reason) && (
                <Textarea
                  placeholder={`Optional notes for "${reason}"...`}
                  value={notes[reason] || ''}
                  onChange={(e) => handleNotesChange(reason, e.target.value)}
                  className="ml-6"
                  rows={2}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={selectedReasons.size === 0}
          >
            Block Name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};