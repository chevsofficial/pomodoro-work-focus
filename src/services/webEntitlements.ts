import { supabase } from './supabaseClient';
import useAppStore from '../store/appStore';
import { logger } from '../utils/logger';

const ACTIVE_STATUSES = ['active', 'trialing'];

export async function refreshWebProEntitlement(userId: string | undefined) {
  if (!userId) {
    useAppStore.getState().setPro(false);
    return false;
  }

  try {
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ACTIVE_STATUSES)
      .limit(1);

    if (!subsError && Array.isArray(subs) && subs.length > 0) {
      useAppStore.getState().setPro(true);
      return true;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .single();

    if (!profileError && profile && (profile as { is_pro?: boolean }).is_pro) {
      useAppStore.getState().setPro(true);
      return true;
    }

    useAppStore.getState().setPro(false);
    return false;
  } catch (error) {
    logger.warn('[Web Entitlements] Failed to refresh entitlement', error);
    useAppStore.getState().setPro(false);
    return false;
  }
}
