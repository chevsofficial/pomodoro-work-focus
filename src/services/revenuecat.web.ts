import useAppStore from '../store/appStore';

export type CustomerInfo = { entitlements: { active: Record<string, unknown> } };

export function isExpoGo() {
  return false;
}

export function getRevenueCatAvailability() {
  return { status: 'skipped', error: null } as const;
}

export async function configureRevenueCat() {
  return { status: 'skipped', error: null } as const;
}

export async function fetchOfferings() {
  return null;
}

export async function purchasePackage() {
  return null;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return { entitlements: { active: {} } };
}

export async function logInRevenueCat() {
  return null;
}

export async function logOutRevenueCat() {
  useAppStore.getState().setPro(false);
}

export async function refreshProStatus() {
  return null;
}
