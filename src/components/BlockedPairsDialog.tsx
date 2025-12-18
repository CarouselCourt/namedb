/**
 * ========================================
 * BLOCKED PAIRS DIALOG COMPONENT
 * ========================================
 * 
 * This dialog provides a comprehensive interface for managing blocked name pairs
 * in the paired name generator. Blocked pairs are combinations of first name +
 * surname that should never be suggested (e.g., "Harry Potter", "Luke Skywalker").
 * 
 * KEY FEATURES:
 * - View all blocked pairs with full context
 * - Add new blocked pairs via dropdown selectors
 * - Edit existing blocked pairs (change reason, notes, or the names themselves)
 * - Delete blocked pairs
 * - Shows how many name entries match each blocked pair (cognates)
 * - Stores reason and notes for each block
 * 
 * BLOCKED PAIR MATCHING:
 * Blocking is done by NAME STRING, not by ID. This means:
 * - Blocking "Harry Potter" blocks ALL "Harry" entries with ALL "Potter" entries
 * - If you have "Harry" (English), "Harry" (Hebrew), "Potter" (English), "Potter" (German)
 * - All 4 combinations are blocked: 2 Harrys × 2 Potters = 4 blocked pairs
 * 
 * This is intentional to prevent accidentally generating famous names even when
 * they have multiple origin entries (false cognates).
 * 
 * DATA STRUCTURE:
 * Each blocked pair stores:
 * - firstName (string): The first name to block
 * - surname (string): The surname to block
 * - reason (optional): Why it's blocked (e.g., "Popular Media")
 * - notes (optional): Additional context
 * - createdAt: Timestamp when it was added
 * 
 * USAGE:
 * Opened from the PairedNameGenerator via the "Manage Blocked Pairs" button.
 * Users can add pairs they want to avoid suggesting, like:
 * - Famous fictional characters
 * - Real historical figures
 * - Celebrities
 * - Personal associations they want to avoid
 */

import { useState } from "react";
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
import { X, Trash2, Edit2, Plus } from "lucide-react";
import { useBlockedPairs, BlockedPair } from "@/hooks/useBlockedPairs";
import { Card, CardContent } from "@/components/ui/card";
import { Name } from "@/hooks/useNameStorage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * BlockedPairsDialogProps Interface
 * 
 * @param open - Dialog open state
 * @param onOpenChange - Callback when dialog opens/closes
 * @param names - Complete name database (for dropdown options)
 */
interface BlockedPairsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  names: Name[];
}

/**
 * BlockedPairsDialog Component
 * Main component function
 */

export const BlockedPairsDialog = ({ open, onOpenChange, names }: BlockedPairsDialogProps) => {
  const { blockedPairs, addBlockedPair, removeBlockedPair, updateBlockedPair } = useBlockedPairs();
  const [editingPair, setEditingPair] = useState<BlockedPair | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    firstNameId: "",
    surnameId: "",
    reason: "",
    notes: "",
  });

  // Get available first names and surnames
  const firstNames = names
    .filter(n => n.nameType === 'firstName' || n.nameType === 'either')
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const surnames = names
    .filter(n => n.nameType === 'surname' || n.nameType === 'either')
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleAdd = () => {
    if (!formData.firstNameId || !formData.surnameId) return;
    
    const firstName = names.find(n => n.id === formData.firstNameId);
    const surname = names.find(n => n.id === formData.surnameId);
    
    if (!firstName || !surname) return;
    
    addBlockedPair(
      firstName.name,
      surname.name,
      formData.reason,
      formData.notes
    );
    
    setFormData({ firstNameId: "", surnameId: "", reason: "", notes: "" });
    setShowAddForm(false);
  };

  const handleEdit = (pair: BlockedPair) => {
    setEditingPair(pair);
    
    // Find any name with matching name string (first match is fine)
    const firstName = names.find(n => n.name.toLowerCase() === pair.firstName.toLowerCase());
    const surname = names.find(n => n.name.toLowerCase() === pair.surname.toLowerCase());
    
    setFormData({
      firstNameId: firstName?.id || "",
      surnameId: surname?.id || "",
      reason: pair.reason || "",
      notes: pair.notes || "",
    });
    setShowAddForm(true);
  };

  const handleUpdate = () => {
    if (!editingPair || !formData.firstNameId || !formData.surnameId) return;
    
    const firstName = names.find(n => n.id === formData.firstNameId);
    const surname = names.find(n => n.id === formData.surnameId);
    
    if (!firstName || !surname) return;
    
    updateBlockedPair(editingPair.id, {
      firstName: firstName.name,
      surname: surname.name,
      reason: formData.reason,
      notes: formData.notes,
    });
    
    setFormData({ firstNameId: "", surnameId: "", reason: "", notes: "" });
    setEditingPair(null);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setFormData({ firstNameId: "", surnameId: "", reason: "", notes: "" });
    setEditingPair(null);
    setShowAddForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="blocked-pairs-description">
        <DialogHeader>
          <DialogTitle>Blocked Name Pairs</DialogTitle>
          <p id="blocked-pairs-description" className="text-sm text-muted-foreground">
            Manage name combinations that should not appear in the paired generator
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Block New Pair
            </Button>
          )}

          {showAddForm && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Select 
                      value={formData.firstNameId} 
                      onValueChange={(value) => setFormData({ ...formData, firstNameId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select first name..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {firstNames.map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name} {n.origin && n.origin.length > 0 && `(${n.origin.join(', ')})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="surname">Surname *</Label>
                    <Select 
                      value={formData.surnameId} 
                      onValueChange={(value) => setFormData({ ...formData, surnameId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select surname..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {surnames.map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name} {n.origin && n.origin.length > 0 && `(${n.origin.join(', ')})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Popular Media"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this blocked pair..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={editingPair ? handleUpdate : handleAdd}
                    disabled={!formData.firstNameId || !formData.surnameId}
                  >
                    {editingPair ? "Update" : "Add"} Blocked Pair
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label className="text-base">
              Blocked Pairs ({blockedPairs.length})
            </Label>
            
            {blockedPairs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No blocked pairs yet. Add combinations you want to exclude from the generator.
              </p>
            ) : (
              <div className="space-y-2">
                {blockedPairs.map((pair) => {
                  // Find any entries with these names (for display context)
                  const firstNameEntries = names.filter(n => n.name.toLowerCase() === pair.firstName.toLowerCase());
                  const surnameEntries = names.filter(n => n.name.toLowerCase() === pair.surname.toLowerCase());
                  
                  return (
                    <Card key={pair.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">
                              {pair.firstName} {pair.surname}
                              {(firstNameEntries.length > 1 || surnameEntries.length > 1) && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Blocks all cognates
                                </Badge>
                              )}
                            </div>
                            {(firstNameEntries.length > 0 || surnameEntries.length > 0) && (
                              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                                {firstNameEntries.length > 0 && (
                                  <span>First: {firstNameEntries.length} {firstNameEntries.length === 1 ? 'entry' : 'entries'}</span>
                                )}
                                {firstNameEntries.length > 0 && surnameEntries.length > 0 && <span>•</span>}
                                {surnameEntries.length > 0 && (
                                  <span>Last: {surnameEntries.length} {surnameEntries.length === 1 ? 'entry' : 'entries'}</span>
                                )}
                              </div>
                            )}
                            {pair.reason && (
                              <Badge variant="outline" className="text-xs">
                                {pair.reason}
                              </Badge>
                            )}
                            {pair.notes && (
                              <p className="text-sm text-muted-foreground">
                                {pair.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(pair.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(pair)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBlockedPair(pair.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
