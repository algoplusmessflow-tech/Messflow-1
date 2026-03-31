import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useStaff, STAFF_ROLES, StaffRole, AttendanceStatus } from '@/hooks/useStaff';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppMode } from '@/contexts/ModeContext';
import { formatDate, toDateInputValue } from '@/lib/format';
import { Plus, Phone, Loader2, UserCheck, Calculator, Banknote, CheckCircle2, DollarSign, UserX, History, RotateCcw, Copy, Building2, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { SalaryHistoryModal } from '@/components/SalaryHistoryModal';
import { toast } from 'sonner';

export default function StaffPayroll() {
  const { mode } = useAppMode();
  const { 
    staff, 
    isLoading, 
    addStaff,
    updateStaff,
    deactivateStaff, 
    reactivateStaff,
    setAttendance, 
    getAttendanceStatus,
    addAdvance,
    calculatePayroll,
    paySalary,
    isSalaryPaid,
  } = useStaff();
  const { formatAmount } = useCurrency();
  const filteredRoles = mode === 'restaurant' ? STAFF_ROLES.filter(r => ['cook', 'delivery'].includes(r.value)) : STAFF_ROLES.filter(r => ['helper', 'other'].includes(r.value));
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [isBankingOpen, setIsBankingOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showBankingDetails, setShowBankingDetails] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'helper' as StaffRole,
    base_salary: '',
  });

  const [bankingData, setBankingData] = useState({
    bank_name: '',
    account_number: '',
    iban: '',
    swift_code: '',
  });

  const today = toDateInputValue(new Date());

  // Filter staff based on active/inactive
  const activeStaff = staff.filter((s) => s.is_active !== false);
  const inactiveStaff = staff.filter((s) => s.is_active === false);
  const displayedStaff = showInactive ? inactiveStaff : activeStaff;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await addStaff.mutateAsync({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      role: formData.role,
      base_salary: Number(formData.base_salary),
    });
    setFormData({ name: '', phone: '', role: 'helper', base_salary: '' });
    setIsAddOpen(false);
  };

  const handleAttendanceChange = (staffId: string, status: AttendanceStatus) => {
    setAttendance.mutate({ staffId, date: today, status });
  };

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    
    await addAdvance.mutateAsync({
      staffId: selectedStaffId,
      amount: Number(advanceAmount),
      notes: advanceNotes || undefined,
    });
    
    setAdvanceAmount('');
    setAdvanceNotes('');
    setSelectedStaffId(null);
    setIsAdvanceOpen(false);
  };

  const openAdvanceDialog = (staffId: string) => {
    setSelectedStaffId(staffId);
    setIsAdvanceOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    await deactivateStaff.mutateAsync(deactivateId);
    setDeactivateId(null);
  };

  const handleReactivate = async (staffId: string) => {
    await reactivateStaff.mutateAsync(staffId);
  };

  const openHistory = (staffId: string, staffName: string) => {
    setSelectedStaffId(staffId);
    setSelectedStaffName(staffName);
    setIsHistoryOpen(true);
  };

  const openBankingDialog = (staffId: string, staffName: string, bankInfo: any) => {
    setSelectedStaffId(staffId);
    setSelectedStaffName(staffName);
    setBankingData({
      bank_name: bankInfo?.bank_name || '',
      account_number: bankInfo?.account_number || '',
      iban: bankInfo?.iban || '',
      swift_code: bankInfo?.swift_code || '',
    });
    setIsBankingOpen(true);
  };

  const handleSaveBanking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    
    await updateStaff.mutateAsync({
      id: selectedStaffId,
      bank_name: bankingData.bank_name || null,
      account_number: bankingData.account_number || null,
      iban: bankingData.iban || null,
      swift_code: bankingData.swift_code || null,
    });
    
    setIsBankingOpen(false);
    toast.success('Banking details updated!');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const maskNumber = (num: string | null) => {
    if (!num) return '';
    if (num.length <= 4) return num;
    return '*'.repeat(num.length - 4) + num.slice(-4);
  };

  const toggleBankingVisibility = (staffId: string) => {
    setShowBankingDetails(prev => ({
      ...prev,
      [staffId]: !prev[staffId],
    }));
  };

  const handlePaySalary = async (staffId: string, staffName: string, amount: number) => {
    await paySalary.mutateAsync({ staffId, amount, staffName });
  };

  const currentMonthYear = format(new Date(), 'MMMM yyyy');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Badge className="mr-2">{mode === 'restaurant' ? 'Viewing Restaurant Staff' : 'Viewing Mess Staff'}</Badge>
          <div>
            <h1 className="text-2xl font-bold">Staff & Payroll</h1>
            <p className="text-muted-foreground">{staff.length} staff members</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStaff} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Staff name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: StaffRole) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Base Salary (AED)</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    placeholder="Monthly salary"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addStaff.isPending}>
                  {addStaff.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Staff
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attendance">
              <UserCheck className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="payroll">
              <Calculator className="h-4 w-4 mr-2" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="list">
              Staff List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Attendance - {formatDate(new Date())}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : staff.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No staff members yet. Add staff to track attendance.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {staff.map((member) => {
                      const status = getAttendanceStatus(member.id, today);
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-accent/50 border border-border">
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={status === 'present' ? 'default' : 'outline'}
                              onClick={() => handleAttendanceChange(member.id, 'present')}
                              className={status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'half_day' ? 'default' : 'outline'}
                              onClick={() => handleAttendanceChange(member.id, 'half_day')}
                              className={status === 'half_day' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                            >
                              Half
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'absent' ? 'default' : 'outline'}
                              onClick={() => handleAttendanceChange(member.id, 'absent')}
                              className={status === 'absent' ? 'bg-destructive hover:bg-destructive/90' : ''}
                            >
                              Absent
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : staff.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No staff members yet.
                </CardContent>
              </Card>
            ) : (
              staff.map((member) => {
                const payroll = calculatePayroll(member.id);
                const isPaid = isSalaryPaid(member.id);
                if (!payroll) return null;
                
                return (
                  <Card key={member.id} className={isPaid ? 'border-green-500/50 bg-green-500/5' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{member.name}</CardTitle>
                          {isPaid && (
                            <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                        </div>
                        {!isPaid && (
                          <Button size="sm" variant="outline" onClick={() => openAdvanceDialog(member.id)}>
                            <Banknote className="h-4 w-4 mr-1" />
                            Advance
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.role} • {currentMonthYear}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Base Salary</p>
                          <p className="font-medium">{formatAmount(payroll.baseSalary)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Daily Rate</p>
                          <p className="font-medium">{formatAmount(Math.round(payroll.dailyRate))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Present Days</p>
                          <p className="font-medium text-primary">{payroll.presentDays}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Absent/Half Days</p>
                          <p className="font-medium text-destructive">{payroll.absentDays} / {payroll.halfDays}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deductions</p>
                          <p className="font-medium text-destructive">-{formatAmount(Math.round(payroll.totalDeduction))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Advances Paid</p>
                          <p className="font-medium text-amber-500">-{formatAmount(payroll.totalAdvances)}</p>
                        </div>
                      </div>
                      
                      {member.iban && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">IBAN:</span>
                              <span className="font-mono">
                                {showBankingDetails[member.id] 
                                  ? member.iban 
                                  : maskNumber(member.iban)}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => toggleBankingVisibility(member.id)}
                              >
                                {showBankingDetails[member.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(member.iban || '', 'IBAN')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold">Net Payable</span>
                            <p className="text-sm text-muted-foreground">Auto-recorded in Expenses</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-primary">{formatAmount(Math.round(payroll.netPayable))}</span>
                            {!isPaid && payroll.netPayable > 0 && (
                              <Button 
                                size="sm" 
                                onClick={() => handlePaySalary(member.id, member.name, Math.round(payroll.netPayable))}
                                disabled={paySalary.isPending}
                              >
                                {paySalary.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <DollarSign className="h-4 w-4 mr-1" />
                                )}
                                Pay Salary
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {/* Toggle between active and inactive staff */}
            <div className="flex justify-end gap-2">
              <Button
                variant={showInactive ? 'outline' : 'default'}
                size="sm"
                onClick={() => setShowInactive(false)}
              >
                Active ({activeStaff.length})
              </Button>
              <Button
                variant={showInactive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInactive(true)}
              >
                Left Company ({inactiveStaff.length})
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : displayedStaff.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {showInactive ? 'No former staff members.' : 'No active staff members yet. Add your first staff member.'}
                </CardContent>
              </Card>
            ) : (
              displayedStaff.map((member) => (
                <Card key={member.id} className={showInactive ? 'opacity-70' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{member.name}</h3>
                          <Badge variant="secondary">{member.role}</Badge>
                          {showInactive && (
                            <Badge variant="outline" className="text-muted-foreground">Left</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                          <span>{formatAmount(Number(member.base_salary))}/month</span>
                        </div>
                        {member.bank_name && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{member.bank_name}</span>
                            {member.iban && (
                              <>
                                <span className="mx-1">•</span>
                                <span className="font-mono">{maskNumber(member.iban)}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openBankingDialog(member.id, member.name, member)}
                          title="Banking Details"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openHistory(member.id, member.name)}
                          title="Salary History"
                        >
                          <History className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {showInactive ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleReactivate(member.id)}
                            disabled={reactivateStaff.isPending}
                            title="Reactivate"
                          >
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeactivateId(member.id)}
                            disabled={deactivateStaff.isPending}
                            title="Mark as Left"
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Salary Advance Dialog */}
        <Dialog open={isAdvanceOpen} onOpenChange={setIsAdvanceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Salary Advance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAdvance} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="advanceAmount">Amount (AED)</Label>
                <Input
                  id="advanceAmount"
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advanceNotes">Notes (Optional)</Label>
                <Input
                  id="advanceNotes"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="e.g., Emergency advance"
                />
              </div>
              <Button type="submit" className="w-full" disabled={addAdvance.isPending}>
                {addAdvance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Advance
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Banking Details Dialog */}
        <Dialog open={isBankingOpen} onOpenChange={setIsBankingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Banking Details - {selectedStaffName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveBanking} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={bankingData.bank_name}
                  onChange={(e) => setBankingData({ ...bankingData, bank_name: e.target.value })}
                  placeholder="e.g., Emirates NBD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={bankingData.account_number}
                  onChange={(e) => setBankingData({ ...bankingData, account_number: e.target.value })}
                  placeholder="Account number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={bankingData.iban}
                  onChange={(e) => setBankingData({ ...bankingData, iban: e.target.value.toUpperCase() })}
                  placeholder="e.g., AE07033123456789012345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swiftCode">SWIFT/BIC Code</Label>
                <Input
                  id="swiftCode"
                  value={bankingData.swift_code}
                  onChange={(e) => setBankingData({ ...bankingData, swift_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., EABORAE1XXX"
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateStaff.isPending}>
                {updateStaff.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Banking Details
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Staff Left Company?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the staff member as inactive. Their salary history and records will be preserved for accounting purposes. You can reactivate them later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Mark as Left
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Salary History Modal */}
        <SalaryHistoryModal
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          staffId={selectedStaffId}
          staffName={selectedStaffName}
        />
      </div>
    </AppLayout>
  );
}
