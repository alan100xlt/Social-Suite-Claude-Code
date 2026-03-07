import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface GAProperty {
  propertyId: string;
  displayName: string;
  accountName: string;
}

interface GAPropertySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: GAProperty[];
  onSelect: (property: GAProperty) => Promise<void>;
  isLoading?: boolean;
}

export function GAPropertySelectionDialog({
  open,
  onOpenChange,
  properties,
  onSelect,
  isLoading = false,
}: GAPropertySelectionDialogProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const property = properties.find((p) => p.propertyId === selectedId);
    if (!property) return;

    setSubmitting(true);
    try {
      await onSelect(property);
      onOpenChange(false);
    } catch {
      // Error handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select GA4 Property</DialogTitle>
          <DialogDescription>
            Choose the Google Analytics property to connect. Page metrics and
            traffic data will be synced hourly.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading properties...</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No GA4 properties found. Make sure your Google account has access to at
            least one Analytics property.
          </div>
        ) : (
          <RadioGroup value={selectedId} onValueChange={setSelectedId} className="space-y-3 py-4">
            {properties.map((prop) => (
              <div
                key={prop.propertyId}
                className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer"
                onClick={() => setSelectedId(prop.propertyId)}
              >
                <RadioGroupItem value={prop.propertyId} id={prop.propertyId} />
                <Label htmlFor={prop.propertyId} className="flex-1 cursor-pointer">
                  <div className="font-medium">{prop.displayName}</div>
                  <div className="text-xs text-muted-foreground">{prop.accountName}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || submitting || isLoading}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Property'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GAPropertySelectionDialog;
