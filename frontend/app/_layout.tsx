import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useAppFonts } from '../src/design/fonts';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { useReducedMotion } from '../src/ui/hooks/useReducedMotion';
import { UIProvider } from '../src/ui/providers/UIProvider';

// Keep the native splash up until the bundled fonts are ready (never longer than FONT_WAIT_MS)
SplashScreen.preventAutoHideAsync().catch(() => {});
const FONT_WAIT_MS = 3000;

/** Stack with the canvas colour behind every screen and screen transitions that respect "reduce motion". */
function AppStack() {
  const { user } = useAuth();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Stack
      key={user?._id ?? 'guest'}
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'default',
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="owner" />
      <Stack.Screen name="search" />
    </Stack>
  );
}

export default function RootLayout() {
  const { ready } = useAppFonts();
  const [waitedLongEnough, setWaitedLongEnough] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedLongEnough(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const show = ready || waitedLongEnough;
  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => {});
  }, [show]);

  // Fonts failing or loading slowly never blocks the app: text falls back to the system font
  if (!show) return null;

  return (
    <AuthProvider>
      <ThemeProvider variant="reader">
        <UIProvider>
          <AppStack />
        </UIProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
