import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { StaffUpdate } from '@/integrations/supabase/types';

export type StaffRole = 'cook' | 'cleaner' | 'helper' | 'manager' | 'delivery' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'half_day';

export const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: 'cook', label: 'Cook' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'helper', label: 'Helper' },
  { value: 'manager', label: 'Manager' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' },
];

interface Staff {
  id: string;
  owner_id: string;
  name: string;
  role: StaffRole;
  phone: string;
  base_salary: number;
  is_active: boolean;
  bank_name: string | null;
  account_number: string | null;
  iban: string | null;
  swift_code: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffAttendance {
  id: string;
  owner_id: string;
  staff_id: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

interface SalaryAdvance {
  id: string;
  owner_id: string;
  staff_id: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

interface SalaryPayment {
  id: string;
  owner_id: string;
  staff_id: string;
  amount: number;
  month_year: string;
  expense_id: string | null;
  paid_at: string;
  created_at: string;
}

export function useStaff() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all staff
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Staff[];
    },
    enabled: !!user,
  });

  // Fetch attendance for this month
  const { data: attendance = [] } = useQuery({
    queryKey: ['staff-attendance', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('owner_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data as StaffAttendance[];
    },
    enabled: !!user,
  });

  // Fetch salary advances for this month
  const { data: advances = [] } = useQuery({
    queryKey: ['salary-advances', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      
      const { data, error } = await supabase
        .from('salary_advances')
        .select('*')
        .eq('owner_id', user.id)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString())
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as SalaryAdvance[];
    },
    enabled: !!user,
  });

  // Fetch salary payments for this month
  const { data: salaryPayments = [] } = useQuery({
    queryKey: ['salary-payments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const monthYear = format(new Date(), 'yyyy-MM');
      
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('owner_id', user.id)
        .eq('month_year', monthYear);
      
      if (error) throw error;
      return data as SalaryPayment[];
    },
    enabled: !!user,
  });

  // Realtime subscription for staff
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('staff-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff', filter: `owner_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['staff'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_attendance', filter: `owner_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['staff-attendance'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'salary_advances', filter: `owner_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['salary-advances'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'salary_payments', filter: `owner_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['salary-payments'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Add staff
  const addStaff = useMutation({
    mutationFn: async (staffData: { name: string; role: StaffRole; phone: string; base_salary: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('staff')
        .insert({ ...staffData, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member added!');
    },
    onError: (error) => {
      toast.error('Failed to add staff: ' + error.message);
    },
  });

  // Update staff
  const updateStaff = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff updated!');
    },
    onError: (error) => {
      toast.error('Failed to update staff: ' + error.message);
    },
  });

  // Soft delete staff (mark as inactive instead of deleting)
  const deactivateStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: false } as StaffUpdate)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff marked as left company');
    },
    onError: (error) => {
      toast.error('Failed to update staff: ' + error.message);
    },
  });

  // Reactivate staff
  const reactivateStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: true } as StaffUpdate)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff reactivated!');
    },
    onError: (error) => {
      toast.error('Failed to reactivate staff: ' + error.message);
    },
  });

  // Hard delete staff (for cleanup, rarely used)
  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff removed!');
    },
    onError: (error) => {
      toast.error('Failed to remove staff: ' + error.message);
    },
  });

  // Set attendance
  const setAttendance = useMutation({
    mutationFn: async ({ staffId, date, status }: { staffId: string; date: string; status: AttendanceStatus }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('staff_attendance')
        .upsert(
          { staff_id: staffId, date, status, owner_id: user.id },
          { onConflict: 'staff_id,date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
    },
    onError: (error) => {
      toast.error('Failed to update attendance: ' + error.message);
    },
  });

  // Add salary advance
  const addAdvance = useMutation({
    mutationFn: async ({ staffId, amount, notes }: { staffId: string; amount: number; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('salary_advances')
        .insert({ staff_id: staffId, amount, notes, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      toast.success('Advance recorded!');
    },
    onError: (error) => {
      toast.error('Failed to record advance: ' + error.message);
    },
  });

  // Delete advance
  const deleteAdvance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('salary_advances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      toast.success('Advance deleted!');
    },
    onError: (error) => {
      toast.error('Failed to delete advance: ' + error.message);
    },
  });

  // Pay salary - creates expense record and marks as paid
  const paySalary = useMutation({
    mutationFn: async ({ staffId, amount, staffName }: { staffId: string; amount: number; staffName: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const monthYear = format(new Date(), 'yyyy-MM');
      
      // First, create an expense record for the salary
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          owner_id: user.id,
          amount,
          category: 'salaries',
          description: `Salary payment - ${staffName} (${monthYear})`,
          date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Then, record the salary payment
      const { data, error } = await supabase
        .from('salary_payments')
        .insert({
          owner_id: user.id,
          staff_id: staffId,
          amount,
          month_year: monthYear,
          expense_id: expense.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Clear advances for this month after salary is paid
      const { error: clearError } = await supabase
        .from('salary_advances')
        .delete()
        .eq('owner_id', user.id)
        .eq('staff_id', staffId)
        .gte('date', startOfMonth(new Date()).toISOString())
        .lte('date', endOfMonth(new Date()).toISOString());

      if (clearError) console.warn('Failed to clear advances:', clearError);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Salary paid and expense recorded!');
    },
    onError: (error) => {
      toast.error('Failed to process salary: ' + error.message);
    },
  });

  // Get attendance for a specific staff member on a date
  const getAttendanceStatus = (staffId: string, date: string): AttendanceStatus | null => {
    const record = attendance.find(a => a.staff_id === staffId && a.date === date);
    return record?.status || null;
  };

  // Calculate payroll for a staff member
  const calculatePayroll = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return null;

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const today = new Date();
    
    // Get working days so far this month
    let currentDate = new Date(monthStart);
    let workingDays = 0;
    while (currentDate <= today && currentDate <= monthEnd) {
      workingDays++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const dailyRate = staffMember.base_salary / 30; // Assuming 30 days per month

    // Count absences and half days
    const staffAttendance = attendance.filter(a => a.staff_id === staffId);
    const absentDays = staffAttendance.filter(a => a.status === 'absent').length;
    const halfDays = staffAttendance.filter(a => a.status === 'half_day').length;
    const presentDays = staffAttendance.filter(a => a.status === 'present').length;

    // Calculate deductions
    const absentDeduction = absentDays * dailyRate;
    const halfDayDeduction = halfDays * (dailyRate / 2);
    const totalDeduction = absentDeduction + halfDayDeduction;

    // Get total advances
    const staffAdvances = advances.filter(a => a.staff_id === staffId);
    const totalAdvances = staffAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

    // Net payable
    const netPayable = staffMember.base_salary - totalDeduction - totalAdvances;

    return {
      baseSalary: staffMember.base_salary,
      dailyRate,
      workingDays,
      presentDays,
      absentDays,
      halfDays,
      absentDeduction,
      halfDayDeduction,
      totalDeduction,
      totalAdvances,
      netPayable: Math.max(0, netPayable),
      advances: staffAdvances,
    };
  };

  // Check if salary is already paid for this month
  const isSalaryPaid = (staffId: string): boolean => {
    const monthYear = format(new Date(), 'yyyy-MM');
    return salaryPayments.some(p => p.staff_id === staffId && p.month_year === monthYear);
  };

  // Get all salary payments for a staff member (history)
  const getStaffSalaryHistory = async (staffId: string) => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('salary_payments')
      .select('*')
      .eq('staff_id', staffId)
      .eq('owner_id', user.id)
      .order('paid_at', { ascending: false });

    if (error) throw error;
    return data;
  };

  return {
    staff,
    attendance,
    advances,
    salaryPayments,
    isLoading,
    addStaff,
    updateStaff,
    deleteStaff,
    deactivateStaff,
    reactivateStaff,
    setAttendance,
    addAdvance,
    deleteAdvance,
    paySalary,
    getAttendanceStatus,
    calculatePayroll,
    isSalaryPaid,
    getStaffSalaryHistory,
  };
}
