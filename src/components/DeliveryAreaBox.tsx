import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MapPin } from 'lucide-react';

type DeliveryArea = {
  id: string;
  name: string;
  description?: string;
};

type Props = {
  areas: DeliveryArea[];
  selectedArea: string | null;
  setSelectedArea: (id: string | null) => void;
  getAreaStats: (areaId: string) => number;
  onManageZones: () => void;
};

export const DeliveryAreaBox: React.FC<Props> = ({
  areas,
  selectedArea,
  setSelectedArea,
  getAreaStats,
  onManageZones,
}) => {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Zones
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onManageZones}>
          <Plus className="h-4 w-4 mr-1" />
          Manage Zones
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
                    <Badge variant="outline">
                      {area.description || 'No description'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
