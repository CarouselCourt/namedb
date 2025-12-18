/**
 * ========================================
 * MERGE NAMES DIALOG COMPONENT
 * ========================================
 * 
 * This dialog handles the complex task of merging two name entries that
 * represent the same name but have been entered separately. It's used when
 * a user realizes two entries are actually spelling variants of the same name.
 * 
 * KEY FEATURES:
 * - Conflict detection: Identifies fields that differ between the two names
 * - Field-by-field resolution: User chooses which value to keep for each conflict
 * - Smart defaults: Arrays default to "combine", strings default to "primary"
 * - Warning system: Alerts user if origins don't match (possible false cognates)
 * - Spelling consolidation: Automatically combines all alternate spellings
 * 
 * MERGE LOGIC:
 * When merging "Andrea" (Italian, feminine) with "Andrea" (Greek, masculine):
 * 1. All spellings are combined into alternateSpellings array
 * 2. Primary name is kept from the first entry
 * 3. For each conflicting field (pronunciation, etymology, etc.):
 *    - User chooses: keep primary, keep merge, or combine both
 * 4. Non-conflicting fields are automatically preserved
 * 5. Result is a single entry with complete information
 * 
 * USE CASES:
 * - Combining spelling variants entered as separate entries
 * - Consolidating duplicate data entry
 * - Merging partially-complete entries
 * 
 * CONFLICT RESOLUTION OPTIONS:
 * - **Primary**: Keep the value from the first (primary) name
 * - **Merge**: Keep the value from the second (merge) name
 * - **Combine**: Merge both values (only for arrays like categories, feelings)
 */

import { Name } from "@/hooks/useNameStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Component Props
 * 
 * @param open - Controls dialog visibility
 * @param onOpenChange - Callback when dialog opens/closes
 * @param primaryName - The "main" entry that will be kept (its ID is preserved)
 * @param mergeName - The entry being merged into primary (will be deleted)
 * @param onConfirmMerge - Callback with user's resolution choices for conflicts
 */
interface MergeNamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryName: Name;
  mergeName: Name;
  onConfirmMerge: (resolutions: { [field: string]: 'primary' | 'merge' | 'combine' }) => void;
}

/**
 * MergeNamesDialog Component
 */
export const MergeNamesDialog = ({
  open,
  onOpenChange,
  primaryName,
  mergeName,
  onConfirmMerge,
}: MergeNamesDialogProps) => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  /**
   * User's resolution choices for conflicting fields
   * Key: field name, Value: 'primary' | 'merge' | 'combine'
   */
  const [resolutions, setResolutions] = useState<{ [field: string]: 'primary' | 'merge' | 'combine' }>({});

  // ============================================================================
  // CONFLICT DETECTION
  // ============================================================================
  
  /**
   * Fields that we check for conflicts
   * Each field can be a string or array type
   */
  const conflictFields: { key: keyof Name; label: string; isArray?: boolean }[] = [
    { key: 'pronunciation', label: 'Pronunciation' },
    { key: 'etymology', label: 'Etymology' },
    { key: 'meaning', label: 'Literal Meaning' },
    { key: 'notes', label: 'Notes' },
    { key: 'meanings', label: 'Categories', isArray: true },
    { key: 'feelings', label: 'Feelings', isArray: true },
    { key: 'roots', label: 'Etymological Roots', isArray: true },
    { key: 'relatedNames', label: 'Related Names', isArray: true },
  ];

  /**
   * Check if a field has different values between the two names
   * 
   * For arrays: Compare sorted JSON strings (order-independent comparison)
   * For other types: Direct equality check
   */
  const hasConflict = (field: keyof Name) => {
    const primaryVal = primaryName[field];
    const mergeVal = mergeName[field];
    
    if (Array.isArray(primaryVal) && Array.isArray(mergeVal)) {
      return JSON.stringify(primaryVal.sort()) !== JSON.stringify(mergeVal.sort());
    }
    return primaryVal !== mergeVal;
  };

  /**
   * List of fields that actually have conflicts
   * Only these will be shown to the user for resolution
   */
  const conflicts = conflictFields.filter(f => hasConflict(f.key));

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Handle merge confirmation
   * 
   * Applies smart defaults for any fields the user didn't explicitly choose:
   * - Arrays: default to 'combine' (merge both sets of values)
   * - Strings: default to 'primary' (keep original value)
   */
  const handleMerge = () => {
    // Set default resolutions for fields not explicitly chosen
    const finalResolutions = { ...resolutions };
    conflicts.forEach(conflict => {
      if (!finalResolutions[conflict.key]) {
        // Default: primary for strings, combine for arrays
        finalResolutions[conflict.key] = conflict.isArray ? 'combine' : 'primary';
      }
    });
    
    onConfirmMerge(finalResolutions);
    onOpenChange(false);
  };

  /**
   * Render a field value (handles both arrays and simple values)
   * 
   * Arrays are displayed as badges, simple values as text
   */
  const renderFieldValue = (value: any) => {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((v, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {typeof v === 'object' ? `${v.language}: ${v.form}` : v}
            </Badge>
          ))}
        </div>
      );
    }
    return <span className="text-sm">{value || <em className="text-muted-foreground">None</em>}</span>;
  };

  /**
   * Check if origins match between the two names
   * 
   * This is used to warn the user if they're merging entries that might
   * actually be false cognates (same spelling, different origins)
   */
  const originsMatch = JSON.stringify(primaryName.origin?.sort()) === JSON.stringify(mergeName.origin?.sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Name Entries</DialogTitle>
          <DialogDescription>
            Merging "{mergeName.name}" into "{primaryName.name}". All spellings will be combined.
          </DialogDescription>
        </DialogHeader>

        {!originsMatch && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Warning: These names have different origins. Merging will combine their origin arrays.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Merging Names:</h4>
            <div className="flex flex-wrap gap-1">
              <Badge variant="default">{primaryName.name}</Badge>
              <Badge variant="secondary">{mergeName.name}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All related name forms from both entries will be combined.
            </p>
          </div>

          {conflicts.length > 0 && (
            <div className="space-y-6">
              <h4 className="font-semibold">Resolve Conflicts:</h4>
              {conflicts.map(conflict => (
                <div key={conflict.key} className="border rounded-lg p-4 space-y-3">
                  <Label className="text-base font-semibold">{conflict.label}</Label>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        From "{primaryName.name}":
                      </span>
                      {renderFieldValue(primaryName[conflict.key])}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        From "{mergeName.name}":
                      </span>
                      {renderFieldValue(mergeName[conflict.key])}
                    </div>
                  </div>

                  <RadioGroup
                    value={resolutions[conflict.key] || (conflict.isArray ? 'combine' : 'primary')}
                    onValueChange={(value: 'primary' | 'merge' | 'combine') =>
                      setResolutions({ ...resolutions, [conflict.key]: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="primary" id={`${conflict.key}-primary`} />
                      <Label htmlFor={`${conflict.key}-primary`} className="cursor-pointer">
                        Keep from "{primaryName.name}"
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="merge" id={`${conflict.key}-merge`} />
                      <Label htmlFor={`${conflict.key}-merge`} className="cursor-pointer">
                        Keep from "{mergeName.name}"
                      </Label>
                    </div>
                    {conflict.isArray && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="combine" id={`${conflict.key}-combine`} />
                        <Label htmlFor={`${conflict.key}-combine`} className="cursor-pointer">
                          Combine both (default)
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              ))}
            </div>
          )}

          {conflicts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No conflicting fields detected. The entries will be merged automatically.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge}>
            Merge Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
