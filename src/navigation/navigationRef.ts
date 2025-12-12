import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './RootNavigator';

type PendingNavigation<RouteName extends keyof RootStackParamList> = {
  name: RouteName;
  params?: RootStackParamList[RouteName];
} | null;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNavigation: PendingNavigation<keyof RootStackParamList> = null;

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
    pendingNavigation = null;
  } else {
    pendingNavigation = { name, params } as PendingNavigation<keyof RootStackParamList>;
  }
}

export function handlePendingNavigation() {
  if (pendingNavigation && navigationRef.isReady()) {
    navigationRef.navigate(pendingNavigation.name as any, pendingNavigation.params as any);
    pendingNavigation = null;
  }
}
