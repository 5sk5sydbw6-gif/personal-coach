/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Age in whole years from birth year and month. Without a birth day we
 * treat the birthday as the 1st of the month, so someone turns a year
 * older at the start of their birth month.
 */
export function ageFromBirth(birthYear: number, birthMonth: number, today: Date): number {
  const years = today.getFullYear() - birthYear;
  return today.getMonth() + 1 >= birthMonth ? years : years - 1;
}
