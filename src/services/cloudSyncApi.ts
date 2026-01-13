import { isSupabaseConfigured, supabase } from './supabaseClient';
import { AppStateSnapshot } from '../models';
import { logger } from '../utils/logger';

export type CloudSnapshot = AppStateSnapshot & {
  userId: string;
  updatedAt: string;
  revision: number;
};

export const CLOUD_SYNC_CONFLICT_CODE = 'CLOUD_SYNC_CONFLICT';

export class CloudSyncConflictError extends Error {
  code = CLOUD_SYNC_CONFLICT_CODE;
  serverSnapshot?: CloudSnapshot;

  constructor(serverSnapshot?: CloudSnapshot) {
    super('Cloud sync conflict detected');
    this.serverSnapshot = serverSnapshot;
  }
}

const TABLE_NAME = 'user_snapshots';

type UploadSnapshotResponse = {
  conflict?: boolean;
  snapshot?: AppStateSnapshot;
  revision?: number;
  updated_at?: string;
  user_id?: string;
  current_row?: {
    snapshot?: AppStateSnapshot;
    revision?: number;
    updated_at?: string;
    user_id?: string;
  };
};

const mapRowToSnapshot = (
  row: UploadSnapshotResponse | UploadSnapshotResponse['current_row'],
  fallback: CloudSnapshot,
): CloudSnapshot | undefined => {
  if (!row?.snapshot) return undefined;

  return {
    ...row.snapshot,
    userId: row.user_id ?? fallback.userId,
    revision: row.revision ?? fallback.revision,
    updatedAt: row.updated_at ?? fallback.updatedAt,
  } as CloudSnapshot;
};

export const cloudSyncApi = {
  async fetchSnapshot(userId: string): Promise<CloudSnapshot | null> {
    if (!isSupabaseConfigured) {
      logger.warn('Cloud sync: Supabase is not configured. Skipping fetch.');
      return null;
    }

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
    if (!isSupabaseConfigured) {
      logger.warn('Cloud sync: Supabase is not configured. Skipping upload.');
      throw new Error('Supabase credentials are not configured.');
    }

    const { userId: _userId, revision, updatedAt, ...appState } = snapshot;
    const expectedRevision = revision;
    const nextRevision = expectedRevision + 1;

    const { data, error } = await supabase.rpc('upload_user_snapshot', {
      expected_revision: expectedRevision,
      new_revision: nextRevision,
      new_snapshot: appState,
      new_updated_at: updatedAt,
    });

    if (error) {
      logger.error('Cloud sync: uploadSnapshot failed', error);
      throw error;
    }

    const response = data as UploadSnapshotResponse | null;
    if (!response) {
      throw new Error('Cloud sync: uploadSnapshot returned empty response.');
    }

    const currentRow = response.current_row ?? response;
    const serverSnapshot = mapRowToSnapshot(currentRow, snapshot);

    if (response.conflict) {
      throw new CloudSyncConflictError(serverSnapshot);
    }

    if (!serverSnapshot) {
      throw new Error('Cloud sync: uploadSnapshot returned invalid snapshot data.');
    }

    return serverSnapshot;
  },
};
