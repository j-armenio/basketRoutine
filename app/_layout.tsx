import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import { colors } from '@/theme/colors';
import { navigationTheme } from '@/theme/navigationTheme';
import { Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import regular from 'expo-symbols/androidWeights/regular';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, error } = useDatabaseSetup();
  // Preloads the icon font behind the splash, so tab icons don't wait for it. If it
  // fails we carry on: icons fall back to their empty box.
  const [fontsLoaded, fontError] = useFonts({ [regular.name]: regular.font });
  const fontsSettled = fontsLoaded || !!fontError;

  useEffect(() => {
    if (error || (ready && fontsSettled)) SplashScreen.hideAsync();
  }, [ready, error, fontsSettled]);

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Database error: {error.message}</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!ready || !fontsSettled) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <StatusBar style="light" />
    </ThemeProvider>
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
