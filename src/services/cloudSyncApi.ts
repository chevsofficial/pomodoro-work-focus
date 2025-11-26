import { AppStateSnapshot } from '../models';

export type CloudSnapshot = AppStateSnapshot & {
  userId: string;
  updatedAt: string;
  revision: number;
};

export interface CloudSyncApi {
  fetchSnapshot: (userId: string) => Promise<CloudSnapshot | null>;
  uploadSnapshot: (snapshot: CloudSnapshot) => Promise<CloudSnapshot>;
}

// Stub implementation – replace with real network calls
export const cloudSyncApi: CloudSyncApi = {
  async fetchSnapshot(_userId: string) {
    // TODO: Implement actual API call
    // e.g., GET /sync?userId=...
    return null;
  },
  async uploadSnapshot(snapshot: CloudSnapshot) {
    // TODO: Implement actual API call
    // e.g., POST /sync with JSON body, returns stored snapshot (with updated revision / updatedAt)
    return snapshot;
  },
};
