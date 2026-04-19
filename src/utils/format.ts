export function formatCurrency(amount: number, currency = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('he-IL').format(Math.round(n));
}
