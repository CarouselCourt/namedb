/**
 * ========================================
 * NAME DIALOG COMPONENT
 * ========================================
 * 
 * This is the main form for adding and editing names in the library.
 * It handles all the data entry for a name's properties and validates
 * for potential duplicate entries (false cognates).
 * 
 * KEY FEATURES:
 * - Add new names or edit existing ones
 * - Detect duplicate names (false cognates) and alert the user
 * - Hierarchical category and origin selection
 * - Extended fields for alternate spellings, diminutives, and related forms
 * - Request merging spelling variants with existing names
 * - Predefined geographic regions and countries (see README-ORIGINS.md)
 * 
 * FORM FIELDS:
 * - Basic: name, type (first/surname), pronunciation, gender (disabled for surnames)
 * - Origin & Script: where the name comes from, native writing system
 * - Etymological Roots: historical word origins (e.g., Proto-Indo-European *leuk-)
 * - Meaning: literal translation and hierarchical categories
 * - Etymology: historical and linguistic origins
 * - Feelings: emotional associations (noble, warm, mysterious, etc.)
 * - Extended: alternate spellings, diminutives, gender variants, other languages
 * - Notes: free-form text for additional information
 * 
 * SPECIAL BEHAVIOR:
 * - Gender field is disabled when Name Type is set to "surname" since surnames
 *   are inherently gender-neutral family names
 * - Predefined regions (15 European regions) always appear and auto-link to Europe
 * - Predefined countries (Baltic States) always appear and auto-link to Europe + Baltic States
 * 
 * FALSE COGNATE DETECTION:
 * The dialog checks if there are other names with the same spelling but
 * different origins/meanings (e.g., "Andrea" in Italian vs Greek). It alerts
 * the user to add distinguishing information.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Name } from "@/hooks/useNameStorage";
import { useCategoryStorage } from "@/hooks/useCategoryStorage";
import { CategoryAutocomplete } from "./CategoryAutocomplete";
import { SeparatedCategorySelector } from "./SeparatedCategorySelector";
import { SeparatedOriginSelector } from "./SeparatedOriginSelector";
import { ExtendedFields, ExtendedFieldsRef } from "./NameDialogExtended";
import { findDuplicateNames } from "@/utils/duplicateNames";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

/**
 * Component Props
 * 
 * @param open - Controls whether the dialog is visible
 * @param onOpenChange - Callback when dialog is opened/closed
 * @param onSave - Callback when user saves the form (creates or updates a name)
 * @param editingName - If provided, the dialog is in edit mode for this name
 * @param allNames - Complete list of names, used for duplicate detection and autocomplete
 * @param onRequestMerge - Callback to merge a spelling variant with an existing name
 */
interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: Omit<Name, 'id' | 'createdAt' | 'status'>) => void;
  editingName?: Name & { displayName?: string; isPrimarySpelling?: boolean; editingRelatedName?: any };
  allNames: Name[];
  onRequestMerge?: (existingName: Name, newSpelling: string) => void;
}

export const NameDialog = ({ open, onOpenChange, onSave, editingName, allNames, onRequestMerge }: NameDialogProps) => {
  // Get stored categories from local storage (persists even if no names use them yet)
  const { categories: storedCategories } = useCategoryStorage();
  
  // Ref to access ExtendedFields methods
  const extendedFieldsRef = useRef<ExtendedFieldsRef>(null);
  
  /**
   * Form Data State
   * 
   * All the information about a name is stored in this state object.
   * When editing, this is populated from the editingName prop.
   * When adding new, it starts with empty/default values.
   */
  const [formData, setFormData] = useState({
    name: "",
    nameType: "firstName" as 'firstName' | 'surname' | 'either',
    script: "",
    meanings: [] as string[],
    meaning: "",
    etymology: "",
    pronunciation: "",
    origin: [] as string[],
    gender: "any" as 'masculine' | 'feminine' | 'neutral' | 'any',
    feelings: [] as string[],
    notes: "",
    roots: [] as string[],
    relatedNames: [] as Array<{
      type: 'alternateSpelling' | 'diminutive' | 'masculineForm' | 'feminineForm' | 'neutralForm' | 'otherLanguage' | 'fullForm';
      name: string;
      alternateOrigin?: string;
      pronunciation?: string;
      script?: string;
      etymology?: string;
      notes?: string;
      gender?: 'masculine' | 'feminine' | 'neutral' | 'any';
    }>,
  });

  // Temporary input fields for adding meanings/feelings/roots one at a time
  const [meaningInput, setMeaningInput] = useState("");
  const [feelingInput, setFeelingInput] = useState("");
  const [rootInput, setRootInput] = useState("");
  
  /**
   * Duplicate Name Detection (False Cognates)
   * 
   * As the user types a name, we check if there are other entries with the same
   * spelling. This helps identify false cognates - names that look the same but
   * have different origins/meanings (e.g., "Andrea" in Italian vs Greek).
   * 
   * The user is alerted to add distinguishing information (origin, meaning, etymology)
   * to differentiate this entry from existing ones.
   */
  const duplicateNames = useMemo(() => {
    if (!formData.name) return [];
    const tempName: Name = { ...formData as any, id: editingName?.id || 'temp', createdAt: new Date().toISOString() };
    return findDuplicateNames(tempName, allNames);
  }, [formData.name, allNames, editingName?.id]);

  /**
   * Autocomplete Options
   * 
   * These memoized lists provide autocomplete suggestions for:
   * - Categories: From both existing names and stored categories
   * - Feelings: From all existing names
   * - Origins: From all existing names
   * 
   * This helps maintain consistency and avoid typos when entering data.
   */
  const allCategories = useMemo(() => {
    return Array.from(new Set([
      ...allNames.flatMap(n => n.meanings || []),
      ...storedCategories.map(c => c.path)
    ])).sort();
  }, [allNames, storedCategories]);
  
  const allFeelings = useMemo(() => {
    return Array.from(new Set([
      ...allNames.flatMap(n => n.feelings || []),
      ...formData.feelings
    ])).sort();
  }, [allNames, formData.feelings]);
  
  const allOrigins = useMemo(() => {
    return Array.from(new Set([
      ...allNames.flatMap(n => n.origin || []),
      ...formData.origin
    ])).sort();
  }, [allNames, formData.origin]);

  // Predefined continents that should always be available when adding/editing names
  const predefinedContinents = [
    "Asia",
    "Africa", 
    "Europe",
    "Fantasy",
    "North America",
    "Oceania",
    "South America"
  ];

  // Predefined European regions that should always be available when adding/editing names
  // These are automatically linked to Europe
  const predefinedRegions = [
    "Alpine Region",
    "Baltic States",
    "British Isles",
    "The Caucasus",
    "Central Europe",
    "Eastern Balkans",
    "East Slavic Europe",
    "French Region",
    "Germanic Region",
    "Greece & Mediterranean Islands",
    "Iberian Peninsula",
    "Italian Peninsula",
    "Low Countries",
    "Nordic Region",
    "Western Balkans"
  ];

  // Predefined Baltic countries that should always be available when adding/editing names
  // These are automatically linked to both Europe and Baltic States
  const predefinedCountries = [
    "Estonia",
    "Latvia",
    "Lithuania"
  ];

  // Predefined subregions (Estonian regions) that should always be available when adding/editing names
  // These are automatically linked to Europe, Baltic States, and Estonia
  const predefinedSubregions = [
    "Harju County" // Placeholder for Estonian subregion (includes Tallinn)
  ];

  /**
   * Initialize Form Data
   * 
   * When the dialog opens:
   * - If editing a name: populate form with that name's data
   * - If adding new: reset form to default/empty values
   * 
   * This effect runs whenever editingName or open state changes.
   */
  useEffect(() => {
    if (editingName) {
      setFormData({
        name: editingName.name,
        nameType: editingName.nameType,
        script: editingName.script || "",
        meanings: editingName.meanings || [],
        meaning: editingName.meaning || '',
        etymology: editingName.etymology || "",
        pronunciation: editingName.pronunciation || "",
        origin: editingName.origin || [],
        gender: editingName.gender || "any",
        feelings: editingName.feelings || [],
        notes: editingName.notes || "",
        roots: editingName.roots || [],
        relatedNames: editingName.relatedNames || [],
      });

      // If editing a specific related name, trigger edit mode in ExtendedFields
      if (editingName.editingRelatedName && editingName.relatedNames) {
        const relatedIndex = editingName.relatedNames.findIndex(
          r => r.name === editingName.editingRelatedName.name && r.type === editingName.editingRelatedName.type
        );
        if (relatedIndex !== -1) {
          // Use setTimeout to ensure ExtendedFields is mounted before calling the method
          setTimeout(() => {
            extendedFieldsRef.current?.startEditingRelatedName(relatedIndex);
          }, 0);
        }
      }
    } else {
      setFormData({
        name: "",
        nameType: "firstName",
        script: "",
        meanings: [],
        meaning: '',
        etymology: "",
        pronunciation: "",
        origin: [],
        gender: "any",
        feelings: [],
        notes: "",
        roots: [],
        relatedNames: [],
      });
    }
    setMeaningInput("");
    setFeelingInput("");
    setRootInput("");
  }, [editingName, open]);

  /**
   * Form Submission
   * 
   * When the user clicks "Add Name" or "Update", this function:
   * 1. Prevents the default form submission (which would reload the page)
   * 2. Calls the onSave callback with the form data
   * 3. Closes the dialog
   * 
   * The parent component (Index.tsx) handles actually saving the name.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add any pending related name before saving
    extendedFieldsRef.current?.addPendingRelatedName();
    
    onSave(formData);
    onOpenChange(false);
  };

  /**
   * Helper Functions for Multi-Value Fields
   * 
   * These functions help manage array fields like meanings and feelings.
   * They're kept here but are largely superseded by the more sophisticated
   * CategoryAutocomplete and SeparatedCategorySelector components.
   * 
   * NOTE: These are legacy functions that may not be actively used in the current UI
   */
  const addMeaning = () => {
    if (meaningInput.trim() && !formData.meanings.includes(meaningInput.trim())) {
      setFormData({ ...formData, meanings: [...formData.meanings, meaningInput.trim()] });
      setMeaningInput("");
    }
  };

  const removeMeaning = (meaning: string) => {
    setFormData({ ...formData, meanings: formData.meanings.filter(m => m !== meaning) });
  };

  const addFeeling = () => {
    if (feelingInput.trim() && !formData.feelings.includes(feelingInput.trim())) {
      setFormData({ ...formData, feelings: [...formData.feelings, feelingInput.trim()] });
      setFeelingInput("");
    }
  };

  const removeFeeling = (feeling: string) => {
    setFormData({ ...formData, feelings: formData.feelings.filter(f => f !== feeling) });
  };

  const addRoot = () => {
    if (rootInput.trim() && !formData.roots.includes(rootInput.trim())) {
      setFormData({ ...formData, roots: [...formData.roots, rootInput.trim()] });
      setRootInput("");
    }
  };

  const removeRoot = (root: string) => {
    setFormData({ ...formData, roots: formData.roots.filter(r => r !== root) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle>{editingName ? "Edit Name" : "Add New Name"}</DialogTitle>
          {editingName?.editingRelatedName && (
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You are editing the <strong>{editingName.editingRelatedName.name}</strong> variant of <strong>{editingName.name}</strong>. 
                The form below has been pre-filled with the variant's details. Scroll down to the Related Names section to make changes.
              </AlertDescription>
            </Alert>
          )}
          {editingName?.displayName && !editingName.isPrimarySpelling && !editingName?.editingRelatedName && (
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You are editing the <strong>{editingName.displayName}</strong> variant of <strong>{editingName.name}</strong>. 
                Changes will apply to all spellings of this name.
              </AlertDescription>
            </Alert>
          )}
          <p id="dialog-description" className="text-sm text-muted-foreground">
            {editingName ? "Edit the details of this name" : "Add a new name to your library"}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {duplicateNames.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>False Cognate Detected:</strong> {duplicateNames.length} other {duplicateNames.length === 1 ? 'entry exists' : 'entries exist'} with this name. 
                Make sure to add distinguishing information (origin, meaning, etymology) to differentiate this entry.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nameType">Name Type *</Label>
              <Select
                value={formData.nameType}
                onValueChange={(value: any) => setFormData({ ...formData, nameType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firstName">First Name</SelectItem>
                  <SelectItem value="surname">Surname</SelectItem>
                  <SelectItem value="either">Either</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pronunciation">Pronunciation</Label>
              <Input
                id="pronunciation"
                value={formData.pronunciation}
                onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                placeholder="e.g., ay-LEE-nuh"
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender (For First Names)</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: any) => setFormData({ ...formData, gender: value })}
                disabled={formData.nameType === 'surname'}
              >
                <SelectTrigger className={formData.nameType === 'surname' ? "opacity-50 cursor-not-allowed" : ""}>
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

          <div>
            <Label>Origin</Label>
            <SeparatedOriginSelector
              allOrigins={allOrigins}
              selectedOrigins={formData.origin}
              onSelectionChange={(origin) => setFormData({ ...formData, origin })}
              predefinedContinents={predefinedContinents}
              predefinedRegions={predefinedRegions}
              predefinedCountries={predefinedCountries}
              predefinedSubregions={predefinedSubregions}
            />
          </div>

          <div>
            <Label htmlFor="script">Native Script</Label>
            <Input
              id="script"
              value={formData.script}
              onChange={(e) => setFormData({ ...formData, script: e.target.value })}
              placeholder="e.g., 日本, Ελένη"
            />
          </div>

          <div>
            <Label>Etymological Roots</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={rootInput}
                onChange={(e) => setRootInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRoot();
                  }
                }}
                placeholder="e.g., Proto-Indo-European *leuk-"
              />
              <Button type="button" onClick={addRoot}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.roots.map((root, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {root}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeRoot(root)} />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="meaning">Meaning (full translation)</Label>
            <Input
              id="meaning"
              value={formData.meaning}
              onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
              placeholder="The full literal meaning or translation"
            />
          </div>

          <div>
            <SeparatedCategorySelector
              allCategories={allCategories}
              selectedCategories={formData.meanings}
              onSelectionChange={(meanings) => setFormData({ ...formData, meanings })}
            />
          </div>

          <div>
            <Label htmlFor="etymology">Etymology</Label>
            <Textarea
              id="etymology"
              value={formData.etymology}
              onChange={(e) => setFormData({ ...formData, etymology: e.target.value })}
              placeholder="Historical and linguistic origin..."
              rows={2}
            />
          </div>

          <div>
            <Label>Feelings</Label>
            <CategoryAutocomplete
              value={formData.feelings}
              onChange={(feelings) => setFormData({ ...formData, feelings })}
              allOptions={allFeelings}
              placeholder="e.g., noble, mysterious, warm"
              label="Feelings"
              allowHierarchy={false}
            />
          </div>

          <ExtendedFields 
            ref={extendedFieldsRef}
            formData={formData} 
            setFormData={setFormData}
            allNames={allNames}
            onRequestMerge={onRequestMerge}
          />

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingName ? "Update" : "Add Name"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
