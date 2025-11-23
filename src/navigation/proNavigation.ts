import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './RootNavigator';

export const navigateToProUpsell = (
  navigation: NativeStackNavigationProp<RootStackParamList>,
) => {
  navigation.navigate('Paywall');
};
