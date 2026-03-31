import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DiningOptionToggle, DiningOption } from '@/components/pos/DiningOptionToggle';
import { QuickTableSelect } from '@/components/pos/QuickTableSelect';
import { Plus } from 'lucide-react';

// Placeholder static menu items – replace with real data source as needed
const MENU_ITEMS = [
  { id: '1', name: 'Chicken Biryani', price: 25 },
  { id: '2', name: 'Paneer Butter Masala', price: 20 },
  { id: '3', name: 'Tandoori Roti', price: 5 },
  { id: '4', name: 'Mango Lassi', price: 8 },
];

export default function POS() {
  const { user } = useAuth();
  const [dining, setDining] = useState<DiningOption>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);

  const addToCart = (item: typeof MENU_ITEMS[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    toast.success(`${item.name} added`);
  };

  const sendKOT = async () => {
    if (!user) return;
    if (dining === 'dine_in' && !selectedTable) {
      toast.error('Select a table first');
      return;
    }
    
    // Get table name for KOT
    const { data: tableData } = await supabase
      .from('restaurant_tables')
      .select('name')
      .eq('id', selectedTable)
      .single();
    
    const items = cart.map(c => ({ menu_item_id: c.id, quantity: c.qty }));
    const { data, error } = await supabase
      .from('kot_tickets')
      .insert({
        owner_id: user.id,
        order_type: dining,
        table_name: tableData?.name || null,
        items_summary: cart.map(c => `${c.name} x${c.qty}`).join(', '),
        status: 'sent',
        ticket_number: `KOT-${Date.now()}`,
        order_id: `order-${Date.now()}`,
        pax: 1,
      })
      .select()
      .single();
    if (error) {
      toast.error('Failed to send KOT');
    } else {
      toast.success('KOT sent!');
      setCart([]);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Restaurant POS</h1>
          <DiningOptionToggle value={dining} onChange={setDining} />
        </div>

        {/* Table selection for Dine‑in */}
        {dining === 'dine_in' && (
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Select Table</h2>
            <QuickTableSelect selectedTableId={selectedTable} onSelect={setSelectedTable} />
          </div>
        )}

        {/* Menu items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MENU_ITEMS.map(item => (
            <Card key={item.id} className="flex flex-col justify-between p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-transparent hover:border-primary">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                <Badge variant="secondary" className="text-2xl py-3 px-4 font-bold bg-primary/10 text-primary border-2 border-primary">
                  ₹{item.price}
                </Badge>
                <Button 
                  onClick={() => addToCart(item)} 
                  className="w-full h-16 text-xl font-bold py-4 px-6"
                  size="lg"
                >
                  <Plus className="h-6 w-6 mr-2" /> Add to Order
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cart summary */}
        {cart.length > 0 && (
          <Card className="mt-6 border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Cart ({cart.reduce((s, i) => s + i.qty, 0)} items)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <ul className="space-y-3">
                  {cart.map(ci => (
                    <li key={ci.id} className="flex justify-between items-center text-xl font-semibold py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-800">{ci.name} × {ci.qty}</span>
                      <span className="text-primary font-bold">₹{ci.price * ci.qty}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={sendKOT} 
                  className="gap-3 bg-primary hover:bg-primary/90 text-white text-xl font-bold py-4 px-8"
                  size="lg"
                >
                  Send KOT
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
