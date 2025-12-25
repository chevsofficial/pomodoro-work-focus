import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './RootNavigator';

export const goToPaywall = (
  navigation: NativeStackNavigationProp<RootStackParamList>,
  source?: string,
) => {
  navigation.navigate('Paywall', source ? { source } : undefined);
};

export const navigateToProUpsell = (
  navigation: NativeStackNavigationProp<RootStackParamList>,
) => {
  goToPaywall(navigation);
};
