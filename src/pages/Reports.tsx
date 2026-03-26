import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuditReport } from '@/hooks/useAuditReport';
import { useCurrency } from '@/hooks/useCurrency';
import { generateAuditPDF } from '@/lib/audit-pdf-generator';
import { CurrencyCode } from '@/lib/currencies';
import { CostInsightsWidget } from '@/components/CostInsightsWidget';
import { FileText, Download, TrendingUp, TrendingDown, PieChart, Users, Wallet, Lightbulb, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useGenerationLimits } from '@/hooks/useGenerationLimits';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#FFBB28', '#00C49F', '#FF8042', '#8884d8'];

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { report, isLoading, businessName, businessAddress, currency } = useAuditReport(selectedMonth);
  const { formatAmount } = useCurrency();
  const { canGeneratePDF, canGenerateExcel, incrementPDFCount, incrementExcelCount } = useGenerationLimits();

  // Generate last 12 months for selection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date.toISOString(),
      label: format(date, 'MMMM yyyy'),
    };
  });

  const handleExportPDF = async () => {
    if (!report) return;
    
    if (!canGeneratePDF) {
      toast.error('PDF generation limit reached. Please upgrade to Professional plan.');
      return;
    }

    try {
      await generateAuditPDF(report, businessName, businessAddress, currency as CurrencyCode);
      incrementPDFCount();
      toast.success('Audit report downloaded!');
    } catch (error: any) {
      toast.error('Failed to generate PDF: ' + error.message);
    }
  };

  const handleExportExcel = async () => {
    if (!report) return;
    
    if (!canGenerateExcel) {
      toast.error('Excel generation limit reached. Please upgrade to Professional plan.');
      return;
    }

    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Executive Summary
      const summaryData = [
        ['Executive Summary', `${report.month} ${report.year}`],
        [''],
        ['Metric', 'Amount'],
        ['Total Revenue', report.totalRevenue],
        ['Fixed Costs', report.totalFixedCosts],
        ['Variable Costs', report.totalVariableCosts],
        ['Net Profit/Loss', report.netProfit],
        ['Payment Count', report.memberStats.paymentCount],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

      // Sheet 2: Category Breakdown
      const categoryData = [
        ['Category', 'Amount', 'Percentage'],
        ...report.categoryBreakdown.map(cat => [cat.category, cat.amount, `${cat.percentage}%`]),
      ];
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Expense Breakdown');

      // Sheet 3: Salary Manifest
      const salaryData = [
        ['Staff Name', 'Role', 'Base Salary', 'Paid Amount', 'Status'],
        ...report.salaryManifest.map(staff => [
          staff.staffName,
          staff.role,
          staff.baseSalary,
          staff.paidAmount,
          staff.status
        ]),
      ];
      const salarySheet = XLSX.utils.aoa_to_sheet(salaryData);
      XLSX.utils.book_append_sheet(workbook, salarySheet, 'Salary Manifest');

      // Sheet 4: Petty Cash Summary
      const pettyCashData = [
        ['Petty Cash Summary', ''],
        ['Total Refills', report.pettyCashSummary.totalRefills],
        ['Total Spent', report.pettyCashSummary.totalSpent],
        ['Closing Balance', report.pettyCashSummary.closingBalance],
      ];
      const pettyCashSheet = XLSX.utils.aoa_to_sheet(pettyCashData);
      XLSX.utils.book_append_sheet(workbook, pettyCashSheet, 'Petty Cash');

      // Generate filename
      const fileName = `${businessName.replace(/[^a-zA-Z0-9]/g, '_')}_audit_report_${report.month}_${report.year}.xlsx`;
      
      // Write and download
      XLSX.writeFile(workbook, fileName);
      
      incrementExcelCount();
      toast.success('Audit report exported to Excel!');
    } catch (error: any) {
      toast.error('Failed to export Excel: ' + error.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports & Audits</h1>
            <p className="text-muted-foreground">Monthly financial statements & business intelligence</p>
          </div>
        </div>

        {/* Business Intelligence Section */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Business Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CostInsightsWidget />
          </CardContent>
        </Card>

        {/* Month Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <Select
                  value={selectedMonth.toISOString()}
                  onValueChange={(value) => setSelectedMonth(new Date(value))}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExportPDF} disabled={isLoading || !report || !canGeneratePDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleExportExcel} disabled={isLoading || !report || !canGenerateExcel} variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : report ? (
          <>
            {/* Executive Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {report.netProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                  Executive Summary - {report.month} {report.year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-green-500">{formatAmount(report.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">{report.memberStats.paymentCount} payments</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Fixed Costs</p>
                    <p className="text-xl font-bold">{formatAmount(report.totalFixedCosts)}</p>
                    <p className="text-xs text-muted-foreground">Rent + Salaries</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Variable Costs</p>
                    <p className="text-xl font-bold">{formatAmount(report.totalVariableCosts)}</p>
                    <p className="text-xs text-muted-foreground">Daily expenses</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    report.netProfit >= 0 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'bg-destructive/10 border border-destructive/30'
                  }`}>
                    <p className="text-sm text-muted-foreground">
                      Net {report.netProfit >= 0 ? 'Profit' : 'Loss'}
                    </p>
                    <p className={`text-xl font-bold ${
                      report.netProfit >= 0 ? 'text-green-500' : 'text-destructive'
                    }`}>
                      {report.netProfit >= 0 ? '+' : ''}{formatAmount(report.netProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown Chart */}
            {report.categoryBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={report.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="amount"
                          nameKey="category"
                          label={({ category, percentage }) => `${category} (${percentage}%)`}
                          labelLine={false}
                        >
                          {report.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatAmount(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '4px',
                          }}
                        />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Salary Manifest */}
            {report.salaryManifest.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Salary Manifest
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Staff Name</th>
                          <th className="text-left py-2 font-medium">Role</th>
                          <th className="text-right py-2 font-medium">Base Salary</th>
                          <th className="text-right py-2 font-medium">Paid</th>
                          <th className="text-center py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.salaryManifest.map((staff, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{staff.staffName}</td>
                            <td className="py-2 capitalize">{staff.role}</td>
                            <td className="py-2 text-right">{formatAmount(staff.baseSalary)}</td>
                            <td className="py-2 text-right">{formatAmount(staff.paidAmount)}</td>
                            <td className="py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                staff.status === 'paid'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {staff.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Petty Cash Summary */}
            {(report.pettyCashSummary.totalRefills > 0 || report.pettyCashSummary.totalSpent > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Petty Cash Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Refills</p>
                      <p className="text-lg font-bold text-green-500">
                        {formatAmount(report.pettyCashSummary.totalRefills)}
                      </p>
                    </div>
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-lg font-bold text-destructive">
                        {formatAmount(report.pettyCashSummary.totalSpent)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Closing Balance</p>
                      <p className="text-lg font-bold">
                        {formatAmount(report.pettyCashSummary.closingBalance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No data available for the selected month.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
