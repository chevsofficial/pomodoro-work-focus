// src/services/revenuecat.ts

import Purchases, { LOG_LEVEL, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';
import useAppStore from '../store/appStore';
import { getRevenueCatApiKey } from '../config/revenuecat';

// Helper: detect if we're running inside Expo Go
export function isExpoGo() {
  // In Expo Go this will be "expo"
  return Constants.appOwnership === 'expo';
}

/**
 * Initialize RevenueCat safely.
 * - In Expo Go: we SKIP configuring, to avoid crashes.
 * - In dev/production builds: we call Purchases.configure with your API key.
 */
export async function configureRevenueCat() {
  if (isExpoGo()) {
    console.log('[RevenueCat] Expo Go detected, skipping Purchases.configure');
    return;
  }

  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    const message = '[RevenueCat] Missing RevenueCat API key for this platform';
    if (__DEV__) {
      console.warn(`${message}, skipping configure`);
      return;
    }

    console.error(message);
    Alert.alert('RevenueCat Error', 'Missing RevenueCat API key for this platform.');
    throw new Error(message);
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.INFO : LOG_LEVEL.WARN);

    await Purchases.configure({ apiKey });
    console.log('[RevenueCat] Purchases configured successfully', {
      platform: Platform.OS,
    });
  } catch (error) {
    console.warn('[RevenueCat] Purchases.configure failed', error);
  }
}

/**
 * Fetch offerings safely. Returns null if anything fails.
 */
export async function fetchOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings || !offerings.current || Object.keys(offerings.all).length === 0) {
      console.warn('[RevenueCat] Offerings are empty (Test Store?)');
      return null;
    }

    console.log('[RevenueCat] Offerings fetched', Object.keys(offerings.all));

    return offerings;
  } catch (error: any) {
    console.error('[RevenueCat] Error fetching offerings', error);
    if (error?.userInfo?.underlyingErrorMessage) {
      console.error('[RevenueCat underlying]', error.userInfo.underlyingErrorMessage);
    }
    return null;
  }
}

/**
 * Purchase a package and update isPro if user has active entitlements.
 */
export async function purchasePackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    const entitlements = customerInfo.entitlements.active;
    const hasPro = Object.keys(entitlements).length > 0;

    if (hasPro) {
      // Assumes your store has setIsPro(boolean)
      useAppStore.getState().setPro(true);
    }

    return customerInfo;
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('[RevenueCat] Purchase cancelled by user');
    } else {
      console.error('[RevenueCat] Purchase failed', error);
      if (error?.userInfo?.underlyingErrorMessage) {
        console.error('[RevenueCat underlying]', error.userInfo.underlyingErrorMessage);
      }
    }
    throw error;
  }
}

/**
 * Restore purchases and update isPro.
 */
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();

    const entitlements = customerInfo.entitlements.active;
    const hasPro = Object.keys(entitlements).length > 0;

    useAppStore.getState().setPro(hasPro);

    return customerInfo;
  } catch (error) {
    console.warn('[RevenueCat] restorePurchases failed', error);
    throw error;
  }
}
