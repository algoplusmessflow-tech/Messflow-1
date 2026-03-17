import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { FREE_TIER_LIMITS } from './useFreeTierLimits';

export function useGenerationLimits() {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const planType = profile?.plan_type || 'free';
  const isPro = planType === 'pro';

  // For now, we'll use localStorage to track generation counts for free users
  // In a production environment, this should be stored in the database
  
  const getGenerationCount = (type: 'pdf' | 'excel'): number => {
    if (!user) return 0;
    const key = `generation_count_${user.id}_${type}`;
    const count = localStorage.getItem(key);
    return count ? parseInt(count, 10) : 0;
  };

  const incrementGenerationCount = (type: 'pdf' | 'excel'): void => {
    if (!user) return;
    const key = `generation_count_${user.id}_${type}`;
    const currentCount = getGenerationCount(type);
    localStorage.setItem(key, (currentCount + 1).toString());
  };

  const resetGenerationCount = (type: 'pdf' | 'excel'): void => {
    if (!user) return;
    const key = `generation_count_${user.id}_${type}`;
    localStorage.removeItem(key);
  };

  const pdfCount = getGenerationCount('pdf');
  const excelCount = getGenerationCount('excel');

  const limits = useMemo(() => {
    if (isPro) {
      return {
        canGeneratePDF: true,
        canGenerateExcel: true,
        pdfCount,
        pdfLimit: Infinity,
        excelCount,
        excelLimit: Infinity,
        isPro: true,
        incrementPDFCount: () => {},
        incrementExcelCount: () => {},
        resetPDFCount: () => {},
        resetExcelCount: () => {},
      };
    }

    return {
      canGeneratePDF: pdfCount < FREE_TIER_LIMITS.PDF_GENERATIONS,
      canGenerateExcel: excelCount < FREE_TIER_LIMITS.EXCEL_GENERATIONS,
      pdfCount,
      pdfLimit: FREE_TIER_LIMITS.PDF_GENERATIONS,
      excelCount,
      excelLimit: FREE_TIER_LIMITS.EXCEL_GENERATIONS,
      isPro: false,
      incrementPDFCount: () => incrementGenerationCount('pdf'),
      incrementExcelCount: () => incrementGenerationCount('excel'),
      resetPDFCount: () => resetGenerationCount('pdf'),
      resetExcelCount: () => resetGenerationCount('excel'),
    };
  }, [isPro, pdfCount, excelCount]);

  return limits;
}
