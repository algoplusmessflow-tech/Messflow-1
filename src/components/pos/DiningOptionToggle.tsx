import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { UtensilsCrossed, Coffee, Truck } from 'lucide-react';

export type DiningOption = 'dine_in' | 'takeaway' | 'delivery';

interface Props {
  value: DiningOption;
  onChange: (val: DiningOption) => void;
}

export function DiningOptionToggle({ value, onChange }: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(v) => onChange(v as DiningOption)} 
        className="grid grid-cols-3 gap-2 bg-gray-100 p-2 rounded-lg"
      >
        <ToggleGroupItem 
          value="dine_in" 
          className="flex flex-col items-center justify-center gap-2 p-6 text-lg font-semibold border-2 border-transparent hover:border-primary transition-all duration-200"
        >
          <UtensilsCrossed className="h-8 w-8" />
          Dine-in
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="takeaway" 
          className="flex flex-col items-center justify-center gap-2 p-6 text-lg font-semibold border-2 border-transparent hover:border-primary transition-all duration-200"
        >
          <Coffee className="h-8 w-8" />
          Takeaway
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="delivery" 
          className="flex flex-col items-center justify-center gap-2 p-6 text-lg font-semibold border-2 border-transparent hover:border-primary transition-all duration-200"
        >
          <Truck className="h-8 w-8" />
          Delivery
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
