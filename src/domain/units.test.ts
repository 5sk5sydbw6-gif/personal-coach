import {
  formatWeight,
  kgToLb,
  kgToStoneLb,
  lbToKg,
  stoneLbToKg,
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
