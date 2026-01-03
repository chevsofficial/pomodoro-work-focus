import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'en' | 'es';

const STORAGE_KEY = 'app_language';
const SUPPORTED: AppLanguage[] = ['en', 'es'];

/**
 * Return best app language from device locales.
 * - If any locale starts with "es" -> 'es'
 * - Else -> 'en'
 */
export function detectDeviceLanguage(): AppLanguage {
  const locales = Localization.getLocales?.() ?? [];

  const hasSpanish =
    locales.some((locale) => locale.languageCode?.toLowerCase() === 'es') ||
    locales.some((locale) => (locale.languageTag ?? '').toLowerCase().startsWith('es'));

  return hasSpanish ? 'es' : 'en';
}

export async function getSavedLanguage(): Promise<AppLanguage | null> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'es') return saved;
  return null;
}

export async function saveLanguage(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, language);
}

/**
 * Runs once on startup:
 * - If language already saved: return it
 * - Else detect from device and save it
 */
export async function bootstrapLanguage(): Promise<AppLanguage> {
  const saved = await getSavedLanguage();
  if (saved && SUPPORTED.includes(saved)) return saved;

  const detected = detectDeviceLanguage();
  await saveLanguage(detected);
  return detected;
}
