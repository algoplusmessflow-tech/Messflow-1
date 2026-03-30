import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import Settings from '../pages/Settings';
import { useAuth } from '../lib/auth';
import { useProfile } from '../hooks/useProfile';
import { useExpenses } from '../hooks/useExpenses';
import { useStorageManager } from '../hooks/useStorageManager';
import { supabase } from '../integrations/supabase/client';

// Mock all dependencies
vi.mock('../lib/auth');
vi.mock('../hooks/useProfile');
vi.mock('../hooks/useExpenses');
vi.mock('../hooks/useStorageManager');
vi.mock('../integrations/supabase/client');
vi.mock('../lib/pdf-generator');
vi.mock('../lib/slug');
vi.mock('../lib/google-drive');
vi.mock('../lib/google-sheets-backup');
vi.mock('../components/CompanyLogoUpload');
vi.mock('../components/ui/glass-card');
vi.mock('../components/ui/button');
vi.mock('../components/ui/input');
vi.mock('../components/ui/label');
vi.mock('../components/ui/tabs');
vi.mock('../components/ui/dialog');
vi.mock('../components/ui/select');
vi.mock('../components/ui/textarea');
vi.mock('@tanstack/react-query');

const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
};

const mockProfile = {
  user_id: 'user-123',
  business_name: 'Test Business',
  business_type: 'mess',
  currency: 'AED',
  tax_name: 'VAT',
  tax_rate: 5,
  tax_trn: '123456789',
  company_address: 'Test Address',
  whatsapp_api_key: 'test-key',
  map_api_key: 'test-map-key',
  map_api_provider: 'openstreetmap'
};

const mockExpenses = [
  {
    id: '1',
    date: '2024-01-01',
    amount: 100,
    description: 'Test expense',
    category: 'food'
  }
];

const mockStorageManager = {
  storageUsed: 1000000,
  storageLimit: 10000000,
  formatBytes: vi.fn().mockReturnValue('1 MB'),
  deleteOldReceipts: vi.fn()
};

describe('Settings Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock hooks
    (useAuth as any).mockReturnValue({ user: mockUser });
    (useProfile as any).mockReturnValue({ profile: mockProfile });
    (useExpenses as any).mockReturnValue({ expenses: mockExpenses });
    (useStorageManager as any).mockReturnValue(mockStorageManager);
    
    // Mock supabase
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      upsert: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });
  });

  const renderSettings = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Settings />
      </QueryClientProvider>
    );
  };

  it('should render without crashing', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render business mode select with correct options', async () => {
    renderSettings();
    
    const select = screen.getByDisplayValue('mess');
    expect(select).toBeInTheDocument();
    
    // Test that the select has the correct options
    fireEvent.click(select);
    
    await waitFor(() => {
      expect(screen.getByText('Restaurant Mode (Tables & Realtime KOT)')).toBeInTheDocument();
      expect(screen.getByText('Canteen Mode (Pre-paid Tokens & Bulk)')).toBeInTheDocument();
    });
  });

  it('should handle business mode change correctly', async () => {
    renderSettings();
    
    const select = screen.getByDisplayValue('mess');
    fireEvent.click(select);
    
    const restaurantOption = await screen.findByText('Restaurant Mode (Tables & Realtime KOT)');
    fireEvent.click(restaurantOption);
    
    // Verify that the mutation was called with correct data
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  it('should save tax settings correctly', async () => {
    renderSettings();
    
    const taxNameInput = screen.getByDisplayValue('VAT');
    fireEvent.change(taxNameInput, { target: { value: 'GST' } });
    
    const saveButton = screen.getByText('Save Tax Settings');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  it('should save company settings correctly', async () => {
    renderSettings();
    
    const addressInput = screen.getByDisplayValue('Test Address');
    fireEvent.change(addressInput, { target: { value: 'New Address' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  it('should save invoice settings correctly', async () => {
    renderSettings();
    
    const prefixInput = screen.getByDisplayValue('INV');
    fireEvent.change(prefixInput, { target: { value: 'BILL' } });
    
    const saveButton = screen.getByText('Save Invoice Settings');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('invoice_settings');
    });
  });
});