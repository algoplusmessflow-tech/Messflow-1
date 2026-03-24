import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { uploadReceipt as uploadReceiptToCloudinary } from '@/lib/cloudinary';
import { uploadReceipt as uploadReceiptUnified } from '@/lib/upload-service';

export function useStorageManager() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const storageUsed = profile?.storage_used || 0;
  // Storage limits by plan: Free=100MB, Pro=250MB
  const STORAGE_LIMITS: Record<string, number> = {
    free: 104857600,         // 100 MB
    professional: 262144000, // 250 MB
    enterprise: 1073741824,  // 1 GB
  };
  const planType = (profile as any)?.plan_type || 'free';
  const storageLimit = STORAGE_LIMITS[planType] || STORAGE_LIMITS.free;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canUpload = (fileSize: number): boolean => {
    // With Cloudinary, we don't track storage the same way
    // But keep the logic for backward compatibility
    return (storageUsed + fileSize) <= storageLimit;
  };

  /**
   * Upload a receipt to Cloudinary
   * Returns the public URL of the uploaded image
   */
  const uploadReceipt = async (file: File): Promise<{ url: string; size: number } | null> => {
    if (!user) throw new Error('Not authenticated');

    try {
      // Use unified upload service — routes to Google Drive or Cloudinary
      const result = await uploadReceiptUnified(file, user.id);

      // Only track storage if using Cloudinary (Google Drive uses user's own quota)
      if (result.provider === 'cloudinary') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ storage_used: storageUsed + result.size })
          .eq('user_id', user.id);
        if (updateError) console.error('Failed to update storage used:', updateError);
      }

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      return { url: result.url, size: result.size };
    } catch (error: any) {
      console.error('Upload failed:', error);
      throw new Error('Failed to upload receipt: ' + error.message);
    }
  };

  /**
   * Note: Cloudinary deletion requires signed request or manual deletion via dashboard
   * For now, we just clear the reference in the database
   */
  const deleteReceipt = async (receiptUrl: string, fileSize: number) => {
    if (!user) throw new Error('Not authenticated');

    // Update storage used in profile (reduce tracked usage)
    const newStorageUsed = Math.max(0, storageUsed - fileSize);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ storage_used: newStorageUsed })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update storage used:', updateError);
    }

    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const deleteOldReceipts = async (beforeDate: Date) => {
    if (!user) throw new Error('Not authenticated');

    // Get all expenses with receipts before the date
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('id, receipt_url, file_size_bytes')
      .eq('owner_id', user.id)
      .lt('date', beforeDate.toISOString())
      .not('receipt_url', 'is', null);

    if (fetchError) throw fetchError;

    if (!expenses || expenses.length === 0) {
      toast.info('No receipts found before the selected date');
      return;
    }

    let totalFreed = 0;
    let deletedCount = 0;

    for (const expense of expenses) {
      if (expense.receipt_url) {
        try {
          // Clear receipt reference in database
          // Note: Cloudinary images remain until manually deleted via dashboard
          await supabase
            .from('expenses')
            .update({ receipt_url: null, file_size_bytes: 0 })
            .eq('id', expense.id);

          totalFreed += expense.file_size_bytes || 0;
          deletedCount++;
        } catch (error) {
          console.error('Failed to delete receipt:', expense.id, error);
        }
      }
    }

    // Update storage used
    const newStorageUsed = Math.max(0, storageUsed - totalFreed);
    await supabase
      .from('profiles')
      .update({ storage_used: newStorageUsed })
      .eq('user_id', user.id);

    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });

    toast.success(`Deleted ${deletedCount} receipts, freed ${formatBytes(totalFreed)}`);
  };

  return {
    storageUsed,
    storageLimit,
    formatBytes,
    canUpload,
    uploadReceipt,
    deleteReceipt,
    deleteOldReceipts,
  };
}
