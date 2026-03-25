/**
 * createInvoiceRecord — Persists an invoice + line items to Supabase.
 * Called automatically when:
 *   1. A new paid member is added (source: 'member_signup')
 *   2. A payment is recorded against a member (source: 'payment')
 *   3. An invoice is created manually (source: 'manual')
 *
 * Returns the created invoice record, or null on failure.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CreateInvoiceParams {
  ownerId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  amount: number;
  taxRate?: number;
  taxName?: string;
  businessName?: string;
  billingPeriodStart?: string; // YYYY-MM-DD
  billingPeriodEnd?: string;
  notes?: string;
  source: 'member_signup' | 'payment' | 'manual' | 'renewal';
  invoiceNumber?: string;
}

export async function createInvoiceRecord(params: CreateInvoiceParams) {
  const {
    ownerId, memberId, memberName, memberPhone,
    amount, taxRate = 5, taxName = 'VAT',
    billingPeriodStart, billingPeriodEnd,
    notes, source, invoiceNumber,
  } = params;

  // Calculate tax breakdown (amount is inclusive of tax)
  const subtotal = parseFloat((amount / (1 + taxRate / 100)).toFixed(2));
  const taxAmount = parseFloat((amount - subtotal).toFixed(2));
  const totalAmount = amount;

  // Generate invoice number if not provided
  let invNumber = invoiceNumber;
  if (!invNumber) {
    // Fetch the next invoice number from profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('next_invoice_number')
      .eq('user_id', ownerId)
      .single();
    const nextNum = (profileData as any)?.next_invoice_number || 1;
    invNumber = `INV-${String(nextNum).padStart(5, '0')}`;

    // Increment the counter
    await supabase
      .from('profiles')
      .update({ next_invoice_number: nextNum + 1 } as any)
      .eq('user_id', ownerId);
  }

  // Determine billing period
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  const periodStart = billingPeriodStart || today;
  const periodEnd = billingPeriodEnd || nextMonthStr;

  // Build insert data — only include base columns that always exist
  const insertData: Record<string, any> = {
    owner_id: ownerId,
    invoice_number: invNumber,
    member_id: memberId,
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    notes: notes || (source === 'member_signup'
      ? `Auto-generated on member signup for ${memberName}`
      : source === 'renewal'
        ? `Renewal invoice for ${memberName}`
        : source === 'payment'
          ? `Payment recorded for ${memberName}`
          : null),
    status: 'paid',
    due_date: periodEnd,
    paid_date: today,
  };

  // Create invoice record — try with extended columns first, fall back to base
  let result = await supabase
    .from('invoices')
    .insert({ ...insertData, customer_phone: memberPhone, source } as any)
    .select()
    .single();

  // If extended columns don't exist yet, retry with base columns only
  if (result.error && (result.error.message?.includes('customer_phone') || result.error.message?.includes('source') || result.error.code === '42703')) {
    console.warn('[createInvoiceRecord] Extended columns missing, using base insert');
    result = await supabase
      .from('invoices')
      .insert(insertData as any)
      .select()
      .single();
  }

  const { data: invoice, error } = result;

  if (error) {
    console.error('[createInvoiceRecord] Failed to create invoice:', error);
    return null;
  }

  // Create invoice line item — single line for the subscription
  const description = source === 'member_signup'
    ? `Meal subscription — ${memberName} (initial)`
    : source === 'renewal'
      ? `Meal subscription — ${memberName} (renewal)`
      : `Meal subscription — ${memberName}`;

  await supabase
    .from('invoice_items')
    .insert({
      owner_id: ownerId,
      invoice_id: invoice.id,
      description,
      quantity: 1,
      unit_price: subtotal,
      total_price: subtotal,
    } as any);

  // If there's a non-zero tax, add a separate tax line for clarity
  // (Not needed — tax is shown in the invoice header. But we keep the item clean.)

  return invoice;
}
