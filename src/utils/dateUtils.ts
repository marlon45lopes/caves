import { differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from 'date-fns';

/**
 * Calculates the exact age in years, months, and days.
 * @param birthDate The birth date
 * @param targetDate The current date (or a specific date to calculate the age at)
 * @returns A formatted string with the age, e.g., "43 anos, 2 meses, 25 dias"
 */
export function calculateAge(birthDate: Date, targetDate: Date = new Date()): string {
  if (!birthDate || isNaN(birthDate.getTime())) return '';
  
  const years = differenceInYears(targetDate, birthDate);
  const dateAfterYears = addYears(birthDate, years);
  
  const months = differenceInMonths(targetDate, dateAfterYears);
  const dateAfterMonths = addMonths(dateAfterYears, months);
  
  const days = differenceInDays(targetDate, dateAfterMonths);
  
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  
  if (parts.length === 0) return '0 dias';
  
  return parts.join(', ');
}
