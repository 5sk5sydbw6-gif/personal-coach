import type { WeightUnit } from './records';

// Exact by definition (international avoirdupois pound).
export const KG_PER_LB = 0.45359237;
export const LB_PER_STONE = 14;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/**
 * Splits a weight into whole stones and pounds (rounded to `lbDecimals`).
 * Rounding happens before splitting, so 13.96 lb never shows as "0 st 14 lb".
 */
export function kgToStoneLb(kg: number, lbDecimals = 1): { stone: number; lb: number } {
  const factor = 10 ** lbDecimals;
  const totalLb = Math.round(kgToLb(kg) * factor) / factor;
  const stone = Math.floor(totalLb / LB_PER_STONE);
  const lb = Math.round((totalLb - stone * LB_PER_STONE) * factor) / factor;
  return { stone, lb };
}

export function stoneLbToKg(stone: number, lb: number): number {
  return lbToKg(stone * LB_PER_STONE + lb);
}

/** Formats a stored kg value for display in the user's chosen unit. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  switch (unit) {
    case 'kg':
      return `${kg.toFixed(1)} kg`;
    case 'lb':
      return `${kgToLb(kg).toFixed(1)} lb`;
    case 'st': {
      const { stone, lb } = kgToStoneLb(kg);
      return `${stone} st ${lb.toFixed(1)} lb`;
    }
  }
}
