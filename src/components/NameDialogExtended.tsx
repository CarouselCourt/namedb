/**
 * ============================================================================
 * NAME DIALOG EXTENDED FIELDS COMPONENT
 * ============================================================================
 * 
 * This component provides an interface for adding related names to a primary name entry.
 * Related names include alternate spellings, diminutives, gender variations, and forms
 * in other languages/cultures.
 * 
 * KEY FEATURES:
 * - Dropdown selection for relationship type
 * - Name input with optional additional details
 * - Conflict detection for duplicate names
 * - Merge dialog for handling conflicts
 * - Display of all added related names with badges
 */

import { useState, useImperativeHandle, forwardRef } from "react";
import { Name, RelatedName } from "@/hooks/useNameStorage";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ChevronDown, Pencil } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ExtendedFieldsProps {
  formData: {
    relatedNames?: RelatedName[];
    origin?: string[];
    gender?: 'masculine' | 'feminine' | 'neutral' | 'any';
  };
  setFormData: (data: any) => void;
  allNames?: Name[];
  onRequestMerge?: (existingName: Name, newSpelling: string) => void;
}

const RELATIONSHIP_TYPES = [
  { value: 'alternateSpelling', label: 'Alternate Spelling' },
  { value: 'diminutive', label: 'Diminutive' },
  { value: 'masculineForm', label: 'Masculine Form' },
  { value: 'feminineForm', label: 'Feminine Form' },
  { value: 'neutralForm', label: 'Neutral Form' },
  { value: 'otherLanguage', label: 'Other Language/Culture Form' },
] as const;

export interface ExtendedFieldsRef {
  addPendingRelatedName: () => void;
  startEditingRelatedName: (index: number) => void;
}

export const ExtendedFields = forwardRef<ExtendedFieldsRef, ExtendedFieldsProps>(({ formData, setFormData, allNames, onRequestMerge }, ref) => {
  // ============================================================================
  // STATE FOR NEW RELATED NAME ENTRY
  // ============================================================================
  
  const [newRelatedName, setNewRelatedName] = useState<Partial<RelatedName>>({
    type: 'alternateSpelling',
    name: '',
  });
  const [showMergeWarning, setShowMergeWarning] = useState(false);
  const [conflictingName, setConflictingName] = useState<Name | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // ============================================================================
  // CONFLICT DETECTION
  // ============================================================================

  /**
   * Check if a related name already exists in the database
   * Returns the existing name entry if found, null otherwise
   */
  const findExistingName = (relatedName: string): Name | null => {
    if (!allNames || !relatedName) return null;
    
    return allNames.find(n => {
      // Check primary name
      if (n.name.toLowerCase() === relatedName.toLowerCase()) return true;
      
      // Check related names
      if (n.relatedNames?.some(rn => rn.name.toLowerCase() === relatedName.toLowerCase())) return true;
      
      return false;
    }) || null;
  };

  // ============================================================================
  // ADD RELATED NAME
  // ============================================================================

  const addRelatedName = () => {
    if (!newRelatedName.name || !newRelatedName.type) return;

    const relatedNames = formData.relatedNames || [];

    // If editing, update the existing related name
    if (editingIndex !== null) {
      const updatedRelatedNames = [...relatedNames];
      updatedRelatedNames[editingIndex] = newRelatedName as RelatedName;
      setFormData({
        ...formData,
        relatedNames: updatedRelatedNames
      });

      // Reset form and editing state
      setNewRelatedName({
        type: 'alternateSpelling',
        name: '',
      });
      setEditingIndex(null);
      return;
    }

    // Check for conflicts only when adding new
    const existing = findExistingName(newRelatedName.name);
    if (existing && onRequestMerge) {
      setConflictingName(existing);
      setShowMergeWarning(true);
      return;
    }

    // Add the related name
    setFormData({
      ...formData,
      relatedNames: [...relatedNames, newRelatedName as RelatedName]
    });

    // Reset form
    setNewRelatedName({
      type: 'alternateSpelling',
      name: '',
    });
  };

  // ============================================================================
  // REMOVE RELATED NAME
  // ============================================================================

  const removeRelatedName = (index: number) => {
    const relatedNames = formData.relatedNames || [];
    setFormData({
      ...formData,
      relatedNames: relatedNames.filter((_, i) => i !== index)
    });
    
    // If we're editing this item, cancel editing
    if (editingIndex === index) {
      setEditingIndex(null);
      setNewRelatedName({
        type: 'alternateSpelling',
        name: '',
      });
    }
  };

  // ============================================================================
  // EDIT RELATED NAME
  // ============================================================================

  const editRelatedName = (index: number) => {
    const relatedNames = formData.relatedNames || [];
    const relatedToEdit = relatedNames[index];
    
    setNewRelatedName({ ...relatedToEdit });
    setEditingIndex(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewRelatedName({
      type: 'alternateSpelling',
      name: '',
    });
  };

  // ============================================================================
  // GET RELATIONSHIP TYPE LABEL
  // ============================================================================

  const getTypeLabel = (type: RelatedName['type']) => {
    return RELATIONSHIP_TYPES.find(t => t.value === type)?.label || type;
  };

  // ============================================================================
  // EXPOSE METHOD TO PARENT
  // ============================================================================

  useImperativeHandle(ref, () => ({
    addPendingRelatedName: () => {
      // Only add if there's a name entered
      if (newRelatedName.name && newRelatedName.name.trim()) {
        addRelatedName();
      }
    },
    startEditingRelatedName: (index: number) => {
      editRelatedName(index);
      // Scroll to the related names section
      setTimeout(() => {
        const element = document.querySelector('[data-related-names-section]');
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }));

  // ============================================================================
  // RENDERING
  // ============================================================================

  return (
    <div className="space-y-4" data-related-names-section>
      <div>
        <Label className="text-base font-semibold">Related Names</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Add alternate spellings, diminutives, gender forms, and variations in other languages/cultures.
        </p>

        {/* Merge Conflict Warning */}
        {showMergeWarning && conflictingName && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Name Already Exists</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                "{newRelatedName.name}" already exists as a name entry.
                Would you like to merge this information?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onRequestMerge && newRelatedName.name) {
                      onRequestMerge(conflictingName, newRelatedName.name);
                    }
                    setShowMergeWarning(false);
                  }}
                >
                  Merge Names
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Add anyway
                    const relatedNames = formData.relatedNames || [];
                    setFormData({
                      ...formData,
                      relatedNames: [...relatedNames, newRelatedName as RelatedName]
                    });
                    setNewRelatedName({
                      type: 'alternateSpelling',
                      name: '',
                    });
                    setShowMergeWarning(false);
                  }}
                >
                  Add Anyway
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMergeWarning(false)}
                >
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Add/Edit Related Name Form */}
        <div className="border rounded-lg p-4 space-y-4">
          {editingIndex !== null && formData.relatedNames && (
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm font-semibold text-primary">
                Editing: {formData.relatedNames[editingIndex]?.name} ({getTypeLabel(formData.relatedNames[editingIndex]?.type)})
              </span>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Relationship Type Selector */}
            <div>
              <Label>Relationship Type</Label>
            <Select
                value={newRelatedName.type}
                onValueChange={(value) => {
                  const type = value as RelatedName['type'];
                  const updates: Partial<RelatedName> = { type };
                  
                  // Automatically set gender based on relationship type
                  if (type === 'masculineForm') {
                    updates.gender = 'masculine';
                  } else if (type === 'feminineForm') {
                    updates.gender = 'feminine';
                  } else if (type === 'neutralForm') {
                    updates.gender = 'neutral';
                  } else {
                    updates.gender = undefined;
                  }
                  
                  setNewRelatedName({ ...newRelatedName, ...updates });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map(type => {
                    // Disable gender form options that match the name's own gender
                    const isDisabled = 
                      (type.value === 'masculineForm' && formData.gender === 'masculine') ||
                      (type.value === 'feminineForm' && formData.gender === 'feminine') ||
                      (type.value === 'neutralForm' && formData.gender === 'neutral');
                    
                    return (
                      <SelectItem 
                        key={type.value} 
                        value={type.value}
                        disabled={isDisabled}
                      >
                        {type.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Name Input */}
            <div>
              <Label>Name</Label>
              <div className="flex gap-2">
                <Input
                  value={newRelatedName.name || ''}
                  onChange={(e) => setNewRelatedName({ ...newRelatedName, name: e.target.value })}
                  placeholder="Enter related name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRelatedName();
                    }
                  }}
                />
                <Button 
                  onClick={addRelatedName} 
                  size="icon" 
                  variant={editingIndex !== null ? "default" : "outline"}
                  title={editingIndex !== null ? "Update" : "Add"}
                >
                  {editingIndex !== null ? (
                    <span className="text-xs">Save</span>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-semibold">Additional Details (optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pronunciation */}
              <div>
                <Label>Pronunciation (optional)</Label>
                <Input
                  value={newRelatedName.pronunciation || ''}
                  onChange={(e) => setNewRelatedName({ ...newRelatedName, pronunciation: e.target.value })}
                  placeholder="e.g., KAY-lee"
                />
              </div>

              {/* Script */}
              <div>
                <Label>Script (optional)</Label>
                <Input
                  value={newRelatedName.script || ''}
                  onChange={(e) => setNewRelatedName({ ...newRelatedName, script: e.target.value })}
                  placeholder="Native writing system"
                />
              </div>


              {/* Alternate Origin (show for otherLanguage type) */}
              {newRelatedName.type === 'otherLanguage' && (
                <div className="md:col-span-2">
                  <Label>Alternate Origin (optional)</Label>
                  <Input
                    value={newRelatedName.alternateOrigin || ''}
                    onChange={(e) => setNewRelatedName({ 
                      ...newRelatedName, 
                      alternateOrigin: e.target.value || undefined 
                    })}
                    placeholder="e.g., Spanish > Catalan"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will replace the primary origin when displaying this variant
                  </p>
                </div>
              )}

              {/* Etymology */}
              <div className="md:col-span-2">
                <Label>Etymology Notes (optional)</Label>
                <Input
                  value={newRelatedName.etymology || ''}
                  onChange={(e) => setNewRelatedName({ ...newRelatedName, etymology: e.target.value })}
                  placeholder="Additional etymological info for this form"
                />
              </div>

              {/* Feelings */}
              <div className="md:col-span-2">
                <Label>Feelings (optional)</Label>
                <Input
                  value={newRelatedName.feelings?.join(', ') || ''}
                  onChange={(e) => {
                    const feelingsArray = e.target.value
                      .split(',')
                      .map(f => f.trim())
                      .filter(f => f.length > 0);
                    setNewRelatedName({ 
                      ...newRelatedName, 
                      feelings: feelingsArray.length > 0 ? feelingsArray : undefined 
                    });
                  }}
                  placeholder="e.g., cute, playful, affectionate (comma-separated)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alternative feelings specific to this form (comma-separated)
                </p>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={newRelatedName.notes || ''}
                  onChange={(e) => setNewRelatedName({ ...newRelatedName, notes: e.target.value })}
                  placeholder="Any other notes about this form"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Display Added Related Names */}
        {formData.relatedNames && formData.relatedNames.length > 0 && (
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-semibold">Added Related Names:</Label>
            <div className="space-y-2">
              {formData.relatedNames.map((related, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(related.type)}
                      </Badge>
                      <span className="font-semibold">{related.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      {related.pronunciation && <div>Pronunciation: {related.pronunciation}</div>}
                      {related.script && <div>Script: {related.script}</div>}
                      {related.alternateOrigin && <div>Origin: {related.alternateOrigin}</div>}
                      {related.gender && <div>Gender: {related.gender}</div>}
                      {related.feelings && related.feelings.length > 0 && (
                        <div>Feelings: {related.feelings.join(', ')}</div>
                      )}
                      {related.etymology && <div>Etymology: {related.etymology}</div>}
                      {related.notes && <div>Notes: {related.notes}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editRelatedName(index)}
                      className="h-8 w-8 p-0"
                      disabled={editingIndex !== null}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRelatedName(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
