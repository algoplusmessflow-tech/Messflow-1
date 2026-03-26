import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Merge, Users, UserCheck, Loader2, X } from "lucide-react";
import { MergeZonesModal } from "./MergeZonesModal";

type Driver = {
  id: string;
  name: string;
  phone: string;
  status: string;
};

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
  drivers?: Driver[];
  onAssignDriver?: (zoneId: string, driverId: string | null) => Promise<void>;
  isAssigningDriver?: boolean;
};

export const DeliveryZoneBox: React.FC<Props> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  onRefresh,
  drivers = [],
  onAssignDriver,
  isAssigningDriver = false,
}) => {
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const handleOpenAssignDialog = (zone: DeliveryZone, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedZone(zone);
    setSelectedDriverId(zone.driver?.id || "");
    setIsAssignDialogOpen(true);
  };

  const handleAssignDriver = async () => {
    if (!selectedZone || !onAssignDriver) return;
    try {
      await onAssignDriver(selectedZone.id, selectedDriverId || null);
      setIsAssignDialogOpen(false);
      setSelectedZone(null);
      setSelectedDriverId("");
    } catch (error) {
      console.error("Failed to assign driver:", error);
    }
  };

  const activeDrivers = drivers.filter(d => d.status === 'active');

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
                  className={`cursor-pointer hover:shadow-md transition-all overflow-hidden ${
                    selectedZoneId === zone.id ? "border-primary border-2" : ""
                  }`}
                  onClick={() => onSelectZone(zone.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
                            {zone.name}
                          </h3>
                          {zone.driver && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {zone.driver.name}
                            </Badge>
                          )}
                          {!zone.driver && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No driver
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {zone.member_count || 0}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs max-w-[120px] truncate">
                          {zone.description || "No description"}
                        </Badge>
                        {onAssignDriver && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => handleOpenAssignDialog(zone, e)}
                            title={zone.driver ? "Change driver" : "Assign driver"}
                          >
                            {isAssigningDriver ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
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

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              {selectedZone?.driver ? 'Change Driver' : 'Assign Driver'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedZone && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedZone.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedZone.member_count || 0} members
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Driver</label>
              <Select 
                value={selectedDriverId || "__none__"} 
                onValueChange={(val) => setSelectedDriverId(val === "__none__" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Driver</SelectItem>
                  {activeDrivers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No active drivers available
                    </div>
                  ) : (
                    activeDrivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        <div className="flex items-center gap-2">
                          <span>{driver.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({driver.phone})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a driver to assign to this zone, or choose "No Driver" to remove the current assignment.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignDriver}
                disabled={isAssigningDriver}
                className="flex-1"
              >
                {isAssigningDriver ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    {selectedZone?.driver ? 'Update' : 'Assign'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
