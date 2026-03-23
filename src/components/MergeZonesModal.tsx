import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Users, Merge, AlertTriangle } from 'lucide-react';

type DeliveryZone = {
  id: string;
  name: string;
  description?: string | null;
  member_count?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: DeliveryZone[];
  onMergeComplete: () => void;
};

export function MergeZonesModal({ open, onOpenChange, zones, onMergeComplete }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [targetZone, setTargetZone] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);

  const toggleZone = (zoneId: string) => {
    setSelectedZones(prev =>
      prev.includes(zoneId)
        ? prev.filter(id => id !== zoneId)
        : [...prev, zoneId]
    );
  };

  const handleMerge = async () => {
    if (!user || selectedZones.length < 2 || !targetZone) return;

    setIsMerging(true);
    try {
      const zonesToMerge = selectedZones.filter(id => id !== targetZone);
      
      // Update all members from merged zones to target zone
      const memberUpdateResult = await supabase
        .from('members')
        .update({ delivery_area_id: targetZone } as any)
        .in('delivery_area_id', zonesToMerge);

      if (memberUpdateResult.error) throw memberUpdateResult.error;

      // Delete the merged zones
      for (const zoneId of zonesToMerge) {
        const deleteResult = await supabase.from('delivery_areas').delete().eq('id', zoneId);
        if (deleteResult.error) throw deleteResult.error;
      }

      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveryAreas', user.id] });
      queryClient.invalidateQueries({ queryKey: ['members', user.id] });
      queryClient.invalidateQueries({ queryKey: ['members-geo', user.id] });

      toast.success(`Merged ${zonesToMerge.length} zones successfully!`);
      setSelectedZones([]);
      setTargetZone('');
      onMergeComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to merge zones: ' + error.message);
    } finally {
      setIsMerging(false);
    }
  };

  const totalMembers = selectedZones.reduce(
    (sum, id) => sum + (zones.find(z => z.id === id)?.member_count || 0),
    0
  );

  const availableTargets = zones.filter(z => !selectedZones.includes(z.id) || selectedZones.includes(z.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Merge Zones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Select zones to merge (select 2 or more)</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedZones.includes(zone.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleZone(zone.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedZones.includes(zone.id)}
                      onCheckedChange={() => toggleZone(zone.id)}
                    />
                    <div>
                      <p className="font-medium">{zone.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {zone.member_count || 0} members
                      </p>
                    </div>
                  </div>
                  {zone.description && (
                    <Badge variant="outline" className="text-xs">
                      {zone.description.slice(0, 20)}...
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {selectedZones.length >= 2 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{totalMembers}</strong> members will be reassigned
                </span>
              </div>
            )}
          </div>

          {selectedZones.length >= 2 && (
            <div className="space-y-3">
              <Label>Select target zone (members will be moved here)</Label>
              <div className="space-y-2">
                {zones
                  .filter(z => selectedZones.includes(z.id))
                  .map((zone) => (
                    <div
                      key={zone.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        targetZone === zone.id
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setTargetZone(zone.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          targetZone === zone.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {targetZone === zone.id && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{zone.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Keep as target zone
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedZones.length >= 2 && targetZone && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    This action cannot be undone
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    {selectedZones.length - 1} zones will be permanently deleted. 
                    All members will be reassigned to <strong>{zones.find(z => z.id === targetZone)?.name}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedZones([]);
                setTargetZone('');
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={selectedZones.length < 2 || !targetZone || isMerging}
              className="flex-1"
            >
              {isMerging ? 'Merging...' : `Merge ${selectedZones.length} Zones`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
