import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ConfigErrorScreenProps = {
  message: string;
};

export const ConfigErrorScreen: React.FC<ConfigErrorScreenProps> = ({ message }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuration Error</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f1117',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#d0d4dd',
    textAlign: 'center',
    lineHeight: 22,
  },
});
