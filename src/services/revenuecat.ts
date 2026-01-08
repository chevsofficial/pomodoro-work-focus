// src/services/revenuecat.ts

import Purchases, { LOG_LEVEL, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import useAppStore from '../store/appStore';
import { getRevenueCatApiKey } from '../config/revenuecat';
import { logger } from '../utils/logger';

// Helper: detect if we're running inside Expo Go
export function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

type RevenueCatAvailabilityStatus =
  | 'unconfigured'
  | 'configuring'
  | 'configured'
  | 'failed'
  | 'skipped';

type RevenueCatAvailability = {
  status: RevenueCatAvailabilityStatus;
  error: string | null;
};

const REVENUECAT_UNAVAILABLE_MESSAGE = 'Subscriptions unavailable. Please try again later.';

let revenueCatAvailability: RevenueCatAvailability = {
  status: 'unconfigured',
  error: null,
};

let revenueCatConfigurePromise: Promise<RevenueCatAvailability> | null = null;

export function getRevenueCatAvailability(): RevenueCatAvailability {
  return { ...revenueCatAvailability };
}

export function getRevenueCatConfigurePromise(): Promise<RevenueCatAvailability> | null {
  return revenueCatConfigurePromise;
}

async function ensureRevenueCatConfigured() {
  if (isExpoGo()) {
    return false;
  }

  let availability = getRevenueCatAvailability();

  if (availability.status === 'configuring' && revenueCatConfigurePromise) {
    availability = await revenueCatConfigurePromise;
  } else if (availability.status === 'unconfigured') {
    availability = await configureRevenueCat();
  }

  return availability.status === 'configured';
}

export async function logInRevenueCat(appUserId: string) {
  if (!appUserId) {
    return null;
  }

  const isConfigured = await ensureRevenueCatConfigured();

  if (!isConfigured) {
    return null;
  }

  try {
    const loginResult = await Purchases.logIn(appUserId);
    logger.info('[RevenueCat] Purchases.logIn succeeded');
    return loginResult;
  } catch (error) {
    logger.warn('[RevenueCat] Purchases.logIn failed', error);
    return null;
  }
}

export async function logOutRevenueCat() {
  const isConfigured = await ensureRevenueCatConfigured();

  if (!isConfigured) {
    return;
  }

  try {
    await Purchases.logOut();
    logger.info('[RevenueCat] Purchases.logOut succeeded');
  } catch (error) {
    logger.warn('[RevenueCat] Purchases.logOut failed', error);
  }
}

/**
 * Initialize RevenueCat safely.
 * - In Expo Go: we SKIP configuring, to avoid crashes.
 * - In dev/production builds: we call Purchases.configure with your API key.
 */
export async function configureRevenueCat() {
  if (revenueCatAvailability.status === 'configured') {
    return revenueCatConfigurePromise ?? Promise.resolve(getRevenueCatAvailability());
  }

  if (revenueCatAvailability.status === 'configuring' && revenueCatConfigurePromise) {
    return revenueCatConfigurePromise;
  }

  revenueCatAvailability = { status: 'configuring', error: null };

  revenueCatConfigurePromise = (async () => {
    if (isExpoGo()) {
      logger.info('[RevenueCat] Expo Go detected, skipping Purchases.configure');
      revenueCatAvailability = { status: 'skipped', error: null };
      return getRevenueCatAvailability();
    }

    const apiKey = getRevenueCatApiKey();

    if (!apiKey) {
      const message = '[RevenueCat] Missing RevenueCat API key for this platform';
      logger.warn(`${message}, skipping configure`);
      revenueCatAvailability = {
        status: 'failed',
        error: REVENUECAT_UNAVAILABLE_MESSAGE,
      };
      return getRevenueCatAvailability();
    }

    try {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.INFO : LOG_LEVEL.WARN);

      await Purchases.configure({ apiKey });
      logger.info('[RevenueCat] Purchases configured successfully', {
        platform: Platform.OS,
      });
      revenueCatAvailability = { status: 'configured', error: null };
    } catch (error) {
      logger.warn('[RevenueCat] Purchases.configure failed', error);
      revenueCatAvailability = {
        status: 'failed',
        error: REVENUECAT_UNAVAILABLE_MESSAGE,
      };
    }

    return getRevenueCatAvailability();
  })();

  return revenueCatConfigurePromise;
}

/**
 * Fetch offerings safely. Returns null if anything fails.
 */
export async function fetchOfferings(): Promise<PurchasesOfferings> {
  return Purchases.getOfferings();
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
      logger.info('[RevenueCat] Purchase cancelled by user');
    } else {
      logger.error('[RevenueCat] Purchase failed', error);
      if (error?.userInfo?.underlyingErrorMessage) {
        logger.error('[RevenueCat underlying]', error.userInfo.underlyingErrorMessage);
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
    logger.warn('[RevenueCat] restorePurchases failed', error);
    throw error;
  }
}
