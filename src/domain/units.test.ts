import {
  fieldsToWeight,
  formatWeight,
  kgToLb,
  kgToStoneLb,
  lbToKg,
  parseDecimal,
  stoneLbToKg,
  weightToFields,
} from './units';

describe('weight unit conversion', () => {
  it('converts kg to lb and back', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 5);
    expect(lbToKg(kgToLb(83.4))).toBeCloseTo(83.4, 10);
  });

  it('splits kg into stones and pounds', () => {
    // 80 kg = 176.37 lb = 12 st 8.4 lb
    expect(kgToStoneLb(80)).toEqual({ stone: 12, lb: 8.4 });
  });

  it('rounds before splitting so pounds never show as 14', () => {
    // 13.96 lb rounds to 14.0 lb, which must display as 1 st 0 lb
    expect(kgToStoneLb(lbToKg(13.96))).toEqual({ stone: 1, lb: 0 });
  });

  it('converts stones and pounds back to kg', () => {
    expect(stoneLbToKg(12, 8.4)).toBeCloseTo(80, 1);
  });

  it('formats a weight in each display unit', () => {
    expect(formatWeight(80, 'kg')).toBe('80.0 kg');
    expect(formatWeight(80, 'lb')).toBe('176.4 lb');
    expect(formatWeight(80, 'st')).toBe('12 st 8.4 lb');
  });
});

describe('weight input helpers', () => {
  it('parses decimals with either separator', () => {
    expect(parseDecimal('80.5')).toBe(80.5);
    expect(parseDecimal(' 80,5 ')).toBe(80.5);
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('abc')).toBeUndefined();
  });

  it('shows a stored weight in each unit', () => {
    expect(weightToFields(80, 'kg')).toEqual({ main: '80', lb: '' });
    expect(weightToFields(80, 'lb')).toEqual({ main: '176.4', lb: '' });
    expect(weightToFields(80, 'st')).toEqual({ main: '12', lb: '8.4' });
    expect(weightToFields(undefined, 'kg')).toEqual({ main: '', lb: '' });
  });

  it('converts typed weights back to kg', () => {
    expect(fieldsToWeight({ main: '80', lb: '' }, 'kg')).toBe(80);
    expect(fieldsToWeight({ main: '176.4', lb: '' }, 'lb')).toBeCloseTo(80, 1);
    expect(fieldsToWeight({ main: '12', lb: '8.4' }, 'st')).toBeCloseTo(80, 1);
    expect(fieldsToWeight({ main: '12', lb: '' }, 'st')).toBeCloseTo(76.2, 1);
    expect(fieldsToWeight({ main: '', lb: '5' }, 'st')).toBeUndefined();
    expect(fieldsToWeight({ main: '12', lb: 'x' }, 'st')).toBeUndefined();
  });
});
