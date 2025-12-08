import useAppStore from '../store/appStore';

const LOCALES = {
  en: 'en-US',
  es: 'es-MX',
} as const;

export function formatDateHeader(date: Date): string {
  const language = useAppStore.getState().language ?? 'en';
  const locale = LOCALES[language as keyof typeof LOCALES] ?? LOCALES.en;

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatAnalyticsDate(date: Date): string {
  return formatDateHeader(date);
}
