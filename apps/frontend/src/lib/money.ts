/** Formats minor units as currency, falling back to a plain code for unknown ISO codes. */
export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(minor / 100);
  } catch {
    return `${currency.toUpperCase()} ${(minor / 100).toFixed(2)}`;
  }
}
