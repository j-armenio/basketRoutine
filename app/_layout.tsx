import { useBlurOnKeyboardHide } from '@/components/useBlurOnKeyboardHide';
import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import { colors } from '@/theme/colors';
import { fontFiles } from '@/theme/fonts';
import { navigationTheme } from '@/theme/navigationTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import regular from 'expo-symbols/androidWeights/regular';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, error } = useDatabaseSetup();
  // Preloads the text and icon fonts behind the splash, so nothing redraws once they arrive. If
  // one fails we carry on: text falls back to the system font, icons to their empty box.
  const [fontsLoaded, fontError] = useFonts({ ...fontFiles, [regular.name]: regular.font });
  const fontsSettled = fontsLoaded || !!fontError;
  useBlurOnKeyboardHide();

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
    // Gestures (swipe to delete a set) only work under this root view.
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navigationTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="active-workout" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="edit-workout" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="edit-exercise" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="add-exercise" options={{ presentation: 'modal' }} />
          <Stack.Screen name="add-to-routine" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
  },
});
