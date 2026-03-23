import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Plus, Merge, Users } from "lucide-react";
import { MergeZonesModal } from "./MergeZonesModal";

type DeliveryZone = {
  id: string;
  name: string;
  description?: string | null;
  member_count?: number;
  driver?: {
    id: string;
    name: string;
    phone: string;
  } | null;
};

type Props = {
  zones: DeliveryZone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  onRefresh?: () => void;
};

export const DeliveryZoneBox: React.FC<Props> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  onRefresh,
}) => {
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Delivery Zones
          </CardTitle>
          <div className="flex items-center gap-2">
            {zones.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMergeOpen(true)}
              >
                <Merge className="h-4 w-4 mr-1" />
                Merge Zones
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/zones")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Manage Zones
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No delivery zones yet.{' '}
              <a href="/zones" className="text-primary hover:underline">
                Add zones
              </a>{' '}
              to get started.
            </p>
          ) : (
            <ScrollArea className="space-y-3" style={{ maxHeight: "400px" }}>
              {zones.map((zone) => (
                <Card
                  key={zone.id}
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    selectedZoneId === zone.id ? "border-primary border-2" : ""
                  }`}
                  onClick={() => onSelectZone(zone.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {zone.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {zone.member_count || 0}
                          </Badge>
                          {zone.driver && (
                            <Badge variant="secondary" className="text-xs">
                              {zone.driver.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs max-w-[120px] truncate">
                        {zone.description || "No description"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <MergeZonesModal
        open={isMergeOpen}
        onOpenChange={setIsMergeOpen}
        zones={zones.map(z => ({
          id: z.id,
          name: z.name,
          description: z.description,
          member_count: z.member_count,
        }))}
        onMergeComplete={() => {
          onRefresh?.();
        }}
      />
    </>
  );
};
