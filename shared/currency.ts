/**
 * Format a number or string as Kenyan Shillings (KSh).
 * Examples: formatKSh(1500) → "KSh 1,500.00"
 *           formatKSh("249.5") → "KSh 249.50"
 */
export function formatKSh(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "KSh 0.00";
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Short format without decimals for chart labels.
 * Examples: formatKShShort(1500) → "KSh 1,500"
 */
export function formatKShShort(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "KSh 0";
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export const CURRENCY_SYMBOL = "KSh";
