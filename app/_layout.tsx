import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import { colors } from '@/theme/colors';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, error } = useDatabaseSetup();

  useEffect(() => {
    if (ready || error) SplashScreen.hideAsync();
  }, [ready, error]);

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Database error: {error.message}</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!ready) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
});
