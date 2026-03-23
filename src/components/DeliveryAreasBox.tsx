import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, MapPin } from 'lucide-react';

// Props expected from parent
interface Props {
  areas: any[];
  selectedArea: string | null;
  setSelectedArea: (id: string | null) => void;
  areaName: string;
  setAreaName: (name: string) => void;
  areaDescription: string;
  setAreaDescription: (desc: string) => void;
  isAddAreaOpen: boolean;
  setIsAddAreaOpen: (open: boolean) => void;
  handleCreateArea: (e: React.FormEvent) => void;
  getAreaStats: (areaId: string) => number;
}

export default function DeliveryAreasBox({
  areas,
  selectedArea,
  setSelectedArea,
  areaName,
  setAreaName,
  areaDescription,
  setAreaDescription,
  isAddAreaOpen,
  setIsAddAreaOpen,
  handleCreateArea,
  getAreaStats,
}: Props) {
  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Delivery Zones
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => (window.location.href = '/zones')}>
          <Plus className="h-4 w-4 mr-1" /> Manage Zones
        </Button>
      </CardHeader>
      <CardContent>
        {areas.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No delivery zones yet.{' '}
            <a href="/zones" className="text-primary hover:underline">
              Add zones
            </a>{' '}
            to get started.
          </p>
        ) : (
          <ScrollArea className="space-y-3" style={{ maxHeight: '400px' }}>
            {areas.map((area) => (
              <Card
                key={area.id}
                className="cursor-pointer hover:shadow-md transition-all"
              >
                <CardContent
                  className={`p-4 ${selectedArea === area.id ? 'border-primary border-2' : ''}`}
                  onClick={() => setSelectedArea(area.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{area.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getAreaStats(area.id)} active members
                      </p>
                    </div>
                    <Badge variant="outline">{area.description || 'No description'}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        )}
      </CardContent>

      {/* Add Area Dialog */}
      <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Delivery Area</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateArea} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="areaName">Area Name</Label>
              <Input
                id="areaName"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Downtown, Industrial Area, etc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="areaDescription">Description (Optional)</Label>
              <Input
                id="areaDescription"
                value={areaDescription}
                onChange={(e) => setAreaDescription(e.target.value)}
                placeholder="Brief description of the area"
              />
            </div>
            <Button type="submit" className="w-full">
              Create Delivery Area
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
