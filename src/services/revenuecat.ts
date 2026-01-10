// src/services/revenuecat.ts

import Purchases, {
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
  type CustomerInfo,
} from 'react-native-purchases';
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

const PRO_ENTITLEMENT_ID = 'pro';
const REVENUECAT_UNAVAILABLE_MESSAGE = 'Subscriptions unavailable. Please try again later.';

let revenueCatAvailability: RevenueCatAvailability = {
  status: 'unconfigured',
  error: null,
};

let revenueCatConfigurePromise: Promise<RevenueCatAvailability> | null = null;
let removeCustomerInfoListener: (() => void) | null = null;

function hasProEntitlement(customerInfo: CustomerInfo | null | undefined): boolean {
  if (!customerInfo) return false;

  // RevenueCat v5+ has: customerInfo.entitlements.active[entitlementId]
  return Boolean(customerInfo.entitlements.active?.[PRO_ENTITLEMENT_ID]);
}

function syncProFromCustomerInfo(customerInfo: CustomerInfo | null | undefined) {
  const isPro = hasProEntitlement(customerInfo);
  useAppStore.getState().setPro(isPro);
  return isPro;
}

export function attachRevenueCatCustomerInfoListener() {
  // Prevent duplicate listeners if called twice
  if (removeCustomerInfoListener) return;

  const listener = (customerInfo: CustomerInfo) => {
    syncProFromCustomerInfo(customerInfo);
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  // RevenueCat doesn't provide an official "remove listener" in some SDK versions.
  // But newer versions do. If available, use it. If not available, we just avoid double attaching.
  removeCustomerInfoListener = () => {
    // @ts-expect-error - depending on SDK version
    if (typeof Purchases.removeCustomerInfoUpdateListener === 'function') {
      // @ts-expect-error - depending on SDK version
      Purchases.removeCustomerInfoUpdateListener(listener);
    }
  };
}

export function detachRevenueCatCustomerInfoListener() {
  removeCustomerInfoListener?.();
  removeCustomerInfoListener = null;
}

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
    syncProFromCustomerInfo(loginResult.customerInfo);
    await refreshProStatus();
    return loginResult;
  } catch (error) {
    logger.warn('[RevenueCat] Purchases.logIn failed', error);
    return null;
  }
}

export async function logOutRevenueCat() {
  const isConfigured = await ensureRevenueCatConfigured();

  if (!isConfigured) {
    useAppStore.getState().setPro(false);
    return;
  }

  try {
    await Purchases.logOut();
    logger.info('[RevenueCat] Purchases.logOut succeeded');
  } catch (error) {
    logger.warn('[RevenueCat] Purchases.logOut failed', error);
  } finally {
    useAppStore.getState().setPro(false);
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
      attachRevenueCatCustomerInfoListener();
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

export async function refreshProStatus() {
  try {
    const info = await Purchases.getCustomerInfo();
    syncProFromCustomerInfo(info);
    return info;
  } catch (error) {
    logger.warn('[RevenueCat] getCustomerInfo failed', error);
    return null;
  }
}

/**
 * Fetch offerings safely. Returns null on failure (never throws).
 */
export async function fetchOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const availability = getRevenueCatAvailability();
    if (availability.status === 'skipped' || availability.status === 'failed') {
      logger.info('[RevenueCat] fetchOfferings skipped (not configured)');
      return null;
    }

    return await Purchases.getOfferings();
  } catch (error) {
    logger.warn('[RevenueCat] fetchOfferings failed', error);
    return null;
  }
}

/**
 * Purchase a package and update isPro if user has active entitlements.
 */
export async function purchasePackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    syncProFromCustomerInfo(customerInfo);

    return customerInfo;
  } catch (error: any) {
    if (error?.userCancelled) {
      logger.info('[RevenueCat] Purchase cancelled by user');
      return null;
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

    syncProFromCustomerInfo(customerInfo);

    return customerInfo;
  } catch (error) {
    logger.warn('[RevenueCat] restorePurchases failed', error);
    throw error;
  }
}
