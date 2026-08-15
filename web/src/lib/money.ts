export const INR_CURRENCY = 'INR' as const;

export function formatINR(amount: number | null | undefined, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: INR_CURRENCY,
    maximumFractionDigits,
  }).format(Number(amount || 0));
}
