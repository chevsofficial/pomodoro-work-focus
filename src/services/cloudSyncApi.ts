import { supabase } from './supabaseClient';
import { AppStateSnapshot } from '../models';
import { logger } from '../utils/logger';

export type CloudSnapshot = AppStateSnapshot & {
  userId: string;
  updatedAt: string;
  revision: number;
};

const TABLE_NAME = 'user_snapshots';

export const cloudSyncApi = {
  async fetchSnapshot(userId: string): Promise<CloudSnapshot | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST204') {
        return null;
      }
      logger.error('Cloud sync: fetchSnapshot failed', error);
      return null;
    }

    const { snapshot, revision, updated_at } = data;

    return {
      ...snapshot,
      userId,
      revision: revision ?? 0,
      updatedAt: updated_at,
    } as CloudSnapshot;
  },

  async uploadSnapshot(snapshot: CloudSnapshot): Promise<CloudSnapshot> {
    const { userId, revision, updatedAt, ...appState } = snapshot;

    const payload = {
      user_id: userId,
      snapshot: appState,
      revision,
      updated_at: updatedAt,
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      logger.error('Cloud sync: uploadSnapshot failed', error);
      throw error;
    }

    return {
      ...data.snapshot,
      userId: data.user_id,
      revision: data.revision,
      updatedAt: data.updated_at,
    } as CloudSnapshot;
  },
};
