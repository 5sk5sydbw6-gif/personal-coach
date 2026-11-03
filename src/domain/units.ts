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

/** Parses user-typed numbers; accepts "80,5" as well as "80.5". Empty or invalid -> undefined. */
export function parseDecimal(text: string): number | undefined {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** Text shown in a weight input: one box, or two for stones + pounds. */
export interface WeightFields {
  main: string;
  lb: string;
}

export function weightToFields(kg: number | undefined, unit: WeightUnit): WeightFields {
  if (kg === undefined) return { main: '', lb: '' };
  switch (unit) {
    case 'kg':
      return { main: trimZero(kg.toFixed(1)), lb: '' };
    case 'lb':
      return { main: trimZero(kgToLb(kg).toFixed(1)), lb: '' };
    case 'st': {
      const { stone, lb } = kgToStoneLb(kg);
      return { main: String(stone), lb: trimZero(lb.toFixed(1)) };
    }
  }
}

/** Converts typed weight back to kg (rounded to 10 g). Undefined if the main box is empty or invalid. */
export function fieldsToWeight(fields: WeightFields, unit: WeightUnit): number | undefined {
  const main = parseDecimal(fields.main);
  if (main === undefined) return undefined;
  let kg: number;
  if (unit === 'kg') kg = main;
  else if (unit === 'lb') kg = lbToKg(main);
  else {
    const lb = fields.lb.trim() === '' ? 0 : parseDecimal(fields.lb);
    if (lb === undefined) return undefined;
    kg = stoneLbToKg(main, lb);
  }
  return Math.round(kg * 100) / 100;
}

function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
