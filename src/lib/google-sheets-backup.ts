/**
 * Google Sheets Backup for MessFlow.
 * Creates/updates a spreadsheet in the user's Google Drive with real-time member data.
 * Uses the Sheets API via the provider_token from Supabase Auth.
 *
 * Architecture:
 * - Each user gets their own "MessFlow Backup" spreadsheet in Drive
 * - Sheet 1: Members (full customer data)
 * - Sheet 2: Menu (current week)
 * - Sheet 3: Expenses summary
 * - Spreadsheet ID cached in profiles.google_sheets_id
 * - Does NOT touch SuperAdmin data — only the authenticated user's own members
 */

import { supabase } from '@/integrations/supabase/client';
import { getGoogleAccessToken } from './google-drive';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

// ── Create or get the backup spreadsheet ──────────────────────

async function getOrCreateBackupSheet(
  accessToken: string,
  userId: string
): Promise<string> {
  // Check cached spreadsheet ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_sheets_id, business_name')
    .eq('user_id', userId)
    .single();

  const cachedId = (profile as any)?.google_sheets_id;
  const bizName = (profile as any)?.business_name || 'MessFlow';

  // Verify cached sheet still exists
  if (cachedId) {
    const check = await fetch(`${SHEETS_API}/${cachedId}?fields=spreadsheetId`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (check.ok) return cachedId;
  }

  // Create new spreadsheet
  const createRes = await fetch(SHEETS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: `${bizName} — MessFlow Backup` },
      sheets: [
        { properties: { title: 'Members', sheetId: 0 } },
        { properties: { title: 'Menu', sheetId: 1 } },
        { properties: { title: 'Expenses', sheetId: 2 } },
        { properties: { title: 'Backup Log', sheetId: 3 } },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create backup spreadsheet');
  }

  const sheet = await createRes.json();
  const sheetId = sheet.spreadsheetId;

  // Cache the ID
  await supabase
    .from('profiles')
    .update({ google_sheets_id: sheetId } as any)
    .eq('user_id', userId);

  return sheetId;
}

// ── Write data to a sheet range ──────────────────────────────

async function writeToSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Failed to write to ${range}`);
  }
}

// ── Clear a sheet before writing ─────────────────────────────

async function clearSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

// ── Format header row (bold, frozen) ─────────────────────────

async function formatHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number
): Promise<void> {
  await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    }),
  });
}

// ── Main backup function ─────────────────────────────────────

export async function backupMembersToSheets(userId: string): Promise<{
  spreadsheetUrl: string;
  memberCount: number;
}> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error('Google not connected. Sign in with Google first.');

  const spreadsheetId = await getOrCreateBackupSheet(accessToken, userId);

  // Fetch members (ONLY this user's members — not SuperAdmin data)
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .eq('owner_id', userId)
    .order('name');

  if (error) throw new Error('Failed to fetch members: ' + error.message);

  // Fetch delivery zones for lookup
  const { data: zones } = await supabase
    .from('delivery_areas')
    .select('id, name')
    .eq('owner_id', userId);
  const zoneMap: Record<string, string> = {};
  (zones || []).forEach((z: any) => { zoneMap[z.id] = z.name; });

  // Build Members sheet data
  const memberHeaders = [
    'Name', 'Phone', 'Address', 'Status', 'Plan', 'Meal Type',
    'Monthly Fee', 'Balance', 'Joining Date', 'Expiry Date',
    'Zone', 'Roti Qty', 'Rice Type', 'Dietary', 'Skip Weekends',
    'Free Trial', 'Special Notes', 'Portal Username',
  ];

  const memberRows = (members || []).map((m: any) => [
    m.name || '',
    m.phone || '',
    m.address || '',
    m.status || 'active',
    m.plan_type || '',
    m.meal_type || 'both',
    m.monthly_fee || 0,
    m.balance || 0,
    m.joining_date || '',
    m.plan_expiry_date || '',
    zoneMap[m.delivery_area_id] || '',
    m.roti_quantity || 2,
    m.rice_type || '',
    m.dietary_preference || '',
    m.skip_weekends ? 'Yes' : 'No',
    m.free_trial ? 'Yes' : 'No',
    m.special_notes || '',
    m.portal_username || '',
  ]);

  // Write Members sheet
  await clearSheet(accessToken, spreadsheetId, 'Members');
  await writeToSheet(accessToken, spreadsheetId, 'Members!A1', [memberHeaders, ...memberRows]);
  await formatHeaders(accessToken, spreadsheetId, 0);

  // Fetch & write Menu
  const weekNum = Math.ceil(new Date().getDate() / 7);
  const { data: menu } = await supabase
    .from('menu')
    .select('day, breakfast, lunch, dinner')
    .eq('owner_id', userId)
    .eq('week_number', weekNum)
    .order('day');

  if (menu && menu.length > 0) {
    const menuHeaders = ['Day', 'Breakfast', 'Lunch', 'Dinner'];
    const menuRows = menu.map((m: any) => [m.day, m.breakfast || '', m.lunch || '', m.dinner || '']);
    await clearSheet(accessToken, spreadsheetId, 'Menu');
    await writeToSheet(accessToken, spreadsheetId, 'Menu!A1', [menuHeaders, ...menuRows]);
    await formatHeaders(accessToken, spreadsheetId, 1);
  }

  // Fetch & write Expenses (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: expenses } = await supabase
    .from('expenses')
    .select('date, category, description, amount, payment_method')
    .eq('owner_id', userId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false });

  if (expenses && expenses.length > 0) {
    const expHeaders = ['Date', 'Category', 'Description', 'Amount', 'Payment'];
    const expRows = expenses.map((e: any) => [e.date, e.category || '', e.description || '', e.amount || 0, e.payment_method || '']);
    await clearSheet(accessToken, spreadsheetId, 'Expenses');
    await writeToSheet(accessToken, spreadsheetId, 'Expenses!A1', [expHeaders, ...expRows]);
    await formatHeaders(accessToken, spreadsheetId, 2);
  }

  // Write backup log
  const now = new Date().toLocaleString();
  await writeToSheet(accessToken, spreadsheetId, 'Backup Log!A1', [
    ['Last Backup', 'Members', 'Menu Days', 'Expenses (30d)'],
    [now, (members || []).length, (menu || []).length, (expenses || []).length],
  ]);
  await formatHeaders(accessToken, spreadsheetId, 3);

  return {
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    memberCount: (members || []).length,
  };
}

// ── Check if backup sheet exists ─────────────────────────────

export async function getBackupSheetUrl(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('google_sheets_id')
    .eq('user_id', userId)
    .single();
  const id = (data as any)?.google_sheets_id;
  return id ? `https://docs.google.com/spreadsheets/d/${id}` : null;
}
