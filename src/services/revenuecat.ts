import Purchases, { PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import useAppStore from '../store/appStore';
import { getRevenueCatApiKey, REVENUECAT_KEYS } from '../config/revenuecat';

export const initRevenueCat = () => {
  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    console.error('RevenueCat: API key is not configured for this platform.');
    return;
  }

  Purchases.configure({
    apiKey,
    appUserID: null,
  });
};

export const fetchOfferings = async (): Promise<PurchasesOfferings | null> => {
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.error('RevenueCat: failed to load offerings', error);
    return null;
  }
};

export const purchaseProduct = async (packageToBuy: PurchasesPackage) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
    const entitlement = customerInfo.entitlements.active['pro'];

    if (entitlement) {
      useAppStore.getState().setProStatus({
        isPro: true,
        source: 'iap',
        productId: packageToBuy.product.identifier,
        platform: Platform.OS,
        expiresAt: entitlement.expirationDate ?? null,
        activatedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    if (!error?.userCancelled) {
      console.error('RevenueCat: purchase failed', error);
    }
    throw error;
  }
};

export const restorePurchases = async () => {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const entitlement = customerInfo.entitlements.active['pro'];

    if (entitlement) {
      useAppStore.getState().setProStatus({
        isPro: true,
        source: 'iap',
        productId: entitlement.productIdentifier,
        platform: Platform.OS,
        expiresAt: entitlement.expirationDate ?? null,
        activatedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
      });
    }

    return entitlement;
  } catch (error) {
    console.error('RevenueCat: restore failed', error);
    throw error;
  }
};

export const getConfiguredRevenueCatKeys = () => REVENUECAT_KEYS;
