import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const EVENTS_KEY = 'TOMOFLOW_PRODUCT_EVENTS_V1';

type ProductEvent = {
  name: string;
  at: string;
  meta?: Record<string, unknown>;
};

export async function trackEvent(name: string, meta?: Record<string, unknown>) {
  const evt: ProductEvent = {
    name,
    at: new Date().toISOString(),
    meta,
  };

  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    const list = raw ? (JSON.parse(raw) as ProductEvent[]) : [];
    list.push(evt);
    const bounded = list.slice(-300);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(bounded));
  } catch (error) {
    logger.warn('[events] failed to persist event', error);
  }

  logger.info('[event]', evt);
}
