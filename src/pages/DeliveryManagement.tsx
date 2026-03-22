import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMembers } from '@/hooks/useMembers';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Filter, X, Calendar as CalendarIcon, RefreshCw, Users, MapPin, Truck, FileText, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, Edit2, Copy, Phone } from 'lucide-react';
import { formatDate, toDateInputValue } from '@/lib/format';
import { generateAccessCode } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { extractCoordinatesFromInput, fetchLocationFromAddress, generateEmbedUrl, sanitizeMapLink } from '@/lib/geolocation';

type DeliveryArea = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

type Driver = {
  id: string;
  name: string;
  phone: string;
  access_code: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type DeliveryBatch = {
  id: string;
  date: string;
  area_id: string;
  driver_id?: string;
  status: string;
  area?: DeliveryArea;
  driver?: Driver;
  delivery_count: number;
};

type BatchDelivery = {
  id: string;
  batch_id: string;
  member_id: string;
  status: string;
  delivery_time?: string;
  proof_url?: string;
  remarks?: string;
  member?: {
    id: string;
    name: string;
    phone: string;
    address: string;
    area?: string;
  };
};

export default function DeliveryManagement() {
  const { user } = useAuth();
  const { members, isLoading: membersLoading } = useMembers();
  const queryClient = useQueryClient();

  // State for delivery areas
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);

  // State for drivers
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Assign driver to batch
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [assigningBatchId, setAssigningBatchId] = useState<string | null>(null);
  const [selectedDriverForBatch, setSelectedDriverForBatch] = useState<string>('');

  // Update delivery status
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [updatingDelivery, setUpdatingDelivery] = useState<BatchDelivery | null>(null);
  const [deliveryRemarks, setDeliveryRemarks] = useState('');

  // State for delivery batches
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [batchDate, setBatchDate] = useState(toDateInputValue(new Date()));
  const [isAutoBatchOpen, setIsAutoBatchOpen] = useState(false);
  const [autoBatchLoading, setAutoBatchLoading] = useState(false);
  
  // Filter state
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // State for deliveries
  const [deliveries, setDeliveries] = useState<BatchDelivery[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [batchDeliveriesLoading, setBatchDeliveriesLoading] = useState(false);
  
  // Batch detail modal
  const [isBatchDetailOpen, setIsBatchDetailOpen] = useState(false);
  
  // Customer location edit in batch
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<BatchDelivery | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    address: '',
    map_link: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    delivery_area_id: '',
  });
  const [isUpdatingCustomerLocation, setIsUpdatingCustomerLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Mutations
const createAreaMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: inserted, error } = await supabase
        .from('delivery_areas')
        .insert({ ...data, owner_id: user?.id || '' })
        .select('*')
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (data) => {
      setAreas([...areas, data]);
      toast.success('Delivery area created successfully!');
      setIsAddAreaOpen(false);
      setAreaName('');
      setAreaDescription('');
    },
    onError: (error) => {
      toast.error('Failed to create delivery area: ' + error.message);
    }
  });

const createDriverMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; access_code: string }) => {
      const { data: inserted, error } = await supabase
        .from('drivers')
        .insert({ ...data, owner_id: user?.id || '' })
        .select('*')
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (data) => {
      setDrivers([...drivers, data]);
      toast.success('Driver created successfully!');
      setIsAddDriverOpen(false);
      setDriverName('');
      setDriverPhone('');
    },
    onError: (error) => {
      toast.error('Failed to create driver: ' + error.message);
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; phone: string; status: string }) => {
      const { data: updated, error } = await supabase
        .from('drivers')
        .update({ name: data.name, phone: data.phone, status: data.status, updated_at: new Date().toISOString() })
        .eq('id', data.id)
        .select('*')
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      setDrivers(drivers.map(d => d.id === data.id ? data : d));
      toast.success('Driver updated successfully!');
      setIsEditDriverOpen(false);
      setEditingDriver(null);
    },
    onError: (error) => {
      toast.error('Failed to update driver: ' + error.message);
    }
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ batchId, driverId }: { batchId: string; driverId: string }) => {
      const { data: updated, error } = await supabase
        .from('delivery_batches')
        .update({ driver_id: driverId, status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', batchId)
        .select('*, area:delivery_areas!area_id(id, name), driver:drivers!driver_id(id, name, phone)')
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      setBatches(batches.map(b => b.id === data.id ? { ...b, driver_id: data.driver_id, driver: data.driver, status: data.status } : b));
      toast.success('Driver assigned successfully!');
      setIsAssignDriverOpen(false);
      setAssigningBatchId(null);
      setSelectedDriverForBatch('');
    },
    onError: (error) => {
      toast.error('Failed to assign driver: ' + error.message);
    }
  });

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ deliveryId, status, remarks }: { deliveryId: string; status: string; remarks?: string }) => {
      const { data: updated, error } = await supabase
        .from('batch_deliveries')
        .update({ 
          status, 
          remarks: remarks || null,
          delivery_time: status === 'delivered' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', deliveryId)
        .select('*, member (id name phone address)')
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      setDeliveries(deliveries.map(d => d.id === data.id ? data : d));
      toast.success('Delivery status updated!');
      setIsUpdateStatusOpen(false);
      setUpdatingDelivery(null);
      setDeliveryRemarks('');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    }
  });

const generateDeliveryBatches = async (date: string) => {
    // Check if batches already exist for this date
    const { data: existingBatches } = await supabase
      .from('delivery_batches')
      .select('id, area_id')
      .eq('owner_id', user?.id || '')
      .eq('date', date);

    if (existingBatches && existingBatches.length > 0) {
      throw new Error('Batches already exist for this date. Please delete existing batches first or choose a different date.');
    }

    // Get all active members grouped by area
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('id, name, phone, delivery_area_id, status')
      .eq('owner_id', user?.id || '')
      .eq('status', 'active');

    if (membersError) throw membersError;

    // Group members by area using delivery_area_id
    const membersByArea = membersData?.reduce((acc, member) => {
      if (member.delivery_area_id) {
        if (!acc[member.delivery_area_id]) acc[member.delivery_area_id] = [];
        acc[member.delivery_area_id].push(member);
      }
      return acc;
    }, {} as { [areaId: string]: any[] });

    // Get all delivery areas
    const { data: areasData, error: areasError } = await supabase
      .from('delivery_areas')
      .select('*')
      .eq('owner_id', user?.id || '');

    if (areasError) throw areasError;

    // Create batches for each area
const batchPromises = areasData?.map(async (area: any) => {
      const membersInArea = membersByArea[area.id] || [];

      // Create delivery batch
      const { data: batchData, error: batchError } = await supabase
        .from('delivery_batches')
        .insert({
          owner_id: user?.id || '',
          date: date,
          area_id: area.id,
          status: 'pending'
        })
        .select('*')
        .single();

      if (batchError) throw batchError;

      // Create batch deliveries for each member in this area
      if (membersInArea.length > 0) {
        const deliveryPromises = membersInArea.map(async (member: any) => {
          return supabase
            .from('batch_deliveries')
            .insert({
              owner_id: user?.id || '',
              batch_id: batchData.id,
              member_id: member.id,
              status: 'pending'
            });
        });

        await Promise.all(deliveryPromises);
      }

      return batchData;
    });

    const batches = await Promise.all(batchPromises);
    return batches;
  };

  const autoBatchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate) return;

      const date = selectedDate.toISOString().split('T')[0];
      const batches = await generateDeliveryBatches(date);
      return batches;
    },
    onSuccess: (data) => {
      setBatches(data);
      toast.success('Delivery batches generated successfully!');
      setAutoBatchLoading(false);
    },
    onError: (error) => {
      toast.error('Failed to generate delivery batches: ' + error.message);
      setAutoBatchLoading(false);
    }
  });

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_areas')
        .select('*')
        .eq('owner_id', user?.id || '')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('fetchAreas error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('fetchAreas exception:', err);
      return [];
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('owner_id', user?.id || '')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('fetchDrivers error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('fetchDrivers exception:', err);
      return [];
    }
  };

  const fetchBatches = async (date?: string) => {
    try {
      const query = supabase
        .from('delivery_batches')
        .select('*, area:delivery_areas!area_id(id, name), driver:drivers!driver_id(id, name, phone)')
        .eq('owner_id', user?.id || '')
        .order('created_at', { ascending: true });

      if (date) {
        query.eq('date', date);
      }
      
      // Apply filters
      if (areaFilter && areaFilter !== 'all') {
        query.eq('area_id', areaFilter);
      }
      if (driverFilter && driverFilter !== 'all') {
        query.eq('driver_id', driverFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('fetchBatches error:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Get delivery counts for each batch
      const batchIds = data?.map((b: any) => b.id) || [];
      const deliveryCounts = await Promise.all(
        batchIds.map(async (batchId: string) => {
          try {
            const { data: countData } = await supabase
              .from('batch_deliveries')
              .select('status')
              .eq('batch_id', batchId);
            
            const total = countData?.length || 0;
            const delivered = countData?.filter(d => d.status === 'delivered').length || 0;
            return { total, delivered };
          } catch {
            return { total: 0, delivered: 0 };
          }
        })
      );

      return data?.map((batch: any, index: number) => ({
        ...batch,
        delivery_count: deliveryCounts[index]?.total || 0,
        delivered_count: deliveryCounts[index]?.delivered || 0
      })) || [];
    } catch (err) {
      console.warn('fetchBatches exception:', err);
      return [];
    }
  };

const fetchDeliveries = async (batchId: string) => {
    const { data, error } = await supabase
      .from('batch_deliveries')
      .select('*, member (id name phone address)')
      .eq('batch_id', batchId)
      .eq('owner_id', user?.id || '')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  };

// Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading delivery data...');
        
        const areasData = await fetchAreas();
        const driversData = await fetchDrivers();
        const batchesData = await fetchBatches();
        
        console.log('Loaded data:', { areasData, driversData, batchesData });
        setAreas(areasData);
        setDrivers(driversData);
        setBatches(batchesData);
      } catch (error: any) {
        console.error('Failed to load delivery data:', error);
      }
    };

    loadData();
  }, [user?.id]);

  // Handle date change
  useEffect(() => {
    if (selectedDate) {
      const loadBatches = async () => {
        try {
          const batchesData = await fetchBatches(selectedDate.toISOString().split('T')[0]);
          setBatches(batchesData);
        } catch (error) {
          console.error('Failed to load batches for date:', error);
        }
      };
      loadBatches();
    }
  }, [selectedDate, areaFilter, driverFilter, statusFilter]);

  // Handle batch selection
  useEffect(() => {
    if (selectedBatch) {
      const loadDeliveries = async () => {
        try {
          setBatchDeliveriesLoading(true);
          const deliveriesData = await fetchDeliveries(selectedBatch);
          setDeliveries(deliveriesData);
          setBatchDeliveriesLoading(false);
        } catch (error) {
          console.error('Failed to load deliveries:', error);
          setBatchDeliveriesLoading(false);
        }
      };
      loadDeliveries();
    } else {
      setDeliveries([]);
    }
  }, [selectedBatch]);

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAreaMutation.mutateAsync({
      name: areaName,
      description: areaDescription
    });
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const accessCode = generateAccessCode();
    await createDriverMutation.mutateAsync({
      name: driverName,
      phone: driverPhone,
      access_code: accessCode
    });
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverName(driver.name);
    setDriverPhone(driver.phone);
    setIsEditDriverOpen(true);
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    await updateDriverMutation.mutateAsync({
      id: editingDriver.id,
      name: driverName,
      phone: driverPhone,
      status: editingDriver.status
    });
  };

  const handleAssignDriver = (batchId: string) => {
    setAssigningBatchId(batchId);
    const batch = batches.find(b => b.id === batchId);
    setSelectedDriverForBatch(batch?.driver_id || '');
    setIsAssignDriverOpen(true);
  };

  const handleAssignDriverSubmit = async () => {
    if (!assigningBatchId || !selectedDriverForBatch) return;
    await assignDriverMutation.mutateAsync({
      batchId: assigningBatchId,
      driverId: selectedDriverForBatch
    });
  };

  const handleUpdateStatus = (delivery: BatchDelivery) => {
    setUpdatingDelivery(delivery);
    setDeliveryRemarks(delivery.remarks || '');
    setIsUpdateStatusOpen(true);
  };

  const handleUpdateStatusSubmit = async () => {
    if (!updatingDelivery) return;
    await updateDeliveryStatusMutation.mutateAsync({
      deliveryId: updatingDelivery.id,
      status: updatingDelivery.status,
      remarks: deliveryRemarks
    });
  };

  const openEditCustomer = (delivery: BatchDelivery) => {
    setEditingDelivery(delivery);
    setEditCustomerForm({
      address: delivery.member?.address || '',
      map_link: delivery.member?.map_link || '',
      location_lat: delivery.member?.location_lat || null,
      location_lng: delivery.member?.location_lng || null,
      delivery_area_id: delivery.member?.delivery_area_id || '',
    });
    setLocationError('');
    setIsEditCustomerOpen(true);
  };

  const handleFetchCustomerLocation = async (input: string) => {
    if (!input.trim()) {
      setLocationError('Please enter an address or map link');
      return;
    }

    setIsUpdatingCustomerLocation(true);
    setLocationError('');

    try {
      const parsed = extractCoordinatesFromInput(input);
      
      if (parsed && parsed.lat && parsed.lng) {
        setEditCustomerForm(prev => ({
          ...prev,
          address: parsed.address || prev.address,
          map_link: parsed.mapLink || prev.map_link,
          location_lat: parsed.lat,
          location_lng: parsed.lng,
        }));
      } else {
        const result = await fetchLocationFromAddress(input);
        setEditCustomerForm(prev => ({
          ...prev,
          address: result.address || prev.address,
          map_link: result.mapLink || prev.map_link,
          location_lat: result.lat || null,
          location_lng: result.lng || null,
        }));
      }
    } catch {
      setLocationError('Could not fetch location. Please enter manually.');
    } finally {
      setIsUpdatingCustomerLocation(false);
    }
  };

  const handleCustomerMapLinkChange = (link: string) => {
    const sanitized = sanitizeMapLink(link);
    setEditCustomerForm(prev => ({ ...prev, map_link: sanitized }));
    
    if (sanitized) {
      const parsed = extractCoordinatesFromInput(sanitized);
      if (parsed && parsed.lat && parsed.lng) {
        setEditCustomerForm(prev => ({
          ...prev,
          location_lat: parsed.lat,
          location_lng: parsed.lng,
        }));
      }
    }
  };

  const handleUpdateCustomerLocation = async () => {
    if (!editingDelivery || !user) return;
    
    setIsUpdatingCustomerLocation(true);
    
    try {
      // Get the current batch info
      const currentBatch = batches.find(b => b.id === editingDelivery.batch_id);
      if (!currentBatch) {
        throw new Error('Batch not found');
      }

      // Update member location data
      const { error: updateError } = await supabase
        .from('members')
        .update({
          address: editCustomerForm.address || null,
          map_link: editCustomerForm.map_link || null,
          location_lat: editCustomerForm.location_lat,
          location_lng: editCustomerForm.location_lng,
          delivery_area_id: editCustomerForm.delivery_area_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingDelivery.member_id)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      // Check if area changed - need to reassign batch
      const newAreaId = editCustomerForm.delivery_area_id || null;
      const oldAreaId = currentBatch.area_id;

      // Log the action
      await supabase.from('delivery_status_logs').insert({
        owner_id: user.id,
        batch_delivery_id: editingDelivery.id,
        status: 'location_updated',
        notes: `Customer location updated. Area changed from ${oldAreaId} to ${newAreaId || 'unassigned'}`,
      });

      // If area changed and new area exists, reassign
      if (newAreaId && newAreaId !== oldAreaId) {
        // Find or create batch for new area on same date
        let targetBatch = batches.find(b => b.date === currentBatch.date && b.area_id === newAreaId);
        
        if (!targetBatch) {
          // Create new batch for the new area
          const { data: newBatch, error: batchError } = await supabase
            .from('delivery_batches')
            .insert({
              owner_id: user.id,
              date: currentBatch.date,
              area_id: newAreaId,
              status: 'pending',
            })
            .select('*, area:delivery_areas(*), driver:drivers(*)')
            .single();
          
          if (batchError) throw batchError;
          targetBatch = newBatch;
        }

        // Remove from old batch
        await supabase
          .from('batch_deliveries')
          .delete()
          .eq('id', editingDelivery.id);

        // Add to new batch
        await supabase
          .from('batch_deliveries')
          .insert({
            owner_id: user.id,
            batch_id: targetBatch.id,
            member_id: editingDelivery.member_id,
            status: editingDelivery.status,
          });

        // Log reassignment
        await supabase.from('delivery_status_logs').insert({
          owner_id: user.id,
          batch_delivery_id: editingDelivery.id,
          status: 'reassigned',
          notes: `Customer reassigned from batch ${currentBatch.id.slice(-6)} to ${targetBatch.id.slice(-6)} due to area change`,
        });

        toast.success(`Customer moved to ${targetBatch.area?.name || 'new area'}`);
      } else {
        toast.success('Customer location updated!');
      }

      // Refresh data
      const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
      await fetchBatches(dateStr);
      if (selectedBatch) {
        await fetchDeliveries(selectedBatch);
      }

      setIsEditCustomerOpen(false);
      setEditingDelivery(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update customer location');
    } finally {
      setIsUpdatingCustomerLocation(false);
    }
  };

  const handleCopyAccessCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Access code copied!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleAutoBatch = async () => {
    if (!selectedDate) return;
    setAutoBatchLoading(true);
    await autoBatchMutation.mutateAsync();
  };

const getAreaStats = (areaId: string) => {
    const activeMembers = members?.filter(m =>
      m.status === 'active' &&
      m.area === areaId
    ) || [];
    return activeMembers.length;
  };

  const getMemberArea = (member: any) => {
    return member.area || 'No area';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', text: 'Pending' };
      case 'assigned': return { variant: 'default' as const, className: 'bg-blue-100 text-blue-800', text: 'Assigned' };
      case 'out_for_delivery': return { variant: 'outline' as const, className: 'bg-purple-100 text-purple-800', text: 'Out for Delivery' };
      case 'completed': return { variant: 'default' as const, className: 'bg-green-100 text-green-800', text: 'Completed' };
      default: return { variant: 'secondary' as const, className: '', text: status };
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', text: 'Pending' };
      case 'out_for_delivery': return { variant: 'outline' as const, className: 'bg-purple-100 text-purple-800', text: 'Out for Delivery' };
      case 'delivered': return { variant: 'default' as const, className: 'bg-green-100 text-green-800', text: 'Delivered' };
      case 'not_delivered': return { variant: 'destructive' as const, className: 'bg-red-100 text-red-800', text: 'Not Delivered' };
      case 'skipped': return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800', text: 'Skipped' };
      default: return { variant: 'secondary' as const, className: '', text: status };
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Delivery Management</h1>
            <p className="text-muted-foreground">Manage deliveries, drivers, and batches</p>
          </div>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{areas.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{drivers.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{batches.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {deliveries.filter(d => d.status === 'pending' || d.status === 'out_for_delivery').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Date Selector and Actions */}
        <Card>
          <CardContent className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="batchDate" className="text-xs text-muted-foreground">Delivery Date</Label>
                <Input
                  id="batchDate"
                  type="date"
                  value={batchDate}
                  onChange={(e) => {
                    setBatchDate(e.target.value);
                    setSelectedDate(e.target.value ? new Date(e.target.value) : null);
                  }}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Area Filter</Label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {areas.map(area => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Driver Filter</Label>
                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Drivers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {drivers.filter(d => d.status === 'active').map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Actions Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <Button
                onClick={handleAutoBatch}
                disabled={autoBatchLoading || !selectedDate}
              >
                {autoBatchLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {autoBatchLoading ? 'Generating...' : 'Auto-Generate Batches'}
              </Button>
              
              {/* Summary */}
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{batches.length}</span> batches
                </span>
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{batches.reduce((sum, b) => sum + (b.delivery_count || 0), 0)}</span> deliveries
                </span>
                <span className="text-muted-foreground">
                  <span className="font-medium text-green-500">{batches.reduce((sum, b) => sum + (b.delivered_count || 0), 0)}</span> delivered
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Areas and Batches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Areas Section */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Zones
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/zones'}>
                <Plus className="h-4 w-4 mr-1" />
                Manage Zones
              </Button>
            </CardHeader>
            <CardContent>
              {areas.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No delivery zones yet. <a href="/zones" className="text-primary hover:underline">Add zones</a> to get started.</p>
              ) : (
                <ScrollArea className="space-y-3" style={{ maxHeight: '400px' }}>
                  {areas.map((area) => (
                    <Card key={area.id} className="cursor-pointer hover:shadow-md transition-all">
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

          {/* Batches Section */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Batches
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBatch(null)}
                className={selectedBatch ? 'border-primary text-primary' : ''}
              >
                {selectedBatch ? 'Clear Selection' : 'Select Batch'}
              </Button>
            </CardHeader>
            <CardContent>
              {batches.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {selectedDate ? 'No batches for this date' : 'Select a date to view batches'}
                </p>
              ) : (
                <ScrollArea className="space-y-3" style={{ maxHeight: '400px' }}>
                  {batches.map((batch) => (
                    <Card
                      key={batch.id}
                      className={`cursor-pointer hover:shadow-md transition-all ${selectedBatch === batch.id ? 'border-primary border-2' : ''
                        }`}
                      onClick={() => setSelectedBatch(batch.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">
                              Batch #{batch.id.slice(-6)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {batch.area?.name || 'No area assigned'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {batch.delivery_count} deliveries
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge {...getStatusBadge(batch.status)}>
                              {batch.status}
                            </Badge>
                            {batch.driver ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                {batch.driver.name}
                              </p>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignDriver(batch.id);
                                }}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                Assign
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
        </div>

        {/* Drivers Management Section */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Drivers Management
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsAddDriverOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Driver
            </Button>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No drivers yet. Add your first driver to get started.</p>
            ) : (
              <ScrollArea className="space-y-3" style={{ maxHeight: '300px' }}>
                {drivers.map((driver) => (
                  <Card key={driver.id} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{driver.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {driver.phone}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            Code: {driver.access_code}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAccessCode(driver.access_code);
                              }}
                            >
                              {copiedCode === driver.access_code ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                            {driver.status}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDriver(driver);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Deliveries Section */}
        {selectedBatch && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Deliveries for Selected Batch
              </CardTitle>
              <Badge variant="outline">
                {deliveries.length} deliveries
              </Badge>
            </CardHeader>
            <CardContent>
              {batchDeliveriesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : deliveries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No deliveries found for this batch
                </p>
              ) : (
                <ScrollArea className="space-y-3" style={{ maxHeight: '400px' }}>
                  {deliveries.map((delivery) => (
                    <Card key={delivery.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">
                              {delivery.member?.name || 'Unknown'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {delivery.member?.phone || 'No phone'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {delivery.member?.address || 'No address'}
                            </p>
                          </div>
<div className="text-right">
                            <Badge {...getStatusBadge(delivery.status)}>
                              {delivery.status}
                            </Badge>
                            {delivery.delivery_time && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(new Date(delivery.delivery_time))}
                              </p>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs mt-1"
                              onClick={() => handleUpdateStatus(delivery)}
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Add Driver Dialog */}
        <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Driver</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverPhone">Phone Number</Label>
                <Input
                  id="driverPhone"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="05X XXX XXXX"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Create Driver
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Driver Dialog */}
        <Dialog open={isEditDriverOpen} onOpenChange={setIsEditDriverOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Driver</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateDriver} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editDriverName">Driver Name</Label>
                <Input
                  id="editDriverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDriverPhone">Phone Number</Label>
                <Input
                  id="editDriverPhone"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="05X XXX XXXX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDriverStatus">Status</Label>
                <Select 
                  value={editingDriver?.status || 'active'} 
                  onValueChange={(v) => editingDriver && setEditingDriver({...editingDriver, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Update Driver
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign Driver Dialog */}
        <Dialog open={isAssignDriverOpen} onOpenChange={setIsAssignDriverOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Driver to Batch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Driver</Label>
                <Select value={selectedDriverForBatch} onValueChange={setSelectedDriverForBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.status === 'active').map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} - {driver.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignDriverSubmit} className="w-full" disabled={!selectedDriverForBatch}>
                Assign Driver
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update Delivery Status Dialog */}
        <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Delivery Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {updatingDelivery && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{updatingDelivery.member?.name}</p>
                  <p className="text-sm text-muted-foreground">{updatingDelivery.member?.address}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={updatingDelivery?.status || 'pending'} 
                  onValueChange={(v) => updatingDelivery && setUpdatingDelivery({...updatingDelivery, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="not_delivered">Not Delivered</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input
                  value={deliveryRemarks}
                  onChange={(e) => setDeliveryRemarks(e.target.value)}
                  placeholder="Add notes..."
                />
              </div>
              <Button onClick={handleUpdateStatusSubmit} className="w-full">
                Update Status
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Batch Detail Dialog */}
        <Dialog open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Batch Details
              </DialogTitle>
            </DialogHeader>
            {selectedBatch && (
              <div className="flex-1 overflow-auto">
                {(() => {
                  const batch = batches.find(b => b.id === selectedBatch);
                  if (!batch) return null;
                  return (
                    <div className="space-y-4">
                      {/* Batch Info */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Area</p>
                          <p className="font-medium">{batch.area?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-medium">{batch.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge {...getStatusBadge(batch.status)}>{batch.status}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Driver</p>
                          <p className="font-medium">{batch.driver?.name || 'Not assigned'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Deliveries</p>
                          <p className="font-medium">{batch.delivery_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Delivered</p>
                          <p className="font-medium text-green-500">{batch.delivered_count || 0}</p>
                        </div>
                      </div>
                      
                      {/* Deliveries List - loaded on demand via useEffect */}
                      <div>
                        <p className="font-medium mb-2">Customer Deliveries</p>
                        <div className="space-y-2 max-h-64 overflow-auto">
                          {deliveries
                            .filter(d => d.batch_id === selectedBatch)
                            .map(delivery => (
                            <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">{delivery.member?.name}</p>
                                <p className="text-sm text-muted-foreground">{delivery.member?.phone}</p>
                                {delivery.member?.address && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {delivery.member.address}
                                  </p>
                                )}
                                {delivery.member?.map_link && (
                                  <a 
                                    href={delivery.member.map_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    View on Map
                                  </a>
                                )}
                                {delivery.member?.location_lat && delivery.member?.location_lng && (
                                  <p className="text-xs text-muted-foreground">
                                    {delivery.member.location_lat.toFixed(4)}, {delivery.member.location_lng.toFixed(4)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCustomer(delivery)}
                                  title="Edit location"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <div className="text-right">
                                  <Badge {...getDeliveryStatusBadge(delivery.status)}>
                                    {delivery.status}
                                  </Badge>
                                  {delivery.remarks && (
                                    <p className="text-xs text-muted-foreground mt-1">{delivery.remarks}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Customer Location Dialog */}
        <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Edit Customer Location
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editingDelivery && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{editingDelivery.member?.name}</p>
                  <p className="text-sm text-muted-foreground">{editingDelivery.member?.phone}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={editCustomerForm.address}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                    placeholder="Enter address"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleFetchCustomerLocation(editCustomerForm.address)}
                    disabled={isUpdatingCustomerLocation || !editCustomerForm.address}
                  >
                    {isUpdatingCustomerLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {locationError && (
                <p className="text-xs text-destructive">{locationError}</p>
              )}

              <div className="space-y-2">
                <Label>Map Link (Google Maps URL)</Label>
                <Input
                  value={editCustomerForm.map_link}
                  onChange={(e) => handleCustomerMapLinkChange(e.target.value)}
                  placeholder="Paste Google Maps link or coordinates"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editCustomerForm.location_lat || ''}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, location_lat: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 25.2048"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editCustomerForm.location_lng || ''}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, location_lng: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 55.2708"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Area/Zone</Label>
                <Select
                  value={editCustomerForm.delivery_area_id}
                  onValueChange={(value) => setEditCustomerForm({ ...editCustomerForm, delivery_area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Area</SelectItem>
                    {areas.map(area => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Changing area will move customer to the appropriate batch
                </p>
              </div>

              {editCustomerForm.location_lat && editCustomerForm.location_lng && (
                <div className="space-y-2">
                  <Label>Location Preview</Label>
                  <iframe
                    title="Location Preview"
                    width="100%"
                    height="120"
                    style={{ border: 0, borderRadius: '8px' }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${editCustomerForm.location_lng - 0.01}%2C${editCustomerForm.location_lat - 0.01}%2C${editCustomerForm.location_lng + 0.01}%2C${editCustomerForm.location_lat + 0.01}&layer=mapnik&marker=${editCustomerForm.location_lat}%2C${editCustomerForm.location_lng}`}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditCustomerOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCustomerLocation} 
                  disabled={isUpdatingCustomerLocation}
                  className="flex-1"
                >
                  {isUpdatingCustomerLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save & Reassign'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}