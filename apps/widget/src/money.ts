/**
 * Whole amounts read better without the trailing zeroes a donation never has:
 * "€5" rather than "€5.00", while "€7.50" keeps its cents.
 */
export function formatAmount(amount: number, currency: string): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    // An unknown currency code would otherwise throw and take the container
    // down with it.
    return `${currency.toUpperCase()} ${amount.toFixed(fractionDigits)}`;
  }
}
