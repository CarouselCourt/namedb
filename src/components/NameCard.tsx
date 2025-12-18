/**
 * ============================================================================
 * NAME CARD COMPONENT
 * ============================================================================
 * 
 * This component displays a single name with all its information in a card format.
 * It's the primary way users interact with individual names in the library.
 * 
 * FEATURES:
 * - Displays name details (pronunciation, meaning, etymology, etc.)
 * - Shows categories, feelings, and origins
 * - Displays name relationships (variants, diminutives, gender forms, etc.)
 * - Shows similar names discovered by the similarity algorithm
 * - Provides action buttons (edit, delete, mark as used/blocked)
 * - Highlights duplicate names (false cognates)
 * - Visual status indicators (available/used/blocked)
 * 
 * PROPS:
 * - name: The name data to display (can include displayName for variants)
 * - onEdit: Callback when user clicks edit button
 * - onDelete: Callback when user clicks delete button
 * - onToggleUsed: Legacy callback for toggling used status
 * - onSetStatus: Callback for changing status (available/used/blocked)
 * - similarNames: Pre-calculated list of similar names
 * - allNames: Full name database (used for duplicate detection)
 * 
 * CARD SECTIONS (in order):
 * 1. Header: Name, type, gender, origin badges
 * 2. Status badges: Visual indicators for used/blocked status
 * 3. Action buttons: Edit, delete, mark used/blocked
 * 4. Meaning & Context: Pronunciation, categories, literal meaning, etymology, roots
 * 5. Name Relationships: Variants, diminutives, gender forms, false cognates
 * 6. Similar Names: Linguistically related names (from similarity algorithm)
 * 
 * VISUAL STYLING:
 * - Available names: Normal appearance
 * - Used names: Muted background, slight grayscale, blue border
 * - Blocked names: More muted, more grayscale, red border
 */

import { Name } from "@/hooks/useNameStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CheckCircle2, Circle, Ban, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { BlockNameDialog } from "@/components/BlockNameDialog";
import { hasDuplicates, findDuplicateNames, getDistinguishingLabel } from "@/utils/duplicateNames";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * NameCardProps: Props interface for NameCard component
 * 
 * EXTENDED NAME TYPE:
 * name can have additional properties:
 * - displayName: The spelling variant to show (for alternate spellings)
 * - isPrimarySpelling: Is this the main spelling or a variant?
 */
interface NameCardProps {
  name: Name & { displayName?: string; isPrimarySpelling?: boolean };
  onEdit: (name: Name) => void;
  onDelete: (id: string, variantSpelling?: string) => void;
  onToggleUsed: (id: string, usedIn?: string) => void;
  onSetStatus: (id: string, status: 'available' | 'blocked' | 'used', payload?: { usedIn?: string; blockedReason?: string }) => void;
  similarNames?: { name: Name; reason: string; score?: number }[];
  allNames: Name[];
}

/**
 * NameCard: Main component function
 */
export const NameCard = ({ name, onEdit, onDelete, onToggleUsed, onSetStatus, similarNames, allNames }: NameCardProps) => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  /**
   * UI state for "mark as used" feature
   * - showUsedInput: Is the "Where used?" input field visible?
   * - usedInValue: The current value in the "Where used?" input
   */
  const [showUsedInput, setShowUsedInput] = useState(false);
  const [usedInValue, setUsedInValue] = useState(name.usedIn || "");
  
  /**
   * Dialog state for blocking a name
   */
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  
  /**
   * Dialog state for confirming deletion
   */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  /**
   * Expansion state for collapsible sections
   * - showAllSimilar: Show all similar names or just first 5?
   * - showAllCategories: Show all categories or just first 3?
   * - showAllFeelings: Show all feelings or just first 5?
   */
  const [showAllSimilar, setShowAllSimilar] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllFeelings, setShowAllFeelings] = useState(false);
  
  /**
   * DUPLICATE DETECTION
   * Find names with the same spelling but different origins (false cognates)
   * Example: "Kim" (Korean) vs "Kim" (German surname)
   */
  const duplicates = findDuplicateNames(name, allNames);
  const isDuplicate = duplicates.length > 0;

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================
  
  /**
   * handleMarkUsed - Toggle the "mark as used" workflow
   * 
   * WORKFLOW:
   * 1. First click: Show input field for "Where used?"
   * 2. Second click: Save the status with the usedIn value
   * 
   * The input allows tracking where the name was used (character name, URL, etc.)
   */
  const handleMarkUsed = () => {
    if (!showUsedInput) {
      setShowUsedInput(true);
    } else {
      onSetStatus(name.id, 'used', { usedIn: usedInValue });
      setShowUsedInput(false);
    }
  };

  /**
   * handleBlockConfirm - Process blocking a name with reasons
   * 
   * REASON FORMATTING:
   * Takes an array of reason objects: [{ type: "Too Popular", notes: "Top 10 in US" }]
   * Formats them into a string: "Too Popular: Top 10 in US | Hard to Spell"
   * 
   * This formatted string is stored in the name's blockedReason field.
   */
  const handleBlockConfirm = (reasons: Array<{ type: string; notes?: string }>) => {
    // Format the reasons into a readable string
    const formattedReason = reasons.map(r => {
      const base = r.type;
      return r.notes ? `${base}: ${r.notes}` : base;
    }).join(' | ');
    
    onSetStatus(name.id, 'blocked', { blockedReason: formattedReason });
  };

  /**
   * handleMarkAvailable - Reset name to available status
   * 
   * Clears any used/blocked status and resets related UI state.
   */
  const handleMarkAvailable = () => {
    onSetStatus(name.id, 'available');
    setShowUsedInput(false);
    setUsedInValue("");
  };

  /**
   * getNameTypeLabel - Convert nameType to display label
   * 
   * Maps internal values to user-friendly labels:
   * - "firstName" → "First Name"
   * - "surname" → "Surname"
   * - "either" → "Either"
   */
  const getNameTypeLabel = (type: string) => {
    const labels = {
      firstName: "First Name",
      surname: "Surname",
      either: "Either",
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Current status of the name (available, used, or blocked)
  const status = name.status || 'available';

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================
  
  /**
   * CARD VISUAL STATES:
   * - Available: Normal appearance, default styling
   * - Used: Muted background, 30% grayscale, blue border
   * - Blocked: More muted background, 50% grayscale, red border
   * 
   * The card has a unique ID for smooth scrolling navigation when clicking
   * similar names or duplicates.
   */
  return (
    <Card 
      id={`name-card-${name.id}`} 
      className={`transition-all hover:shadow-lg max-h-[600px] flex flex-col ${
        status === 'used' ? 'bg-muted/50 opacity-70 grayscale-[30%] border-primary border-2' : 
        status === 'blocked' ? 'bg-muted/40 opacity-60 grayscale-[50%] border-destructive border-2' : ''
      }`}
    >
      {/* ================================================================
          CARD HEADER: Name, Type, Gender, Origin
          ================================================================ */}
      <CardHeader className="space-y-2 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-1">
              {/* Show native script if available (e.g., 한국어, 日本語) */}
              {(() => {
                // If displaying a variant, check if it has its own script
                if (name.displayName && !name.isPrimarySpelling) {
                  const variantData = name.relatedNames?.find(r => r.name === name.displayName);
                  const scriptToShow = variantData?.script || name.script;
                  return scriptToShow ? <div className="text-3xl mb-1">{scriptToShow}</div> : null;
                }
                return name.script ? <div className="text-3xl mb-1">{name.script}</div> : null;
              })()}
              {/* Display variant spelling if this is a variant card, otherwise main name */}
              {name.displayName || name.name}
            </CardTitle>
            {/* Badge section: Name type, gender, and most specific origins */}
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="secondary">{getNameTypeLabel(name.nameType)}</Badge>
              {name.gender && name.gender !== 'any' && (
                <Badge variant="outline" className="capitalize">{name.gender}</Badge>
              )}
              {/* Only show most specific origins (hide parent categories if child exists) */}
              {(() => {
                // If displaying a variant with an alternateOrigin, use that instead
                // Normalize origin to array (it may be a string or array)
                let originsToDisplay = Array.isArray(name.origin) 
                  ? name.origin 
                  : (name.origin ? [name.origin] : []);
                
                if (name.displayName && !name.isPrimarySpelling) {
                  const variantData = name.relatedNames?.find(r => r.name === name.displayName);
                  if (variantData?.alternateOrigin) {
                    originsToDisplay = [variantData.alternateOrigin];
                  }
                }
                
                if (originsToDisplay.length > 0) {
                  return originsToDisplay
                    .filter(origin => {
                      const hasMoreSpecific = originsToDisplay.some(other => 
                        other !== origin && 
                        other.startsWith(origin + ' > ')
                      );
                      return !hasMoreSpecific;
                    })
                    .map((origin, idx) => (
                      <Badge key={idx} variant="outline">{origin}</Badge>
                    ));
                }
                return null;
              })()}
            </div>
          </div>
          {/* Action buttons: Edit and Delete */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(name)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* ================================================================
          CARD CONTENT: All name details and metadata
          ================================================================ */}
      <CardContent className="space-y-3 overflow-y-auto flex-1">
        
        {/* Status section with visual badge */}
        <div>
          <span className="font-medium text-muted-foreground">Status: </span>
          <Badge variant={
            status === 'used' ? 'secondary' : 
            status === 'blocked' ? 'destructive' : 
            'outline'
          } className="capitalize">
            {status}
          </Badge>
          {/* Show blocking reason if blocked */}
          {status === 'blocked' && name.blockedReason && (
            <div className="text-sm text-muted-foreground mt-1">Reason: {name.blockedReason}</div>
          )}
        </div>
        {name.pronunciation && (
          <div>
            <span className="font-medium text-muted-foreground">Pronunciation: </span>
            <span className="italic">{name.pronunciation}</span>
          </div>
        )}
        {Array.isArray(name.meanings) && name.meanings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-muted-foreground">Categories: </span>
              {(() => {
                const filteredCategories = [...(name.meanings || [])]
                  .filter(category => {
                    const hasMoreSpecific = name.meanings?.some(other => 
                      other !== category && 
                      other.startsWith(category + ' > ')
                    );
                    return !hasMoreSpecific;
                  })
                  .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true }));
                
                return filteredCategories.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                  >
                    View {showAllCategories ? 'Less' : 'More'}
                  </Button>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-1">
              {(() => {
                const filteredCategories = [...(name.meanings || [])]
                  .filter(category => {
                    const hasMoreSpecific = name.meanings?.some(other => 
                      other !== category && 
                      other.startsWith(category + ' > ')
                    );
                    return !hasMoreSpecific;
                  })
                  .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true }));
                
                return (showAllCategories ? filteredCategories : filteredCategories.slice(0, 6))
                  .map((meaning, idx) => (
                    <Badge key={idx} variant="secondary">{meaning}</Badge>
                  ));
              })()}
            </div>
          </div>
        )}

        {name.meaning && (
          <div>
            <span className="font-medium text-muted-foreground">Literal meaning: </span>
            <span className="text-sm">{name.meaning}</span>
          </div>
        )}
        {(() => {
          // Check if viewing a variant with alternative feelings
          let feelingsToDisplay = name.feelings || [];
          
          if (name.displayName && !name.isPrimarySpelling) {
            const variantData = name.relatedNames?.find(r => r.name === name.displayName);
            if (variantData?.feelings && variantData.feelings.length > 0) {
              feelingsToDisplay = variantData.feelings;
            }
          }
          
          return Array.isArray(feelingsToDisplay) && feelingsToDisplay.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-muted-foreground">Feelings: </span>
                {(() => {
                  const sortedFeelings = [...feelingsToDisplay]
                    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true }));
                  
                  return sortedFeelings.length > 6 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => setShowAllFeelings(!showAllFeelings)}
                    >
                      View {showAllFeelings ? 'Less' : 'More'}
                    </Button>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const sortedFeelings = [...feelingsToDisplay]
                    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true }));
                  
                  return (showAllFeelings ? sortedFeelings : sortedFeelings.slice(0, 6))
                    .map((feeling, idx) => (
                      <Badge key={idx} variant="outline">{feeling}</Badge>
                    ));
                })()}
              </div>
            </div>
          );
        })()}
        {name.etymology && (
          <div>
            <span className="font-medium text-muted-foreground">Etymology: </span>
            <span className="text-sm">{name.etymology}</span>
          </div>
        )}
        {name.roots && name.roots.length > 0 && (
          <div>
            <span className="font-medium text-muted-foreground">Etymological Roots: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {name.roots.map((root, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">{root}</Badge>
              ))}
            </div>
          </div>
        )}
        {name.notes && (
          <div>
            <span className="font-medium text-muted-foreground">Notes: </span>
            <span className="text-sm">{name.notes}</span>
          </div>
        )}

        {/* ================================================================
            NAME RELATIONSHIPS SECTION
            Shows direct name-to-name connections from relatedNames array
            ================================================================ */}
        {((name.relatedNames && name.relatedNames.length > 0) || duplicates.length > 0) && (
          <div className="border-t pt-3 mt-3 space-y-2">
            <span className="font-medium text-muted-foreground text-sm">Related Forms & Relationships:</span>
            
            {/* FALSE COGNATES: Names with same spelling but different origins */}
            {duplicates.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">False Cognates: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {duplicates.map((dup) => (
                    <Badge 
                      key={dup.id} 
                      variant="outline" 
                      className="text-xs cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        const targetElement = document.getElementById(`name-card-${dup.id}`);
                        if (targetElement) {
                          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          targetElement.classList.add('ring-2', 'ring-white');
                          setTimeout(() => {
                            targetElement.classList.remove('ring-2', 'ring-white');
                          }, 2000);
                        }
                      }}
                    >
                      {getDistinguishingLabel(dup)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Group related names by type */}
            {name.relatedNames && name.relatedNames.length > 0 && (() => {
              const byType: { [key: string]: typeof name.relatedNames } = {};
              
              // If viewing a variant, determine the relationship type and handle accordingly
              let filteredRelated;
              
              if (name.displayName && !name.isPrimarySpelling) {
                // Find what type of variant this is
                const thisVariantType = name.relatedNames.find(r => r.name === name.displayName)?.type;
                
                // If this is a diminutive, show primary as "Full Form" and other diminutives as alternates
                if (thisVariantType === 'diminutive') {
                  filteredRelated = [];
                  
                  // Add primary name as full form
                  filteredRelated.push({
                    name: name.name,
                    type: 'fullForm'
                  });
                  
                  // Add other diminutives as alternate spellings (excluding self)
                  const otherDiminutives = name.relatedNames.filter(r => 
                    r.type === 'diminutive' && r.name !== name.displayName
                  );
                  otherDiminutives.forEach(dim => {
                    filteredRelated.push({
                      ...dim,
                      type: 'alternateSpelling'
                    });
                  });
                  
                  // Add any actual alternate spellings of the primary as full forms too
                  const primaryAlternates = name.relatedNames.filter(r => 
                    r.type === 'alternateSpelling'
                  );
                  primaryAlternates.forEach(alt => {
                    filteredRelated.push({
                      ...alt,
                      type: 'fullForm'
                    });
                  });
                  
                  // Add gender forms and other language forms as-is
                  const otherRelations = name.relatedNames.filter(r => 
                    r.type !== 'diminutive' && 
                    r.type !== 'alternateSpelling' &&
                    r.name !== name.displayName
                  );
                  filteredRelated.push(...otherRelations);
                } else if (thisVariantType === 'masculineForm' || thisVariantType === 'feminineForm' || thisVariantType === 'neutralForm') {
                  // Handle gender forms
                  filteredRelated = [];
                  
                  // Get the gender of this variant
                  const thisVariantGender = name.relatedNames.find(r => r.name === name.displayName)?.gender || name.gender;
                  
                  // Determine the primary name's gender by examining other gender forms
                  // If we're viewing a masculine form and there are feminine forms, the primary must be feminine (or neutral with multiple forms)
                  const hasMasculineForms = name.relatedNames.some(r => r.type === 'masculineForm');
                  const hasFeminineForms = name.relatedNames.some(r => r.type === 'feminineForm');
                  const hasNeutralForms = name.relatedNames.some(r => r.type === 'neutralForm');
                  
                  let primaryGender: string;
                  if (thisVariantGender === 'masculine' && hasFeminineForms && !hasNeutralForms) {
                    primaryGender = 'feminine';
                  } else if (thisVariantGender === 'feminine' && hasMasculineForms && !hasNeutralForms) {
                    primaryGender = 'masculine';
                  } else if (thisVariantGender === 'masculine' && hasNeutralForms) {
                    primaryGender = 'neutral';
                  } else if (thisVariantGender === 'feminine' && hasNeutralForms) {
                    primaryGender = 'neutral';
                  } else if (thisVariantGender === 'neutral' && (hasMasculineForms || hasFeminineForms)) {
                    // If viewing neutral and there are gendered forms, check which is more prominent
                    primaryGender = hasMasculineForms ? 'masculine' : 'feminine';
                  } else {
                    // Default to name.gender (which should be the primary's gender)
                    primaryGender = name.gender;
                  }
                  const primaryRelType = primaryGender === 'masculine' ? 'masculineForm' : 
                                        primaryGender === 'feminine' ? 'feminineForm' :
                                        primaryGender === 'neutral' ? 'neutralForm' : 'alternateSpelling';
                  filteredRelated.push({
                    name: name.name,
                    type: primaryRelType,
                    gender: primaryGender
                  });
                  
                  // Add alternate spellings of the primary with same gender type as primary
                  const primaryAlternates = name.relatedNames.filter(r => 
                    r.type === 'alternateSpelling'
                  );
                  primaryAlternates.forEach(alt => {
                    filteredRelated.push({
                      ...alt,
                      type: primaryRelType,
                      gender: primaryGender
                    });
                  });
                  
                  // Add other gender forms based on whether they match this variant's gender
                  const otherGenderForms = name.relatedNames.filter(r => 
                    (r.type === 'masculineForm' || r.type === 'feminineForm' || r.type === 'neutralForm') &&
                    r.name !== name.displayName
                  );
                  
                  otherGenderForms.forEach(form => {
                    if (form.gender === thisVariantGender) {
                      // Same gender = alternate spelling
                      filteredRelated.push({
                        ...form,
                        type: 'alternateSpelling'
                      });
                    } else {
                      // Different gender = keep as gender form
                      filteredRelated.push(form);
                    }
                  });
                  
                  // Add diminutives and other language forms as-is
                  const otherRelations = name.relatedNames.filter(r => 
                    r.type === 'diminutive' || r.type === 'otherLanguage'
                  );
                  filteredRelated.push(...otherRelations);
                } else if (thisVariantType === 'otherLanguage') {
                  // Handle other language forms - show inverse relationship
                  filteredRelated = [];
                  
                  // Get the primary origin for display
                  const primaryOrigin = name.origin && name.origin.length > 0 
                    ? name.origin.find(o => !name.origin!.some(other => other !== o && other.startsWith(o + ' > '))) || name.origin[0]
                    : undefined;
                  
                  // Add primary name as an otherLanguage form
                  filteredRelated.push({
                    name: name.name,
                    type: 'otherLanguage',
                    alternateOrigin: primaryOrigin
                  });
                  
                  // Add other otherLanguage forms (excluding self)
                  const otherLanguageForms = name.relatedNames.filter(r => 
                    r.type === 'otherLanguage' && r.name !== name.displayName
                  );
                  filteredRelated.push(...otherLanguageForms);
                  
                  // Add diminutives, gender forms, and alternate spellings
                  const otherRelations = name.relatedNames.filter(r => 
                    r.type !== 'otherLanguage' && r.name !== name.displayName
                  );
                  filteredRelated.push(...otherRelations);
                } else {
                  // For non-diminutive, non-gender-form variants, use original logic
                  filteredRelated = name.relatedNames.filter(related => 
                    related.name !== name.displayName
                  );
                  
                  // Add primary as alternate spelling
                  filteredRelated.push({
                    name: name.name,
                    type: 'alternateSpelling'
                  });
                }
              } else {
                // For primary names, just filter out self
                filteredRelated = name.relatedNames.filter(related => 
                  related.name !== name.displayName
                );
              }
              
              filteredRelated.forEach(related => {
                if (!byType[related.type]) byType[related.type] = [];
                byType[related.type].push(related);
              });
              
              const typeLabels: { [key: string]: string } = {
                alternateSpelling: 'Alternate Spellings',
                diminutive: 'Diminutives',
                feminineForm: 'Feminine Forms',
                masculineForm: 'Masculine Forms',
                neutralForm: 'Neutral Forms',
                otherLanguage: 'Other Languages/Cultures',
                fullForm: 'Full Forms'
              };
              
              // Define the order in which relationship types should appear
              const orderedTypes = [
                'alternateSpelling',
                'diminutive',
                'fullForm',
                'feminineForm',
                'masculineForm',
                'neutralForm',
                'otherLanguage'
              ];
              
              // Only show sections that have related names
              return orderedTypes
                .filter(type => byType[type] && byType[type].length > 0)
                .map(type => {
                  const related = byType[type];
                  return (
                    <div key={type}>
                      <span className="text-xs text-muted-foreground">{typeLabels[type]}: </span>
                       <div className="flex flex-wrap gap-1 mt-1">
                        {related.map((rel, idx) => (
                          <div key={idx} className="relative group">
                            <Badge variant="outline" className="text-xs pr-6">
                              {rel.name}
                              {rel.alternateOrigin && ` (${rel.alternateOrigin.split(' > ').pop()})`}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                // Open the name dialog with this related name selected for editing
                                onEdit({ ...name, editingRelatedName: rel } as any);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        )}
        
        {/* ================================================================
            SIMILAR NAMES SECTION
            Names found by the similarity algorithm (linguistic relationships)
            ================================================================ */}
        {similarNames && similarNames.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-muted-foreground text-sm">Similar Names (by relevance):</span>
              {/* Show/hide toggle if more than 6 similar names */}
              {similarNames.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setShowAllSimilar(!showAllSimilar)}
                >
                  View {showAllSimilar ? 'Less' : 'More'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {/* Show all or just first 6, based on toggle state */}
              {(showAllSimilar ? similarNames : similarNames.slice(0, 6))
                .map((similar, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      /**
                       * SIMILARITY NAVIGATION:
                       * Click to scroll to similar name's card with highlight effect
                       * Shows reason for similarity in badge text (e.g., "shared meaning")
                       */
                      const targetElement = document.getElementById(`name-card-${similar.name.id}`);
                      if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetElement.classList.add('ring-2', 'ring-white');
                        setTimeout(() => {
                          targetElement.classList.remove('ring-2', 'ring-white');
                        }, 2000);
                      }
                    }}
                  >
                    {similar.name.name} ({similar.reason})
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* ================================================================
            STATUS ACTIONS SECTION
            Buttons to change name status (available/used/blocked)
            ================================================================ */}
        <div className="border-t pt-3 mt-3 space-y-2">
          {/* Show "Used in" information if name is marked as used */}
          {status === 'used' && name.usedIn && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Used in: </span>
              {/* If usedIn is a URL, make it clickable with external link icon */}
              {name.usedIn.startsWith('http://') || name.usedIn.startsWith('https://') ? (
                <a 
                  href={name.usedIn} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {name.usedIn}
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span>{name.usedIn}</span>
              )}
            </div>
          )}

          {/* Input field for "Where used?" - appears after clicking "Mark Used" */}
          {showUsedInput && (
            <Input
              placeholder="Character name or URL..."
              value={usedInValue}
              onChange={(e) => setUsedInValue(e.target.value)}
              className="mb-2"
            />
          )}

          {/* Action buttons - only show buttons for status transitions that are possible */}
          <div className="flex justify-center gap-2">
            {status !== 'available' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkAvailable}
                className="text-xs"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Available
              </Button>
            )}

            {status !== 'used' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkUsed}
                className="text-xs"
              >
                <Circle className="mr-1 h-3 w-3" />
                Mark Used
              </Button>
            )}

            {status !== 'blocked' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBlockDialog(true)}
                className="text-xs"
              >
                <Ban className="mr-1 h-3 w-3" />
                Block
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Delete {name.displayName || name.name}?
              {name.displayName && !name.isPrimarySpelling && (
                <Badge variant="secondary" className="text-xs">
                  Variant of {name.name}
                </Badge>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {name.displayName && !name.isPrimarySpelling 
                ? `This will remove the spelling "${name.displayName}" from the name entry. The primary name and other variants will remain.`
                : "This will permanently delete this name entry and all its variants. This action cannot be undone."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const variantToDelete = name.displayName && !name.isPrimarySpelling ? name.displayName : undefined;
                onDelete(name.id, variantToDelete);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Name Dialog - Opens when user clicks "Block" button */}
      <BlockNameDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        onConfirm={handleBlockConfirm}
        nameName={name.name}
      />
    </Card>
  );
};
