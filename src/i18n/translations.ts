import useAppStore from '../store/appStore';
import { Language } from '../models';

export const translations = {
  en: {
    common: {
      start: 'Start',
      stop: 'Stop',
    },
  },
  es: {
    common: {
      start: 'Iniciar',
      stop: 'Detener',
    },
  },
} as const;

type TranslationTree = typeof translations.en;

type NestedKeyOf<T> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? `${Extract<K, string>}` | `${Extract<K, string>}.${NestedKeyOf<T[K]>}`
    : `${Extract<K, string>}`;
}[keyof T];

export type TranslationKey = NestedKeyOf<TranslationTree>;

const lookupTranslation = (
  language: Language,
  key: TranslationKey,
): string | undefined => {
  return key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, translations[language]) as string | undefined;
};

export const t = (key: TranslationKey): string => {
  const language = useAppStore.getState().language;
  const translated = lookupTranslation(language, key) ?? lookupTranslation('en', key);
  return typeof translated === 'string' ? translated : key;
};
