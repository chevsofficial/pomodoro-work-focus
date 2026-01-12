import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_LINKS } from '../config/links';

export function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>App configuration error</Text>
      <Text style={styles.body}>{message}</Text>

      <Text style={styles.hint}>
        This is a release build missing required configuration. Please contact support.
      </Text>

      <Pressable onPress={() => Linking.openURL(`mailto:${APP_LINKS.supportEmail}`)}>
        <Text style={styles.link}>{APP_LINKS.supportEmail}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 16, marginBottom: 12 },
  hint: { fontSize: 13, opacity: 0.7, marginBottom: 12 },
  link: { fontSize: 14, textDecorationLine: 'underline' },
});
