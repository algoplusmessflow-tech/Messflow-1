import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin } from "lucide-react";
import { RestaurantTable } from "@/integrations/supabase/types";

interface TableCardProps {
  table: RestaurantTable;
  onClick?: (table: RestaurantTable) => void;
}

export function TableCard({ table, onClick }: TableCardProps) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'occupied':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'cleaning':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] min-h-[120px] shadow-sm border-gray-200 touch-manipulation" 
      onClick={() => onClick && onClick(table)}
      role="button"
      tabIndex={0}
    >
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-2 min-h-[44px]">
        <h3 className="font-semibold text-lg">{table.name}</h3>
        <Badge className={`capitalize ${getStatusColor(table.status)} border-0`}>
          {table.status || 'unknown'}
        </Badge>
      </CardHeader>
      <CardContent className="px-4 py-3 flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <Users className="w-4 h-4" />
          <span>{table.capacity}</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <MapPin className="w-4 h-4" />
          <span className="capitalize">{table.zone || 'Indoor'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
