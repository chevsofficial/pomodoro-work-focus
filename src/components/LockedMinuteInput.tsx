import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { ProBadge } from './ProBadge';
import { useThemeColors } from '../theme/useThemeColors';

type LockedMinuteInputProps = {
  value: string | number;
  locked: boolean;
  onPressLocked: () => void;
  onChangeText?: (text: string) => void;
  inputStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  keyboardType?: TextInputProps['keyboardType'];
  placeholderTextColor?: string;
  testID?: string;
  pressable?: boolean;
};

export const LockedMinuteInput: React.FC<LockedMinuteInputProps> = ({
  value,
  locked,
  onPressLocked,
  onChangeText,
  inputStyle,
  textStyle,
  keyboardType = 'numeric',
  placeholderTextColor,
  testID,
  pressable = true,
}) => {
  const colors = useThemeColors();

  if (!locked) {
    return (
      <TextInput
        style={inputStyle}
        value={String(value)}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={placeholderTextColor}
        testID={testID}
      />
    );
  }

  const content = (
    <View style={[styles.lockedContainer, inputStyle]}>
      <Text style={[styles.lockedText, { color: colors.textPrimary }, textStyle]}>
        {String(value)}
      </Text>
      <View style={styles.proBadge}>
        <ProBadge />
      </View>
    </View>
  );

  if (!pressable) {
    return <View testID={testID}>{content}</View>;
  }

  return (
    <TouchableOpacity onPress={onPressLocked} activeOpacity={0.7} testID={testID}>
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  lockedContainer: {
    position: 'relative',
    height: 44,
    justifyContent: 'center',
    paddingRight: 44,
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  proBadge: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -9 }],
  },
});
