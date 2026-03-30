import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AddTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTableModal({ open, onOpenChange }: AddTableModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [capacityOption, setCapacityOption] = useState("4");
  const [customCapacity, setCustomCapacity] = useState("");
  const [zone, setZone] = useState("indoor");

  const isCustomCapacity = capacityOption === "custom";
  const finalCapacity = isCustomCapacity ? parseInt(customCapacity, 10) : parseInt(capacityOption, 10);

  const addTableMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user found");
      
      const { data, error } = await supabase
        .from("restaurant_tables")
        .insert({
          owner_id: user.id,
          name,
          capacity: finalCapacity || 4,
          zone,
          status: "available",
          is_active: true
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant_tables"] });
      toast({ title: "Table added successfully" });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to add table", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setName("");
    setCapacityOption("4");
    setCustomCapacity("");
    setZone("indoor");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isNaN(finalCapacity)) {
      toast({ 
        title: "Please fill required fields validly", 
        variant: "destructive" 
      });
      return;
    }
    addTableMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Table</DialogTitle>
          <DialogDescription>
            Register a new table for your restaurant to start tracking orders.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Table Name / Number *</Label>
            <Input 
              id="name" 
              placeholder="e.g. Table 1, VIP Booth" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="min-h-[44px]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity">Seating Capacity</Label>
            <Select value={capacityOption} onValueChange={setCapacityOption}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select capacity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2" className="min-h-[44px] cursor-pointer">2 Seater</SelectItem>
                <SelectItem value="4" className="min-h-[44px] cursor-pointer">4 Seater</SelectItem>
                <SelectItem value="6" className="min-h-[44px] cursor-pointer">6 Seater</SelectItem>
                <SelectItem value="8" className="min-h-[44px] cursor-pointer">8 Seater</SelectItem>
                <SelectItem value="custom" className="min-h-[44px] cursor-pointer font-medium text-primary">Other (Custom)</SelectItem>
              </SelectContent>
            </Select>
            {isCustomCapacity && (
              <Input 
                type="number"
                min="1"
                placeholder="Enter number of seats" 
                value={customCapacity} 
                onChange={(e) => setCustomCapacity(e.target.value)}
                className="mt-2 min-h-[44px]"
                required
              />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zone">Zone / Area</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indoor" className="min-h-[44px] cursor-pointer">Indoor</SelectItem>
                <SelectItem value="outdoor" className="min-h-[44px] cursor-pointer">Outdoor</SelectItem>
                <SelectItem value="terrace" className="min-h-[44px] cursor-pointer">Terrace</SelectItem>
                <SelectItem value="bar" className="min-h-[44px] cursor-pointer">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="pt-4 sm:space-x-2 flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addTableMutation.isPending}
              className="min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              {addTableMutation.isPending ? "Saving..." : "Save Table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
