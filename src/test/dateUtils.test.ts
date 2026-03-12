import { describe, it, expect } from 'vitest';
import { calculateAge } from '../utils/dateUtils';

describe('calculateAge', () => {
  it('should calculate accurate age in years, months, and days', () => {
    const targetDate = new Date('2026-03-12T00:00:00');
    
    // Example from user: roughly 43 years, 2 months, 25 days depending on the exact dates
    const birthDate1 = new Date('1982-12-17T00:00:00');
    expect(calculateAge(birthDate1, targetDate)).toBe('43 anos, 2 meses, 23 dias'); // 23 or 25 depending on exact days, standard calculation gives 23
    
    // Exact 1 year, 1 month, 1 day
    const birthDate2 = new Date('2025-02-11T00:00:00');
    expect(calculateAge(birthDate2, targetDate)).toBe('1 ano, 1 mês, 1 dia');

    // Newborn
    const birthDate3 = new Date('2026-03-12T00:00:00');
    expect(calculateAge(birthDate3, targetDate)).toBe('0 dias');
  });
});
