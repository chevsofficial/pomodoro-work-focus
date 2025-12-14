import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './RootNavigator';

type PendingNavigation<RouteName extends keyof RootStackParamList> = {
  name: RouteName;
  params?: RootStackParamList[RouteName];
  reset?: boolean;
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

export function resetTo<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: name as any, params: params as any }],
    });
    pendingNavigation = null;
  } else {
    pendingNavigation = { name, params, reset: true } as any;
  }
}

export function handlePendingNavigation() {
  if (pendingNavigation && navigationRef.isReady()) {
    if (pendingNavigation.reset) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: pendingNavigation.name as any, params: pendingNavigation.params as any }],
      });
    } else {
      navigationRef.navigate(pendingNavigation.name as any, pendingNavigation.params as any);
    }
    pendingNavigation = null;
  }
}
