import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from './RootNavigator';

export const navigateToProUpsell = (
  navigation: NavigationProp<RootStackParamList>,
) => {
  navigation.navigate('Paywall');
};
