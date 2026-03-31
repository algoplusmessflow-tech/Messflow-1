import React, { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  selectedTableId: string | null;
  onSelect: (id: string) => void;
}

export function QuickTableSelect({ selectedTableId, onSelect }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['restaurant_tables', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Invalidate when tables change elsewhere (could add realtime, omitted for brevity)
  useEffect(() => {
    const channel = supabase
      .channel('tables-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        queryClient.invalidateQueries({ queryKey: ['restaurant_tables', user?.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (isLoading) {
    return <div className="py-4 text-center text-muted-foreground text-xl">Loading tables…</div>;
  }

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap py-4">
        <div className="flex space-x-3 px-2">
          {tables.map(table => (
            <Button
              key={table.id}
              variant={selectedTableId === table.id ? 'default' : 'outline'}
              size="lg"
              className={cn(
                'flex-shrink-0 min-w-[120px] h-16 text-xl font-bold',
                selectedTableId === table.id 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-300'
              )}
              onClick={() => onSelect(table.id)}
            >
              {table.name ?? `Table ${table.id}`}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
