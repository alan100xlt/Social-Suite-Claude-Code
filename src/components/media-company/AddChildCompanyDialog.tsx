import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAddChildCompany } from '@/hooks/useMediaCompanyHierarchy';
import { useAllCompanies } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

interface AddChildCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaCompanyId: string;
  existingChildIds: string[];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function AddChildCompanyDialog({
  open,
  onOpenChange,
  mediaCompanyId,
  existingChildIds,
}: AddChildCompanyDialogProps) {
  const [tab, setTab] = useState('create');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create new state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');

  // Add existing state
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [relationshipType, setRelationshipType] = useState<'owned' | 'managed' | 'partnered'>('owned');

  const { data: allCompanies } = useAllCompanies();
  const addChildMutation = useAddChildCompany();

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(generateSlug(name));
    }
  }, [name, slugManuallyEdited]);

  const availableCompanies = (allCompanies || []).filter(
    c => !existingChildIds.includes(c.id)
  );

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      // Create the company
      const { data: company, error } = await supabase
        .from('companies')
        .insert({
          name: name.trim(),
          slug: slug.trim() || generateSlug(name),
          website_url: websiteUrl.trim() || null,
          branding: description.trim() ? { description: description.trim() } : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Associate with media company
      await addChildMutation.mutateAsync({
        mediaCompanyId,
        childCompanyId: company.id,
        relationshipType: 'owned',
      });

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['all-companies'] });
      toast({ title: 'Company Created', description: `${name} has been created and added to the portfolio.` });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to create company',
        variant: 'destructive',
      });
    },
  });

  const handleAddExisting = async () => {
    if (!selectedCompanyId) return;
    try {
      await addChildMutation.mutateAsync({
        mediaCompanyId,
        childCompanyId: selectedCompanyId,
        relationshipType,
      });
      toast({ title: 'Company Added', description: 'Company has been added to the portfolio.' });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to add company',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setSlugManuallyEdited(false);
    setWebsiteUrl('');
    setDescription('');
    setSelectedCompanyId('');
    setRelationshipType('owned');
    setTab('create');
  };

  const isPending = createAndAddMutation.isPending || addChildMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Company to Portfolio</DialogTitle>
          <DialogDescription>
            Create a new company or add an existing one to this media company.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="existing">Add Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name *</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-slug">URL Slug</Label>
              <Input
                id="new-slug"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }}
                placeholder="company-slug"
              />
              <p className="text-xs text-muted-foreground">Auto-generated from name.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-website">Website</Label>
              <Input
                id="new-website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-desc">Description</Label>
              <Textarea
                id="new-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the company"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => createAndAddMutation.mutate()}
                disabled={isPending || !name.trim()}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create & Add
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Company</Label>
              <Command className="border rounded-md">
                <CommandInput placeholder="Search companies..." className="h-9" />
                <CommandList className="max-h-48">
                  <CommandEmpty>No companies available</CommandEmpty>
                  <CommandGroup>
                    {availableCompanies.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => setSelectedCompanyId(c.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCompanyId === c.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            <div className="space-y-2">
              <Label>Relationship Type</Label>
              <Select value={relationshipType} onValueChange={(v) => setRelationshipType(v as typeof relationshipType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="managed">Managed</SelectItem>
                  <SelectItem value="partnered">Partnered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleAddExisting}
                disabled={isPending || !selectedCompanyId}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add to Portfolio
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
