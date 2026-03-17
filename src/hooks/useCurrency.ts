import { useProfile } from '@/hooks/useProfile';
import { CurrencyCode, formatCurrencyWithCode } from '@/lib/currencies';

export function useCurrency() {
  const { profile } = useProfile();
  
  const currency = (profile?.currency || 'AED') as CurrencyCode;

  const formatAmount = (amount: number): string => {
    return formatCurrencyWithCode(amount, currency);
  };

  return {
    currency,
    formatAmount,
  };
}
