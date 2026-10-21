import { bn } from './translations';
const banglaNumbers = new Intl.NumberFormat('bn-BD', { useGrouping: false });
export function translate(message: string, language: 'en' | 'bn' = 'en', ...values: unknown[]) {
  const text = language === 'bn' ? (bn[message] ?? message) : message;
  return text.replace(/\{(\d+)\}/g, (_, index: string) => {
    const value = values[Number(index)];
    return language === 'bn' && typeof value === 'number'
      ? banglaNumbers.format(value)
      : String(value ?? '');
  });
}
